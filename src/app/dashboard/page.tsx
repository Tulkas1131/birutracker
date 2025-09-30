
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { History, Package, Truck, Users, PackageCheck, PackageSearch, Warehouse, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/firebase";
import { type Asset, type Event } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { differenceInDays } from "date-fns";

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

    const deliveryEventsMap = new Map<string, Date>();
    events
        .filter(e => e.event_type === 'ENTREGA_A_CLIENTE')
        .forEach(e => {
            // We only care about the latest delivery event for each asset
            if (!deliveryEventsMap.has(e.asset_id)) {
                deliveryEventsMap.set(e.asset_id, e.timestamp.toDate());
            }
        });

    const activosCriticos = assetsEnCliente.filter(asset => {
        const deliveryDate = deliveryEventsMap.get(asset.id);
        if (deliveryDate) {
            return differenceInDays(now, deliveryDate) > 30;
        }
        return false;
    }).length;

    return {
      assetsEnClienteGrouped: groupAssetsByFormat(assetsEnCliente),
      assetsEnPlantaGrouped: groupAssetsByFormat(assetsEnPlanta),
      assetsEnRepartoGrouped: groupAssetsByFormat(assetsEnReparto),
      movimientosUltimas24h,
      activosCriticos,
    };
  }, [assets, events]);
  
  const StatCard = ({ title, value, icon, href }: { title: string, value: number, icon: React.ReactNode, href?: string }) => {
     const cardContent = (
         <Card className="transition-transform hover:scale-105 hover:shadow-lg h-full">
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
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
          </CardHeader>
          <CardContent className="space-y-2 pt-6">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </CardContent>
        </Card>
      )
    }
    
    return (
      <Card className="h-full">
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

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Panel de Control" description="¡Bienvenido de nuevo! Aquí tienes un resumen rápido." />
      <main className="flex-1 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="lg:col-span-2">
              <StatCard 
                  title="Movimientos (Últimas 24h)" 
                  value={metrics.movimientosUltimas24h} 
                  icon={<History className="h-4 w-4 text-muted-foreground" />} 
                  href="/dashboard/overview"
              />
          </div>
          <div className="lg:col-span-2">
              <StatCard 
                  title="Activos Críticos (>30 días)" 
                  value={metrics.activosCriticos} 
                  icon={<AlertTriangle className="h-4 w-4 text-destructive" />} 
                  href="/dashboard/overview"
              />
          </div>
          
          <div className="lg:col-span-2">
             <GroupedStatCard 
                title="Barriles en Reparto" 
                data={metrics.assetsEnRepartoGrouped} 
                icon={<PackageSearch className="h-4 w-4 text-muted-foreground" />} 
                type="BARRIL"
            />
          </div>
          <div className="lg:col-span-2">
             <GroupedStatCard 
                title="CO2 en Reparto" 
                data={metrics.assetsEnRepartoGrouped} 
                icon={<PackageSearch className="h-4 w-4 text-muted-foreground" />} 
                type="CO2"
            />
          </div>

          <div className="lg:col-span-2">
             <GroupedStatCard 
                title="Barriles en Planta" 
                data={metrics.assetsEnPlantaGrouped} 
                icon={<Warehouse className="h-4 w-4 text-muted-foreground" />} 
                type="BARRIL"
            />
          </div>
           <div className="lg:col-span-2">
             <GroupedStatCard 
                title="CO2 en Planta" 
                data={metrics.assetsEnPlantaGrouped} 
                icon={<Warehouse className="h-4 w-4 text-muted-foreground" />} 
                type="CO2"
            />
          </div>

          <div className="lg:col-span-2">
             <GroupedStatCard 
                title="Barriles en Clientes" 
                data={metrics.assetsEnClienteGrouped} 
                icon={<PackageCheck className="h-4 w-4 text-muted-foreground" />} 
                type="BARRIL"
            />
          </div>
          <div className="lg:col-span-2">
             <GroupedStatCard 
                title="CO2 en Clientes" 
                data={metrics.assetsEnClienteGrouped} 
                icon={<PackageCheck className="h-4 w-4 text-muted-foreground" />} 
                type="CO2"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

    
