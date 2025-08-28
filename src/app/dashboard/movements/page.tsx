
"use client";

import { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Timestamp, collection, doc, runTransaction, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Loader2, QrCode } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { movementSchema, type MovementFormData, type Asset, type Customer } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useData } from "@/context/data-context";

// Dynamically import the QrScanner component
const QrScanner = dynamic(() => import('@/components/qr-scanner').then(mod => mod.QrScanner), {
  ssr: false,
  loading: () => <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>,
});


export default function MovementsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [user] = useAuthState(auth());
  const { assets, customers } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setScannerOpen] = useState(false);
  
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

  const handleScanSuccess = async (decodedText: string) => {
    setScannerOpen(false);
    const firestore = db();
    try {
      const assetRef = doc(firestore, 'assets', decodedText);
      const assetSnap = await getDoc(assetRef);
      if (assetSnap.exists()) {
        const scannedAsset = { id: assetSnap.id, ...assetSnap.data() } as Asset;
        form.setValue('asset_id', scannedAsset.id);
        toast({
            title: "Activo Encontrado",
            description: `Se ha seleccionado el activo: ${scannedAsset.code}.`
        });
      } else {
        toast({
            title: "Error",
            description: "No se encontró ningún activo con el QR escaneado.",
            variant: "destructive"
        });
      }
    } catch (error) {
        console.error("Error fetching asset by ID: ", error);
        toast({
            title: "Error de Búsqueda",
            description: "No se pudo verificar el código QR.",
            variant: "destructive"
        });
    }
  };

  const handleScanError = (errorMessage: string) => {
    console.error(errorMessage);
  };


  async function onSubmit(data: MovementFormData) {
    setIsSubmitting(true);
    const firestore = db();

    if (!user) {
       toast({ title: "Error", description: "Debes iniciar sesión para registrar un movimiento.", variant: "destructive" });
       setIsSubmitting(false);
       return;
    }

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
      await runTransaction(firestore, async (transaction) => {
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
        transaction.set(doc(collection(firestore, "events")), eventData);

        // 2. Update the asset location and state
        const assetRef = doc(firestore, "assets", selectedAsset.id);
        transaction.update(assetRef, { location: newLocation, state: newState });
      });

      toast({
        title: "Movimiento Registrado",
        description: `El movimiento del activo ${selectedAsset.code} ha sido registrado.`,
      });
      
      form.reset();
      router.push("/dashboard/history");
    } catch (e) {
      console.error("La transacción falló: ", e);
      toast({
        title: "Error",
        description: "No se pudo completar la transacción. Por favor, inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <Dialog open={isScannerOpen} onOpenChange={setScannerOpen}>
        <PageHeader
            title="Registrar un Movimiento"
            description="Registra la salida o entrada de un activo a un cliente."
            action={
                <DialogTrigger asChild>
                    <Button size="lg" variant="outline" onClick={() => setScannerOpen(true)}>
                        <QrCode className="mr-2 h-5 w-5" />
                        Escanear QR
                    </Button>
                </DialogTrigger>
            }
        />
        <main className="flex-1 p-4 pt-0 md:p-6 md:pt-0">
            <Card className="mx-auto w-full max-w-2xl">
            <CardHeader>
                <CardTitle>Detalles del Nuevo Movimiento</CardTitle>
                <CardDescription>Selecciona un activo (manualmente o con QR), tipo de evento y cliente.</CardDescription>
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
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un activo para mover" />
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
                        <FormLabel>Tipo de Evento</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un tipo de evento" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="SALIDA_LLENO">SALIDA_LLENO (Entrega)</SelectItem>
                            <SelectItem value="RETORNO_VACIO">RETORNO_VACIO (Retorno)</SelectItem>
                            <SelectItem value="SALIDA_VACIO">SALIDA_VACIO (Caso Especial)</SelectItem>
                            <SelectItem value="DEVOLUCION_LLENO">DEVOLUCION_LLENO (Caso Especial)</SelectItem>
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
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Escanear Código QR</DialogTitle>
            </DialogHeader>
            <Suspense fallback={<div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
              {isScannerOpen && (
                <QrScanner
                    onScanSuccess={handleScanSuccess}
                    onScanError={handleScanError}
                />
              )}
            </Suspense>
        </DialogContent>
      </Dialog>
    </div>
  );
}
