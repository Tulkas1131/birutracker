
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { History, Package, Truck, Users, AlertTriangle, PackageCheck, PackageSearch } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/firebase";
import { type Asset, type Event } from "@/lib/types";
import { differenceInDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { collection, query, getDocs, orderBy, where } = await import("firebase/firestore/lite");
        const firestore = db();
        
        const assetsQuery = query(collection(firestore, "assets"));
        const eventsQuery = query(collection(firestore, "events"), orderBy("timestamp", "desc"));
        
        const [assetsSnapshot, eventsSnapshot] = await Promise.all([
          getDocs(assetsQuery),
          getDocs(eventsQuery)
        ]);
        
        const assetsData = assetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
        const eventsData = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
        
        setAssets(assetsData);
        setEvents(eventsData);
      } catch (error) {
        console.error("Error fetching dashboard data: ", error);
        // Handle toast notification if needed
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const metrics = useMemo(() => {
    const assetsEnCliente = assets.filter(asset => asset.location === 'EN_CLIENTE').length;
    const assetsEnReparto = assets.filter(asset => asset.location === 'EN_REPARTO').length;
    
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const movimientosUltimas24h = events.filter(event => event.timestamp.toDate() > twentyFourHoursAgo).length;

    const deliveryEvents = events.filter(e => e.event_type === 'ENTREGA_A_CLIENTE');
    const assetLastDeliveryMap = new Map<string, Date>();

    deliveryEvents.forEach(event => {
      if (!assetLastDeliveryMap.has(event.asset_id)) {
        assetLastDeliveryMap.set(event.asset_id, event.timestamp.toDate());
      }
    });

    const activosCriticos = assets.reduce((count, asset) => {
      if (asset.location === 'EN_CLIENTE') {
        const lastDeliveryDate = assetLastDeliveryMap.get(asset.id);
        if (lastDeliveryDate && differenceInDays(now, lastDeliveryDate) > 30) {
          return count + 1;
        }
      }
      return count;
    }, 0);

    return {
      assetsEnCliente,
      assetsEnReparto,
      movimientosUltimas24h,
      activosCriticos,
    };
  }, [assets, events]);
  
  const StatCard = ({ title, value, icon, href, isAlert }: { title: string, value: number, icon: React.ReactNode, href?: string, isAlert?: boolean }) => {
     const cardContent = (
         <Card className={`transition-transform hover:scale-105 hover:shadow-lg ${isAlert ? 'bg-destructive/10 border-destructive' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-8 w-1/2" />
                ) : (
                    <div className="text-2xl font-bold">{value}</div>
                )}
            </CardContent>
        </Card>
     );

     return href ? <Link href={href}>{cardContent}</Link> : cardContent;
  };

  const navLinks = [
      {
        title: "Registrar Movimiento",
        description: "Registra entregas y retornos de activos.",
        href: "/dashboard/movements",
        icon: <Truck className="h-6 w-6 text-muted-foreground" />,
      },
      {
        title: "Gestionar Activos",
        description: "Ver, crear y editar barriles y cilindros.",
        href: "/dashboard/assets",
        icon: <Package className="h-6 w-6 text-muted-foreground" />,
      },
      {
        title: "Gestionar Clientes",
        description: "Mantén un registro de tus clientes.",
        href: "/dashboard/customers",
        icon: <Users className="h-6 w-6 text-muted-foreground" />,
      },
      {
        title: "Ver Historial Completo",
        description: "Explora el historial de movimientos.",
        href: "/dashboard/history",
        icon: <History className="h-6 w-6 text-muted-foreground" />,
      },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Panel de Control" description="¡Bienvenido de nuevo! Aquí tienes un resumen rápido." />
      <main className="flex-1 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard 
                title="Activos Críticos (>30 días)" 
                value={metrics.activosCriticos} 
                icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />} 
                isAlert={metrics.activosCriticos > 0}
            />
             <StatCard 
                title="Activos en Clientes" 
                value={metrics.assetsEnCliente} 
                icon={<PackageCheck className="h-4 w-4 text-muted-foreground" />} 
            />
            <StatCard 
                title="Activos en Reparto" 
                value={metrics.assetsEnReparto} 
                icon={<PackageSearch className="h-4 w-4 text-muted-foreground" />} 
            />
            <StatCard 
                title="Movimientos (Últimas 24h)" 
                value={metrics.movimientosUltimas24h} 
                icon={<History className="h-4 w-4 text-muted-foreground" />} 
                href="/dashboard/history"
            />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
            {navLinks.map((link) => (
                <Link href={link.href} key={link.title}>
                    <Card className="flex items-center p-4 transition-transform hover:scale-105 hover:shadow-lg h-full">
                        <div className="mr-4">
                            {link.icon}
                        </div>
                        <div>
                            <h3 className="font-semibold">{link.title}</h3>
                            <p className="text-sm text-muted-foreground">{link.description}</p>
                        </div>
                    </Card>
                </Link>
            ))}
        </div>
      </main>
    </div>
  );
}

    