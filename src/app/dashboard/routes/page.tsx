
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from "@/lib/firebase";
import { PageHeader } from "@/components/page-header";
import { Loader2, Printer, Route as RouteIcon, SearchX, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { type Route, type UserData } from '@/lib/types';
import { Timestamp } from 'firebase/firestore/lite';
import { useUserRole } from '@/hooks/use-user-role';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"


const formatDate = (timestamp: Timestamp) => {
    if (!timestamp || !timestamp.toDate) return 'Fecha inválida';
    return timestamp.toDate().toLocaleString();
};

const getStatusVariant = (status: Route['status']) => {
    switch (status) {
        case 'PENDIENTE': return 'default';
        case 'EN_PROGRESO': return 'warning';
        case 'COMPLETADA': return 'success';
        default: return 'secondary';
    }
}


export default function RoutesPage() {
    const [routes, setRoutes] = useState<Route[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

    const userRole = useUserRole();
    const router = useRouter();

    useEffect(() => {
        if (userRole && userRole !== 'Admin') {
            router.push('/dashboard');
        }
    }, [userRole, router]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        if (userRole === 'Admin') {
            try {
                const { collection, query, orderBy, getDocs } = await import("firebase/firestore/lite");
                const firestore = db();
                const routesQuery = query(collection(firestore, "routes"), orderBy("createdAt", "desc"));
                const usersQuery = query(collection(firestore, "users"));
                
                const [routesSnapshot, usersSnapshot] = await Promise.all([
                    getDocs(routesQuery),
                    getDocs(usersQuery),
                ]);

                const routesData = routesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Route));
                const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));
                
                setRoutes(routesData);
                setUsers(usersData);
            } catch (error) {
                console.error("Error fetching routes data:", error);
            } finally {
                setIsLoading(false);
            }
        }
    }, [userRole]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const usersMap = useMemo(() => new Map(users.map(user => [user.id, user])), [users]);
    
    if (userRole !== 'Admin') {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    const RoutePrintView = ({ route }: { route: Route }) => (
        <div className="p-4 bg-white text-black">
            <h1 className="text-2xl font-bold mb-2">{route.name}</h1>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <p><strong>Fecha de Creación:</strong> {formatDate(route.createdAt)}</p>
                <p><strong>Creado por:</strong> {usersMap.get(route.createdBy)?.email || 'Desconocido'}</p>
                <p><strong>Responsable:</strong> {route.responsible || 'No asignado'}</p>
                <p><strong>Estado:</strong> {route.status}</p>
            </div>
            <hr className="my-4 border-gray-300"/>
            <h2 className="text-xl font-semibold mb-2">Paradas</h2>
            <div className="space-y-4">
                {route.stops.map((stop, index) => (
                    <div key={index} className="border border-gray-300 rounded p-3">
                        <h3 className="font-bold text-lg">{index + 1}. {stop.customerName}</h3>
                        <ul className="list-disc list-inside mt-2">
                           {stop.assets.map(asset => (
                               <li key={asset.id}>{asset.code} ({asset.format})</li>
                           ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="flex flex-1 flex-col">
            <PageHeader
                title="Historial de Rutas"
                description="Consulta todas las hojas de ruta que se han generado para los despachos."
            />
            <main className="flex-1 p-4 pt-0 md:p-6 md:pt-0">
                <Dialog open={!!selectedRoute} onOpenChange={(isOpen) => !isOpen && setSelectedRoute(null)}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Rutas Generadas</CardTitle>
                            <CardDescription>Cada tarjeta representa un despacho masivo creado.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center items-center py-20">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : routes.length === 0 ? (
                                <EmptyState
                                    icon={<SearchX className="h-16 w-16" />}
                                    title="No se han creado rutas"
                                    description="Ve a 'Registrar Movimiento' para crear tu primera hoja de ruta."
                                />
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {routes.map(route => (
                                        <Card key={route.id} className="flex flex-col">
                                            <CardHeader>
                                                <CardTitle className="text-lg">{route.name}</CardTitle>
                                                <CardDescription>{formatDate(route.createdAt)}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="flex-grow">
                                                <div className="text-sm space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4 text-muted-foreground" />
                                                        <span>Creado por: {usersMap.get(route.createdBy)?.email || 'Desconocido'}</span>
                                                    </div>
                                                     <div className="flex items-center gap-2">
                                                        <RouteIcon className="h-4 w-4 text-muted-foreground" />
                                                        <span>{route.stops.length} paradas</span>
                                                    </div>
                                                    <div>
                                                        <Badge variant={getStatusVariant(route.status)}>{route.status}</Badge>
                                                    </div>
                                                </div>
                                            </CardContent>
                                            <CardFooter>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" className="w-full" onClick={() => setSelectedRoute(route)}>
                                                        Ver Detalles
                                                    </Button>
                                                </DialogTrigger>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {selectedRoute && (
                         <DialogContent className="max-w-2xl print:max-w-none print:border-0 print:p-0">
                            <div className="no-print">
                                <DialogHeader>
                                    <DialogTitle>{selectedRoute.name}</DialogTitle>
                                    <DialogDescription>
                                        Detalles de la hoja de ruta generada.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="mt-4 max-h-[60vh] overflow-y-auto p-1">
                                    <RoutePrintView route={selectedRoute} />
                                </div>
                                <DialogFooter className="mt-4">
                                    <Button variant="outline" onClick={() => window.print()}>
                                        <Printer className="mr-2 h-4 w-4" />
                                        Imprimir
                                    </Button>
                                </DialogFooter>
                            </div>
                            <div className="print-only hidden">
                                <RoutePrintView route={selectedRoute} />
                            </div>
                        </DialogContent>
                    )}
                </Dialog>
            </main>
        </div>
    );
}

