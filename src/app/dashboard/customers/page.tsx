"use client";

import { useState, useEffect, useMemo } from "react";
import { MoreHorizontal, PlusCircle, Loader2, ChevronLeft, ChevronRight, Users2, Phone, History } from "lucide-react";
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
import type { Customer, Asset, Event } from "@/lib/types";
import { CustomerForm } from "@/components/customer-form";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { logAppEvent } from "@/lib/logging";
import { useIsMobile } from "@/hooks/use-mobile";
import { EmptyState } from "@/components/empty-state";

const ITEMS_PER_PAGE = 10;

type CustomerAssetCounts = {
    [format: string]: number;
    total: number;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const userRole = useUserRole();
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { collection, query, orderBy, getDocs } = await import("firebase/firestore/lite");
        const firestore = db();
        
        const customersQuery = query(collection(firestore, "customers"), orderBy("name"));
        const assetsQuery = query(collection(firestore, "assets"));
        const eventsQuery = query(collection(firestore, "events"), orderBy("timestamp", "desc"));
        
        const [customersSnapshot, assetsSnapshot, eventsSnapshot] = await Promise.all([
          getDocs(customersQuery),
          getDocs(assetsQuery),
          getDocs(eventsQuery),
        ]);
        
        const customersData = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
        const assetsData = assetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
        const eventsData = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));

        setCustomers(customersData);
        setAssets(assetsData);
        setEvents(eventsData);

      } catch (error: any) {
        console.error("Error fetching customers data: ", error);
        logAppEvent({
            level: 'ERROR',
            message: 'Failed to fetch comprehensive customer data',
            component: 'CustomersPage',
            stack: error.stack,
        });
        toast({
          title: "Error de Carga",
          description: "No se pudieron cargar todos los datos de clientes.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);
  
  const { customerAssetCounts, customerAssetHistory } = useMemo(() => {
    const counts = new Map<string, CustomerAssetCounts>();
    const history = new Map<string, number>();
    const deliveredAssetsByCustomer = new Map<string, Set<string>>();

    if (!assets.length || !events.length) {
      return { customerAssetCounts: counts, customerAssetHistory: history };
    }
    
    // Create a map of last known events for each asset for efficiency
    const lastEventsMap = new Map<string, Event>();
    for (const event of events) {
      if (!lastEventsMap.has(event.asset_id)) {
        lastEventsMap.set(event.asset_id, event);
      }
    }

    // Calculate current assets in possession
    for (const asset of assets) {
      if (asset.location === 'EN_CLIENTE') {
        const lastEvent = lastEventsMap.get(asset.id);
        
        // Ensure the last event was a delivery, not a collection that failed to update the asset location
        if (lastEvent && lastEvent.event_type === 'ENTREGA_A_CLIENTE') {
          const customerId = lastEvent.customer_id;
          
          if (!counts.has(customerId)) {
            counts.set(customerId, { total: 0 });
          }
          
          const customerCounts = counts.get(customerId)!;
          const formatKey = asset.type === 'CO2' ? `${asset.format} (CO2)` : asset.format;

          customerCounts[formatKey] = (customerCounts[formatKey] || 0) + 1;
          customerCounts.total += 1;
        }
      }
    }
    
    // Calculate historical asset deliveries
    for (const event of events) {
      if (event.event_type === 'ENTREGA_A_CLIENTE' && event.customer_id) {
        if (!deliveredAssetsByCustomer.has(event.customer_id)) {
          deliveredAssetsByCustomer.set(event.customer_id, new Set());
        }
        deliveredAssetsByCustomer.get(event.customer_id)!.add(event.asset_id);
      }
    }

    for (const [customerId, assetSet] of deliveredAssetsByCustomer.entries()) {
        history.set(customerId, assetSet.size);
    }
    
    return { customerAssetCounts: counts, customerAssetHistory: history };
  }, [assets, events]);

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

  const PhoneLinks = ({ phone }: { phone?: string }) => {
    if (!phone) return null;
    const phoneNumbers = phone.split(',').map(p => p.trim()).filter(Boolean);

    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Phone className="h-4 w-4 text-muted-foreground" />
        {phoneNumbers.map((num, index) => (
          <a
            key={index}
            href={`tel:${num.replace(/\D/g, '')}`}
            className="text-sm text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {num}
          </a>
        ))}
      </div>
    )
  };

  const AssetCountDisplay = ({ counts, historyCount }: { counts?: CustomerAssetCounts, historyCount?: number }) => {
    const hasCurrentAssets = counts && counts.total > 0;
    const hasHistory = historyCount !== undefined && historyCount > 0;

    if (!hasCurrentAssets && !hasHistory) {
      return <span className="text-sm text-muted-foreground">0 Activos</span>;
    }
    
    const { total, ...formats } = counts || { total: 0 };
    const formatEntries = Object.entries(formats);

    return (
      <div className="flex flex-col gap-2">
        {hasCurrentAssets && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-sm font-semibold mr-2">En Posesión:</span>
              {formatEntries.map(([format, count]) => (
                  <Badge key={format} variant="secondary" className="text-xs">
                      {format}: <span className="font-bold ml-1">{count}</span>
                  </Badge>
              ))}
              <Badge variant="default" className="text-xs">
                  Total: <span className="font-bold ml-1">{total}</span>
              </Badge>
          </div>
        )}
        {hasHistory && (
           <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-sm font-semibold mr-2 flex items-center gap-1.5"><History className="h-4 w-4"/>Histórico:</span>
              <Badge variant="outline" className="text-xs">
                  Total: <span className="font-bold ml-1">{historyCount}</span>
              </Badge>
          </div>
        )}
      </div>
    );
  };


  const CustomerCardMobile = ({ customer, counts, historyCount }: { customer: Customer, counts?: CustomerAssetCounts, historyCount?: number }) => (
    <div className="flex items-start justify-between rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-1.5 flex-grow">
            <span className="font-semibold">{customer.name}</span>
            <Badge variant="outline" className="w-fit">{customer.type}</Badge>
            <span className="text-sm text-muted-foreground">{customer.address}</span>
            <span className="text-sm text-muted-foreground">{customer.contact}</span>
            <PhoneLinks phone={customer.phone} />
            <div className="pt-2">
              <AssetCountDisplay counts={counts} historyCount={historyCount} />
            </div>
        </div>
        <div className="flex items-center flex-shrink-0">
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
          description="Gestiona tus clientes y su inventario de activos."
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
                     {paginatedCustomers.map(customer => <CustomerCardMobile key={customer.id} customer={customer} counts={customerAssetCounts.get(customer.id)} historyCount={customerAssetHistory.get(customer.id)} />)}
                  </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Activos</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Teléfono</TableHead>
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
                        <TableCell>
                           <AssetCountDisplay counts={customerAssetCounts.get(customer.id)} historyCount={customerAssetHistory.get(customer.id)} />
                        </TableCell>
                        <TableCell>{customer.contact}</TableCell>
                        <TableCell><PhoneLinks phone={customer.phone} /></TableCell>
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

    