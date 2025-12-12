
"use client";

import { useState, useEffect, useCallback } from "react";
import { MoreHorizontal, PlusCircle, Loader2, QrCode, Printer, PackagePlus, ChevronLeft, ChevronRight, PackageSearch, X, User, Filter } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import dynamic from "next/dynamic";
import { collection, onSnapshot, doc, getDoc, deleteDoc, runTransaction, Timestamp, writeBatch, type DocumentData, type QueryDocumentSnapshot, query, where, orderBy, getDocs, limit, startAfter, getCountFromServer } from "firebase/firestore";

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
import type { Asset, AssetBatchFormData } from "@/lib/types";
import { AssetForm } from "@/components/asset-form";
import { AssetBatchForm } from "@/components/asset-batch-form";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { logAppEvent } from "@/lib/logging";
import { useIsMobile } from "@/hooks/use-mobile";
import { Logo } from "@/components/logo";
import { EmptyState } from "@/components/empty-state";
import { useAuthState } from "react-firebase-hooks/auth";
import { cn } from "@/lib/utils";


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

const AssetCustomerInfo = ({ customerName }: { customerName: string | null | undefined }) => {
    if (!customerName) return null;

    return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <User className="h-3 w-3" />
            <span>{customerName}</span>
        </div>
    );
};


export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [isBatchFormOpen, setBatchFormOpen] = useState(false);
  const [isQrCodeOpen, setQrCodeOpen] = useState(false);
  const [isConfirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [activeTab, setActiveTab] = useState('50L');
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const [assetsToPrint, setAssetsToPrint] = useState<Asset[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [pageStartDocs, setPageStartDocs] = useState<Record<number, QueryDocumentSnapshot<DocumentData> | null>>({ 1: null });
  const [totalAssets, setTotalAssets] = useState(0);

  const [locationFilter, setLocationFilter] = useState<'ALL' | Asset['location']>('ALL');

  const { toast } = useToast();
  const userRole = useUserRole();
  const isMobile = useIsMobile();
  const [user] = useAuthState(auth);

  const activeAssetType = activeTab === 'co2' ? 'CO2' : 'BARRIL';
  const activeFormat = activeTab === 'co2' ? '9L' : activeTab;
  
 const fetchAssets = useCallback(async (
    page: number, 
    startDoc: QueryDocumentSnapshot<DocumentData> | null = null
) => {
    setIsLoading(true);
    try {
        const firestore = db;
        
        let conditions = [where("type", "==", activeAssetType)];
        if (activeAssetType === 'BARRIL') {
          conditions.push(where("format", "==", activeFormat));
        }
        if (locationFilter !== 'ALL') {
          conditions.push(where("location", "==", locationFilter));
        }
        
        const assetsCollection = collection(firestore, "assets");
        
        // Count total assets for the current filter set
        const totalQuery = query(assetsCollection, ...conditions);
        const countSnapshot = await getCountFromServer(totalQuery);
        setTotalAssets(countSnapshot.data().count);

        // Fetch paginated data
        let assetsQuery = query(totalQuery, orderBy("code"));
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

        if (error.code === 'resource-exhausted') {
            toast({
              title: "Límite de Firebase alcanzado",
              description: "Has superado la cuota de lecturas gratuitas por hoy. Los datos no se pueden cargar.",
              variant: "destructive",
              duration: 9000,
            });
        } else if (error.code === 'failed-precondition' || (error.message && error.message.includes('index'))) {
             toast({
              title: "Índice de Firestore Requerido",
              description: "Esta combinación de filtros necesita un índice. Por favor, crea el índice en la consola de Firebase para continuar.",
              variant: "destructive",
              duration: 9000,
            });
        } else {
             toast({
              title: "Error de Carga",
              description: `No se pudieron cargar los activos. Error: ${error.message}`,
              variant: "destructive",
              duration: 9000,
            });
        }
    } finally {
        setIsLoading(false);
    }
}, [activeAssetType, activeFormat, locationFilter, toast]);

  // Effect for when main tab changes
  useEffect(() => {
    setLocationFilter('ALL');
    setCurrentPage(1);
    setPageStartDocs({ 1: null });
    setLastVisible(null);
    // fetchAssets will be called by the effect below
  }, [activeTab]);
  
  // Effect for when filters or page change
  useEffect(() => {
      fetchAssets(currentPage, pageStartDocs[currentPage] || null);
  }, [locationFilter, currentPage, fetchAssets, pageStartDocs]);

  const goToPage = (page: number) => {
    if (page < 1 || (page > currentPage && !lastVisible)) return;
    setCurrentPage(page);
    // The effect above will handle the fetch
  };

  const handleLocationFilterChange = (newFilter: 'ALL' | Asset['location']) => {
    setLocationFilter(newFilter);
    setCurrentPage(1);
    setPageStartDocs({ 1: null });
    setLastVisible(null);
  }

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
            const firestore = db;
            let conditions = [where("type", "==", activeAssetType)];
            if (activeAssetType === 'BARRIL') {
              conditions.push(where("format", "==", activeFormat));
            }
            
            // Limit print to a reasonable number to avoid high read costs, e.g. 15
            const allAssetsQuery = query(collection(firestore, "assets"), ...conditions, orderBy("code"), limit(15));
            const allAssetsSnapshot = await getDocs(allAssetsQuery);
            listToPrint = allAssetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
        } catch(e: any) {
             if (e.code === 'resource-exhausted') {
                 toast({
                    title: "Límite de Firebase alcanzado",
                    description: "No se pueden cargar todos los activos para imprimir debido al límite de lecturas.",
                    variant: "destructive",
                    duration: 9000,
                 });
             } else {
                toast({
                    title: "Error de Impresión",
                    description: "No se pudieron cargar todos los activos para imprimir.",
                    variant: "destructive"
                });
             }
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
    const firestore = db;
    try {
      await deleteDoc(doc(firestore, "assets", assetToDelete.id));
      setAssets(prev => prev.filter(asset => asset.id !== assetToDelete.id));
      toast({
        title: "Activo Eliminado",
        description: `El activo ${assetToDelete.code} ha sido eliminado.`,
      });
      // Refetch current page after delete
      fetchAssets(currentPage, pageStartDocs[currentPage] || null);
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
    const firestore = db;
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
    const firestore = db;

    if (!user) {
        toast({ title: "Error", description: "No se ha podido identificar al usuario.", variant: "destructive"});
        return;
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const eventTimestamp = Timestamp.now();

        if (selectedAsset) {
            // --- Editing existing asset ---
            const assetRef = doc(firestore, "assets", selectedAsset.id);
            const assetDataToUpdate: Partial<Asset> = {
                state: data.state,
                location: data.location,
                variety: data.state === 'LLENO' ? data.variety || "" : "",
                valveType: data.state === 'LLENO' ? data.valveType || "" : "",
                lastMovementTimestamp: eventTimestamp,
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
                    timestamp: eventTimestamp,
                    user_id: user.uid,
                    variety: data.variety || "",
                    valveType: data.valveType || "",
                });
                assetDataToUpdate.currentCustomerId = "INTERNAL";
                assetDataToUpdate.currentCustomerName = "Planta";
            }

            transaction.update(assetRef, assetDataToUpdate);
            toast({ title: "Activo Actualizado", description: "Los cambios han sido guardados." });

        } else {
            // --- Creating new asset ---
            const { prefix, nextNumber } = await generateNextCode(data.type);
            const newCode = `${prefix}-${String(nextNumber).padStart(3, '0')}`;
            const newAssetData: Omit<Asset, 'id'> = { 
                ...data, 
                code: newCode, 
                state: 'VACIO' as const, 
                location: 'EN_PLANTA' as const, 
                variety: "", 
                valveType: "",
                currentCustomerId: "INTERNAL",
                currentCustomerName: "Planta",
                lastMovementTimestamp: eventTimestamp,
            };
            
            const newAssetRef = doc(collection(firestore, "assets"));
            transaction.set(newAssetRef, newAssetData);
            toast({ title: "Activo Creado", description: `El nuevo activo ha sido añadido con el código ${newCode}.` });
        }
      });
      
      setFormOpen(false);
      setSelectedAsset(undefined);
      fetchAssets(1, null);

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
    const firestore = db;
    try {
      const { prefix, nextNumber } = await generateNextCode(data.type);
      const batch = writeBatch(firestore);
      const eventTimestamp = Timestamp.now();
      
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
          currentCustomerId: "INTERNAL",
          currentCustomerName: "Planta",
          lastMovementTimestamp: eventTimestamp,
        };
        const newAssetRef = doc(collection(firestore, "assets"));
        batch.set(newAssetRef, newAssetData);
      }
      
      await batch.commit();
      fetchAssets(1, null);
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
  
  const totalPages = Math.ceil(totalAssets / ITEMS_PER_PAGE);

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
             <AssetCustomerInfo customerName={asset.currentCustomerName} />
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
                    <AssetCustomerInfo customerName={asset.currentCustomerName} />
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

  const StatusFilters = () => (
    <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button variant={locationFilter === 'ALL' ? 'default' : 'outline'} size="sm" onClick={() => handleLocationFilterChange('ALL')}>
            Todos
        </Button>
        <Button variant={locationFilter === 'EN_PLANTA' ? 'default' : 'outline'} size="sm" onClick={() => handleLocationFilterChange('EN_PLANTA')}>
            En Planta
        </Button>
        <Button variant={locationFilter === 'EN_REPARTO' ? 'default' : 'outline'} size="sm" onClick={() => handleLocationFilterChange('EN_REPARTO')}>
            En Reparto
        </Button>
        <Button variant={locationFilter === 'EN_CLIENTE' ? 'default' : 'outline'} size="sm" onClick={() => handleLocationFilterChange('EN_CLIENTE')}>
            En Cliente
        </Button>
    </div>
  )

  const AssetList = ({ assetList, typeName, format }: { assetList: Asset[], typeName: string, format: string }) => {
    return (
     <Card>
        <CardHeader className="hidden md:flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Activos: {format}</CardTitle>
            <CardDescription>
                {`Un listado de todos los activos de formato ${format} en tu inventario.`}
            </CardDescription>
          </div>
          <StatusFilters />
        </CardHeader>
        <div className="px-6 pt-4 md:hidden">
            <StatusFilters />
        </div>
        <CardContent className="p-0 md:p-6 md:pt-0">
          {isLoading ? (
             <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
          ) : assetList.length === 0 ? (
            <EmptyState 
                icon={<PackageSearch className="h-16 w-16" />}
                title={`No hay ${typeName} de ${format} aún`}
                description={`Crea tu primer activo para empezar a rastrear tu inventario de ${typeName}.`}
                action={
                    <DialogTrigger asChild>
                        <Button onClick={handleNew}>
                          <PlusCircle className="mr-2 h-5 w-5" />
                          Nuevo Activo
                        </Button>
                    </DialogTrigger>
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
              <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
                  <TabsList>
                    <TabsTrigger value="50L">Barriles 50L</TabsTrigger>
                    <TabsTrigger value="30L">Barriles 30L</TabsTrigger>
                    <TabsTrigger value="30L SLIM">Barriles 30L SLIM</TabsTrigger>
                    <TabsTrigger value="co2">CO2</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="50L">
                   <AssetList assetList={assets} typeName="barriles" format="50L" />
                </TabsContent>
                <TabsContent value="30L">
                   <AssetList assetList={assets} typeName="barriles" format="30L" />
                </TabsContent>
                <TabsContent value="30L SLIM">
                   <AssetList assetList={assets} typeName="barriles" format="30L SLIM" />
                </TabsContent>
                <TabsContent value="co2">
                   <AssetList assetList={assets} typeName="cilindros" format="CO2" />
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

