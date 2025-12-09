
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { MoreHorizontal, PlusCircle, Loader2, QrCode, Printer, PackagePlus, ChevronLeft, ChevronRight, PackageSearch, X, User } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import dynamic from "next/dynamic";
import { collection, onSnapshot, doc, deleteDoc, runTransaction, Timestamp, writeBatch, type DocumentData, type QueryDocumentSnapshot, query, where, orderBy, getDocs, limit, startAfter, getCountFromServer } from "firebase/firestore";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import type { Asset, AssetBatchFormData, Event } from "@/lib/types";
import { AssetForm } from "@/components/asset-form";
import { AssetBatchForm } from "@/components/asset-batch-form";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { logAppEvent } from "@/lib/logging";
import { useIsMobile } from "@/hooks/use-mobile";
import { Logo } from "@/components/logo";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { useAuthState } from "react-firebase-hooks/auth";


const QRCode = dynamic(() => import('qrcode.react'), {
  loading: () => <div className="flex h-[128px] w-[128px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>,
  ssr: false,
});

const ITEMS_PER_PAGE = 10;

// Componente para visualización en la UI y para impresión
const QrLabel = ({ asset }: { asset: Asset }) => {
  return (
    <div className="qr-label">
      <div className="qr-label__header">
        <Logo className="h-5 w-5 text-white" />
        <span className="qr-label__title">Tracked by BiruTracker</span>
      </div>
      <div className="qr-label__body">
        <div className="qr-label__qr-container">
          <QRCode value={asset.id} size={100} renderAs="svg" level="H" includeMargin={false} className="h-full w-full" />
        </div>
        <div className="qr-label__code">{asset.code}</div>
        <div className="qr-label__format">{asset.format} {asset.type === 'BARRIL' ? 'Barril' : 'Cilindro CO2'}</div>
      </div>
    </div>
  );
};


export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [isBatchFormOpen, setBatchFormOpen] = useState(false);
  const [isQrCodeOpen, setQrCodeOpen] = useState(false);
  const [isConfirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [activeTab, setActiveTab] = useState('barrels');
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const [assetsToPrint, setAssetsToPrint] = useState<Asset[]>([]);
  
  const [locationFilter, setLocationFilter] = useState<Asset['location'] | null>(null);
  const [formatFilter, setFormatFilter] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [pageStartDocs, setPageStartDocs] = useState<Record<number, QueryDocumentSnapshot<DocumentData> | null>>({ 1: null });
  const [totalAssetsInFilter, setTotalAssetsInFilter] = useState(0);

  const { toast } = useToast();
  const userRole = useUserRole();
  const isMobile = useIsMobile();
  const [user] = useAuthState(auth);
  
  
  const fetchAssetsAndCounts = useCallback(async (
    page: number, 
    startDoc: QueryDocumentSnapshot<DocumentData> | null = null
) => {
    setIsLoading(true);
    try {
        const firestore = db();
        
        const assetType = activeTab === 'barrels' ? 'BARRIL' : 'CO2';
        
        let conditions = [where("type", "==", assetType)];
        if (locationFilter) conditions.push(where("location", "==", locationFilter));
        if (formatFilter) conditions.push(where("format", "==", formatFilter));
        
        const assetsCollection = collection(firestore, "assets");
        
        const countQuery = query(assetsCollection, ...conditions);
        const countSnapshot = await getCountFromServer(countQuery);
        setTotalAssetsInFilter(countSnapshot.data().count);

        let assetsQuery = query(assetsCollection, ...conditions, orderBy("code"));
        if (startDoc) {
            assetsQuery = query(assetsQuery, startAfter(startDoc));
        }
        assetsQuery = query(assetsQuery, limit(ITEMS_PER_PAGE));
        
        const assetsSnapshot = await getDocs(assetsQuery);
        const assetsData = assetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
        setAssets(assetsData);

        const newLastVisible = assetsSnapshot.docs[assetsSnapshot.docs.length - 1] || null;
        setLastVisible(newLastVisible);

        if (newLastVisible) {
          setPageStartDocs(prev => ({...prev, [page + 1]: newLastVisible }));
        }

    } catch (error: any) {
        console.error("Error fetching assets: ", error);
        logAppEvent({
            level: 'ERROR',
            message: 'Failed to fetch paginated assets',
            component: 'AssetsPage',
            stack: error.stack,
        });
        toast({
          title: "Error de Carga",
          description: "No se pudieron cargar los activos.",
          variant: "destructive"
        });
    } finally {
        setIsLoading(false);
    }
}, [activeTab, locationFilter, formatFilter, toast]);

  useEffect(() => {
    // Reset pagination and fetch data when filters or tab change
    setCurrentPage(1);
    setPageStartDocs({ 1: null });
    setLastVisible(null);
    fetchAssetsAndCounts(1, null);
  }, [activeTab, locationFilter, formatFilter, fetchAssetsAndCounts]);

  useEffect(() => {
     const firestore = db();
     
     // Only fetch all events once for the customer info logic
     const eventsQuery = query(collection(firestore, "events"), orderBy("timestamp", "desc"));
     const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
        const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
        setAllEvents(eventsData);
     }, (error: any) => {
        console.error("Error fetching events:", error);
        logAppEvent({ level: 'ERROR', message: 'Failed to fetch events snapshot', component: 'AssetsPage', stack: error.stack });
     });

     return () => {
        unsubscribeEvents();
     };
  }, []);

  const goToPage = (page: number) => {
    if (page < 1 || (page > currentPage && !lastVisible)) return;
    
    const startDoc = pageStartDocs[page] || null;
    setCurrentPage(page);
    fetchAssetsAndCounts(page, startDoc);
  };


  const lastEventsMap = useMemo(() => {
      const map = new Map<string, Event>();
      for (const event of allEvents) {
          if (!map.has(event.asset_id)) {
              map.set(event.asset_id, event);
          }
      }
      return map;
  }, [allEvents]);

  const handleEdit = (asset: Asset) => {
    setSelectedAsset(asset);
    setFormOpen(true);
  };
  
  const handleNew = () => {
    setSelectedAsset(undefined);
    setFormOpen(true);
  };
  
  const handleNewBatch = () => {
    setBatchFormOpen(true);
  };

  const handleShowQrCode = (asset: Asset) => {
    setSelectedAsset(asset);
    setQrCodeOpen(true);
  };

  const handlePrint = async (asset?: Asset) => {
    let listToPrint: Asset[] = [];
    if (asset) {
        listToPrint = [asset];
    } else {
        setIsLoading(true);
        try {
            const firestore = db();
            const assetType = activeTab === 'barrels' ? 'BARRIL' : 'CO2';
            const allAssetsQuery = query(collection(firestore, "assets"), where("type", "==", assetType), orderBy("code"));
            const allAssetsSnapshot = await getDocs(allAssetsQuery);
            listToPrint = allAssetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
        } catch(e) {
             toast({
                title: "Error de Impresión",
                description: "No se pudieron cargar todos los activos para imprimir.",
                variant: "destructive"
            });
            setIsLoading(false);
            return;
        }
        setIsLoading(false);
    }

    if (listToPrint.length === 0) {
        toast({
            title: "Nada para Imprimir",
            description: "No hay activos en la categoría seleccionada para imprimir.",
            variant: "default"
        });
        return;
    }
    
    setAssetsToPrint(listToPrint);

    setTimeout(() => {
        window.print();
    }, 100);
  };
  
  const confirmDelete = (asset: Asset) => {
    setAssetToDelete(asset);
    setConfirmDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!assetToDelete) return;

    if (userRole !== 'Admin') {
       toast({
        title: "Acceso Denegado",
        description: "No tienes permiso para eliminar activos.",
        variant: "destructive",
      });
      return;
    }
    const firestore = db();
    try {
      await deleteDoc(doc(firestore, "assets", assetToDelete.id));
      setAssets(prev => prev.filter(asset => asset.id !== assetToDelete.id));
      toast({
        title: "Activo Eliminado",
        description: `El activo ${assetToDelete.code} ha sido eliminado.`,
      });
      fetchAssetsAndCounts(currentPage, pageStartDocs[currentPage -1]);
    } catch (error: any) {
      console.error("Error eliminando activo: ", error);
      logAppEvent({
        level: 'ERROR',
        message: `Failed to delete asset ${assetToDelete.id}`,
        component: 'AssetsPage',
        stack: error.stack,
      });
      toast({
        title: "Error",
        description: "No se pudo eliminar el activo.",
        variant: "destructive",
      });
    } finally {
      setConfirmDeleteOpen(false);
      setAssetToDelete(null);
    }
  };

  const generateNextCode = async (type: 'BARRIL' | 'CO2'): Promise<{prefix: string, nextNumber: number}> => {
    const firestore = db();
    const prefix = type === 'BARRIL' ? 'KEG' : 'CO2';
    const q = query(
      collection(firestore, "assets"), 
      where("type", "==", type),
      orderBy("code", "desc"),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return { prefix, nextNumber: 1 };
    }
    
    const lastCode = querySnapshot.docs[0].data().code;
    const lastNumber = parseInt(lastCode.split('-')[1], 10);
    return { prefix, nextNumber: lastNumber + 1 };
  };
  
  const handleFormSubmit = async (data: Omit<Asset, 'id' | 'code'>) => {
    const firestore = db();

    if (!user) {
        toast({ title: "Error", description: "No se ha podido identificar al usuario.", variant: "destructive"});
        return;
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        if (selectedAsset) {
            // --- Editing existing asset ---
            const assetRef = doc(firestore, "assets", selectedAsset.id);
            const assetDataToUpdate: Partial<Asset> = {
                state: data.state,
                location: data.location,
                variety: data.state === 'LLENO' ? data.variety || "" : "",
                valveType: data.state === 'LLENO' ? data.valveType || "" : "",
            };

            if (selectedAsset.location === 'EN_PLANTA') {
                assetDataToUpdate.format = data.format;
                assetDataToUpdate.type = data.type;
            } else if (data.format !== selectedAsset.format || data.type !== selectedAsset.type) {
                 toast({
                    title: "Edición Limitada",
                    description: "El tipo y formato solo se pueden editar si el activo está EN PLANTA.",
                    variant: "default",
                    duration: 6000,
                });
            }

            if (data.state === 'LLENO' && selectedAsset.state === 'VACIO') {
                const newEventRef = doc(collection(firestore, "events"));
                transaction.set(newEventRef, {
                    asset_id: selectedAsset.id,
                    asset_code: selectedAsset.code,
                    customer_id: "INTERNAL",
                    customer_name: "Planta",
                    event_type: 'LLENADO_EN_PLANTA',
                    timestamp: Timestamp.now(),
                    user_id: user.uid,
                    variety: data.variety || "",
                    valveType: data.valveType || "",
                });
            }

            transaction.update(assetRef, assetDataToUpdate);
            toast({ title: "Activo Actualizado", description: "Los cambios han sido guardados." });

        } else {
            // --- Creating new asset ---
            const { prefix, nextNumber } = await generateNextCode(data.type);
            const newCode = `${prefix}-${String(nextNumber).padStart(3, '0')}`;
            const newAssetData = { ...data, code: newCode, state: 'VACIO' as const, location: 'EN_PLANTA' as const, variety: "", valveType: "" };
            
            const newAssetRef = doc(collection(firestore, "assets"));
            transaction.set(newAssetRef, newAssetData);
            toast({ title: "Activo Creado", description: `El nuevo activo ha sido añadido con el código ${newCode}.` });
        }
      });
      
      setFormOpen(false);
      setSelectedAsset(undefined);
      fetchAssetsAndCounts(1, null);

    } catch (error: any) {
      console.error("Error guardando activo: ", error);
      logAppEvent({
        level: 'ERROR',
        message: `Failed to save asset (editing: ${!!selectedAsset})`,
        component: 'AssetForm',
        stack: error.stack,
      });
      toast({
        title: "Error",
        description: "No se pudieron guardar los datos en una transacción.",
        variant: "destructive",
      });
    }
  };

  const handleBatchFormSubmit = async (data: AssetBatchFormData) => {
    const firestore = db();
    try {
      const { prefix, nextNumber } = await generateNextCode(data.type);
      const batch = writeBatch(firestore);
      
      for (let i = 0; i < data.quantity; i++) {
        const currentNumber = nextNumber + i;
        const newCode = `${prefix}-${String(currentNumber).padStart(3, '0')}`;
        const newAssetData = {
          type: data.type,
          format: data.format,
          code: newCode,
          state: 'VACIO' as const,
          location: 'EN_PLANTA' as const,
          variety: '',
          valveType: '',
        };
        const newAssetRef = doc(collection(firestore, "assets"));
        batch.set(newAssetRef, newAssetData);
      }
      
      await batch.commit();
      fetchAssetsAndCounts(1, null);
      toast({
        title: "Lote Creado Exitosamente",
        description: `Se han creado ${data.quantity} nuevos activos de tipo ${data.type}.`,
      });

      setBatchFormOpen(false);
    } catch (error: any) {
      console.error("Error creando lote de activos: ", error);
      logAppEvent({
        level: 'ERROR',
        message: 'Failed to create asset batch',
        component: 'AssetBatchForm',
        stack: error.stack,
      });
      toast({
        title: "Error",
        description: "No se pudo crear el lote de activos.",
        variant: "destructive",
      });
    }
  };
  
  const getLocationVariant = (location: Asset["location"]): "success" | "default" | "warning" => {
    switch (location) {
      case "EN_CLIENTE": return "warning";
      case "EN_PLANTA": return "success";
      case "EN_REPARTO": return "default";
      default: return "default";
    }
  };

  const getLocationText = (location: Asset["location"]) => {
    switch (location) {
        case "EN_CLIENTE": return "En Cliente";
        case "EN_PLANTA": return "En Planta";
        case "EN_REPARTO": return "En Reparto";
        default: return location;
    }
  };
  
  const assetCountsByFormat = useMemo(() => {
    const calculateCounts = (assetList: Asset[]) => {
      return assetList.reduce((acc, asset) => {
        if (!acc[asset.format]) {
          acc[asset.format] = { EN_PLANTA: 0, EN_CLIENTE: 0, EN_REPARTO: 0 };
        }
        if (asset.location in acc[asset.format]) {
           acc[asset.format][asset.location]++;
        }
        return acc;
      }, {} as Record<string, Record<Asset['location'], number>>);
    };

    return {
      barrels: calculateCounts(assets.filter(a => a.type === 'BARRIL')),
      co2: calculateCounts(assets.filter(a => a.type === 'CO2')),
    };
  }, [assets]);
  
  const totalPages = Math.ceil(totalAssetsInFilter / ITEMS_PER_PAGE);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setFormatFilter(null);
    setLocationFilter(null);
  };
  
  const handleFilterClick = (format: string, location: Asset['location']) => {
    setFormatFilter(format);
    setLocationFilter(location);
  };

  const clearFilters = () => {
    setFormatFilter(null);
    setLocationFilter(null);
  };

  const AssetCustomerInfo = ({ asset }: { asset: Asset }) => {
      const lastEvent = lastEventsMap.get(asset.id);
      if (lastEvent?.customer_name && lastEvent.customer_name !== 'Planta' && lastEvent.customer_name !== 'Proveedor') {
          const showForReparto = asset.location === 'EN_REPARTO' && lastEvent.event_type === 'SALIDA_A_REPARTO';
          const showForCliente = asset.location === 'EN_CLIENTE';
          if (showForReparto || showForCliente) {
              return (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <User className="h-3 w-3" />
                      <span>{lastEvent.customer_name}</span>
                  </div>
              );
          }
      }
      return null;
  };


  const AssetCardMobile = ({ asset }: { asset: Asset }) => (
    <div className="flex items-center justify-between rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-1">
        <span className="font-semibold">{asset.code}</span>
        <span className="text-sm text-muted-foreground">{asset.format}</span>
        <div className="flex items-center gap-2 flex-wrap">
           <Badge variant={asset.state === 'LLENO' ? 'default' : 'secondary'}>
              {asset.state === 'LLENO' ? 'Lleno' : 'Vacío'}
           </Badge>
           {asset.state === 'LLENO' && asset.type === 'BARRIL' && (asset.variety || asset.valveType) && (
             <div className="flex items-center gap-2">
                {asset.variety && <Badge variant="outline" className="font-mono">{asset.variety}</Badge>}
                {asset.valveType && <Badge variant="outline" className="font-mono">V: {asset.valveType}</Badge>}
             </div>
           )}
           <div className="flex flex-col items-start">
             <Badge variant={getLocationVariant(asset.location)}>
                {getLocationText(asset.location)}
             </Badge>
             <AssetCustomerInfo asset={asset} />
           </div>
        </div>
      </div>
       <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => handleShowQrCode(asset)}>
              <QrCode className="h-5 w-5" />
          </Button>
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button aria-haspopup="true" size="icon" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Toggle menu</span>
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => handleEdit(asset)}>Editar</DropdownMenuItem>
                  {userRole === 'Admin' && (
                      <DropdownMenuItem onSelect={() => confirmDelete(asset)} className="text-destructive">
                          Eliminar
                      </DropdownMenuItem>
                  )}
              </DropdownMenuContent>
          </DropdownMenu>
       </div>
    </div>
  );
  
  const AssetTableDesktop = ({ assetList }: { assetList: Asset[] }) => (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Formato</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Ubicación</TableHead>
            <TableHead>QR</TableHead>
            <TableHead>
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assetList.map((asset) => (
            <TableRow key={asset.id}>
              <TableCell className="font-medium">{asset.code}</TableCell>
              <TableCell>{asset.format}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1 items-start">
                  <Badge variant={asset.state === 'LLENO' ? 'default' : 'secondary'}>
                    {asset.state === 'LLENO' ? 'Lleno' : 'Vacío'}
                  </Badge>
                  {asset.state === 'LLENO' && asset.type === 'BARRIL' && (asset.variety || asset.valveType) && (
                    <div className="flex items-center gap-2">
                        {asset.variety && <Badge variant="outline" className="font-mono">{asset.variety}</Badge>}
                        {asset.valveType && <Badge variant="outline" className="font-mono">V: {asset.valveType}</Badge>}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                 <div className="flex flex-col items-start">
                    <Badge variant={getLocationVariant(asset.location)}>
                    {getLocationText(asset.location)}
                    </Badge>
                    <AssetCustomerInfo asset={asset} />
                </div>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => handleShowQrCode(asset)}>
                    <QrCode className="h-5 w-5" />
                </Button>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button aria-haspopup="true" size="icon" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => handleEdit(asset)}>Editar</DropdownMenuItem>
                    {userRole === 'Admin' && (
                        <DropdownMenuItem onSelect={() => confirmDelete(asset)} className="text-destructive">
                            Eliminar
                        </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
  );

  const AssetList = ({ assetList, type }: { assetList: Asset[], type: 'BARRIL' | 'CO2' }) => {
    const typeName = type === 'BARRIL' ? 'barriles' : 'cilindros';
    return (
     <Card>
        <CardHeader className="hidden md:flex">
          <CardTitle className="text-xl">{type === 'BARRIL' ? 'Barriles' : 'Cilindros de CO2'}</CardTitle>
          <CardDescription>
            {locationFilter && formatFilter 
                ? `Mostrando ${totalAssetsInFilter} activos de formato "${formatFilter}" en "${getLocationText(locationFilter as Asset['location'])}".`
                : `Un listado de todos los activos de tipo ${typeName} en tu inventario.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          {isLoading ? (
             <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
          ) : assetList.length === 0 ? (
            <EmptyState 
                icon={<PackageSearch className="h-16 w-16" />}
                title={locationFilter ? 'No hay activos para este filtro' : `No hay ${typeName} aún`}
                description={locationFilter ? 'Prueba a seleccionar otro filtro o límpialo para ver todos los activos.' : `Crea tu primer activo para empezar a rastrear tu inventario de ${typeName}.`}
                action={
                    locationFilter ? (
                         <Button onClick={clearFilters}>
                          <X className="mr-2 h-5 w-5" />
                          Limpiar Filtro
                        </Button>
                    ) : (
                        <DialogTrigger asChild>
                            <Button onClick={handleNew}>
                              <PlusCircle className="mr-2 h-5 w-5" />
                              Nuevo Activo
                            </Button>
                        </DialogTrigger>
                    )
                }
            />
          ) : isMobile ? (
              <div className="space-y-4 p-4">
                  {assetList.map(asset => <AssetCardMobile key={asset.id} asset={asset} />)}
              </div>
          ) : (
             <AssetTableDesktop assetList={assetList} />
          )}
        </CardContent>
        {totalPages > 1 && !isLoading && assetList.length > 0 && (
          <CardFooter className="flex items-center justify-between py-4">
              <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
              </span>
              <div className="flex gap-2">
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                  >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                  </Button>
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages || !lastVisible}
                  >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                  </Button>
              </div>
          </CardFooter>
        )}
      </Card>
    );
  };

  const CountsDisplay = ({ counts, onFilter }: { counts: Record<string, Record<Asset['location'], number>>, onFilter: (format: string, location: Asset['location']) => void }) => (
    <div className="flex flex-col gap-y-2 text-sm text-muted-foreground">
      {Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([format, data]) => (
        <div key={format} className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="font-semibold">{format}:</span>
          {(['EN_PLANTA', 'EN_CLIENTE', 'EN_REPARTO'] as Asset['location'][]).map(loc => (
            data[loc] > 0 && (
              <button key={loc} onClick={() => onFilter(format, loc)} className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", {
                  'bg-success/20 text-green-800 hover:bg-success/30 border-success/30 dark:text-green-300 dark:hover:bg-green-800/50 dark:border-green-800': loc === 'EN_PLANTA',
                  'bg-warning/20 text-amber-800 hover:bg-warning/30 border-warning/30 dark:text-amber-300 dark:hover:bg-amber-800/50 dark:border-amber-800': loc === 'EN_CLIENTE',
                  'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-secondary dark:hover:bg-slate-700': loc === 'EN_REPARTO',
                  'ring-2 ring-primary': locationFilter === loc && formatFilter === format
              })}>
                <span>{getLocationText(loc)}:</span>
                <span>{data[loc]}</span>
              </button>
            )
          ))}
        </div>
      ))}
    </div>
  );
  
  return (
    <>
      <div className="no-print">
        <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
          <PageHeader
            title="Activos"
            description="Gestiona tus barriles de cerveza y cilindros de CO₂."
            action={
              <div className="flex flex-col sm:flex-row items-center gap-2">
                   <Button size="lg" variant="outline" onClick={() => handlePrint()} disabled={isLoading}>
                      <Printer className="mr-2 h-5 w-5" />
                      Imprimir Lote de QR
                  </Button>
                  <Button size="lg" variant="outline" onClick={handleNewBatch}>
                      <PackagePlus className="mr-2 h-5 w-5" />
                      Crear Lote
                  </Button>
                  <DialogTrigger asChild>
                      <Button size="lg" onClick={handleNew}>
                          <PlusCircle className="mr-2 h-5 w-5" />
                          Nuevo Activo
                      </Button>
                  </DialogTrigger>
              </div>
            }
          />
          <main className="flex-1 p-4 pt-0 md:p-6 md:pt-0">
              <Tabs defaultValue={activeTab} onValueChange={handleTabChange}>
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
                  <TabsList>
                    <TabsTrigger value="barrels">Barriles</TabsTrigger>
                    <TabsTrigger value="co2">CO2</TabsTrigger>
                  </TabsList>
                  <div className="flex flex-col items-start sm:items-end gap-2">
                    {activeTab === 'barrels' && <CountsDisplay counts={assetCountsByFormat.barrels} onFilter={handleFilterClick} />}
                    {activeTab === 'co2' && <CountsDisplay counts={assetCountsByFormat.co2} onFilter={handleFilterClick} />}
                    {locationFilter && (
                       <Button variant="ghost" size="sm" onClick={clearFilters} className="text-destructive hover:text-destructive">
                            <X className="mr-2 h-4 w-4" />
                            Limpiar Filtro
                        </Button>
                    )}
                  </div>
                </div>
                <TabsContent value="barrels">
                   <AssetList assetList={assets} type="BARRIL" />
                </TabsContent>
                <TabsContent value="co2">
                   <AssetList assetList={assets} type="CO2" />
                </TabsContent>
              </Tabs>
          </main>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{selectedAsset ? "Editar Activo" : "Crear Nuevo Activo"}</DialogTitle>
                  <DialogDescription>
                      {selectedAsset ? "Modifica los detalles del activo existente." : "Completa el formulario para añadir un nuevo activo."}
                  </DialogDescription>
              </DialogHeader>
              <AssetForm
                key={selectedAsset?.id || 'new'}
                defaultValues={selectedAsset}
                onSubmit={handleFormSubmit}
                onCancel={() => {
                  setFormOpen(false);
                  setSelectedAsset(undefined);
                }}
                isLocked={!!selectedAsset && selectedAsset.location !== 'EN_PLANTA'}
              />
          </DialogContent>
        </Dialog>
        <Dialog open={isBatchFormOpen} onOpenChange={setBatchFormOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Crear Lote de Activos</DialogTitle>
                    <DialogDescription>
                        Genera múltiples activos con formato y tipo idénticos. Los códigos se asignarán automáticamente.
                    </DialogDescription>
                </DialogHeader>
                <AssetBatchForm
                  onSubmit={handleBatchFormSubmit}
                  onCancel={() => setBatchFormOpen(false)}
                />
            </DialogContent>
        </Dialog>
        <Dialog open={isQrCodeOpen} onOpenChange={setQrCodeOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Código QR del Activo</DialogTitle>
                  <DialogDescription>
                      Escanea este código para registrar movimientos rápidos. Puedes imprimirlo y pegarlo en el activo físico.
                  </DialogDescription>
              </DialogHeader>
              {selectedAsset && (
                  <div className="flex justify-center items-center p-4">
                      <QrLabel asset={selectedAsset} />
                  </div>
              )}
              <DialogFooter>
                  <Button variant="outline" onClick={() => selectedAsset && handlePrint(selectedAsset)}>
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir
                  </Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>
        <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción es permanente y no se puede deshacer. Se eliminará el activo con código
                <span className="font-bold"> {assetToDelete?.code}</span> de la base de datos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setAssetToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="print-only">
        <div className="print-sheet">
          {assetsToPrint.map(asset => (
            <div key={asset.id} className="print-item">
              <QrLabel asset={asset} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

    