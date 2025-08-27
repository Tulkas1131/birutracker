
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Timestamp, collection, onSnapshot, addDoc, doc, runTransaction } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { movementSchema, type MovementFormData, type Asset, type Customer } from "@/lib/types";
import { Input } from "@/components/ui/input";

export default function MovementsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    const unsubAssets = onSnapshot(collection(db, "assets"), (snapshot) => {
      setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)));
    });
    const unsubCustomers = onSnapshot(collection(db, "customers"), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    });
    return () => {
      unsubAssets();
      unsubCustomers();
    };
  }, []);

  const form = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      event_type: "SALIDA_LLENO",
      variety: "",
    },
  });

  const watchAssetId = form.watch("asset_id");
  const watchEventType = form.watch("event_type");

  const selectedAsset = assets.find(asset => asset.id === watchAssetId);
  const showVarietyField = selectedAsset?.type === 'BARRIL' && (watchEventType === 'SALIDA_LLENO' || watchEventType === 'DEVOLUCION_LLENO');


  async function onSubmit(data: MovementFormData) {
    setIsSubmitting(true);

    if (!user) {
       toast({ title: "Error", description: "You must be logged in to log a movement.", variant: "destructive" });
       setIsSubmitting(false);
       return;
    }

    if (!selectedAsset) {
      toast({ title: "Error", description: "Asset not found.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    const selectedCustomer = customers.find(c => c.id === data.customer_id);
     if (!selectedCustomer) {
      toast({ title: "Error", description: "Customer not found.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    // Determine new location and state based on event type
    let newLocation: Asset['location'] = selectedAsset.location;
    let newState: Asset['state'] = selectedAsset.state;

    switch (data.event_type) {
      case 'SALIDA_LLENO':
        newLocation = 'EN_CLIENTE';
        newState = 'LLENO';
        break;
      case 'SALIDA_VACIO':
        newLocation = 'EN_CLIENTE';
        newState = 'VACIO';
        break;
      case 'RETORNO_VACIO':
        newLocation = 'EN_PLANTA';
        newState = 'VACIO';
        break;
      case 'DEVOLUCION_LLENO':
        newLocation = 'EN_PLANTA';
        newState = 'LLENO';
        break;
    }

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Create the new event
        const eventData = {
          asset_id: selectedAsset.id,
          asset_code: selectedAsset.code,
          customer_id: selectedCustomer.id,
          customer_name: selectedCustomer.name,
          event_type: data.event_type,
          timestamp: Timestamp.now(),
          user_id: user.uid,
          variety: data.variety || "",
        };
        transaction.set(doc(collection(db, "events")), eventData);

        // 2. Update the asset location and state
        const assetRef = doc(db, "assets", selectedAsset.id);
        transaction.update(assetRef, { location: newLocation, state: newState });
      });

      toast({
        title: "Movement Logged",
        description: `Movement of asset ${selectedAsset.code} has been logged.`,
      });
      
      form.reset();
      router.push("/dashboard/history");
    } catch (e) {
      console.error("Transaction failed: ", e);
      toast({
        title: "Error",
        description: "Could not complete the transaction. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Log a Movement"
        description="Record an asset moving to or from a customer."
      />
      <main className="flex-1 p-4 pt-0 md:p-6 md:pt-0">
        <Card className="mx-auto w-full max-w-2xl">
          <CardHeader>
            <CardTitle>New Movement Details</CardTitle>
            <CardDescription>Select an asset, event type, and customer.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="asset_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an asset to move" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assets.map(asset => (
                            <SelectItem key={asset.id} value={asset.id}>
                              {asset.code} ({asset.type} - {asset.format}) - <span className="text-muted-foreground">{asset.location}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="event_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an event type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SALIDA_LLENO">SALIDA_LLENO (Delivery)</SelectItem>
                          <SelectItem value="RETORNO_VACIO">RETORNO_VACIO (Return)</SelectItem>
                          <SelectItem value="SALIDA_VACIO">SALIDA_VACIO (Special Case)</SelectItem>
                          <SelectItem value="DEVOLUCION_LLENO">DEVOLUCION_LLENO (Special Case)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {showVarietyField && (
                  <FormField
                    control={form.control}
                    name="variety"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Beer Variety</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., IPA, Stout, Lager" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                 <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select the associated customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map(customer => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                   {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Movement
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
