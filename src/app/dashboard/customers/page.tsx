"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, PlusCircle, Loader2 } from "lucide-react";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";

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
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);
  const { toast } = useToast();

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const q = query(collection(db, "customers"), orderBy("name"));
      const querySnapshot = await getDocs(q);
      const customersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(customersList);
    } catch (error) {
      console.error("Error fetching customers: ", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormOpen(true);
  };
  
  const handleNew = () => {
    setSelectedCustomer(undefined);
    setFormOpen(true);
  };
  
  const handleDelete = async (id: string) => {
     try {
      await deleteDoc(doc(db, "customers", id));
      toast({
        title: "Cliente Eliminado",
        description: "El cliente ha sido eliminado correctamente.",
      });
      fetchCustomers(); // Refresh list
    } catch (error) {
       console.error("Error deleting customer: ", error);
       toast({
        title: "Error",
        description: "No se pudo eliminar el cliente.",
        variant: "destructive",
      });
    }
  };
  
  const handleFormSubmit = async (data: Omit<Customer, 'id'>) => {
    try {
      if (selectedCustomer) {
        const customerRef = doc(db, "customers", selectedCustomer.id);
        await updateDoc(customerRef, data);
        toast({
          title: "Cliente Actualizado",
          description: "Los cambios han sido guardados.",
        });
      } else {
        await addDoc(collection(db, "customers"), data);
        toast({
          title: "Cliente Creado",
          description: "El nuevo cliente ha sido añadido.",
        });
      }
      setFormOpen(false);
      setSelectedCustomer(undefined);
      fetchCustomers(); // Refresh list
    } catch (error) {
      console.error("Error saving customer: ", error);
       toast({
        title: "Error",
        description: "No se pudo guardar el cliente.",
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
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
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
                    {customers.length === 0 ? (
                       <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            No hay clientes. ¡Añade uno nuevo para empezar!
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
                                  <span className="sr-only">Menú</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => handleEdit(customer)}>Editar</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleDelete(customer.id)}>Eliminar</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
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
