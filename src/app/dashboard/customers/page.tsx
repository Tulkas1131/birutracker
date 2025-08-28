
"use client";

import { useState } from "react";
import { MoreHorizontal, PlusCircle, Loader2 } from "lucide-react";
import { addDoc, updateDoc, deleteDoc, doc, collection } from "firebase/firestore";
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
import { PageHeader } from "@/components/page-header";
import type { Customer } from "@/lib/types";
import { CustomerForm } from "@/components/customer-form";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { useData } from "@/context/data-context";

export default function CustomersPage() {
  const { customers, isLoading } = useData();
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);
  const { toast } = useToast();
  const userRole = useUserRole();

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormOpen(true);
  };
  
  const handleNew = () => {
    setSelectedCustomer(undefined);
    setFormOpen(true);
  };
  
  const handleDelete = async (id: string) => {
    if (userRole !== 'Admin') {
       toast({
        title: "Acceso Denegado",
        description: "No tienes permiso para eliminar clientes.",
        variant: "destructive",
      });
      return;
    }
    const firestore = db();
    try {
      await deleteDoc(doc(firestore, "customers", id));
      toast({
        title: "Cliente Eliminado",
        description: "El cliente ha sido eliminado de la base de datos.",
      });
    } catch (error) {
       console.error("Error eliminando cliente: ", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente.",
        variant: "destructive",
      });
    }
  };
  
  const handleFormSubmit = async (data: Omit<Customer, 'id'>) => {
    const firestore = db();
    try {
      if (selectedCustomer) {
        await updateDoc(doc(firestore, "customers", selectedCustomer.id), data);
        toast({
          title: "Cliente Actualizado",
          description: "Los cambios han sido guardados.",
        });
      } else {
        await addDoc(collection(firestore, "customers"), data);
        toast({
          title: "Cliente Creado",
          description: "El nuevo cliente ha sido añadido.",
        });
      }
      setFormOpen(false);
      setSelectedCustomer(undefined);
    } catch (error) {
      console.error("Error guardando cliente: ", error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los datos.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-1 flex-col">
       <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
        <PageHeader
          title="Clientes"
          description="Gestiona tus clientes y distribuidores."
          action={
            <DialogTrigger asChild>
                <Button size="lg" onClick={handleNew}>
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Nuevo Cliente
                </Button>
            </DialogTrigger>
          }
        />
        <main className="flex-1 p-4 pt-0 md:p-6 md:pt-0">
          <Card>
            <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead>Contacto</TableHead>
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
                    ) : customers.length === 0 ? (
                       <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            No hay clientes. ¡Añade uno para empezar!
                          </TableCell>
                        </TableRow>
                    ) : (
                      customers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{customer.type}</Badge>
                          </TableCell>
                          <TableCell>{customer.address}</TableCell>
                          <TableCell>{customer.contact}</TableCell>
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
                                <DropdownMenuItem onSelect={() => handleEdit(customer)}>Editar</DropdownMenuItem>
                                {userRole === 'Admin' && (
                                  <DropdownMenuItem onSelect={() => handleDelete(customer.id)} className="text-destructive">
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
            </CardContent>
          </Card>
        </main>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{selectedCustomer ? "Editar Cliente" : "Crear Nuevo Cliente"}</DialogTitle>
            </DialogHeader>
            <CustomerForm
              defaultValues={selectedCustomer}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setFormOpen(false);
                setSelectedCustomer(undefined);
              }}
            />
        </DialogContent>
      </Dialog>
    </div>
  );
}
