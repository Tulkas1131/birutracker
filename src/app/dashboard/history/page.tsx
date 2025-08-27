"use client";

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Event } from "@/lib/types";

export default function HistoryPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    customer: '',
    assetType: 'ALL',
    eventType: 'ALL',
  });

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        const q = query(collection(db, "events"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        const eventsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
        setEvents(eventsList);
      } catch (error) {
        console.error("Error fetching events: ", error);
        toast({
          title: "Error",
          description: "No se pudo cargar el historial de movimientos.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const filteredEvents = useMemo(() => {
    return events
      .filter(event => {
        const customerMatch = event.customer_name.toLowerCase().includes(filters.customer.toLowerCase());
        const assetTypeMatch = filters.assetType === 'ALL' || event.asset_code.startsWith(filters.assetType);
        const eventTypeMatch = filters.eventType === 'ALL' || event.event_type === filters.eventType;
        return customerMatch && assetTypeMatch && eventTypeMatch;
      });
  }, [events, filters]);

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleString();
  };
  
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
                  <SelectItem value="KEG">BARRIL</SelectItem>
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
                  <SelectItem value="DEVOLUCION_VACIO">DEVOLUCION_VACIO</SelectItem>
                  <SelectItem value="SALIDA_VACIO">SALIDA_VACIO</SelectItem>
                  <SelectItem value="ENTRADA_LLENO">ENTRADA_LLENO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isLoading ? (
               <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
               </div>
            ) : (
              <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Código de Activo</TableHead>
                    <TableHead>Tipo de Evento</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Variedad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>{formatDate(event.timestamp)}</TableCell>
                      <TableCell className="font-medium">{event.asset_code}</TableCell>
                      <TableCell>{event.event_type}</TableCell>
                      <TableCell>{event.customer_name}</TableCell>
                      <TableCell>{event.variety || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredEvents.length === 0 && (
                <div className="py-10 text-center text-muted-foreground">
                  No se encontraron movimientos para los filtros seleccionados.
                </div>
              )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
