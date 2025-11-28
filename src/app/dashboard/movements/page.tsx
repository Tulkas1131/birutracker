
"use client";

import { useState, Suspense, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dynamic from "next/dynamic";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Loader2, QrCode, ArrowRight, AlertTriangle, Route as RouteIcon, Pencil, X, Calendar as CalendarIcon, User, PlusCircle, Printer, FileText, History, Trash2 } from "lucide-react";
import { differenceInDays, format } from 'date-fns';
import { renderToStaticMarkup } from 'react-dom/server';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { movementSchema, type MovementFormData, type Asset, type Customer, type Event, type MovementEventType, type Route, type RouteStop, UserData } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { logAppEvent } from "@/lib/logging";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useUserRole } from "@/hooks/use-user-role";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/logo";

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

// --- Sub-components for better readability ---

const FillDateInfo = ({ fillDate }: { fillDate: Date | undefined }) => {
    if (!fillDate) return null;

    const daysOld = differenceInDays(new Date(), fillDate);
    let colorClass = 'text-muted-foreground';
    if (daysOld >= 14) {
      colorClass = 'text-destructive';
    } else if (daysOld >= 7) {
      colorClass = 'text-amber-600 dark:text-amber-500';
    }

    return (
      <div className={cn("flex items-center gap-1.5 text-xs mt-1", colorClass)}>
        <CalendarIcon className="h-3 w-3" />
        <span>Llenado: {format(fillDate, 'dd/MM/yyyy')}</span>
      </div>
    );
};

const AssetRow = ({ asset, fillDatesMap }: { asset: Asset; fillDatesMap: Map<string, Date> }) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 p-2 rounded-md">
        <div className="flex-1 font-normal">
            <div className="flex flex-col">
                <span className="font-sans">
                    {asset.code}
                    <span className="text-muted-foreground ml-2">
                        ({asset.format}{asset.variety && asset.type === 'BARRIL' ? ` - ${asset.variety}` : ''})
                    </span>
                </span>
                <FillDateInfo fillDate={fillDatesMap.get(asset.id)} />
            </div>
        </div>
    </div>
);

const PrintRouteSheet = ({ route, usersMap }: { route: Route | null, usersMap: Map<string, UserData> }) => {
    if (!route) return null;
    
    const createdByUser = usersMap.get(route.createdBy);
    return (
        <html>
            <head>
                <title>Hoja de Ruta</title>
                <style>{`
                    body { 
                        font-family: Calibri, sans-serif;
                        margin: 2rem;
                    }
                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        border-bottom: 2px solid black;
                        padding-bottom: 1rem;
                        margin-bottom: 2rem;
                    }
                    .header h1 {
                        font-size: 2rem;
                        font-weight: bold;
                        margin: 0;
                    }
                    .header-details {
                        text-align: right;
                        font-size: 0.9rem;
                    }
                    .header-details p {
                        margin: 0;
                    }
                    .customer-section {
                        page-break-inside: avoid;
                        margin-bottom: 2rem;
                        border: 1px solid #ccc;
                        padding: 1rem;
                        border-radius: 8px;
                    }
                    .customer-header h2 {
                        font-size: 1.5rem;
                        font-weight: bold;
                        margin: 0;
                    }
                    .customer-header p {
                        font-size: 1rem;
                        color: #555;
                        margin: 0.25rem 0 0 0;
                    }
                    .assets-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 1rem;
                    }
                    .assets-table th, .assets-table td {
                        border: 1px solid #ddd;
                        padding: 8px;
                        text-align: left;
                    }
                    .assets-table th {
                        background-color: #f2f2f2;
                        font-weight: bold;
                    }
                `}</style>
            </head>
            <body>
                <header className="header">
                    <h1>Hoja de Ruta Cerveceria Pukalan</h1>
                    <div className="header-details">
                        <p><strong>Fecha:</strong> {format(route.createdAt.toDate(), 'dd/MM/yyyy HH:mm')}</p>
                        <p><strong>Ruta ID:</strong> {route.id}</p>
                        <p><strong>Generado por:</strong> {createdByUser?.email || route.createdBy}</p>
                    </div>
                </header>
                <main>
                    {route.stops.map((stop, index) => (
                        <div key={stop.customerId} className="customer-section">
                            <div className="customer-header">
                                <h2>{index + 1}. {stop.customerName}</h2>
                                {stop.customerAddress && <p>{stop.customerAddress}</p>}
                            </div>
                            <table className="assets-table">
                                <thead>
                                    <tr>
                                        <th>Código</th>
                                        <th>Formato</th>
                                        <th>Variedad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stop.assets.map(asset => (
                                        <tr key={asset.id}>
                                            <td>{asset.code}</td>
                                            <td>{asset.format}</td>
                                            <td>{asset.variety || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </main>
            </body>
        </html>
    );
};


// --- Main Page Component ---

export default function MovementsPage() {
  const { toast } = useToast();
  const [user] = useAuthState(auth());
  const userRole = useUserRole();
  
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setScannerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("rutas");
  
  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);
  const [actionLogic, setActionLogic] = useState<ActionLogic | null>(null);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);

  // Route creation state
  const [isRouteDialogOpen, setIsRouteDialogOpen] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  
  const form = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: { variety: "", valveType: "", customer_id: "INTERNAL" },
  });
  
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { collection, query, orderBy, getDocs } = await import("firebase/firestore/lite");
      const firestore = db();
      const assetsQuery = query(collection(firestore, "assets"));
      const customersQuery = query(collection(firestore, "customers"), orderBy("name"));
      const eventsQuery = query(collection(firestore, "events"), orderBy("timestamp", "desc"));
      const routesQuery = query(collection(firestore, "routes"), orderBy("createdAt", "desc"));
      const usersQuery = query(collection(firestore, "users"));

      const [assetsSnapshot, customersSnapshot, eventsSnapshot, routesSnapshot, usersSnapshot] = await Promise.all([
        getDocs(assetsQuery),
        getDocs(customersQuery),
        getDocs(eventsQuery),
        getDocs(routesQuery),
        getDocs(usersQuery)
      ]);

      const assetsData = assetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
      const customersData = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      const eventsData = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      const routesData = routesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Route));
      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));
      
      setAllAssets(assetsData);
      setEvents(eventsData);
      setCustomers(customersData);
      setRoutes(routesData);
      setUsers(usersData);
      
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
  
  const lastEventsMap = useMemo(() => {
    const map = new Map<string, Event>();
    for (const event of events) {
      if (!map.has(event.asset_id)) {
        map.set(event.asset_id, event);
      }
    }
    return map;
  }, [events]);

  const assetsMap = useMemo(() => new Map(allAssets.map(asset => [asset.id, asset])), [allAssets]);

  const assetsInActiveRoutes = useMemo(() => {
    const assetIdsInActiveRoutes = new Set<string>();

    routes.forEach(route => {
        // Skip the route being edited
        if (editingRouteId && route.id === editingRouteId) {
            return;
        }
        
        let isRouteActive = false;
        for (const stop of route.stops) {
            for (const assetInStop of stop.assets) {
                const fullAsset = assetsMap.get(assetInStop.id);
                // A route is considered "active" if at least one of its assets is still 'EN_REPARTO' and 'LLENO'.
                // This indicates it hasn't been delivered yet.
                if (fullAsset && fullAsset.location === 'EN_REPARTO' && fullAsset.state === 'LLENO') {
                    isRouteActive = true;
                    break;
                }
            }
            if (isRouteActive) break;
        }

        if (isRouteActive) {
            route.stops.forEach(stop => {
                stop.assets.forEach(asset => {
                    assetIdsInActiveRoutes.add(asset.id);
                });
            });
        }
    });
    return assetIdsInActiveRoutes;
}, [routes, assetsMap, editingRouteId]);


  const assetsOnDelivery = useMemo(() => {
    return allAssets.filter(asset => 
        asset.location === 'EN_REPARTO' && asset.state === 'LLENO' && !assetsInActiveRoutes.has(asset.id)
    );
  }, [allAssets, assetsInActiveRoutes]);

  const fillDatesMap = useMemo(() => {
    const map = new Map<string, Date>();
    const lastFillEvents = new Map<string, Event>();
    
    events.filter(e => e.event_type === 'LLENADO_EN_PLANTA').forEach(event => {
        if (!lastFillEvents.has(event.asset_id) || event.timestamp.toMillis() > lastFillEvents.get(event.asset_id)!.timestamp.toMillis()) {
            lastFillEvents.set(event.asset_id, event);
        }
    });

    for (const asset of allAssets) {
        const lastFillEvent = lastFillEvents.get(asset.id);
        if (lastFillEvent) {
            map.set(asset.id, lastFillEvent.timestamp.toDate());
        }
    }
    return map;
  }, [allAssets, events]);
  
  const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c])), [customers]);
  const usersMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  const groupedAssetsOnDelivery = useMemo(() => {
    const groups = new Map<string, Asset[]>();
    for (const asset of assetsOnDelivery) {
         const lastEvent = lastEventsMap.get(asset.id);
         if (lastEvent && lastEvent.event_type === 'SALIDA_A_REPARTO') {
             const customerId = lastEvent.customer_id;
             if (!groups.has(customerId)) {
                groups.set(customerId, []);
            }
            groups.get(customerId)!.push(asset);
         }
    }
    return Array.from(groups.entries()).sort((a, b) => (customerMap.get(a[0])?.name || '').localeCompare(customerMap.get(b[0])?.name || ''));
  }, [assetsOnDelivery, lastEventsMap, customerMap]);

  
  const resetMovementState = () => {
    setScannedAsset(null);
    setActionLogic(null);
    setIsManualOverride(false);
    setShowCorrectionDialog(false);
    form.reset({ variety: "", valveType: "", customer_id: "INTERNAL" });
  };

  const handleScanSuccess = async (decodedText: string) => {
    setScannerOpen(false);
    
    if (!/^[a-zA-Z0-9]{20}$/.test(decodedText)) {
        toast({ title: "Código QR Inválido", description: "El QR no contiene un identificador válido.", variant: "destructive" });
        return;
    }
    
    let asset: Asset | undefined = allAssets.find(a => a.id === decodedText);

    if (!asset) {
        const { getDoc, doc } = await import("firebase/firestore/lite");
        const firestore = db();
        const assetRef = doc(firestore, "assets", decodedText);
        const assetSnap = await getDoc(assetRef);

        if (!assetSnap.exists()) {
            toast({ title: "Activo No Encontrado", description: "El activo escaneado no existe.", variant: "destructive" });
            return;
        }
        asset = { id: assetSnap.id, ...assetSnap.data() } as Asset;
    }

    let logic: ActionLogic | undefined | null = JSON.parse(JSON.stringify(stateLogic[asset.location]?.[asset.state]));

    if (!logic) {
        toast({ title: "Movimiento No Definido", description: `No hay una acción lógica para un activo ${asset.state} que está ${asset.location.replace('_', ' ')}. Considera realizar una acción manual.`, variant: "destructive", duration: 8000 });
        logic = {
            primary: 'SALIDA_A_REPARTO',
            manualOverrides: ['SALIDA_A_REPARTO', 'RECEPCION_EN_PLANTA', 'DEVOLUCION', 'SALIDA_VACIO', 'LLENADO_EN_PLANTA'],
            description: "El estado actual del activo no tiene una acción sugerida. Por favor, selecciona una acción manual.",
            requiresCustomerSelection: true,
        };
        setIsManualOverride(true); 
    }
    
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
    
    if (logic.autoFillsCustomer) {
        const eventToUse: Event | undefined = lastEventsMap.get(asset.id);
        if (eventToUse) {
            form.setValue('customer_id', eventToUse.customer_id);
        }
    } else if (!logic.requiresCustomerSelection) {
        form.setValue('customer_id', 'INTERNAL'); 
    } else {
        form.resetField('customer_id'); 
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
        if (scannedAsset.state === 'VACIO') newState = 'LLENO';
        newLocation = 'EN_REPARTO';
        newVariety = data.variety || newVariety;
        newValveType = data.valveType || newValveType;
        break;
      case 'DEVOLUCION':
        newLocation = 'EN_PLANTA';
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

  const handleCustomerSelect = (customerId: string, isSelected: boolean) => {
    setSelectedCustomers(prev => {
        const newSet = new Set(prev);
        if (isSelected) {
            newSet.add(customerId);
        } else {
            newSet.delete(customerId);
        }
        return newSet;
    });
  };

 const openPrintWindow = (route: Route) => {
    const printContent = renderToStaticMarkup(<PrintRouteSheet route={route} usersMap={usersMap} />);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500); 
    } else {
        toast({
            title: "Error de Impresión",
            description: "El navegador bloqueó la apertura de la ventana de impresión. Por favor, permite las ventanas emergentes para este sitio.",
            variant: "destructive",
        });
    }
  };

  const handleGenerateRoute = async () => {
    const { collection, addDoc, doc, setDoc, Timestamp } = await import("firebase/firestore/lite");
    const firestore = db();
    if (selectedCustomers.size === 0) {
        toast({ title: "Error", description: "Debes seleccionar al menos un cliente.", variant: "destructive" });
        return;
    }

    if (!user) {
        toast({ title: "Error", description: "No se pudo identificar al usuario creador.", variant: "destructive" });
        return;
    }
    
    // Refresh assets on delivery to include any assets from the route being edited
    const originalAssetsForEditedRoute = editingRouteId ? routes.find(r => r.id === editingRouteId)?.stops.flatMap(s => s.assets) || [] : [];

    const stops: RouteStop[] = [...groupedAssetsOnDelivery, ...originalAssetsForEditedRoute.reduce((acc, asset) => {
        const lastEvent = lastEventsMap.get(asset.id);
        if (lastEvent) {
             const customerId = lastEvent.customer_id;
             if (!acc.has(customerId)) acc.set(customerId, []);
             // This is a simplified asset, need to get full asset details
             const fullAsset = allAssets.find(a => a.id === asset.id);
             if (fullAsset) acc.get(customerId)!.push(fullAsset);
        }
        return acc;
    }, new Map<string, Asset[]>())]
        .filter(([customerId]) => selectedCustomers.has(customerId))
        .map(([customerId, assets]) => {
            const customer = customerMap.get(customerId);
            return {
                customerId,
                customerName: customer?.name || 'Desconocido',
                customerAddress: customer?.address || '',
                assets: assets.map(a => ({ id: a.id, code: a.code, format: a.format, variety: a.variety })),
            }
        });
    
    try {
        let finalRoute: Route;
        if (editingRouteId) {
            const routeRef = doc(firestore, "routes", editingRouteId);
            await setDoc(routeRef, { stops }, { merge: true });
            const updatedRoute = routes.find(r => r.id === editingRouteId);
            if (updatedRoute) {
                finalRoute = {...updatedRoute, stops};
                toast({ title: "Ruta Actualizada", description: "La hoja de ruta ha sido actualizada." });
            } else {
                 throw new Error("No se pudo encontrar la ruta para actualizar localmente.");
            }
        } else {
            const newRouteData: Omit<Route, 'id'> = {
                createdAt: Timestamp.now(),
                createdBy: user.uid,
                stops,
            };
            const routeRef = await addDoc(collection(firestore, "routes"), newRouteData);
            finalRoute = { id: routeRef.id, ...newRouteData };
            toast({ title: "Ruta Generada", description: "La hoja de ruta ha sido creada y guardada." });
        }
        
        setIsRouteDialogOpen(false);
        await fetchData();

        openPrintWindow(finalRoute);

    } catch (error: any) {
        console.error("Error generating route: ", error);
        logAppEvent({ level: 'ERROR', message: 'Failed to generate route', component: 'MovementsPage-handleGenerateRoute', stack: error.stack });
        toast({ title: "Error", description: "No se pudo generar la hoja de ruta.", variant: "destructive" });
    } finally {
        setSelectedCustomers(new Set());
        setEditingRouteId(null);
    }
  };
  
  const handleEditRoute = (route: Route) => {
    setEditingRouteId(route.id);
    const customerIds = new Set(route.stops.map(stop => stop.customerId));
    setSelectedCustomers(customerIds);
    setIsRouteDialogOpen(true);
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (userRole !== 'Admin' || !user) {
        toast({ title: "Acceso Denegado", description: "No tienes permiso para eliminar rutas.", variant: "destructive" });
        return;
    }
    const { doc, deleteDoc } = await import("firebase/firestore/lite");
    const firestore = db();
    try {
        await deleteDoc(doc(firestore, "routes", routeId));
        setRoutes(prev => prev.filter(route => route.id !== routeId));
        toast({ title: "Ruta Eliminada", description: "La hoja de ruta ha sido eliminada." });
        logAppEvent({
            level: 'INFO',
            message: `Admin user deleted route with ID: ${routeId}`,
            component: 'MovementsPage-handleDeleteRoute',
            userEmail: user.email || 'unknown',
        });
    } catch (error: any) {
        console.error("Error deleting route: ", error);
        logAppEvent({
            level: 'ERROR',
            message: `Failed to delete route ${routeId}`,
            component: 'MovementsPage-handleDeleteRoute',
            stack: error.stack,
            userEmail: user.email || 'unknown',
        });
        toast({ title: "Error", description: "No se pudo eliminar la ruta.", variant: "destructive" });
    }
  };
  
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

  const getAssetsForEditedRoute = () => {
    if (!editingRouteId) return [];
    const route = routes.find(r => r.id === editingRouteId);
    if (!route) return [];
    
    const assetDetails: [string, Asset[]][] = route.stops.map(stop => {
        const assetsInStop = stop.assets
            .map(asset => allAssets.find(a => a.id === asset.id))
            .filter((a): a is Asset => !!a);
        return [stop.customerId, assetsInStop];
    });
    return assetDetails;
  };
  
  const combinedAssetsForDialog = useMemo(() => {
    const combined = new Map<string, Asset[]>();

    // Add assets currently on delivery and not in other routes
    groupedAssetsOnDelivery.forEach(([customerId, assets]) => {
        combined.set(customerId, [...(combined.get(customerId) || []), ...assets]);
    });
    
    // If editing, add assets from the route being edited
    if (editingRouteId) {
        const assetsFromEditedRoute = getAssetsForEditedRoute();
        assetsFromEditedRoute.forEach(([customerId, assets]) => {
            const existing = combined.get(customerId) || [];
            const newAssets = assets.filter(a => !existing.some(e => e.id === a.id));
            combined.set(customerId, [...existing, ...newAssets]);
        });
    }

    return Array.from(combined.entries()).sort((a, b) => (customerMap.get(a[0])?.name || '').localeCompare(customerMap.get(b[0])?.name || ''));
  }, [groupedAssetsOnDelivery, editingRouteId, routes, allAssets, customerMap]);


  return (
    <>
      <div className="flex flex-1 flex-col">
        <PageHeader title="Registrar Movimiento" description="Escanea un QR para una acción rápida o gestiona las rutas de despacho." />
        <main className="flex-1 p-4 pt-0 md:p-6 md:pt-0 space-y-8">
            <div className="no-print">
                <Card>
                    <CardHeader>
                        <CardTitle>Movimiento Individual</CardTitle>
                        <CardDescription>Activa la cámara para escanear un activo y registrar una acción rápida.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!isScannerOpen ? (
                            <Button size="lg" className="w-full max-w-xs text-lg" onClick={() => setScannerOpen(true)}>
                                <QrCode className="mr-4 h-8 w-8" />
                                Escanear QR
                            </Button>
                        ) : (
                            <div>
                                <QrScanner onScanSuccess={handleScanSuccess} onScanError={handleScanError} />
                                <Button variant="outline" className="mt-4 w-full max-w-xs" onClick={() => setScannerOpen(false)}>
                                    <X className="mr-2 h-4 w-4" />
                                    Cerrar Escáner
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Gestión de Rutas</CardTitle>
                         <CardDescription>Crea, edita y consulta las hojas de ruta para los despachos a clientes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="rutas">Rutas</TabsTrigger>
                                <TabsTrigger value="historial">Historial de Rutas</TabsTrigger>
                            </TabsList>
                            <TabsContent value="rutas">
                                <Card className="border-none shadow-none">
                                    <CardContent className="pt-6">
                                    <Dialog open={isRouteDialogOpen} onOpenChange={(isOpen) => {
                                        setIsRouteDialogOpen(isOpen);
                                        if (!isOpen) {
                                            setEditingRouteId(null);
                                            setSelectedCustomers(new Set());
                                        }
                                    }}>
                                            <DialogTrigger asChild>
                                                <Button size="lg" onClick={() => setIsRouteDialogOpen(true)}>
                                                    <PlusCircle className="mr-2 h-5 w-5" />
                                                    Crear Hoja de Ruta
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-2xl">
                                                <DialogHeader>
                                                    <DialogTitle>{editingRouteId ? 'Editar Hoja de Ruta' : 'Crear Hoja de Ruta'}</DialogTitle>
                                                    <DialogDescription>
                                                        Selecciona los clientes que formarán parte de la ruta de despacho. Solo se muestran los que tienen activos en tránsito.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="py-4 max-h-[60vh] overflow-y-auto">
                                                    {combinedAssetsForDialog.length > 0 ? (
                                                        <div className="space-y-4">
                                                            {combinedAssetsForDialog.map(([customerId, customerAssets]) => (
                                                                <Card key={customerId} className={cn("transition-colors", selectedCustomers.has(customerId) && "border-primary ring-2 ring-primary")}>
                                                                    <CardHeader className="p-4 flex flex-row items-center gap-4 cursor-pointer" onClick={() => handleCustomerSelect(customerId, !selectedCustomers.has(customerId))}>
                                                                        <Checkbox
                                                                            id={`customer-${customerId}`}
                                                                            checked={selectedCustomers.has(customerId)}
                                                                            onCheckedChange={(checked) => handleCustomerSelect(customerId, !!checked)}
                                                                            className="h-5 w-5"
                                                                        />
                                                                        <div className="flex-1">
                                                                            <Label htmlFor={`customer-${customerId}`} className="text-base flex items-center gap-2 cursor-pointer">
                                                                                <User className="h-5 w-5" />
                                                                                {customerMap.get(customerId)?.name || 'Cliente desconocido'}
                                                                            </Label>
                                                                        </div>
                                                                    </CardHeader>
                                                                    <CardContent className="p-4 pt-0 space-y-2">
                                                                        {customerAssets.sort((a,b) => a.code.localeCompare(b.code)).map(asset => (
                                                                            <AssetRow key={asset.id} asset={asset} fillDatesMap={fillDatesMap} />
                                                                        ))}
                                                                    </CardContent>
                                                                </Card>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <EmptyState
                                                            icon={<RouteIcon className="h-16 w-16" />}
                                                            title="No hay activos disponibles para rutas"
                                                            description="Actualmente no hay ningún activo en tránsito que no esté ya asignado a otra ruta."
                                                        />
                                                    )}
                                                </div>
                                                <DialogFooter>
                                                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                                                    <Button onClick={handleGenerateRoute} disabled={selectedCustomers.size === 0}>
                                                        <FileText className="mr-2 h-4 w-4" />
                                                        {editingRouteId ? 'Actualizar y Guardar' : 'Crear y Guardar'}
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                    </Dialog>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="historial">
                                <Card className="border-none shadow-none">
                                    <CardContent className="pt-6">
                                    {isLoading ? (
                                            <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
                                    ) : routes.length === 0 ? (
                                            <EmptyState icon={<History className="h-16 w-16" />} title="No hay rutas guardadas" description="Crea tu primera hoja de ruta desde la pestaña de Rutas." />
                                    ) : (
                                            <div className="space-y-2">
                                            {routes.map(route => (
                                                <div key={route.id} className="flex items-center justify-between rounded-md border p-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold">Ruta del {format(route.createdAt.toDate(), 'dd/MM/yyyy HH:mm')}</span>
                                                        <span className="text-sm text-muted-foreground">{route.stops.length} parada(s)</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button variant="outline" size="sm" onClick={() => openPrintWindow(route)}>
                                                            <Printer className="mr-2 h-4 w-4" />
                                                            Reimprimir
                                                        </Button>
                                                        {userRole === 'Admin' && (
                                                            <>
                                                                <Button variant="outline" size="sm" onClick={() => handleEditRoute(route)}>
                                                                    <Pencil className="mr-2 h-4 w-4" />
                                                                    Editar
                                                                </Button>
                                                                <Button variant="destructive" size="icon" onClick={() => handleDeleteRoute(route.id)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            </div>
                                    )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
            
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
        </main>
      </div>
    </>
  );
}

    