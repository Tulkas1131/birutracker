
"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, PlusCircle, Loader2 } from "lucide-react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs } from "firebase/firestore";
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

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const { toast } = useToast();

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
  
  const handleFormSubmit = async (data: Omit<Asset, 'id'>) => {
    try {
      // Check for uniqueness of the asset code
      const q = query(collection(db, "assets"), where("code", "==", data.code));
      const querySnapshot = await getDocs(q);
      
      let isDuplicate = false;
      if (!querySnapshot.empty) {
        if (selectedAsset) {
          // If editing, check if the found asset is different from the current one
          querySnapshot.forEach((doc) => {
            if (doc.id !== selectedAsset.id) {
              isDuplicate = true;
            }
          });
        } else {
          // If creating, any result is a duplicate
          isDuplicate = true;
        }
      }

      if (isDuplicate) {
        toast({
          title: "Código Duplicado",
          description: `El código "${data.code}" ya está en uso. Por favor, elige uno diferente.`,
          variant: "destructive",
        });
        return;
      }


      if (selectedAsset) {
        await updateDoc(doc(db, "assets", selectedAsset.id), data);
        toast({
          title: "Activo Actualizado",
          description: "Los cambios han sido guardados.",
        });
      } else {
        await addDoc(collection(db, "assets"), data);
        toast({
          title: "Activo Creado",
          description: "El nuevo activo ha sido añadido.",
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
  
  const getStatusVariant = (status: Asset["status"]) => {
    switch (status) {
      case "LLENO":
        return "default";
      case "VACIO":
        return "secondary";
      case "EN_CLIENTE":
        return "outline";
      case "EN_PLANTA":
        return "destructive";
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
          <TableHead>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={4} className="h-24 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            </TableCell>
          </TableRow>
        ) : assetList.length === 0 ? (
          <TableRow>
             <TableCell colSpan={4} className="h-24 text-center">
              No hay activos. ¡Añade uno nuevo para empezar!
            </TableCell>
          </TableRow>
        ) : (
          assetList.map((asset) => (
            <TableRow key={asset.id}>
              <TableCell className="font-medium">{asset.code}</TableCell>
              <TableCell>{asset.format}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(asset.status)}>{asset.status}</Badge>
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
                    <DropdownMenuItem onSelect={() => handleDelete(asset.id)}>Eliminar</DropdownMenuItem>
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
                  <CardContent>
                    <AssetTable assetList={barrels} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="co2">
                <Card>
                  <CardContent>
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
