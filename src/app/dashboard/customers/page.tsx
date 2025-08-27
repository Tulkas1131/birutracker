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
import { PageHeader } from "@/components/page-header";
import type { Customer } from "@/lib/types";
import { CustomerForm } from "@/components/customer-form";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { mockCustomers } from "@/lib/data";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);
  const { toast } = useToast();

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormOpen(true);
  };
  
  const handleNew = () => {
    setSelectedCustomer(undefined);
    setFormOpen(true);
  };
  
  const handleDelete = async (id: string) => {
    setCustomers(customers.filter(customer => customer.id !== id));
    toast({
      title: "Cliente Eliminado",
      description: "El cliente ha sido eliminado (simulación).",
    });
  };
  
  const handleFormSubmit = async (data: Omit<Customer, 'id'>) => {
    if (selectedCustomer) {
      setCustomers(customers.map(customer => customer.id === selectedCustomer.id ? { ...selectedCustomer, ...data } : customer));
      toast({
        title: "Cliente Actualizado",
        description: "Los cambios han sido guardados (simulación).",
      });
    } else {
      const newCustomer = { ...data, id: `new-${Date.now()}` };
      setCustomers([...customers, newCustomer]);
      toast({
        title: "Cliente Creado",
        description: "El nuevo cliente ha sido añadido (simulación).",
      });
    }
    setFormOpen(false);
    setSelectedCustomer(undefined);
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
