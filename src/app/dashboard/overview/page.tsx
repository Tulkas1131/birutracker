
"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Timestamp } from "firebase/firestore/lite";
import { db } from "@/lib/firebase";
import { Loader2, Trash2, ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Event, Asset, MovementEventType } from "@/lib/types";
import { useUserRole } from '@/hooks/use-user-role';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { differenceInDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { logAppEvent } from '@/lib/logging';
import { useIsMobile } from '@/hooks/use-mobile';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/empty-state';

const ITEMS_PER_PAGE = 10;

const formatEventType = (eventType: Event['event_type']) => {
    const translations: Record<MovementEventType, string> = {
        LLENADO_EN_PLANTA: "Llenar Activo",
        SALIDA_A_REPARTO: "Salida a Reparto",
        ENTREGA_A_CLIENTE: "Entrega a Cliente",
        RECOLECCION_DE_CLIENTE: "Recolección de Cliente",
        RECEPCION_EN_PLANTA: "Recepción en Planta",
        SALIDA_VACIO: "Préstamo (Salida Vacío)",
        DEVOLUCION: "Devolución (Lleno)",
    };
    return translations[eventType] || eventType;
};

const formatDate = (timestamp: Timestamp) => {
    if (!timestamp || !timestamp.toDate) return 'Fecha inválida';
    return timestamp.toDate().toLocaleString();
};

function EventCardMobile({ event, assetsMap, onDelete }: { event: Event, assetsMap: Map<string, Asset>, onDelete: (id: string) => void }) {
    const userRole = useUserRole();
    const asset = assetsMap.get(event.asset_id);
    const daysAtCustomer = useMemo(() => {
        if (event.event_type === 'ENTREGA_A_CLIENTE' && asset && asset.location === 'EN_CLIENTE') {
            return differenceInDays(new Date(), event.timestamp.toDate());
        }
        return null;
    }, [event, asset]);

    return (
        <div className="rounded-lg border bg-card p-4">
            <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1.5">
                    <span className="font-semibold">{event.asset_code}</span>
                    <span className="text-sm font-medium">{formatEventType(event.event_type)}</span>
                    <span className="text-sm text-muted-foreground">{event.customer_name}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(event.timestamp)}</span>
                     {asset?.type === 'BARRIL' && event.valveType && <span className="text-xs text-muted-foreground">Válvula: {event.valveType}</span>}
                </div>
                <div className="flex flex-col items-end gap-2">
                    {daysAtCustomer !== null && (
                        daysAtCustomer >= 30 ? (
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

function EventTableRow({ event, assetsMap, onDelete, showBeerColumns }: { event: Event, assetsMap: Map<string, Asset>, onDelete: (id: string) => void, showBeerColumns: boolean }) {
  const userRole = useUserRole();
  const asset = assetsMap.get(event.asset_id);
  const daysAtCustomer = useMemo(() => {
    if (event.event_type === 'ENTREGA_A_CLIENTE' && asset && asset.location === 'EN_CLIENTE') {
      return differenceInDays(new Date(), event.timestamp.toDate());
    }
    return null;
  }, [event, asset]);

  return (
    <TableRow>
      <TableCell className="hidden sm:table-cell">{formatDate(event.timestamp)}</TableCell>
      <TableCell className="font-medium">{event.asset_code}</TableCell>
      <TableCell className="hidden sm:table-cell">{formatEventType(event.event_type)}</TableCell>
      <TableCell>{event.customer_name}</TableCell>
      <TableCell className="hidden md:table-cell">
        {daysAtCustomer !== null ? (
          daysAtCustomer >= 30 ? (
            <Badge variant="destructive">{daysAtCustomer} días</Badge>
          ) : (
            <span>{daysAtCustomer} días</span>
          )
        ) : (
          '--'
        )}
      </TableCell>
      {showBeerColumns && <TableCell className="hidden lg:table-cell">{event.variety || 'N/A'}</TableCell>}
      {showBeerColumns && <TableCell className="hidden lg:table-cell">{event.valveType || 'N/A'}</TableCell>}
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

function OverviewPageContent() {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  
  const [filters, setFilters] = useState({
    customer: '',
    assetType: 'ALL',
    eventType: 'ALL',
    criticalOnly: searchParams.get('critical') === 'true',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const userRole = useUserRole();
  const isMobile = useIsMobile();

  const fetchData = useCallback(async () => {
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
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleFilterChange = (filterName: keyof typeof filters, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setCurrentPage(1);
  };
  
  const assetsMap = useMemo(() => new Map(assets.map(asset => [asset.id, asset])), [assets]);

  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
        const asset = assetsMap.get(event.asset_id);
        const customerMatch = event.customer_name.toLowerCase().includes(filters.customer.toLowerCase());
        
        const assetTypeMatch = filters.assetType === 'ALL' || (asset?.type === filters.assetType);
        const eventTypeMatch = filters.eventType === 'ALL' || event.event_type === filters.eventType;

        let criticalMatch = true;
        if (filters.criticalOnly) {
          criticalMatch = false; // Assume not a match unless proven otherwise
          if (event.event_type === 'ENTREGA_A_CLIENTE' && asset && asset.location === 'EN_CLIENTE') {
              const days = differenceInDays(new Date(), event.timestamp.toDate());
              if (days >= 30) {
                  criticalMatch = true;
              }
          }
        }
        
        return customerMatch && assetTypeMatch && eventTypeMatch && criticalMatch;
    });
  }, [allEvents, filters, assetsMap]);

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

  const showBeerColumns = filters.assetType === 'ALL' || filters.assetType === 'BARRIL';

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Historial de Movimientos"
        description="Consulta el registro de todos los movimientos de activos."
      />
      <main className="flex-1 p-4 pt-0 md:p-6 md:pt-0">
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-center gap-4 p-4 md:p-6">
            <Input
              placeholder="Buscar por cliente..."
              value={filters.customer}
              onChange={(e) => handleFilterChange('customer', e.target.value)}
              className="w-full"
            />
            <Select value={filters.assetType} onValueChange={(value) => handleFilterChange('assetType', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tipo de Activo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los Tipos</SelectItem>
                  <SelectItem value="BARRIL">Barril</SelectItem>
                  <SelectItem value="CO2">CO2</SelectItem>
                </SelectContent>
            </Select>
            <Select value={filters.eventType} onValueChange={(value) => handleFilterChange('eventType', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tipo de Evento" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">Todos los Eventos</SelectItem>
                    <SelectItem value="LLENADO_EN_PLANTA">Llenado</SelectItem>
                    <SelectItem value="SALIDA_A_REPARTO">Salida a Reparto</SelectItem>
                    <SelectItem value="ENTREGA_A_CLIENTE">Entrega a Cliente</SelectItem>
                    <SelectItem value="RECOLECCION_DE_CLIENTE">Recolección de Cliente</SelectItem>
                    <SelectItem value="RECEPCION_EN_PLANTA">Recepción en Planta</SelectItem>
                    <SelectItem value="SALIDA_VACIO">Salida Vacío (Préstamo)</SelectItem>
                    <SelectItem value="DEVOLUCION">Devolución (Lleno)</SelectItem>
                </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Switch
                id="critical-only"
                checked={filters.criticalOnly}
                onCheckedChange={(checked) => handleFilterChange('criticalOnly', checked)}
              />
              <Label htmlFor="critical-only">Solo Críticos ({'>'}30 días)</Label>
            </div>
          </div>
          <CardContent className="p-0 md:p-6 md:pt-0">
            {isLoading ? (
                <div className="flex justify-center items-center py-20 h-60">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : paginatedEvents.length === 0 ? (
                <EmptyState 
                    icon={<SearchX className="h-16 w-16" />}
                    title="No se encontraron movimientos"
                    description="Prueba a cambiar los filtros o busca por otro cliente para ver el historial de eventos."
                />
            ) : isMobile ? (
                <div className="space-y-4 p-4">
                    {paginatedEvents.map((event) => (
                        <EventCardMobile key={event.id} event={event} assetsMap={assetsMap} onDelete={handleDelete} />
                    ))}
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
                          {showBeerColumns && <TableHead className="hidden lg:table-cell">Variedad</TableHead>}
                          {showBeerColumns && <TableHead className="hidden lg:table-cell">Válvula</TableHead>}
                          {userRole === 'Admin' && <TableHead>Acciones</TableHead>}
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEvents.map((event) => (
                        <EventTableRow key={event.id} event={event} assetsMap={assetsMap} onDelete={handleDelete} showBeerColumns={showBeerColumns} />
                    ))}
                  </TableBody>
              </Table>
            )}
          </CardContent>
           {totalPages > 1 && !isLoading && paginatedEvents.length > 0 && (
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


export default function OverviewPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <OverviewPageContent />
        </Suspense>
    );
}
