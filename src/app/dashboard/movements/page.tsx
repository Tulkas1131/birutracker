"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Timestamp, collection, onSnapshot, addDoc, doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
  const showVarietyField = selectedAsset?.type === 'BARRIL' && (watchEventType === 'SALIDA_LLENO' || watchEventType === 'ENTRADA_LLENO');


  async function onSubmit(data: MovementFormData) {
    setIsSubmitting(true);
    if (!selectedAsset) {
      toast({ title: "Error", description: "Activo no encontrado.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    const selectedCustomer = customers.find(c => c.id === data.customer_id);
     if (!selectedCustomer) {
      toast({ title: "Error", description: "Cliente no encontrado.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    const newStatus = data.event_type === 'SALIDA_LLENO' || data.event_type === 'SALIDA_VACIO' ? 'EN_CLIENTE' : 'EN_PLANTA';

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
          user_id: "user_placeholder", // Replace with actual user ID
          variety: data.variety || "",
        };
        transaction.set(doc(collection(db, "events")), eventData);

        // 2. Update the asset status
        const assetRef = doc(db, "assets", selectedAsset.id);
        transaction.update(assetRef, { status: newStatus });
      });

      toast({
        title: "Movimiento Registrado",
        description: `Se ha registrado el movimiento del activo ${selectedAsset.code}.`,
      });
      
      form.reset();
      router.push("/dashboard/history");
    } catch (e) {
      console.error("Transaction failed: ", e);
      toast({
        title: "Error",
        description: "No se pudo completar la operación. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Registrar un Movimiento"
        description="Registra la salida o entrada de un activo a un cliente."
      />
      <main className="flex-1 p-4 pt-0 md:p-6 md:pt-0">
        <Card className="mx-auto w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Detalles del Nuevo Movimiento</CardTitle>
            <CardDescription>Selecciona un activo, un tipo de evento y un cliente.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="asset_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un activo para mover" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assets.map(asset => (
                            <SelectItem key={asset.id} value={asset.id}>
                              {asset.code} ({asset.type} - {asset.format}) - <span className="text-muted-foreground">{asset.status}</span>
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
                      <FormLabel>Tipo de Evento</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un tipo de evento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SALIDA_LLENO">SALIDA_LLENO (Salida)</SelectItem>
                          <SelectItem value="DEVOLUCION_VACIO">DEVOLUCION_VACIO (Retorno)</SelectItem>
                          <SelectItem value="SALIDA_VACIO">SALIDA_VACIO (Caso especial)</SelectItem>
                          <SelectItem value="ENTRADA_LLENO">ENTRADA_LLENO (Caso especial)</SelectItem>
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
                        <FormLabel>Variedad de Cerveza</FormLabel>
                        <FormControl>
                          <Input placeholder="ej., IPA, Stout, Lager" {...field} />
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
                      <FormLabel>Cliente</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el cliente asociado" />
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
                  Guardar Movimiento
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
