
"use client";

import { useState, useEffect, useRef } from "react";
import { MoreHorizontal, PlusCircle, Loader2, QrCode, Printer, PackagePlus } from "lucide-react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, orderBy, limit, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import QRCode from "qrcode.react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import type { Asset, AssetBatchFormData } from "@/lib/types";
import { AssetForm } from "@/components/asset-form";
import { AssetBatchForm } from "@/components/asset-batch-form";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [isBatchFormOpen, setBatchFormOpen] = useState(false);
  const [isQrCodeOpen, setQrCodeOpen] = useState(false);
  const [isBatchQrOpen, setBatchQrOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('barrels');
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const { toast } = useToast();
  const userRole = useUserRole();
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const batchQrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const firestore = db();
    const q = query(collection(firestore, "assets"), orderBy("code"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const assetsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
      setAssets(assetsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching assets: ", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

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

  const handlePrint = (ref: React.RefObject<HTMLDivElement>) => {
    const printWindow = window.open('', '', 'height=800,width=1000');
    if (printWindow && ref.current) {
        printWindow.document.write('<html><head><title>Imprimir QR</title>');
        printWindow.document.write(`
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
            body { font-family: sans-serif; }
            .print-container {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
              gap: 40px 20px;
              padding: 20px;
            }
            .qr-item {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              page-break-inside: avoid;
            }
            .qr-item h1 {
              font-size: 1.5rem;
              margin: 8px 0 0 0;
            }
            .qr-item p {
              font-size: 1rem;
              margin: 4px 0 0 0;
            }
            .single-qr-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 1rem;
              padding: 1rem;
              height: 100vh;
            }
             .single-qr-container h1 { font-size: 2rem; }
             .single-qr-container p { font-size: 1.25rem; }
          </style>
        `);
        printWindow.document.write('</head><body>');
        printWindow.document.write(ref.current.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500); // Wait for content to render
    }
  };
  
  const handleDelete = async (id: string) => {
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
      await deleteDoc(doc(firestore, "assets", id));
      toast({
        title: "Activo Eliminado",
        description: "El activo ha sido eliminado de la base de datos.",
      });
    } catch (error) {
      console.error("Error eliminando activo: ", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el activo.",
        variant: "destructive",
      });
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
    try {
      if (selectedAsset) {
        // Editing existing asset
        const assetDataToUpdate: Partial<Asset> = {
          format: data.format,
          state: data.state,
          location: data.location,
        };
        await updateDoc(doc(firestore, "assets", selectedAsset.id), assetDataToUpdate);
        toast({
          title: "Activo Actualizado",
          description: "Los cambios han sido guardados.",
        });
      } else {
        // Creating new asset
        const { prefix, nextNumber } = await generateNextCode(data.type);
        const newCode = `${prefix}-${String(nextNumber).padStart(3, '0')}`;
        const newAssetData = { ...data, code: newCode };
        await addDoc(collection(firestore, "assets"), newAssetData);
        toast({
          title: "Activo Creado",
          description: `El nuevo activo ha sido añadido con el código ${newCode}.`,
        });
      }
      setFormOpen(false);
      setSelectedAsset(undefined);
    } catch (error) {
      console.error("Error guardando activo: ", error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los datos.",
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
        };
        const newAssetRef = doc(collection(firestore, "assets"));
        batch.set(newAssetRef, newAssetData);
      }
      
      await batch.commit();

      toast({
        title: "Lote Creado Exitosamente",
        description: `Se han creado ${data.quantity} nuevos activos de tipo ${data.type}.`,
      });

      setBatchFormOpen(false);
    } catch (error) {
      console.error("Error creando lote de activos: ", error);
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
      default:
        return "default";
    }
  };
  
  const barrels = assets.filter(asset => asset.type === 'BARRIL');
  const co2Cylinders = assets.filter(asset => asset.type === 'CO2');

  const assetsToPrint = activeTab === 'barrels' ? barrels : co2Cylinders;

  const AssetTable = ({ assetList }: { assetList: Asset[] }) => (
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
                  {asset.location === 'EN_PLANTA' ? 'En Planta' : 'En Cliente'}
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
                        <DropdownMenuItem onSelect={() => handleDelete(asset.id)} className="text-destructive">
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

  return (
    <div className="flex flex-1 flex-col">
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
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="barrels">Barriles ({barrels.length})</TabsTrigger>
                <TabsTrigger value="co2">CO2 ({co2Cylinders.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="barrels">
                <Card>
                  <CardContent className="p-0">
                    <AssetTable assetList={barrels} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="co2">
                <Card>
                  <CardContent className="p-0">
                    <AssetTable assetList={co2Cylinders} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
        </main>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{selectedAsset ? "Editar Activo" : "Crear Nuevo Activo"}</DialogTitle>
            </DialogHeader>
            <AssetForm
              defaultValues={selectedAsset}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setFormOpen(false);
                setSelectedAsset(undefined);
              }}
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
                <div ref={qrCodeRef} className="single-qr-container">
                    <QRCode value={selectedAsset.id} size={256} />
                    <h1>{selectedAsset.code}</h1>
                    <p>{selectedAsset.format} - {selectedAsset.type === 'BARRIL' ? 'Barril' : 'CO2'}</p>
                </div>
            )}
            <Button onClick={() => handlePrint(qrCodeRef)}>Imprimir QR</Button>
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
              <div ref={batchQrRef} className="print-container">
                {assetsToPrint.map(asset => (
                  <div key={asset.id} className="qr-item">
                    <QRCode value={asset.id} size={180} />
                    <h1>{asset.code}</h1>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Button onClick={() => handlePrint(batchQrRef)} className="mt-4">
              <Printer className="mr-2 h-5 w-5" />
              Imprimir Todos ({assetsToPrint.length})
            </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
