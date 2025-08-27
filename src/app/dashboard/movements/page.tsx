"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { collection, getDocs, addDoc, doc, updateDoc, Timestamp, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
  const [isLoading, setIsLoading] = useState(true);
  
  const form = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      event_type: "SALIDA_LLENO",
      variety: "",
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const assetsQuery = query(collection(db, "assets"), orderBy("code"));
        const customersQuery = query(collection(db, "customers"), orderBy("name"));
        
        const [assetsSnapshot, customersSnapshot] = await Promise.all([
          getDocs(assetsQuery),
          getDocs(customersQuery)
        ]);
        
        const assetsList = assetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
        const customersList = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
        
        setAssets(assetsList);
        setCustomers(customersList);
      } catch (error) {
         console.error("Error fetching data: ", error);
         toast({
          title: "Error",
          description: "No se pudieron cargar los activos y clientes.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const watchAssetId = form.watch("asset_id");
  const watchEventType = form.watch("event_type");

  const selectedAsset = assets.find(asset => asset.id === watchAssetId);
  const showVarietyField = selectedAsset?.type === 'BARRIL' && (watchEventType === 'SALIDA_LLENO' || watchEventType === 'ENTRADA_LLENO');


  async function onSubmit(data: MovementFormData) {
    if (!selectedAsset) {
      toast({ title: "Error", description: "Activo no encontrado.", variant: "destructive" });
      return;
    }
    const selectedCustomer = customers.find(c => c.id === data.customer_id);
     if (!selectedCustomer) {
      toast({ title: "Error", description: "Cliente no encontrado.", variant: "destructive" });
      return;
    }

    try {
      // 1. Create event document
      const newEvent = {
        asset_id: selectedAsset.id,
        asset_code: selectedAsset.code,
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        event_type: data.event_type,
        timestamp: Timestamp.now(),
        user_id: "user_placeholder", // Replace with actual user ID in a real app
        variety: data.variety || "",
      };
      await addDoc(collection(db, "events"), newEvent);

      // 2. Update asset status based on event type
      let newStatus: Asset['status'] = selectedAsset.status;
      switch(data.event_type) {
        case 'SALIDA_LLENO':
        case 'SALIDA_VACIO':
          newStatus = 'EN_CLIENTE';
          break;
        case 'DEVOLUCION_VACIO':
          newStatus = 'VACIO';
          break;
        case 'ENTRADA_LLENO':
           newStatus = 'LLENO';
           break;
      }
      
      const assetRef = doc(db, "assets", selectedAsset.id);
      await updateDoc(assetRef, { status: newStatus });

      toast({
        title: "Movimiento Registrado",
        description: `Se ha registrado el movimiento del activo ${selectedAsset.code}.`,
      });
      
      form.reset();
      router.push("/dashboard/history");

    } catch(error) {
       console.error("Error submitting movement: ", error);
       toast({
        title: "Error",
        description: "No se pudo registrar el movimiento.",
        variant: "destructive",
      });
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
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoading ? "Cargando activos..." : "Selecciona un activo para mover"} />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoading ? "Cargando clientes..." : "Selecciona el cliente asociado"} />
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
                <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
