
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Timestamp, collection, onSnapshot, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Event, Asset } from "@/lib/types";
import { useUserRole } from '@/hooks/use-user-role';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useData } from '@/context/data-context';
import { differenceInDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';

function EventTable({ events, assets, isLoading, onDelete }: { events: Event[], assets: Asset[], isLoading: boolean, onDelete: (id: string) => void }) {
  const userRole = useUserRole();
  const assetsMap = useMemo(() => new Map(assets.map(asset => [asset.id, asset])), [assets]);

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp || !timestamp.toDate) return 'Fecha inválida';
    return timestamp.toDate().toLocaleString();
  };

  const getDaysAtCustomer = (event: Event) => {
    const asset = assetsMap.get(event.asset_id);
    // Only calculate for departure events of assets that are currently with a customer
    if (event.event_type === 'SALIDA_LLENO' && asset && asset.location === 'EN_CLIENTE') {
      const days = differenceInDays(new Date(), event.timestamp.toDate());
      return days;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Código de Activo</TableHead>
            <TableHead>Tipo de Evento</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Días en Cliente</TableHead>
            <TableHead>Variedad</TableHead>
            {userRole === 'Admin' && <TableHead>Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => {
            const daysAtCustomer = getDaysAtCustomer(event);
            return (
              <TableRow key={event.id}>
                <TableCell>{formatDate(event.timestamp)}</TableCell>
                <TableCell className="font-medium">{event.asset_code}</TableCell>
                <TableCell>{event.event_type}</TableCell>
                <TableCell>{event.customer_name}</TableCell>
                <TableCell>
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
                <TableCell>{event.variety || 'N/A'}</TableCell>
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
          })}
        </TableBody>
      </Table>
      {events.length === 0 && !isLoading && (
        <div className="py-10 text-center text-muted-foreground">
          No se encontraron movimientos para los filtros seleccionados.
        </div>
      )}
    </>
  );
}

export default function HistoryPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const { assets, isLoading: isAssetsLoading } = useData();
  const [isEventsLoading, setIsEventsLoading] = useState(true);
  const { toast } = useToast();
  const userRole = useUserRole();

  useEffect(() => {
    const firestore = db();
    // NOTE: onSnapshot is not available in the Firestore lite SDK.
    // This component will show historical data but won't update in real-time.
    // To enable real-time updates, the full Firestore SDK would be needed,
    // which would impact the performance gains from using the lite version.
    const q = query(collection(firestore, "events"), orderBy("timestamp", "desc"));
    const getEvents = async () => {
        try {
            const snapshot = await getDocs(q);
            const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
            setEvents(eventsData);
        } catch(error) {
            console.error("Error fetching events: ", error);
             toast({
                title: "Error al Cargar Historial",
                description: "No se pudo cargar el historial de movimientos.",
                variant: "destructive",
            });
        } finally {
            setIsEventsLoading(false);
        }
    }
    getEvents();
  }, [toast]);

  const [filters, setFilters] = useState({
    customer: '',
    assetType: 'ALL',
    eventType: 'ALL',
  });


  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleDelete = async (id: string) => {
    if (userRole !== 'Admin') {
      toast({
        title: "Acceso Denegado",
        description: "No tienes permiso para eliminar eventos.",
        variant: "destructive",
      });
      return;
    }
    const firestore = db();
    try {
      await deleteDoc(doc(firestore, "events", id));
      setEvents(prevEvents => prevEvents.filter(event => event.id !== id));
      toast({
        title: "Evento Eliminado",
        description: "El evento ha sido eliminado del historial.",
      });
    } catch (error) {
      console.error("Error eliminando evento: ", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el evento.",
        variant: "destructive",
      });
    }
  };


  const filteredEvents = useMemo(() => {
    return events
      .filter(event => {
        const customerMatch = event.customer_name.toLowerCase().includes(filters.customer.toLowerCase());
        const assetTypeMatch = filters.assetType === 'ALL' || (event.asset_code && event.asset_code.startsWith(filters.assetType));
        const eventTypeMatch = filters.eventType === 'ALL' || event.event_type === filters.eventType;
        return customerMatch && assetTypeMatch && eventTypeMatch;
      });
  }, [events, filters]);
  
  const isLoading = isAssetsLoading || isEventsLoading;

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Historial de Movimientos"
        description="Consulta el registro de todos los movimientos de activos."
      />
      <main className="flex-1 p-4 pt-0 md:p-6 md:pt-0">
        <Card>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4 py-4">
              <Input
                placeholder="Filtrar por cliente..."
                value={filters.customer}
                onChange={(e) => handleFilterChange('customer', e.target.value)}
                className="w-full sm:max-w-sm"
              />
              <Select value={filters.assetType} onValueChange={(value) => handleFilterChange('assetType', value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Tipo de Activo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los Tipos</SelectItem>
                  <SelectItem value="KEG">KEG</SelectItem>
                  <SelectItem value="CO2">CO2</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.eventType} onValueChange={(value) => handleFilterChange('eventType', value)}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Tipo de Evento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los Eventos</SelectItem>
                  <SelectItem value="SALIDA_LLENO">SALIDA_LLENO</SelectItem>
                  <SelectItem value="RETORNO_VACIO">RETORNO_VACIO</SelectItem>
                  <SelectItem value="SALIDA_VACIO">SALIDA_VACIO</SelectItem>
                  <SelectItem value="DEVOLUCION_LLENO">DEVOLUCION_LLENO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <EventTable events={filteredEvents} assets={assets} isLoading={isLoading} onDelete={handleDelete} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
