
"use client";

import { useState, useRef, useMemo, Suspense, useEffect } from "react";
import { MoreHorizontal, PlusCircle, Loader2, QrCode, Printer, PackagePlus, ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/firebase";
import dynamic from "next/dynamic";

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
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logAppEvent } from "@/lib/logging";
import { useIsMobile } from "@/hooks/use-mobile";
import { Logo } from "@/components/logo";

const QRCode = dynamic(() => import('qrcode.react'), {
  loading: () => <div className="flex h-[256px] w-[256px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>,
  ssr: false,
});

const ITEMS_PER_PAGE = 10;

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [isBatchFormOpen, setBatchFormOpen] = useState(false);
  const [isQrCodeOpen, setQrCodeOpen] = useState(false);
  const [isBatchQrOpen, setBatchQrOpen] = useState(false);
  const [isConfirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [activeTab, setActiveTab] = useState('barrels');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const { toast } = useToast();
  const userRole = useUserRole();
  const isMobile = useIsMobile();
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAssets = async () => {
      setIsLoading(true);
      try {
        const { collection, query, orderBy, getDocs } = await import("firebase/firestore/lite");
        const firestore = db();
        const assetsQuery = query(collection(firestore, "assets"), orderBy("code"));
        const assetsSnapshot = await getDocs(assetsQuery);
        const assetsData = assetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
        setAssets(assetsData);
      } catch (error: any) {
        console.error("Error fetching assets: ", error);
        logAppEvent({
            level: 'ERROR',
            message: 'Failed to fetch assets',
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
    };
    fetchAssets();
  }, [toast]);

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

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=800,width=1000');
    if (printWindow && printRef.current) {
        printWindow.document.write('<html><head><title>Imprimir QR</title>');
        // Link to the main stylesheet to get all styles, including print styles
        const styles = Array.from(document.styleSheets)
            .map(styleSheet => `<link rel="stylesheet" href="${styleSheet.href}">`)
            .join('');
        printWindow.document.write(styles);
        printWindow.document.write('</head><body class="bg-white">');
        printWindow.document.write(printRef.current.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        
        // Use a timeout to ensure styles are loaded before printing
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }
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
    const { doc, deleteDoc } = await import("firebase/firestore/lite");
    const firestore = db();
    try {
      await deleteDoc(doc(firestore, "assets", assetToDelete.id));
      setAssets(prev => prev.filter(asset => asset.id !== assetToDelete.id));
      toast({
        title: "Activo Eliminado",
        description: `El activo ${assetToDelete.code} ha sido eliminado.`,
      });
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
    const { collection, query, where, orderBy, limit, getDocs } = await import("firebase/firestore/lite");
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
    const { doc, updateDoc, addDoc, collection } = await import("firebase/firestore/lite");
    const firestore = db();
    try {
      if (selectedAsset) {
        // Editing existing asset - allow state, location, format, and type changes (only on unlocked assets)
        const assetDataToUpdate: Partial<Asset> = {
          state: data.state,
          location: data.location,
        };
        // Only allow changing format and type if asset is in plant
        if(selectedAsset.location === 'EN_PLANTA') {
            assetDataToUpdate.format = data.format;
            assetDataToUpdate.type = data.type;
        } else {
            toast({
                title: "Edición Limitada",
                description: "El tipo y formato solo se pueden editar si el activo está EN PLANTA.",
                variant: "default",
                duration: 6000,
            })
        }
        await updateDoc(doc(firestore, "assets", selectedAsset.id), assetDataToUpdate);
        setAssets(prev => prev.map(asset => asset.id === selectedAsset.id ? { ...asset, ...assetDataToUpdate } : asset));
        toast({
          title: "Activo Actualizado",
          description: "Los cambios han sido guardados.",
        });
      } else {
        // Creating new asset
        const { prefix, nextNumber } = await generateNextCode(data.type);
        const newCode = `${prefix}-${String(nextNumber).padStart(3, '0')}`;
        const newAssetData = { ...data, code: newCode, state: 'VACIO' as const, location: 'EN_PLANTA' as const };
        const newDocRef = await addDoc(collection(firestore, "assets"), newAssetData);
        setAssets(prev => [...prev, { id: newDocRef.id, ...newAssetData }]);
        toast({
          title: "Activo Creado",
          description: `El nuevo activo ha sido añadido con el código ${newCode}.`,
        });
      }
      setFormOpen(false);
      setSelectedAsset(undefined);
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
        description: "No se pudieron guardar los datos.",
        variant: "destructive",
      });
    }
  };

  const handleBatchFormSubmit = async (data: AssetBatchFormData) => {
    const { collection, writeBatch, doc } = await import("firebase/firestore/lite");
    const firestore = db();
    try {
      const { prefix, nextNumber } = await generateNextCode(data.type);
      const batch = writeBatch(firestore);
      const newAssets: Asset[] = [];
      
      for (let i = 0; i < data.quantity; i++) {
        const currentNumber = nextNumber + i;
        const newCode = `${prefix}-${String(currentNumber).padStart(3, '0')}`;
        const newAssetData = {
          type: data.type,
          format: data.format,
          code: newCode,
          state: 'VACIO' as const,
          location: 'EN_PLANTA' as const,
        };
        const newAssetRef = doc(collection(firestore, "assets"));
        batch.set(newAssetRef, newAssetData);
        newAssets.push({ id: newAssetRef.id, ...newAssetData });
      }
      
      await batch.commit();
      setAssets(prev => [...prev, ...newAssets]);
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
  
  const getLocationVariant = (location: Asset["location"]) => {
    switch (location) {
      case "EN_CLIENTE":
        return "outline";
      case "EN_PLANTA":
        return "secondary";
      case "EN_REPARTO":
        return "default";
      default:
        return "default";
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
  
  const barrels = assets.filter(asset => asset.type === 'BARRIL');
  const co2Cylinders = assets.filter(asset => asset.type === 'CO2');

  const assetCountsByFormat = useMemo(() => {
    const calculateCounts = (assetList: Asset[]) => {
      return assetList.reduce((acc, asset) => {
        if (!acc[asset.format]) {
          acc[asset.format] = { inPlant: 0, inCustomer: 0, inDelivery: 0 };
        }
        if (asset.location === 'EN_PLANTA') {
          acc[asset.format].inPlant++;
        } else if (asset.location === 'EN_CLIENTE') {
          acc[asset.format].inCustomer++;
        } else if (asset.location === 'EN_REPARTO') {
            acc[asset.format].inDelivery++;
        }
        return acc;
      }, {} as Record<string, { inPlant: number; inCustomer: number; inDelivery: number }>);
    };

    return {
      barrels: calculateCounts(barrels),
      co2: calculateCounts(co2Cylinders),
    };
  }, [barrels, co2Cylinders]);
  
  const assetsToPrint = activeTab === 'barrels' ? barrels : co2Cylinders;

  const currentAssetList = activeTab === 'barrels' ? barrels : co2Cylinders;
  const totalPages = Math.ceil(currentAssetList.length / ITEMS_PER_PAGE);
  const paginatedAssets = currentAssetList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
  };

  const AssetCardMobile = ({ asset }: { asset: Asset }) => (
    <div className="flex items-center justify-between rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-1">
        <span className="font-semibold">{asset.code}</span>
        <span className="text-sm text-muted-foreground">{asset.format}</span>
        <div className="flex items-center gap-2">
           <Badge variant={asset.state === 'LLENO' ? 'default' : 'secondary'}>
              {asset.state === 'LLENO' ? 'Lleno' : 'Vacío'}
            </Badge>
            <Badge variant={getLocationVariant(asset.location)}>
              {getLocationText(asset.location)}
            </Badge>
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
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              </TableCell>
            </TableRow>
          ) : assetList.length === 0 ? (
            <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                No hay activos. ¡Añade uno para empezar!
              </TableCell>
            </TableRow>
          ) : (
            assetList.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell className="font-medium">{asset.code}</TableCell>
                <TableCell>{asset.format}</TableCell>
                <TableCell>
                  <Badge variant={asset.state === 'LLENO' ? 'default' : 'secondary'}>
                    {asset.state === 'LLENO' ? 'Lleno' : 'Vacío'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getLocationVariant(asset.location)}>
                    {getLocationText(asset.location)}
                  </Badge>
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
            ))
          )}
        </TableBody>
      </Table>
  );

  const AssetList = ({ assetList, type }: { assetList: Asset[], type: 'BARRIL' | 'CO2' }) => (
     <Card>
        <CardHeader className="hidden md:flex">
          <CardTitle className="text-xl">{type === 'BARRIL' ? 'Barriles' : 'Cilindros de CO2'}</CardTitle>
          <CardDescription>
            Un listado de todos los activos de tipo {type === 'BARRIL' ? 'barril' : 'CO2'} en tu inventario.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 md:p-0">
          {isMobile ? (
              <div className="space-y-4 p-4">
                  {isLoading ? (
                    <div className="flex justify-center items-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : assetList.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground">
                       No hay activos. ¡Añade uno para empezar!
                    </div>
                  ) : (
                    assetList.map(asset => <AssetCardMobile key={asset.id} asset={asset} />)
                  )}
              </div>
          ) : (
             <AssetTableDesktop assetList={assetList} />
          )}
        </CardContent>
        {totalPages > 1 && (
          <CardFooter className="flex items-center justify-between py-4">
              <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
              </span>
              <div className="flex gap-2">
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                  >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                  </Button>
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                  >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                  </Button>
              </div>
          </CardFooter>
        )}
      </Card>
  );

  const CountsDisplay = ({ counts }: { counts: Record<string, { inPlant: number; inCustomer: number; inDelivery: number }> }) => (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
      {Object.entries(counts).map(([format, data]) => (
        <div key={format} className="flex items-center gap-2">
          <span className="font-semibold">{format}:</span>
          <span>En Planta: <Badge variant="secondary">{data.inPlant}</Badge></span>
          <span>En Cliente: <Badge variant="outline">{data.inCustomer}</Badge></span>
          <span>En Reparto: <Badge variant="default">{data.inDelivery}</Badge></span>
        </div>
      ))}
    </div>
  );

  const QrLabel = ({ asset }: { asset: Asset }) => {
    return (
      <div className="qr-label">
        <div className="qr-label__header">
          <Logo className="h-6 w-6 text-white" />
          <span className="qr-label__title">Tracked by BiruTracker</span>
        </div>
        <div className="qr-label__body">
          <div className="qr-label__qr-container">
            <QRCode value={asset.id} size={120} renderAs="svg" level="H" includeMargin={false} />
          </div>
          <div className="qr-label__info">
            <div className="qr-label__code">{asset.code}</div>
            <div className="qr-label__format">{asset.format} {asset.type === 'BARRIL' ? 'Barril' : 'CO2'}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-1 flex-col">
       {/* Hidden div for printing content */}
       <div className="print-only">
          <div ref={printRef}>
              {selectedAsset && (
                  <div className="print-sheet">
                      <QrLabel asset={selectedAsset} />
                  </div>
              )}
              {isBatchQrOpen && (
                  <div className="print-sheet">
                      {assetsToPrint.map(asset => <QrLabel key={asset.id} asset={asset} />)}
                  </div>
              )}
          </div>
       </div>

       <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
        <PageHeader
          title="Activos"
          description="Gestiona tus barriles de cerveza y cilindros de CO₂."
          action={
            <div className="flex flex-col sm:flex-row items-center gap-2">
                 <Button size="lg" variant="outline" onClick={() => setBatchQrOpen(true)} disabled={assetsToPrint.length === 0}>
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
                  <TabsTrigger value="barrels">Barriles ({barrels.length})</TabsTrigger>
                  <TabsTrigger value="co2">CO2 ({co2Cylinders.length})</TabsTrigger>
                </TabsList>
                {activeTab === 'barrels' && <CountsDisplay counts={assetCountsByFormat.barrels} />}
                {activeTab === 'co2' && <CountsDisplay counts={assetCountsByFormat.co2} />}
              </div>
              <TabsContent value="barrels">
                 <AssetList assetList={paginatedAssets} type="BARRIL" />
              </TabsContent>
              <TabsContent value="co2">
                 <AssetList assetList={paginatedAssets} type="CO2" />
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
              isLocked={selectedAsset?.location !== 'EN_PLANTA'}
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
            <Suspense fallback={<div className="flex h-[320px] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
              {selectedAsset && (
                  <div className="flex justify-center items-center p-4">
                      <QrLabel asset={selectedAsset} />
                  </div>
              )}
            </Suspense>
            <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
            </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={isBatchQrOpen} onOpenChange={setBatchQrOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Imprimir Lote de Códigos QR</DialogTitle>
                <DialogDescription>
                    Aquí están todos los códigos QR para la categoría seleccionada: {activeTab === 'barrels' ? 'Barriles' : 'CO2'}.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh] p-4">
              <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                <div className="grid grid-cols-2 gap-4">
                  {assetsToPrint.map(asset => (
                    <QrLabel key={asset.id} asset={asset} />
                  ))}
                </div>
              </Suspense>
            </ScrollArea>
            <Button onClick={handlePrint} className="mt-4">
              <Printer className="mr-2 h-5 w-5" />
              Imprimir Todos ({assetsToPrint.length})
            </Button>
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
  );
}
