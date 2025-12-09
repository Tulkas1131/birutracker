
"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Timestamp, DocumentData, QueryDocumentSnapshot } from "firebase/firestore/lite";
import { auth, db } from "@/lib/firebase";
import { Loader2, Trash2, ChevronLeft, ChevronRight, SearchX, User } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Event, Asset, MovementEventType, UserData } from "@/lib/types";
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
import { useAuthState } from 'react-firebase-hooks/auth';
import { cn } from '@/lib/utils';

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

function EventCardMobile({ event, asset, user, currentUser, onDelete, daysAtCustomer, variety, valveType }: { event: Event, asset: Asset | undefined, user: UserData | undefined, currentUser: any, onDelete: (id: string) => void, daysAtCustomer: number | null, variety?: string, valveType?: string }) {
    const userRole = useUserRole();
    const isCurrentUserEvent = currentUser?.uid === event.user_id;

    return (
        <div className={cn("rounded-lg border bg-card p-4", isCurrentUserEvent && userRole === 'Operador' && "bg-primary/5 border-primary/20")}>
            <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1.5">
                    <span className="font-semibold">{event.asset_code} {asset && `(${asset.format})`}</span>
                    <span className="text-sm font-medium">{formatEventType(event.event_type)}</span>
                    <span className="text-sm text-muted-foreground">{event.customer_name}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(event.timestamp)}</span>
                     {asset?.type === 'BARRIL' && variety && <span className="text-xs text-muted-foreground">Variedad: {variety}</span>}
                     {asset?.type === 'BARRIL' && valveType && <span className="text-xs text-muted-foreground">Válvula: {valveType}</span>}
                     {userRole === 'Admin' && user && (
                         <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                            <User className="h-3 w-3" />
                            <span>{user.email}</span>
                        </div>
                     )}
                     {isCurrentUserEvent && userRole === 'Operador' && (
                        <Badge variant="outline" className="w-fit mt-1">Mi Movimiento</Badge>
                     )}
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

function EventTableRow({ event, asset, user, currentUser, onDelete, showBeerColumns, daysAtCustomer, variety, valveType }: { event: Event, asset: Asset | undefined, user: UserData | undefined, currentUser: any, onDelete: (id: string) => void, showBeerColumns: boolean, daysAtCustomer: number | null, variety?: string, valveType?: string }) {
  const userRole = useUserRole();
  const isCurrentUserEvent = currentUser?.uid === event.user_id;

  return (
    <TableRow className={cn(isCurrentUserEvent && userRole === 'Operador' && "bg-primary/5")}>
      <TableCell className="hidden sm:table-cell">{formatDate(event.timestamp)}</TableCell>
      <TableCell className="font-medium">{event.asset_code} {asset && `(${asset.format})`}</TableCell>
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
      {showBeerColumns && <TableCell className="hidden lg:table-cell">{variety || 'N/A'}</TableCell>}
      {showBeerColumns && <TableCell className="hidden lg:table-cell">{valveType || 'N/A'}</TableCell>}
      {userRole === 'Admin' && (
          <TableCell>{user?.email || 'Desconocido'}</TableCell>
      )}
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
  const [events, setEvents] = useState<Event[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  
  const [filters, setFilters] = useState({
    customer: '',
    assetCode: '',
    assetType: 'ALL',
    eventType: 'ALL',
    criticalOnly: searchParams.get('critical') === 'true',
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [pageHistory, setPageHistory] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([null]);
  const [totalEvents, setTotalEvents] = useState(0);

  const { toast } = useToast();
  const userRole = useUserRole();
  const [currentUser] = useAuthState(auth());
  const isMobile = useIsMobile();

  const fetchEvents = useCallback(async (
    page: number, 
    lastDoc: QueryDocumentSnapshot<DocumentData> | null = null
  ) => {
    setIsLoading(true);
    try {
        const { collection, query, where, orderBy, getDocs, limit, startAfter, getCount } = await import("firebase/firestore/lite");
        const firestore = db();
        
        let conditions = [];
        if (filters.customer) conditions.push(where("customer_name", ">=", filters.customer), where("customer_name", "<=", filters.customer + '\uf8ff'));
        if (filters.assetCode) conditions.push(where("asset_code", "==", filters.assetCode));
        if (filters.eventType !== 'ALL') conditions.push(where("event_type", "==", filters.eventType));
        
        const assetsToFilter = filters.assetType !== 'ALL' ? assets.filter(a => a.type === filters.assetType).map(a => a.id) : [];
        if (filters.assetType !== 'ALL' && assetsToFilter.length > 0) {
            conditions.push(where("asset_id", "in", assetsToFilter));
        }

        if (filters.criticalOnly) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            conditions.push(where("timestamp", "<=", thirtyDaysAgo));
            conditions.push(where("event_type", "==", "ENTREGA_A_CLIENTE"));
        }

        const eventsCollection = collection(firestore, "events");
        const countQuery = query(eventsCollection, ...conditions);
        const countSnapshot = await getCount(countQuery);
        setTotalEvents(countSnapshot.data().count);
        
        let eventsQuery = query(eventsCollection, ...conditions, orderBy("timestamp", "desc"));
        if (lastDoc) {
            eventsQuery = query(eventsQuery, startAfter(lastDoc));
        }
        eventsQuery = query(eventsQuery, limit(ITEMS_PER_PAGE));
        
        const eventsSnapshot = await getDocs(eventsQuery);
        const eventsData = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
        setEvents(eventsData);

        const newLastVisible = eventsSnapshot.docs[eventsSnapshot.docs.length - 1] || null;
        setLastVisible(newLastVisible);

        if (page > currentPage) {
            setPageHistory(prev => [...prev, lastDoc]);
        }

    } catch(error: any) {
        console.error("Error fetching data: ", error);
        logAppEvent({ level: 'ERROR', message: 'Failed to fetch history data', component: 'HistoryPage', stack: error.stack });
        toast({ title: "Error al Cargar Historial", description: "No se pudo cargar el historial de movimientos.", variant: "destructive"});
    } finally {
        setIsLoading(false);
    }
  }, [filters, assets, toast, currentPage]);

  useEffect(() => {
    const firestore = db();
    const { collection, onSnapshot } = require("firebase/firestore/lite");
    const unsubAssets = onSnapshot(collection(firestore, "assets"), (snapshot) => {
        setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)));
    });
    const unsubUsers = onSnapshot(collection(firestore, "users"), (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData)));
    });
    return () => {
        unsubAssets();
        unsubUsers();
    };
  }, []);

  useEffect(() => {
    // Reset pagination and fetch data when filters change
    if (assets.length > 0) { // Ensure assets are loaded before firing queries that might depend on them
        setCurrentPage(1);
        setPageHistory([null]);
        setLastVisible(null);
        fetchEvents(1, null);
    }
  }, [filters, assets]);

  const goToPage = (page: number) => {
    if (page < 1 || (page > currentPage && !lastVisible)) return;

    setCurrentPage(page);
    const lastDocForPage = page > currentPage ? lastVisible : pageHistory[page - 1];
    if (page < currentPage) {
      setPageHistory(prev => prev.slice(0, page));
    }
    fetchEvents(page, lastDocForPage);
  };
  
  const handleFilterChange = (filterName: keyof typeof filters, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };
  
  const assetsMap = useMemo(() => new Map(assets.map(asset => [asset.id, asset])), [assets]);
  const usersMap = useMemo(() => new Map(users.map(user => [user.id, user])), [users]);

  const assetFillHistoryMap = useMemo(() => {
    const fillHistory = new Map<string, { timestamp: Timestamp; variety?: string; valveType?: string }[]>();
    const fillEvents = events
      .filter(e => e.event_type === 'LLENADO_EN_PLANTA')
      .sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());

    for (const event of fillEvents) {
      if (!fillHistory.has(event.asset_id)) {
        fillHistory.set(event.asset_id, []);
      }
      fillHistory.get(event.asset_id)!.push({
        timestamp: event.timestamp,
        variety: event.variety,
        valveType: event.valveType,
      });
    }
    return fillHistory;
  }, [events]);

  const getCarryForwardData = useCallback((event: Event) => {
    const history = assetFillHistoryMap.get(event.asset_id);
    if (!history) {
      return { variety: event.variety, valveType: event.valveType };
    }
    const lastFill = history.slice().reverse().find(fill => fill.timestamp.toMillis() <= event.timestamp.toMillis());
    return {
      variety: lastFill?.variety || event.variety,
      valveType: lastFill?.valveType || event.valveType
    };
  }, [assetFillHistoryMap]);

  const daysAtCustomerMap = useMemo(() => {
    const map = new Map<string, number>();
    const deliveryEvents = new Map<string, Timestamp>();

    for (const event of events) {
        if (event.event_type === 'ENTREGA_A_CLIENTE' && !deliveryEvents.has(event.asset_id)) {
            deliveryEvents.set(event.asset_id, event.timestamp);
        }
    }

    for (const asset of assets) {
        if (asset.location === 'EN_CLIENTE') {
            const deliveryTimestamp = deliveryEvents.get(asset.id);
            if (deliveryTimestamp) {
                map.set(asset.id, differenceInDays(new Date(), deliveryTimestamp.toDate()));
            }
        }
    }
    return map;
  }, [assets, events]);

  const totalPages = Math.ceil(totalEvents / ITEMS_PER_PAGE);

  const handleDelete = async (id: string) => {
    if (userRole !== 'Admin') {
      toast({ title: "Acceso Denegado", description: "No tienes permiso para eliminar eventos.", variant: "destructive" });
      return;
    }
    const { doc, deleteDoc } = await import("firebase/firestore/lite");
    const firestore = db();
    try {
      await deleteDoc(doc(firestore, "events", id));
      toast({ title: "Evento Eliminado", description: "El evento ha sido eliminado del historial." });
      fetchEvents(currentPage, pageHistory[currentPage - 1]);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 items-start gap-4 p-4 md:p-6">
            <Input
              placeholder="Buscar por cliente..."
              value={filters.customer}
              onChange={(e) => handleFilterChange('customer', e.target.value)}
              className="w-full"
            />
            <Input
              placeholder="Buscar por código..."
              value={filters.assetCode}
              onChange={(e) => handleFilterChange('assetCode', e.target.value)}
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
            <div className="flex items-center space-x-2 justify-self-start xl:justify-self-end">
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
            ) : events.length === 0 ? (
                <EmptyState 
                    icon={<SearchX className="h-16 w-16" />}
                    title="No se encontraron movimientos"
                    description="Prueba a cambiar los filtros o busca por otro criterio para ver el historial de eventos."
                />
            ) : isMobile ? (
                <div className="space-y-4 p-4">
                    {events.map((event) => {
                        const asset = assetsMap.get(event.asset_id);
                        const user = usersMap.get(event.user_id);
                        const days = asset ? daysAtCustomerMap.get(asset.id) : undefined;
                        const { variety, valveType } = getCarryForwardData(event);
                        return (
                           <EventCardMobile key={event.id} event={event} asset={asset} user={user} currentUser={currentUser} onDelete={handleDelete} daysAtCustomer={days === undefined ? null : days} variety={variety} valveType={valveType} />
                        )
                    })}
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
                          {userRole === 'Admin' && <TableHead>Usuario</TableHead>}
                          {userRole === 'Admin' && <TableHead>Acciones</TableHead>}
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => {
                       const asset = assetsMap.get(event.asset_id);
                       const user = usersMap.get(event.user_id);
                       const days = asset ? daysAtCustomerMap.get(asset.id) : undefined;
                       const { variety, valveType } = getCarryForwardData(event);
                       return (
                           <EventTableRow key={event.id} event={event} asset={asset} user={user} currentUser={currentUser} onDelete={handleDelete} showBeerColumns={showBeerColumns} daysAtCustomer={days === undefined ? null : days} variety={variety} valveType={valveType} />
                       )
                    })}
                  </TableBody>
              </Table>
            )}
          </CardContent>
           {totalPages > 1 && !isLoading && events.length > 0 && (
            <CardFooter className="flex items-center justify-between border-t py-4">
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
