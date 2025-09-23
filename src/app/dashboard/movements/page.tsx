
"use client";

import { useState, Suspense, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dynamic from "next/dynamic";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Loader2, QrCode, ArrowRight } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { movementSchema, type MovementFormData, type Asset, type Customer, type Event, type MovementEventType } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { logAppEvent } from "@/lib/logging";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";

const QrScanner = dynamic(() => import('@/components/qr-scanner').then(mod => mod.QrScanner), {
  ssr: false,
  loading: () => <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>,
});

// Helper types and data
type ActionLogic = {
    primary: MovementEventType;
    manualOverrides: MovementEventType[];
    description: string;
    requiresCustomerSelection: boolean;
    requiresVariety?: boolean;
    autoFillsCustomer?: 'fromDelivery' | 'fromLastKnown';
};

const stateLogic: Record<Asset['location'], Partial<Record<Asset['state'], ActionLogic>>> = {
    EN_PLANTA: {
        LLENO: {
            primary: 'SALIDA_A_REPARTO',
            manualOverrides: ['DEVOLUCION'],
            description: "El activo está lleno en planta, listo para ser despachado.",
            requiresCustomerSelection: true,
            requiresVariety: true,
        },
        VACIO: {
            primary: 'SALIDA_A_REPARTO', // This is now the default action
            manualOverrides: ['SALIDA_VACIO'],
            description: "El activo se llenará y saldrá a reparto. Para un préstamo, usa la anulación manual.",
            requiresCustomerSelection: true,
            requiresVariety: true,
        }
    },
    EN_REPARTO: {
        LLENO: {
            primary: 'ENTREGA_A_CLIENTE',
            manualOverrides: ['RECEPCION_EN_PLANTA'],
            description: "El activo está en camino. Confirma la entrega al cliente.",
            requiresCustomerSelection: false,
            autoFillsCustomer: 'fromDelivery'
        },
        VACIO: {
            primary: 'RECEPCION_EN_PLANTA',
            manualOverrides: ['ENTREGA_A_CLIENTE'],
            description: "El activo vacío está volviendo. Confirma su recepción en planta.",
            requiresCustomerSelection: false,
            autoFillsCustomer: 'fromLastKnown'
        }
    },
    EN_CLIENTE: {
        LLENO: {
            primary: 'RECOLECCION_DE_CLIENTE',
            manualOverrides: ['DEVOLUCION'],
            description: "El activo está en el cliente. Se registrará su recolección.",
            requiresCustomerSelection: false,
            autoFillsCustomer: 'fromLastKnown'
        },
        VACIO: {
            primary: 'RECOLECCION_DE_CLIENTE',
            manualOverrides: [],
            description: "El activo vacío está en el cliente. Se registrará su recolección.",
            requiresCustomerSelection: false,
            autoFillsCustomer: 'fromLastKnown'
        }
    }
};

const getEventTypeTranslation = (eventType: MovementEventType): string => {
    const translations: Record<MovementEventType, string> = {
        SALIDA_A_REPARTO: "Salida a Reparto",
        ENTREGA_A_CLIENTE: "Entrega a Cliente",
        RECOLECCION_DE_CLIENTE: "Recolección de Cliente",
        RECEPCION_EN_PLANTA: "Recepción en Planta",
        SALIDA_VACIO: "Préstamo (Salida Vacío)",
        DEVOLUCION: "Devolución (Lleno)",
    };
    return translations[eventType];
};


export default function MovementsPage() {
  const { toast } = useToast();
  const [user] = useAuthState(auth());
  const [assets, setAssets] = useState<Asset[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pendingDeliveryEvents, setPendingDeliveryEvents] = useState<Event[]>([]);
  const [lastEvents, setLastEvents] = useState<Map<string, Event>>(new Map());

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setScannerOpen] = useState(false);
  
  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);
  const [actionLogic, setActionLogic] = useState<ActionLogic | null>(null);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  const form = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: { variety: "" },
  });
  
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { collection, query, where, orderBy, getDocs } = await import("firebase/firestore/lite");
      const firestore = db();
      const assetsQuery = query(collection(firestore, "assets"), orderBy("code"));
      const customersQuery = query(collection(firestore, "customers"), orderBy("name"));
      const eventsQuery = query(collection(firestore, "events"), orderBy("timestamp", "desc"));

      const [assetsSnapshot, customersSnapshot, eventsSnapshot] = await Promise.all([
        getDocs(assetsQuery),
        getDocs(customersQuery),
        getDocs(eventsQuery),
      ]);

      const assetsData = assetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
      const customersData = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      const eventsData = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));

      // Events for assets currently on delivery
      const deliveryEvents = eventsData.filter(e => e.event_type === "SALIDA_A_REPARTO");
      
      // A map of the last known event for every asset
      const lastEventsMap = new Map<string, Event>();
      eventsData.forEach(event => {
        if (!lastEventsMap.has(event.asset_id)) {
            lastEventsMap.set(event.asset_id, event);
        }
      });

      setAssets(assetsData);
      setCustomers(customersData);
      setPendingDeliveryEvents(deliveryEvents);
      setLastEvents(lastEventsMap);

    } catch (error: any) {
      console.error("Error fetching data for movements page: ", error);
      logAppEvent({ level: 'ERROR', message: 'Failed to fetch data', component: 'MovementsPage', stack: error.stack });
      toast({ title: "Error de Carga", description: "No se pudieron cargar los datos.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    setBaseUrl(window.location.origin);
    fetchData();
  }, [fetchData]);
  
  const resetMovementState = () => {
    setScannedAsset(null);
    setActionLogic(null);
    setIsManualOverride(false);
    form.reset();
  };

  const handleScanSuccess = async (decodedText: string) => {
    setScannerOpen(false);

    // Check if it's a URL and extract the ID, otherwise use the text as is.
    let assetId = decodedText;
    if (decodedText.includes('/asset/')) {
        const urlParts = decodedText.split('/asset/');
        assetId = urlParts[urlParts.length - 1];
    }
    
    // Simple validation for Firestore-like ID
    if (!/^[a-zA-Z0-9]{20}$/.test(assetId)) {
        toast({ title: "Código QR Inválido", description: "El QR no contiene un identificador válido.", variant: "destructive" });
        return;
    }
    
    const asset = assets.find(a => a.id === assetId);

    if (!asset) {
        toast({ title: "Activo No Encontrado", description: "El activo escaneado no existe.", variant: "destructive" });
        return;
    }

    const logic = stateLogic[asset.location]?.[asset.state];

    if (!logic) {
        toast({ title: "Movimiento No Definido", description: `No hay una acción lógica para un activo ${asset.state} que está ${asset.location}.`, variant: "destructive", duration: 6000 });
        return;
    }
    
    setScannedAsset(asset);
    setActionLogic(logic);
    form.setValue('asset_id', asset.id);
    form.setValue('event_type', logic.primary);

    // Autofill customer if logic dictates
    if (logic.autoFillsCustomer) {
        let eventToUse: Event | undefined;
        if (logic.autoFillsCustomer === 'fromDelivery') {
            eventToUse = pendingDeliveryEvents.find(e => e.asset_id === asset.id);
        } else { // fromLastKnown
            eventToUse = lastEvents.get(asset.id);
        }
        if (eventToUse) {
            form.setValue('customer_id', eventToUse.customer_id);
        }
    }
  };

  const handleScanError = (errorMessage: string) => {
    if (typeof errorMessage === 'string' && (errorMessage.toLowerCase().includes("notfoundexception") || errorMessage.toLowerCase().includes("insufficient"))) return;
    console.error("QR Scan Error:", errorMessage);
  };
  
  const customerForMovement = useMemo(() => {
    const customerId = form.watch('customer_id');
    return customers.find(c => c.id === customerId);
  }, [form, customers]);

  async function onSubmit(data: MovementFormData) {
    setIsSubmitting(true);
    const { Timestamp, doc, runTransaction, collection } = await import("firebase/firestore/lite");
    const firestore = db();

    if (!user || !scannedAsset) {
       toast({ title: "Error", description: "Falta información del usuario o del activo.", variant: "destructive" });
       setIsSubmitting(false);
       return;
    }
    
    const selectedCustomer = customers.find(c => c.id === data.customer_id);
     if (actionLogic?.requiresCustomerSelection && !selectedCustomer) {
      toast({ title: "Error", description: "Cliente no encontrado o no seleccionado.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    let newLocation: Asset['location'] = scannedAsset.location;
    let newState: Asset['state'] = scannedAsset.state;

    switch (data.event_type) {
      case 'SALIDA_A_REPARTO': newLocation = 'EN_REPARTO'; newState = 'LLENO'; break;
      case 'ENTREGA_A_CLIENTE': newLocation = 'EN_CLIENTE'; newState = 'LLENO'; break;
      case 'SALIDA_VACIO': newLocation = 'EN_CLIENTE'; newState = 'VACIO'; break;
      case 'RECOLECCION_DE_CLIENTE': newLocation = 'EN_REPARTO'; newState = 'VACIO'; break;
      case 'RECEPCION_EN_PLANTA': newLocation = 'EN_PLANTA'; newState = 'VACIO'; break;
      case 'DEVOLUCION': newLocation = 'EN_PLANTA'; newState = 'LLENO'; break;
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const customerId = selectedCustomer ? selectedCustomer.id : lastEvents.get(scannedAsset.id)?.customer_id || '';
        const customerName = selectedCustomer ? selectedCustomer.name : lastEvents.get(scannedAsset.id)?.customer_name || 'N/A';
        
        if (!customerId) {
            throw new Error("No se pudo determinar el cliente para este movimiento.");
        }

        const eventData = { asset_id: scannedAsset.id, asset_code: scannedAsset.code, customer_id: customerId, customer_name: customerName, event_type: data.event_type, timestamp: Timestamp.now(), user_id: user.uid, variety: data.variety || "" };
        const newEventRef = doc(collection(firestore, "events"));
        transaction.set(newEventRef, eventData);

        const assetRef = doc(firestore, "assets", scannedAsset.id);
        transaction.update(assetRef, { location: newLocation, state: newState });
      });

      toast({ title: "Movimiento Registrado", description: `El activo ${scannedAsset.code} ha sido actualizado.` });
      resetMovementState();
      await fetchData();

    } catch (e: any) {
      console.error("La transacción falló: ", e);
      logAppEvent({ level: 'ERROR', message: 'Transaction failed', component: 'MovementsPage-onSubmit', stack: e.stack });
      toast({ title: "Error", description: e.message || "No se pudo completar la transacción.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const currentEventType = form.watch('event_type');
  const showVarietyField = scannedAsset?.type === 'BARRIL' && (currentEventType === 'SALIDA_A_REPARTO' || currentEventType === 'DEVOLUCION');
  const requiresCustomerSelection = isManualOverride 
      ? (
          currentEventType === 'SALIDA_A_REPARTO' || 
          currentEventType === 'SALIDA_VACIO' ||
          currentEventType === 'DEVOLUCION'
        )
      : actionLogic?.requiresCustomerSelection;


  return (
    <div className="flex flex-1 flex-col">
       <Dialog open={isScannerOpen} onOpenChange={setScannerOpen}>
        <PageHeader title="Registrar Movimiento" description="Escanea un código QR para empezar." />
            <main className="flex-1 p-4 pt-0 md:p-6 md:pt-0">
            {isLoading ? (
                <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center gap-8 text-center">
                    <p className="text-lg text-muted-foreground max-w-md">
                        Pulsa el botón para activar la cámara de tu dispositivo y escanear el código QR del activo que deseas mover.
                    </p>
                    <DialogTrigger asChild>
                        <Button size="lg" className="h-24 w-full max-w-xs text-xl" onClick={() => setScannerOpen(true)}>
                            <QrCode className="mr-4 h-10 w-10" />
                            Escanear QR
                        </Button>
                    </DialogTrigger>
                </div>
            )}
            </main>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Escanear Código QR</DialogTitle>
                    <DialogDescription>Apunta la cámara al código QR del activo.</DialogDescription>
                </DialogHeader>
                <Suspense fallback={<div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                  <QrScanner onScanSuccess={handleScanSuccess} onScanError={handleScanError} isScannerOpen={isScannerOpen} />
                </Suspense>
            </DialogContent>
        </Dialog>

        <Dialog open={!!scannedAsset} onOpenChange={(open) => !open && resetMovementState()}>
            <DialogContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <DialogHeader>
                            <DialogTitle>Registrar Movimiento</DialogTitle>
                            <DialogDescription>Confirma la acción para el activo <span className="font-bold">{scannedAsset?.code}</span>.</DialogDescription>
                        </DialogHeader>
                        
                        <div className="my-4 space-y-4">
                           <Alert>
                                <AlertTitle className="flex items-center gap-2">
                                    <span className="font-normal">{scannedAsset?.location.replace('_', ' ')} ({scannedAsset?.state})</span>
                                    <ArrowRight className="h-4 w-4" />
                                    <span>{getEventTypeTranslation(currentEventType)}</span>
                                </AlertTitle>
                                <AlertDescription>
                                    {actionLogic?.description}
                                </AlertDescription>
                            </Alert>
                            
                            {isManualOverride && actionLogic?.manualOverrides.length ? (
                                <FormField
                                    control={form.control}
                                    name="event_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Acción Manual</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value={actionLogic.primary}>{getEventTypeTranslation(actionLogic.primary)} (Sugerido)</SelectItem>
                                                    {actionLogic.manualOverrides.map(type => (
                                                        <SelectItem key={type} value={type}>{getEventTypeTranslation(type)}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ) : null}

                            {requiresCustomerSelection && (
                                <FormField
                                    control={form.control}
                                    name="customer_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cliente</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || ''} disabled={!!actionLogic?.autoFillsCustomer && !isManualOverride}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un cliente" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {customers.map(customer => (<SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                             {customerForMovement && !requiresCustomerSelection && (
                                <div>
                                    <Label>Cliente</Label>
                                    <Input value={customerForMovement.name} disabled />
                                </div>
                            )}

                            {showVarietyField && (
                                <FormField
                                    control={form.control}
                                    name="variety"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Variedad de Cerveza</FormLabel>
                                        <FormControl><Input placeholder="ej., IPA, Stout, Lager" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex">
                           {actionLogic?.manualOverrides.length && !isManualOverride ? (
                                <Button type="button" variant="ghost" onClick={() => setIsManualOverride(true)}>Realizar otra acción</Button>
                           ) : <div />}
                           <div className="flex col-start-2 gap-2">
                                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Confirmar
                                </Button>
                           </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    </div>
  );
}
