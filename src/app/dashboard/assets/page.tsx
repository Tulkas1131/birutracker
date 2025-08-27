"use client";

import { useState } from "react";
import { MoreHorizontal, PlusCircle } from "lucide-react";

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
import { mockAssets } from "@/lib/data";
import type { Asset } from "@/lib/types";
import { AssetForm } from "@/components/asset-form";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>(mockAssets);
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);

  const handleEdit = (asset: Asset) => {
    setSelectedAsset(asset);
    setFormOpen(true);
  };
  
  const handleNew = () => {
    setSelectedAsset(undefined);
    setFormOpen(true);
  };
  
  const handleDelete = (id: string) => {
    setAssets(assets.filter((asset) => asset.id !== id));
  };
  
  const handleFormSubmit = (data: Asset) => {
    if (selectedAsset) {
      setAssets(assets.map((asset) => (asset.id === selectedAsset.id ? { ...data, id: asset.id } : asset)));
    } else {
      setAssets([...assets, { ...data, id: (assets.length + 1).toString() }]);
    }
    setFormOpen(false);
    setSelectedAsset(undefined);
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
        {assetList.map((asset) => (
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
        ))}
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
              <TabsTrigger value="barrels">Barriles</TabsTrigger>
              <TabsTrigger value="co2">CO2</TabsTrigger>
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
              onCancel={() => setFormOpen(false)}
            />
        </DialogContent>
      </Dialog>
    </div>
  );
}

    