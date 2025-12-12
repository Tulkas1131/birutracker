
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { MoreHorizontal, PlusCircle, Loader2, ChevronLeft, ChevronRight, Users2, Phone, History } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, doc, deleteDoc, updateDoc, addDoc, type DocumentData, type QueryDocumentSnapshot, query, orderBy, getDocs, limit, startAfter, getCountFromServer, where } from "firebase/firestore";

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
const FIRESTORE_IN_LIMIT = 30;

type CustomerAssetCounts = {
    [format: string]: number;
    total: number;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerAssetCounts, setCustomerAssetCounts] = useState<Map<string, CustomerAssetCounts>>(new Map());
  const [customerAssetHistory, setCustomerAssetHistory] = useState<Map<string, number>>(new Map());

  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [pageHistory, setPageHistory] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([null]);
  const [totalCustomers, setTotalCustomers] = useState(0);

  const { toast } = useToast();
  const userRole = useUserRole();
  const isMobile = useIsMobile();

  const fetchCustomerData = useCallback(async () => {
    const firestore = db;
    try {
        const assetsInClientQuery = query(collection(firestore, "assets"), where("location", "==", "EN_CLIENTE"));
        const assetsSnapshot = await getDocs(assetsInClientQuery);
        const assetsInClient = assetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
        const assetIds = assetsInClient.map(doc => doc.id);

        if (assetIds.length === 0) {
            setCustomerAssetCounts(new Map());
            setCustomerAssetHistory(new Map());
            return;
        }

        const newCounts = new Map<string, CustomerAssetCounts>();
        if (assetIds.length > 0) {
            const allEvents: Event[] = [];
            for (let i = 0; i < assetIds.length; i += FIRESTORE_IN_LIMIT) {
                const chunk = assetIds.slice(i, i + FIRESTORE_IN_LIMIT);
                const eventsQuery = query(
                    collection(firestore, "events"), 
                    where("asset_id", "in", chunk),
                    orderBy("timestamp", "desc")
                );
                const eventsSnapshot = await getDocs(eventsQuery);
                eventsSnapshot.docs.forEach(doc => allEvents.push(doc.data() as Event));
            }

            const lastDeliveryEventMap = new Map<string, Event>();
            for (const event of allEvents) {
                if (event.event_type === 'ENTREGA_A_CLIENTE' && !lastDeliveryEventMap.has(event.asset_id)) {
                    lastDeliveryEventMap.set(event.asset_id, event);
                }
            }
            
            for (const asset of assetsInClient) {
                const lastEvent = lastDeliveryEventMap.get(asset.id);
                if (lastEvent && lastEvent.customer_id) {
                    const customerId = lastEvent.customer_id;
                    if (!newCounts.has(customerId)) {
                        newCounts.set(customerId, { total: 0 });
                    }
                    const customerCounts = newCounts.get(customerId)!;
                    const formatKey = asset.type === 'CO2' ? `CO2-${asset.format}` : asset.format;
                    customerCounts[formatKey] = (customerCounts[formatKey] || 0) + 1;
                    customerCounts.total += 1;
                }
            }
        }
        setCustomerAssetCounts(newCounts);
        
        const allDeliveryEventsQuery = query(collection(firestore, "events"), where("event_type", "==", "ENTREGA_A_CLIENTE"));
        const allEventsSnapshot = await getDocs(allDeliveryEventsQuery);

        const deliveredAssetsByCustomer = new Map<string, Set<string>>();
        allEventsSnapshot.docs.forEach(doc => {
            const event = doc.data() as Event;
            if (event.customer_id) {
                if (!deliveredAssetsByCustomer.has(event.customer_id)) {
                    deliveredAssetsByCustomer.set(event.customer_id, new Set());
                }
                deliveredAssetsByCustomer.get(event.customer_id)!.add(event.asset_id);
            }
        });

        const newHistory = new Map<string, number>();
        deliveredAssetsByCustomer.forEach((assetSet, customerId) => {
            newHistory.set(customerId, assetSet.size);
        });
        setCustomerAssetHistory(newHistory);

    } catch (error: any) {
        console.error("Error fetching customer asset data: ", error);
        if (error.code === 'resource-exhausted') {
            toast({
                title: "Límite de Firebase alcanzado",
                description: "No se pudieron cargar los contadores de activos para los clientes.",
                variant: "destructive",
                duration: 9000,
            });
        }
    }
  }, [toast]);

  const fetchCustomers = useCallback(async (
    page: number, 
    lastDoc: QueryDocumentSnapshot<DocumentData> | null = null
) => {
    setIsLoading(true);
    try {
        const firestore = db;
        
        const customersCollection = collection(firestore, "customers");
        
        const countSnapshot = await getCountFromServer(customersCollection);
        setTotalCustomers(countSnapshot.data().count);
        
        let customersQuery = query(customersCollection, orderBy("name"));
        
        if (lastDoc) {
            customersQuery = query(customersQuery, startAfter(lastDoc));
        }
        
        customersQuery = query(customersQuery, limit(ITEMS_PER_PAGE));
        
        const customersSnapshot = await getDocs(customersQuery);
        const customersData = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
        setCustomers(customersData);

        const newLastVisible = customersSnapshot.docs[customersSnapshot.docs.length - 1] || null;
        setLastVisible(newLastVisible);

        if (page > currentPage) {
            setPageHistory(prev => [...prev, lastDoc]);
        }

    } catch (error: any) {
        console.error("Error fetching customers data: ", error);
        logAppEvent({
            level: 'ERROR',
            message: 'Failed to fetch paginated customers',
            component: 'CustomersPage',
            stack: error.stack,
        });
        if (error.code === 'resource-exhausted') {
            toast({
              title: "Límite de Firebase alcanzado",
              description: "No se pudieron cargar los clientes debido a la cuota.",
              variant: "destructive",
              duration: 9000,
            });
        } else {
             toast({
              title: "Error de Carga",
              description: "No se pudieron cargar los datos de clientes.",
              variant: "destructive"
            });
        }
    } finally {
        setIsLoading(false);
    }
}, [currentPage, toast]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "customers"), () => {
        fetchCustomers(1, null);
        fetchCustomerData();
    });
    return () => unsub();
  }, [fetchCustomers, fetchCustomerData]);

  const goToPage = (page: number) => {
    if (page < 1 || (page > currentPage && !lastVisible)) return;

    setCurrentPage(page);
    const lastDocForPage = page > currentPage ? lastVisible : pageHistory[page - 1];
    if (page < currentPage) {
      setPageHistory(prev => prev.slice(0, page));
    }
    fetchCustomers(page, lastDocForPage);
  };
  
  const totalPages = Math.ceil(totalCustomers / ITEMS_PER_PAGE);

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
    const firestore = db;
    try {
      await deleteDoc(doc(firestore, "customers", id));
      toast({
        title: "Cliente Eliminado",
        description: "El cliente ha sido eliminado de la base de datos.",
      });
      // The onSnapshot will trigger a refetch
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
    const firestore = db;
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
      // The onSnapshot will trigger a refetch
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
                  Total Entregados: <span className="font-bold ml-1">{historyCount}</span>
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
              {isLoading && customers.length === 0 ? (
                <div className="flex justify-center items-center py-20 h-60">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !isLoading && customers.length === 0 ? (
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
                     {customers.map(customer => <CustomerCardMobile key={customer.id} customer={customer} counts={customerAssetCounts.get(customer.id)} historyCount={customerAssetHistory.get(customer.id)} />)}
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
                    {customers.map((customer) => (
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
             {totalPages > 1 && (
                <CardFooter className="flex items-center justify-between py-4">
                    <span className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                             <ChevronLeft className="h-4 w-4" />
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages || !lastVisible}
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
    
    

    