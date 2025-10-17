
"use client";

import { useState, Suspense, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dynamic from "next/dynamic";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Loader2, QrCode, ArrowRight, AlertTriangle } from "lucide-react";

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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
    requiresValveType?: boolean;
    autoFillsCustomer?: 'fromDelivery' | 'fromLastKnown';
};

const stateLogic: Record<Asset['location'], Partial<Record<Asset['state'], ActionLogic>>> = {
    EN_PLANTA: {
        LLENO: {
            primary: 'SALIDA_A_REPARTO',
            manualOverrides: ['DEVOLUCION'],
            description: "El activo está lleno en planta, listo para ser despachado.",
            requiresCustomerSelection: true,
        },
        VACIO: {
            primary: 'LLENADO_EN_PLANTA',
            manualOverrides: ['SALIDA_VACIO'],
            description: "El activo está vacío. Registra el llenado o una salida en préstamo.",
            requiresCustomerSelection: false,
            requiresVariety: true,
            requiresValveType: true,
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
        LLENADO_EN_PLANTA: "Llenar Activo",
        SALIDA_A_REPARTO: "Salida a Reparto",
        ENTREGA_A_CLIENTE: "Entrega a Cliente",
        RECOLECCION_DE_CLIENTE: "Recolección de Cliente",
        RECEPCION_EN_PLANTA: "Recepción en Planta",
        SALIDA_VACIO: "Préstamo (Salida Vacío)",
        DEVOLUCION: "Devolución (Lleno)",
    };
    return translations[eventType] || eventType;
};


export default function MovementsPage() {
  const { toast } = useToast();
  const [user] = useAuthState(auth());
  const [assets, setAssets] = useState<Asset[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [lastEvents, setLastEvents] = useState<Map<string, Event>>(new Map());

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setScannerOpen] = useState(false);
  
  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);
  const [actionLogic, setActionLogic] = useState<ActionLogic | null>(null);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);

  const form = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: { variety: "", valveType: "", customer_id: "INTERNAL" }, // Default customer for internal ops
  });
  
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { collection, query, orderBy, getDocs } = await import("firebase/firestore/lite");
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

      // A map of the last known event for every asset
      const lastEventsMap = new Map<string, Event>();
      eventsData.forEach(event => {
        if (!lastEventsMap.has(event.asset_id)) {
            lastEventsMap.set(event.asset_id, event);
        }
      });

      setAssets(assetsData);
      setCustomers(customersData);
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
    fetchData();
  }, [fetchData]);
  
  const resetMovementState = () => {
    setScannedAsset(null);
    setActionLogic(null);
    setIsManualOverride(false);
    setShowCorrectionDialog(false);
    form.reset({ variety: "", valveType: "", customer_id: "INTERNAL" });
  };

  const handleScanSuccess = async (decodedText: string) => {
    setScannerOpen(false);
    
    // Simple validation for Firestore-like ID
    if (!/^[a-zA-Z0-9]{20}$/.test(decodedText)) {
        toast({ title: "Código QR Inválido", description: "El QR no contiene un identificador válido.", variant: "destructive" });
        return;
    }
    
    const asset = assets.find(a => a.id === decodedText);

    if (!asset) {
        toast({ title: "Activo No Encontrado", description: "El activo escaneado no existe.", variant: "destructive" });
        return;
    }

    let logic: ActionLogic | undefined | null = JSON.parse(JSON.stringify(stateLogic[asset.location]?.[asset.state]));

    if (!logic) {
        toast({ title: "Movimiento No Definido", description: `No hay una acción lógica para un activo ${asset.state} que está ${asset.location.replace('_', ' ')}. Considera realizar una acción manual.`, variant: "destructive", duration: 8000 });
        logic = {
            primary: 'SALIDA_A_REPARTO', // A neutral default
            manualOverrides: ['SALIDA_A_REPARTO', 'RECEPCION_EN_PLANTA', 'DEVOLUCION', 'SALIDA_VACIO', 'LLENADO_EN_PLANTA'],
            description: "El estado actual del activo no tiene una acción sugerida. Por favor, selecciona una acción manual.",
            requiresCustomerSelection: true,
        };
        setIsManualOverride(true); 
    }
    
    // --- CO2 Specific Logic ---
    if (asset.type === 'CO2') {
        logic.manualOverrides = logic.manualOverrides.filter(o => o !== 'SALIDA_VACIO');
        logic.requiresVariety = false;
        logic.requiresValveType = false;

        if (asset.state === 'VACIO' && asset.location === 'EN_PLANTA') {
            logic.primary = 'LLENADO_EN_PLANTA';
            logic.manualOverrides = ['RECEPCION_EN_PLANTA', 'DEVOLUCION'];
        }

        if (asset.state === 'LLENO' && asset.location === 'EN_PLANTA') {
            logic.manualOverrides.push('LLENADO_EN_PLANTA');
        }
    }


    setScannedAsset(asset);
    setActionLogic(logic);
    form.setValue('asset_id', asset.id);
    form.setValue('event_type', logic.primary);

    // Autofill customer if logic dictates
    if (logic.autoFillsCustomer) {
        const eventToUse: Event | undefined = lastEvents.get(asset.id);
        
        if (eventToUse) {
            form.setValue('customer_id', eventToUse.customer_id);
        }
    } else if (!logic.requiresCustomerSelection) {
        form.setValue('customer_id', 'INTERNAL'); // default for internal ops
    } else {
        form.resetField('customer_id'); // Clear customer if selection is required
    }
  };

  const handleScanError = (errorMessage: string) => {
    if (typeof errorMessage === 'string' && (errorMessage.toLowerCase().includes("notfoundexception") || errorMessage.toLowerCase().includes("insufficient"))) return;
    console.error("QR Scan Error:", errorMessage);
  };
  
  const customerId = form.watch('customer_id');
  const customerForMovement = useMemo(() => {
    return customers.find(c => c.id === customerId);
  }, [customerId, customers]);

  async function onSubmit(data: MovementFormData) {
    if (scannedAsset?.type === 'CO2' && scannedAsset.state === 'VACIO' && data.event_type === 'SALIDA_A_REPARTO') {
        setShowCorrectionDialog(true);
        return;
    }
    
    await executeMovementTransaction(data);
  }

  const handleCorrectionAndSubmit = async () => {
      setShowCorrectionDialog(false);
      const formData = form.getValues();
      await executeMovementTransaction(formData, true);
  };

  async function executeMovementTransaction(data: MovementFormData, forceStateCorrection = false) {
    setIsSubmitting(true);
    const { Timestamp, doc, runTransaction, collection } = await import("firebase/firestore/lite");
    const firestore = db();

    if (!user || !scannedAsset) {
       toast({ title: "Error", description: "Falta información del usuario o del activo.", variant: "destructive" });
       setIsSubmitting(false);
       return;
    }
    
    const selectedCustomer = customers.find(c => c.id === data.customer_id);
    
    if (requiresCustomerSelection && (!data.customer_id || data.customer_id === 'INTERNAL')) {
      form.setError("customer_id", { type: "manual", message: "Debes seleccionar un cliente." });
      toast({ title: "Error de Validación", description: "Debes seleccionar un cliente para esta acción.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    let newLocation: Asset['location'] = scannedAsset.location;
    let newState: Asset['state'] = forceStateCorrection ? 'LLENO' : scannedAsset.state;
    let newVariety = scannedAsset.variety;
    let newValveType = scannedAsset.valveType;

    switch (data.event_type) {
      case 'LLENADO_EN_PLANTA': 
        newState = 'LLENO'; 
        newVariety = data.variety; 
        newValveType = data.valveType;
        break;
      case 'SALIDA_A_REPARTO':
      case 'DEVOLUCION':
        if (scannedAsset.state === 'VACIO') newState = 'LLENO';
        newLocation = data.event_type === 'SALIDA_A_REPARTO' ? 'EN_REPARTO' : 'EN_PLANTA';
        newVariety = data.variety || newVariety;
        newValveType = data.valveType || newValveType;
        break;
      case 'RECOLECCION_DE_CLIENTE':
      case 'RECEPCION_EN_PLANTA':
        newState = 'VACIO';
        newLocation = data.event_type === 'RECOLECCION_DE_CLIENTE' ? 'EN_REPARTO' : 'EN_PLANTA';
        newVariety = ''; 
        newValveType = '';
        break;
      case 'ENTREGA_A_CLIENTE': 
        newLocation = 'EN_CLIENTE'; 
        break;
      case 'SALIDA_VACIO': 
        newLocation = 'EN_CLIENTE'; 
        newState = 'VACIO'; 
        newVariety = ''; 
        newValveType = '';
        break;
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const customerId = selectedCustomer?.id || 'INTERNAL';
        const customerName = selectedCustomer?.name || 'Planta';
        
        const eventData: Omit<Event, 'id'> = { 
            asset_id: scannedAsset.id, 
            asset_code: scannedAsset.code, 
            customer_id: customerId, 
            customer_name: customerName,
            event_type: data.event_type, 
            timestamp: Timestamp.now(), 
            user_id: user.uid, 
            variety: data.variety || "",
            valveType: data.valveType || "",
        };
        const newEventRef = doc(collection(firestore, "events"));
        transaction.set(newEventRef, eventData);

        const assetRef = doc(firestore, "assets", scannedAsset.id);
        transaction.update(assetRef, { 
            location: newLocation, 
            state: newState, 
            variety: newVariety || "", 
            valveType: newValveType || "" 
        });
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

  const showVarietyField = useMemo(() => {
    if (scannedAsset?.type !== 'BARRIL') return false;
    const varietyEvents: MovementEventType[] = ['LLENADO_EN_PLANTA', 'DEVOLUCION', 'SALIDA_A_REPARTO'];
    return varietyEvents.includes(currentEventType);
  }, [scannedAsset, currentEventType]);

  const showValveTypeField = useMemo(() => {
    if (scannedAsset?.type !== 'BARRIL') return false;
    const valveEvents: MovementEventType[] = ['LLENADO_EN_PLANTA', 'DEVOLUCION', 'SALIDA_A_REPARTO'];
    return valveEvents.includes(currentEventType);
  }, [scannedAsset, currentEventType]);

  const requiresCustomerSelection = useMemo(() => {
    const customerEvents: MovementEventType[] = ['SALIDA_A_REPARTO', 'SALIDA_VACIO', 'DEVOLUCION', 'ENTREGA_A_CLIENTE'];
    return customerEvents.includes(currentEventType);
  }, [currentEventType]);

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
                <QrScanner onScanSuccess={handleScanSuccess} onScanError={handleScanError} isScannerOpen={isScannerOpen} />
            </DialogContent>
        </Dialog>

        <Dialog open={!!scannedAsset && !showCorrectionDialog} onOpenChange={(open) => !open && resetMovementState()}>
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
                            
                            {actionLogic?.manualOverrides && actionLogic.manualOverrides.length > 0 && isManualOverride && (
                                <FormField
                                    control={form.control}
                                    name="event_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Acción Manual</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una acción..."/></SelectTrigger></FormControl>
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
                            )}

                            {requiresCustomerSelection ? (
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
                            ) : customerForMovement && customerForMovement.name !== 'Planta' ? (
                                <div>
                                    <Label>Cliente Asignado</Label>
                                    <Input value={customerForMovement.name} disabled />
                                </div>
                            ) : null}

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
                            
                             {showValveTypeField && (
                                <FormField
                                    control={form.control}
                                    name="valveType"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo de Válvula</FormLabel>
                                        <FormControl><Input placeholder="ej., A, G" {...field} maxLength={1} style={{ textTransform: 'uppercase' }} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex">
                           {actionLogic?.manualOverrides && actionLogic.manualOverrides.length > 0 && !isManualOverride ? (
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
        
        <AlertDialog open={showCorrectionDialog} onOpenChange={setShowCorrectionDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-6 w-6 text-yellow-500" />
                        Confirmación Requerida
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Este cilindro de CO₂ figura como VACÍO. Para enviarlo a un cliente, su estado debe ser LLENO.
                        <br/><br/>
                        ¿Confirmas que el activo está físicamente lleno y deseas corregir su estado para continuar?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={resetMovementState}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCorrectionAndSubmit}>
                        Corregir y Continuar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
