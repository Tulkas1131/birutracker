
"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, PlusCircle, Loader2 } from "lucide-react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
import type { Asset } from "@/lib/types";
import { AssetForm } from "@/components/asset-form";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const { toast } = useToast();
  const userRole = useUserRole();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "assets"), (snapshot) => {
      const assetsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
      setAssets(assetsData);
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
  
  const handleDelete = async (id: string) => {
    if (userRole !== 'Admin') {
       toast({
        title: "Acceso denegado",
        description: "No tienes permiso para eliminar activos.",
        variant: "destructive",
      });
      return;
    }
    try {
      await deleteDoc(doc(db, "assets", id));
      toast({
        title: "Activo Eliminado",
        description: "El activo ha sido eliminado de la base de datos.",
      });
    } catch (error) {
      console.error("Error deleting asset: ", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el activo.",
        variant: "destructive",
      });
    }
  };

  const generateNextCode = async (type: 'BARRIL' | 'CO2'): Promise<string> => {
    const prefix = type === 'BARRIL' ? 'KEG' : 'CO2';
    const q = query(
      collection(db, "assets"), 
      where("type", "==", type),
      orderBy("code", "desc"),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return `${prefix}-001`;
    }
    
    const lastCode = querySnapshot.docs[0].data().code;
    const lastNumber = parseInt(lastCode.split('-')[1], 10);
    const nextNumber = lastNumber + 1;
    const nextCode = `${prefix}-${String(nextNumber).padStart(3, '0')}`;
    
    return nextCode;
  };
  
  const handleFormSubmit = async (data: Omit<Asset, 'id' | 'code'>) => {
    try {
      if (selectedAsset) {
        // Editing existing asset
        const assetDataToUpdate: Partial<Asset> = {
          format: data.format,
          state: data.state,
          location: data.location,
        };
        await updateDoc(doc(db, "assets", selectedAsset.id), assetDataToUpdate);
        toast({
          title: "Activo Actualizado",
          description: "Los cambios han sido guardados.",
        });
      } else {
        // Creating new asset
        const newCode = await generateNextCode(data.type);
        const newAssetData = { ...data, code: newCode };
        await addDoc(collection(db, "assets"), newAssetData);
        toast({
          title: "Activo Creado",
          description: `El nuevo activo ha sido añadido con el código ${newCode}.`,
        });
      }
      setFormOpen(false);
      setSelectedAsset(undefined);
    } catch (error) {
      console.error("Error saving asset: ", error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los datos.",
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

  const AssetTable = ({ assetList }: { assetList: Asset[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Formato</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Ubicación</TableHead>
          <TableHead>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            </TableCell>
          </TableRow>
        ) : assetList.length === 0 ? (
          <TableRow>
             <TableCell colSpan={5} className="h-24 text-center">
              No hay activos. ¡Añade uno nuevo para empezar!
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
            <DialogTrigger asChild>
                <Button size="lg" onClick={handleNew}>
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Nuevo Activo
                </Button>
            </DialogTrigger>
          }
        />
        <main className="flex-1 p-4 pt-0 md:p-6 md:pt-0">
            <Tabs defaultValue="barrels">
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
    </div>
  );
}

    