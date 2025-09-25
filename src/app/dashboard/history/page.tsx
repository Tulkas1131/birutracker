
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Timestamp, DocumentData, QueryDocumentSnapshot } from "firebase/firestore/lite";
import { db } from "@/lib/firebase";
import { Loader2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { Input } from '@/components/ui/input';
import type { Event, Asset } from "@/lib/types";
import { useUserRole } from '@/hooks/use-user-role';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { differenceInDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { logAppEvent } from '@/lib/logging';
import { useIsMobile } from '@/hooks/use-mobile';

const ITEMS_PER_PAGE = 10;

const formatEventType = (eventType: Event['event_type']) => {
    switch (eventType) {
      case 'SALIDA_A_REPARTO': return 'Salida a Reparto';
      case 'ENTREGA_A_CLIENTE': return 'Entrega a Cliente';
      case 'RECOLECCION_DE_CLIENTE': return 'Recolección de Cliente';
      case 'RECEPCION_EN_PLANTA': return 'Recepción en Planta';
      case 'SALIDA_VACIO': return 'Salida Vacío (Préstamo)';
      case 'DEVOLUCION': return 'Devolución (Lleno)';
      default: return eventType;
    }
};

const formatDate = (timestamp: Timestamp) => {
    if (!timestamp || !timestamp.toDate) return 'Fecha inválida';
    return timestamp.toDate().toLocaleString();
};

function EventCardMobile({ event, assetsMap, onDelete }: { event: Event, assetsMap: Map<string, Asset>, onDelete: (id: string) => void }) {
    const userRole = useUserRole();
    const daysAtCustomer = useMemo(() => {
        const asset = assetsMap.get(event.asset_id);
        if (event.event_type === 'ENTREGA_A_CLIENTE' && asset && asset.location === 'EN_CLIENTE') {
            return differenceInDays(new Date(), event.timestamp.toDate());
        }
        return null;
    }, [event, assetsMap]);

    return (
        <div className="rounded-lg border bg-card p-4">
            <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1.5">
                    <span className="font-semibold">{event.asset_code}</span>
                    <span className="text-sm font-medium">{formatEventType(event.event_type)}</span>
                    <span className="text-sm text-muted-foreground">{event.customer_name}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(event.timestamp)}</span>
                </div>
                <div className="flex flex-col items-end gap-2">
                    {daysAtCustomer !== null && (
                        daysAtCustomer > 30 ? (
                            <Badge variant="destructive">{daysAtCustomer} días</Badge>
                        ) : (
                            <Badge variant="outline">{daysAtCustomer} días</Badge>
                        )
                    )}
                    {userRole === 'Admin' && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive h-8 w-8"
                            onClick={() => onDelete(event.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

function EventTableRow({ event, assetsMap, onDelete }: { event: Event, assetsMap: Map<string, Asset>, onDelete: (id: string) => void }) {
  const userRole = useUserRole();
  const daysAtCustomer = useMemo(() => {
    const asset = assetsMap.get(event.asset_id);
    if (event.event_type === 'ENTREGA_A_CLIENTE' && asset && asset.location === 'EN_CLIENTE') {
      return differenceInDays(new Date(), event.timestamp.toDate());
    }
    return null;
  }, [event, assetsMap]);

  return (
    <TableRow>
      <TableCell className="hidden sm:table-cell">{formatDate(event.timestamp)}</TableCell>
      <TableCell className="font-medium">{event.asset_code}</TableCell>
      <TableCell className="hidden sm:table-cell">{formatEventType(event.event_type)}</TableCell>
      <TableCell>{event.customer_name}</TableCell>
      <TableCell className="hidden md:table-cell">
        {daysAtCustomer !== null ? (
          daysAtCustomer > 30 ? (
            <Badge variant="destructive">{daysAtCustomer} días</Badge>
          ) : (
            <span>{daysAtCustomer} días</span>
          )
        ) : (
          '--'
        )}
      </TableCell>
      <TableCell className="hidden lg:table-cell">{event.variety || 'N/A'}</TableCell>
      {userRole === 'Admin' && (
        <TableCell>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(event.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}

export default function HistoryPage() {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');
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
            const eventsQuery = query(collection(firestore, "events"), orderBy("timestamp", "desc"));
            const assetsQuery = query(collection(firestore, "assets"));
            
            const [eventsSnapshot, assetsSnapshot] = await Promise.all([
                getDocs(eventsQuery),
                getDocs(assetsQuery)
            ]);

            const eventsData = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
            const assetsData = assetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
            
            setAllEvents(eventsData);
            setAssets(assetsData);
        } catch(error: any) {
            console.error("Error fetching data: ", error);
            logAppEvent({ level: 'ERROR', message: 'Failed to fetch history data', component: 'HistoryPage', stack: error.stack });
            toast({ title: "Error al Cargar Historial", description: "No se pudo cargar el historial de movimientos.", variant: "destructive"});
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, [toast]);
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerSearch(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const filteredEvents = useMemo(() => {
    if (!customerSearch) return allEvents;
    return allEvents.filter(event => event.customer_name.toLowerCase().includes(customerSearch.toLowerCase()));
  }, [allEvents, customerSearch]);

  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE);
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredEvents, currentPage]);

  const handleDelete = async (id: string) => {
    if (userRole !== 'Admin') {
      toast({ title: "Acceso Denegado", description: "No tienes permiso para eliminar eventos.", variant: "destructive" });
      return;
    }
    const { doc, deleteDoc } = await import("firebase/firestore/lite");
    const firestore = db();
    try {
      await deleteDoc(doc(firestore, "events", id));
      setAllEvents(prevEvents => prevEvents.filter(event => event.id !== id));
      toast({ title: "Evento Eliminado", description: "El evento ha sido eliminado del historial." });
    } catch (error: any) {
      console.error("Error eliminando evento: ", error);
       logAppEvent({ level: 'ERROR', message: `Failed to delete event ${id}`, component: 'HistoryPage', stack: error.stack });
      toast({ title: "Error", description: "No se pudo eliminar el evento.", variant: "destructive" });
    }
  };

  const assetsMap = useMemo(() => new Map(assets.map(asset => [asset.id, asset])), [assets]);

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Historial de Movimientos"
        description="Consulta el registro de todos los movimientos de activos."
      />
      <main className="flex-1 p-4 pt-0 md:p-6 md:pt-0">
        <Card>
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 md:p-6">
            <Input
              placeholder="Buscar por cliente..."
              value={customerSearch}
              onChange={handleSearchChange}
              className="w-full sm:max-w-sm"
            />
          </div>
          <CardContent className="p-0">
            {isLoading ? (
                <div className="flex justify-center items-center py-10 h-60">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : isMobile ? (
                <div className="space-y-4 p-4">
                  {paginatedEvents.length > 0 ? (
                      paginatedEvents.map((event) => (
                          <EventCardMobile key={event.id} event={event} assetsMap={assetsMap} onDelete={handleDelete} />
                      ))
                  ) : (
                      <div className="py-10 text-center text-muted-foreground">
                          No se encontraron movimientos.
                      </div>
                  )}
                </div>
            ) : (
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead className="hidden sm:table-cell">Evento</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="hidden md:table-cell">Días en Cliente</TableHead>
                          <TableHead className="hidden lg:table-cell">Variedad</TableHead>
                          {userRole === 'Admin' && <TableHead>Acciones</TableHead>}
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {paginatedEvents.length > 0 ? (
                          paginatedEvents.map((event) => (
                              <EventTableRow key={event.id} event={event} assetsMap={assetsMap} onDelete={handleDelete} />
                          ))
                      ) : (
                          <TableRow>
                              <TableCell colSpan={userRole === 'Admin' ? 7 : 6} className="h-24 text-center">
                                  No se encontraron movimientos.
                              </TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
            )}
          </CardContent>
           {totalPages > 1 && (
            <CardFooter className="flex items-center justify-between border-t py-4">
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
    </div>
  );
}

    