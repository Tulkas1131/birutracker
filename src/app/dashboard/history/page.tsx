"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockEvents } from "@/lib/data";
import type { Event } from "@/lib/types";

export default function HistoryPage() {
  const [events] = useState<Event[]>(mockEvents);
  const [filters, setFilters] = useState({
    customer: '',
    assetType: 'ALL',
    eventType: 'ALL',
  });

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const filteredEvents = useMemo(() => {
    return events
      .filter(event => {
        const customerMatch = event.customer_name.toLowerCase().includes(filters.customer.toLowerCase());
        const assetTypeMatch = filters.assetType === 'ALL' || event.asset_code.includes(filters.assetType);
        const eventTypeMatch = filters.eventType === 'ALL' || event.event_type === filters.eventType;
        return customerMatch && assetTypeMatch && eventTypeMatch;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [events, filters]);
  
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Movement History"
        description="Browse the log of all asset movements."
      />
      <main className="flex-1 p-4 pt-0 md:p-6 md:pt-0">
        <Card>
          <CardContent>
            <div className="flex items-center gap-4 py-4">
              <Input
                placeholder="Filter by customer..."
                value={filters.customer}
                onChange={(e) => handleFilterChange('customer', e.target.value)}
                className="max-w-sm"
              />
              <Select value={filters.assetType} onValueChange={(value) => handleFilterChange('assetType', value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Asset Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Asset Types</SelectItem>
                  <SelectItem value="KEG">BARRIL</SelectItem>
                  <SelectItem value="CO2">CO2</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.eventType} onValueChange={(value) => handleFilterChange('eventType', value)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Event Types</SelectItem>
                  <SelectItem value="SALIDA_LLENO">SALIDA_LLENO</SelectItem>
                  <SelectItem value="DEVOLUCION_VACIO">DEVOLUCION_VACIO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Asset Code</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Customer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{new Date(event.timestamp).toLocaleString()}</TableCell>
                    <TableCell className="font-medium">{event.asset_code}</TableCell>
                    <TableCell>{event.event_type}</TableCell>
                    <TableCell>{event.customer_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredEvents.length === 0 && (
              <div className="py-10 text-center text-muted-foreground">
                No history found for the selected filters.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
