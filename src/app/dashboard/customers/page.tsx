
"use client";

import { useState, useEffect, useMemo } from "react";
import { MoreHorizontal, PlusCircle, Loader2, ChevronLeft, ChevronRight, Users2 } from "lucide-react";
import { db } from "@/lib/firebase";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { logAppEvent } from "@/lib/logging";
import { useIsMobile } from "@/hooks/use-mobile";
import { EmptyState } from "@/components/empty-state";

const ITEMS_PER_PAGE = 10;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const userRole = useUserRole();
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const { collection, query, orderBy, getDocs } = await import("firebase/firestore/lite");
        const firestore = db();
        const customersQuery = query(collection(firestore, "customers"), orderBy("name"));
        const customersSnapshot = await getDocs(customersQuery);
        const customersData = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
        setCustomers(customersData);
      } catch (error: any) {
        console.error("Error fetching customers: ", error);
        logAppEvent({
            level: 'ERROR',
            message: 'Failed to fetch customers',
            component: 'CustomersPage',
            stack: error.stack,
        });
        toast({
          title: "Error de Carga",
          description: "No se pudieron cargar los clientes.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchCustomers();
  }, [toast]);
  
  const totalPages = Math.ceil(customers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return customers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [customers, currentPage]);


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
    const { doc, deleteDoc } = await import("firebase/firestore/lite");
    const firestore = db();
    try {
      await deleteDoc(doc(firestore, "customers", id));
      setCustomers(prev => prev.filter(customer => customer.id !== id));
      toast({
        title: "Cliente Eliminado",
        description: "El cliente ha sido eliminado de la base de datos.",
      });
    } catch (error: any) {
       console.error("Error eliminando cliente: ", error);
       logAppEvent({
        level: 'ERROR',
        message: `Failed to delete customer ${id}`,
        component: 'CustomersPage',
        stack: error.stack,
       });
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente.",
        variant: "destructive",
      });
    }
  };
  
  const handleFormSubmit = async (data: Omit<Customer, 'id'>) => {
    const { doc, updateDoc, addDoc, collection } = await import("firebase/firestore/lite");
    const firestore = db();
    try {
      if (selectedCustomer) {
        await updateDoc(doc(firestore, "customers", selectedCustomer.id), data);
        setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, ...data } : c).sort((a, b) => a.name.localeCompare(b.name)));
        toast({
          title: "Cliente Actualizado",
          description: "Los cambios han sido guardados.",
        });
      } else {
        const newDocRef = await addDoc(collection(firestore, "customers"), data);
        setCustomers(prev => [...prev, { id: newDocRef.id, ...data }].sort((a, b) => a.name.localeCompare(b.name)));
        toast({
          title: "Cliente Creado",
          description: "El nuevo cliente ha sido añadido.",
        });
      }
      setFormOpen(false);
      setSelectedCustomer(undefined);
    } catch (error: any) {
      console.error("Error guardando cliente: ", error);
      logAppEvent({
        level: 'ERROR',
        message: `Failed to save customer (editing: ${!!selectedCustomer})`,
        component: 'CustomerForm',
        stack: error.stack,
      });
      toast({
        title: "Error",
        description: "No se pudieron guardar los datos.",
        variant: "destructive",
      });
    }
  };

  const CustomerCardMobile = ({ customer }: { customer: Customer }) => (
    <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-1">
            <span className="font-semibold">{customer.name}</span>
            <Badge variant="outline" className="w-fit">{customer.type}</Badge>
            <span className="text-sm text-muted-foreground">{customer.address}</span>
            <span className="text-sm text-muted-foreground">{customer.contact}</span>
        </div>
        <div className="flex items-center">
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
        </div>
    </div>
  );

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
            <CardContent className="p-0 md:p-6 md:pt-0">
              {isLoading ? (
                <div className="flex justify-center items-center py-20 h-60">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : customers.length === 0 ? (
                <EmptyState 
                    icon={<Users2 className="h-16 w-16" />}
                    title="Aún no tienes clientes"
                    description="Registra tu primer cliente (bares, distribuidores, etc.) para poder asignarle activos."
                    action={
                        <DialogTrigger asChild>
                            <Button onClick={handleNew}>
                                <PlusCircle className="mr-2 h-5 w-5" />
                                Nuevo Cliente
                            </Button>
                        </DialogTrigger>
                    }
                />
              ) : isMobile ? (
                  <div className="space-y-4 p-4">
                     {paginatedCustomers.map(customer => <CustomerCardMobile key={customer.id} customer={customer} />)}
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
                    {paginatedCustomers.map((customer) => (
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
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
             {totalPages > 1 && !isLoading && customers.length > 0 && (
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
        </main>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{selectedCustomer ? "Editar Cliente" : "Crear Nuevo Cliente"}</DialogTitle>
                <DialogDescription>
                    {selectedCustomer ? "Modifica los detalles del cliente existente." : "Completa el formulario para añadir un nuevo cliente."}
                </DialogDescription>
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
