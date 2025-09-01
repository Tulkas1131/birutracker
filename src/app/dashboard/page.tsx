
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { History, Package, Truck, Users, PackageCheck, PackageSearch, Warehouse } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/firebase";
import { type Asset, type Event } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function DashboardPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { collection, query, getDocs, orderBy } = await import("firebase/firestore/lite");
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
    const groupAssetsByFormat = (filteredAssets: Asset[]) => {
      return filteredAssets.reduce((acc, asset) => {
        const key = `${asset.type} ${asset.format}`;
        if (!acc[key]) {
          acc[key] = 0;
        }
        acc[key]++;
        return acc;
      }, {} as Record<string, number>);
    };

    const assetsEnCliente = assets.filter(asset => asset.location === 'EN_CLIENTE');
    const assetsEnPlanta = assets.filter(asset => asset.location === 'EN_PLANTA');
    const assetsEnReparto = assets.filter(asset => asset.location === 'EN_REPARTO');
    
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const movimientosUltimas24h = events.filter(event => event.timestamp.toDate() > twentyFourHoursAgo).length;

    return {
      assetsEnClienteGrouped: groupAssetsByFormat(assetsEnCliente),
      assetsEnPlantaGrouped: groupAssetsByFormat(assetsEnPlanta),
      assetsEnRepartoGrouped: groupAssetsByFormat(assetsEnReparto),
      movimientosUltimas24h,
    };
  }, [assets, events]);
  
  const StatCard = ({ title, value, icon, href }: { title: string, value: number, icon: React.ReactNode, href?: string }) => {
     const cardContent = (
         <Card className="transition-transform hover:scale-105 hover:shadow-lg">
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
  
  const GroupedStatCard = ({ title, data, icon, type }: { title: string, data: Record<string, number>, icon: React.ReactNode, type: 'BARRIL' | 'CO2' }) => {
    const filteredData = Object.entries(data).filter(([key]) => key.startsWith(type));
    
    if (isLoading) {
      return (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </CardContent>
        </Card>
      )
    }
    
    return (
      <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              {icon}
          </CardHeader>
          <CardContent>
            {filteredData.length > 0 ? (
                filteredData.map(([key, value]) => (
                   <div key={key} className="text-lg font-bold">
                      <span className="text-muted-foreground text-sm font-medium">{key.replace(type, '').trim()}: </span>
                      {value}
                   </div>
                ))
            ) : (
                 <div className="text-lg font-bold">
                    <span className="text-muted-foreground text-sm font-medium">Total: </span>
                    0
                 </div>
            )}
          </CardContent>
      </Card>
    )
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
                title="Movimientos (Últimas 24h)" 
                value={metrics.movimientosUltimas24h} 
                icon={<History className="h-4 w-4 text-muted-foreground" />} 
                href="/dashboard/history"
            />
        </div>

        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold tracking-tight mb-4">Activos en Reparto</h2>
                <div className="grid gap-4 md:grid-cols-2">
                     <GroupedStatCard 
                        title="Barriles en Reparto" 
                        data={metrics.assetsEnRepartoGrouped} 
                        icon={<PackageSearch className="h-4 w-4 text-muted-foreground" />} 
                        type="BARRIL"
                    />
                     <GroupedStatCard 
                        title="CO2 en Reparto" 
                        data={metrics.assetsEnRepartoGrouped} 
                        icon={<PackageSearch className="h-4 w-4 text-muted-foreground" />} 
                        type="CO2"
                    />
                </div>
            </div>

            <div>
                <h2 className="text-xl font-bold tracking-tight mb-4">Activos en Planta</h2>
                <div className="grid gap-4 md:grid-cols-2">
                     <GroupedStatCard 
                        title="Barriles en Planta" 
                        data={metrics.assetsEnPlantaGrouped} 
                        icon={<Warehouse className="h-4 w-4 text-muted-foreground" />} 
                        type="BARRIL"
                    />
                     <GroupedStatCard 
                        title="CO2 en Planta" 
                        data={metrics.assetsEnPlantaGrouped} 
                        icon={<Warehouse className="h-4 w-4 text-muted-foreground" />} 
                        type="CO2"
                    />
                </div>
            </div>

            <div>
                <h2 className="text-xl font-bold tracking-tight mb-4">Activos en Clientes</h2>
                <div className="grid gap-4 md:grid-cols-2">
                     <GroupedStatCard 
                        title="Barriles en Clientes" 
                        data={metrics.assetsEnClienteGrouped} 
                        icon={<PackageCheck className="h-4 w-4 text-muted-foreground" />} 
                        type="BARRIL"
                    />
                     <GroupedStatCard 
                        title="CO2 en Clientes" 
                        data={metrics.assetsEnClienteGrouped} 
                        icon={<PackageCheck className="h-4 w-4 text-muted-foreground" />} 
                        type="CO2"
                    />
                </div>
            </div>
        </div>
        
        <Separator className="my-6" />

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
