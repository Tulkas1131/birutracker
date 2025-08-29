
"use client";

import { useState, Suspense, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Loader2, QrCode } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { movementSchema, type MovementFormData, type Asset, type Customer, type Event, type MovementEventType } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const QrScanner = dynamic(() => import('@/components/qr-scanner').then(mod => mod.QrScanner), {
  ssr: false,
  loading: () => <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>,
});


export default function MovementsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [user] = useAuthState(auth());
  const [assets, setAssets] = useState<Asset[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setScannerOpen] = useState(false);
  
  const form = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      event_type: "SALIDA_A_REPARTO",
      variety: "",
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { collection, query, where, orderBy, getDocs } = await import("firebase/firestore/lite");
        const firestore = db();
        const assetsQuery = query(collection(firestore, "assets"), orderBy("code"));
        const customersQuery = query(collection(firestore, "customers"), orderBy("name"));
        
        const pendingEventsQuery = query(
          collection(firestore, "events"), 
          where("event_type", "in", ["SALIDA_A_REPARTO", "RECOLECCION_DE_CLIENTE", "ENTREGA_A_CLIENTE"]),
          orderBy("timestamp", "desc")
        );

        const [assetsSnapshot, customersSnapshot, pendingEventsSnapshot] = await Promise.all([
          getDocs(assetsQuery),
          getDocs(customersQuery),
          getDocs(pendingEventsQuery),
        ]);

        const assetsData = assetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
        const customersData = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
        const pendingEventsData = pendingEventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));

        setAssets(assetsData);
        setCustomers(customersData);
        setPendingEvents(pendingEventsData);
      } catch (error) {
        console.error("Error fetching data for movements page: ", error);
        toast({
          title: "Error de Carga",
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
  const showVarietyField = selectedAsset?.type === 'BARRIL' && (watchEventType === 'SALIDA_A_REPARTO' || watchEventType === 'DEVOLUCION');

  const filteredAssets = useMemo(() => {
    switch (watchEventType) {
      case 'SALIDA_A_REPARTO':
      case 'SALIDA_VACIO':
        return assets.filter(a => a.location === 'EN_PLANTA');
      case 'ENTREGA_A_CLIENTE':
      case 'RECEPCION_EN_PLANTA':
        return assets.filter(a => a.location === 'EN_REPARTO');
      case 'RECOLECCION_DE_CLIENTE':
      case 'DEVOLUCION':
        return assets.filter(a => a.location === 'EN_CLIENTE');
      default:
        return assets;
    }
  }, [assets, watchEventType]);

  useEffect(() => {
    const isSecondStepEvent = watchEventType === 'ENTREGA_A_CLIENTE' || watchEventType === 'RECEPCION_EN_PLANTA';
    
    if (isSecondStepEvent && watchAssetId) {
      const expectedInitialEventType = watchEventType === 'ENTREGA_A_CLIENTE' ? 'SALIDA_A_REPARTO' : 'RECOLECCION_DE_CLIENTE';
      const pendingEvent = pendingEvents.find(e => e.asset_id === watchAssetId && e.event_type === expectedInitialEventType);

      if (pendingEvent) {
        form.setValue('customer_id', pendingEvent.customer_id);
      }
    } else {
        if (!form.formState.isDirty) { 
             form.resetField('customer_id');
        }
    }
  }, [watchAssetId, watchEventType, pendingEvents, form]);


  useEffect(() => {
    if (watchAssetId && !filteredAssets.find(a => a.id === watchAssetId)) {
      form.setValue('asset_id', '');
    }
  }, [filteredAssets, watchAssetId, form]);

  const handleScanSuccess = async (decodedText: string) => {
    setScannerOpen(false);
    
    if (!/^[a-zA-Z0-9]{20}$/.test(decodedText)) {
        toast({
            title: "Código QR Inválido",
            description: "El QR escaneado no parece ser un identificador de activo válido.",
            variant: "destructive"
        });
        return;
    }

    try {
      const scannedAsset = assets.find(a => a.id === decodedText);

      if (scannedAsset) {
        form.setValue('asset_id', scannedAsset.id);
        
        if (watchEventType === 'RECOLECCION_DE_CLIENTE') {
          const lastDeliveryEvent = pendingEvents.find(e => e.asset_id === scannedAsset.id && e.event_type === 'ENTREGA_A_CLIENTE');
          
          if (lastDeliveryEvent) {
            form.setValue('customer_id', lastDeliveryEvent.customer_id);
            toast({
              title: "Activo y Cliente Encontrados",
              description: `Activo: ${scannedAsset.code}. Cliente: ${lastDeliveryEvent.customer_name}.`
            });
          } else {
            toast({
              title: "Activo Encontrado, Cliente Desconocido",
              description: `Se ha seleccionado el activo: ${scannedAsset.code}. Por favor, selecciona el cliente manualmente.`,
              variant: "default"
            });
          }
        } else {
          toast({
              title: "Activo Encontrado",
              description: `Se ha seleccionado el activo: ${scannedAsset.code}.`
          });
        }
      } else {
        toast({
            title: "Error",
            description: "No se encontró ningún activo con el QR escaneado.",
            variant: "destructive"
        });
      }
    } catch (error) {
        console.error("Error processing scan: ", error);
        toast({
            title: "Error de Búsqueda",
            description: "No se pudo verificar el código QR.",
            variant: "destructive"
        });
    }
  };

  const handleScanError = (errorMessage: string) => {
    if (typeof errorMessage === 'string' && (errorMessage.toLowerCase().includes("not found") || errorMessage.toLowerCase().includes("insufficient"))) {
        return;
    }
    console.error("QR Scan Error:", errorMessage);
  };


  async function onSubmit(data: MovementFormData) {
    setIsSubmitting(true);
    const { Timestamp, doc, runTransaction, collection } = await import("firebase/firestore/lite");
    const firestore = db();

    if (!user) {
       toast({ title: "Error", description: "Debes iniciar sesión para registrar un movimiento.", variant: "destructive" });
       setIsSubmitting(false);
       return;
    }

    const currentSelectedAsset = assets.find(a => a.id === data.asset_id);
    if (!currentSelectedAsset) {
      toast({ title: "Error", description: "Activo no encontrado o inválido para esta operación.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const selectedCustomer = customers.find(c => c.id === data.customer_id);
     if (!selectedCustomer) {
      toast({ title: "Error", description: "Cliente no encontrado.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    let newLocation: Asset['location'] = currentSelectedAsset.location;
    let newState: Asset['state'] = currentSelectedAsset.state;

    switch (data.event_type) {
      case 'SALIDA_A_REPARTO':
        newLocation = 'EN_REPARTO';
        newState = 'LLENO';
        break;
      case 'ENTREGA_A_CLIENTE':
        newLocation = 'EN_CLIENTE';
        newState = 'LLENO';
        break;
      case 'SALIDA_VACIO':
        newLocation = 'EN_CLIENTE';
        newState = 'VACIO';
        break;
      case 'RECOLECCION_DE_CLIENTE':
        newLocation = 'EN_REPARTO';
        newState = 'VACIO';
        break;
      case 'RECEPCION_EN_PLANTA':
        newLocation = 'EN_PLANTA';
        newState = 'VACIO';
        break;
      case 'DEVOLUCION':
        newLocation = 'EN_PLANTA';
        newState = 'LLENO';
        break;
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const isUpdateEvent = data.event_type === 'ENTREGA_A_CLIENTE' || data.event_type === 'RECEPCION_EN_PLANTA';

        if (isUpdateEvent) {
          const expectedInitialEventType = data.event_type === 'ENTREGA_A_CLIENTE' ? 'SALIDA_A_REPARTO' : 'RECOLECCION_DE_CLIENTE';
          
          const pendingEvent = pendingEvents
            .filter(e => e.asset_id === currentSelectedAsset.id && e.event_type === expectedInitialEventType)
            .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())[0];

          if (!pendingEvent) {
            throw new Error(`No se encontró el evento inicial de '${expectedInitialEventType}' para el activo ${currentSelectedAsset.code}. No se puede completar la operación.`);
          }
          const eventRef = doc(firestore, "events", pendingEvent.id);
          transaction.update(eventRef, {
            event_type: data.event_type,
            timestamp: Timestamp.now(),
          });

        } else {
            const eventData = {
                asset_id: currentSelectedAsset.id,
                asset_code: currentSelectedAsset.code,
                customer_id: selectedCustomer.id,
                customer_name: selectedCustomer.name,
                event_type: data.event_type,
                timestamp: Timestamp.now(),
                user_id: user.uid,
                variety: data.variety || "",
            };
            const newEventRef = doc(collection(firestore, "events"));
            transaction.set(newEventRef, eventData);
        }

        const assetRef = doc(firestore, "assets", currentSelectedAsset.id);
        transaction.update(assetRef, { location: newLocation, state: newState });
      });

      toast({
        title: "Movimiento Registrado",
        description: `El movimiento del activo ${currentSelectedAsset.code} ha sido registrado.`,
      });
      
      form.reset();
      router.push("/dashboard/history");
    } catch (e: any) {
      console.error("La transacción falló: ", e);
      toast({
        title: "Error",
        description: e.message || "No se pudo completar la transacción. Por favor, inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleEventTypeChange = (value: MovementEventType) => {
    form.setValue('event_type', value);
    form.resetField('asset_id');
    form.resetField('customer_id');
  };

  const eventTypeDetails: Record<MovementEventType, { title: string; description: string }> = {
    SALIDA_A_REPARTO: { title: "Salida a Reparto (Cargar Camión)", description: "Registra los activos que salen de la planta hacia un cliente." },
    ENTREGA_A_CLIENTE: { title: "Entrega a Cliente", description: "Confirma la entrega de un activo que ya está en reparto." },
    RECOLECCION_DE_CLIENTE: { title: "Recolección de Cliente", description: "Registra un activo vacío que se retira de un cliente." },
    RECEPCION_EN_PLANTA: { title: "Recepción en Planta (Descargar Camión)", description: "Confirma la llegada a planta de un activo recolectado." },
    SALIDA_VACIO: { title: "Préstamo (Salida Vacío)", description: "Registra la salida de un activo vacío hacia un cliente." },
    DEVOLUCION: { title: "Devolución (Lleno)", description: "Registra un activo lleno que un cliente devuelve a planta." },
  };

  return (
    <div className="flex flex-1 flex-col">
      <Dialog open={isScannerOpen} onOpenChange={setScannerOpen}>
        <PageHeader
            title="Registrar un Movimiento"
            description="Elige una acción y completa los detalles."
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
                <CardTitle>{eventTypeDetails[watchEventType].title}</CardTitle>
                <CardDescription>{eventTypeDetails[watchEventType].description}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField
                      control={form.control}
                      name="event_type"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Elige una acción</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={(value: MovementEventType) => handleEventTypeChange(value)}
                              defaultValue={field.value}
                              className="grid grid-cols-2 md:grid-cols-3 gap-4"
                            >
                              {(Object.keys(eventTypeDetails) as MovementEventType[]).map((type) => (
                                <FormItem key={type}>
                                  <FormControl>
                                    <RadioGroupItem value={type} id={type} className="sr-only" />
                                  </FormControl>
                                  <Label
                                    htmlFor={type}
                                    className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer
                                      ${field.value === type ? 'border-primary' : ''}`}
                                  >
                                    <span className="text-center font-semibold">{eventTypeDetails[type].title.split('(')[0].trim()}</span>
                                  </Label>
                                </FormItem>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-4 rounded-md border p-4">
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
                                {filteredAssets.length === 0 ? (
                                    <div className="p-4 text-sm text-muted-foreground">No hay activos disponibles para esta operación.</div>
                                ) : (
                                    filteredAssets.map(asset => (
                                    <SelectItem key={asset.id} value={asset.id}>
                                        {asset.code} ({asset.type} - {asset.format}) - <span className="text-muted-foreground">{asset.state}</span>
                                    </SelectItem>
                                    ))
                                )}
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
                            <Select
                                onValueChange={field.onChange}
                                value={field.value}
                                defaultValue={field.value}
                                disabled={watchEventType === 'ENTREGA_A_CLIENTE' || watchEventType === 'RECEPCION_EN_PLANTA'}
                            >
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
                    </div>
                    
                    <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Guardar Movimiento
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
            </Card>
        </main>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Escanear Código QR</DialogTitle>
                <DialogDescription>
                    Apunta la cámara al código QR del activo. La cámara permanecerá activa para escaneos rápidos.
                </DialogDescription>
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

    