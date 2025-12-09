
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { History, Package, Users, AlertTriangle, BarChart as BarChartIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/firebase";
import { type Asset, type Event, type Customer } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, XAxis, YAxis, Bar, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import { differenceInDays } from 'date-fns';
import { collection, onSnapshot, query } from "firebase/firestore/lite";


const chartConfig = {
  barriles50L: {
    label: "Barriles 50L",
    color: "hsl(var(--chart-2))",
  },
  barriles30LSLIM: {
    label: "Barriles 30L SLIM",
    color: "hsl(var(--chart-3))",
  },
  barriles30L: {
    label: "Barriles 30L",
    color: "hsl(var(--chart-4))",
  },
  co2: {
    label: "CO2",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;


export default function DashboardPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    const firestore = db();
    
    const unsubscribers = [
      onSnapshot(collection(firestore, "assets"), (snapshot) => {
        setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)));
      }),
      onSnapshot(query(collection(firestore, "events")), (snapshot) => {
        setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event)));
      }),
      onSnapshot(collection(firestore, "customers"), (snapshot) => {
        setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
        setIsLoading(false);
      }),
    ];

    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  const metrics = useMemo(() => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const movimientosUltimas24h = events.filter(event => event.timestamp.toDate() > twentyFourHoursAgo).length;

    // Create a map of the last known event for each asset for efficiency
    const lastEventsMap = new Map<string, Event>();
    for (const event of events.sort((a,b) => b.timestamp.toMillis() - a.timestamp.toMillis())) {
        if (!lastEventsMap.has(event.asset_id)) {
            lastEventsMap.set(event.asset_id, event);
        }
    }
    
    const activosCriticos = assets.reduce((count, asset) => {
        if (asset.location !== 'EN_CLIENTE') {
            return count;
        }

        const lastEvent = lastEventsMap.get(asset.id);
        
        if (lastEvent && lastEvent.event_type === 'ENTREGA_A_CLIENTE') {
            const daysAtCustomer = differenceInDays(now, lastEvent.timestamp.toDate());
            if (daysAtCustomer >= 30) {
                return count + 1;
            }
        }
        return count;
    }, 0);
    
    const assetsByLocation = assets.reduce((acc, asset) => {
        const location = asset.location.replace('_', ' ');
        if (!acc[location]) {
            acc[location] = { location, barriles50L: 0, barriles30LSLIM: 0, barriles30L: 0, co2: 0 };
        }
        if (asset.type === 'BARRIL') {
            if (asset.format === '50L') acc[location].barriles50L++;
            else if (asset.format === '30L SLIM') acc[location].barriles30LSLIM++;
            else if (asset.format === '30L') acc[location].barriles30L++;
        } else if (asset.type === 'CO2') {
            acc[location].co2++;
        }
        return acc;
    }, {} as Record<string, { location: string; barriles50L: number; barriles30LSLIM: number; barriles30L: number; co2: number }>);
    
    const locationDistribution = Object.values(assetsByLocation);

    const customerAssetCount = Array.from(lastEventsMap.values()).reduce((acc, event) => {
        const asset = assets.find(a => a.id === event.asset_id);
        if (event.event_type === 'ENTREGA_A_CLIENTE' && asset?.location === 'EN_CLIENTE') {
            acc[event.customer_name] = (acc[event.customer_name] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const topCustomers = Object.entries(customerAssetCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, isMobile ? 5 : 7)
      .map(([name, value]) => ({ name, assets: value }));

    return {
      movimientosUltimas24h,
      activosCriticos,
      locationDistribution,
      topCustomers,
      totalAssets: assets.length,
    };
  }, [assets, events, isMobile]);
  
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

     if (href) {
       const url = new URL(href, window.location.origin);
       if (title.includes("Críticos")) {
           url.searchParams.append('critical', 'true');
       }
       return <Link href={url.pathname + url.search}>{cardContent}</Link>;
     }

     return cardContent;
  };

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Panel de Control" description="¡Bienvenido de nuevo! Aquí tienes un resumen rápido." />
      <main className="flex-1 p-4 md:p-6">
         <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
             <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChartIcon className="h-5 w-5 text-muted-foreground" />
                        Distribución de Activos por Ubicación
                    </CardTitle>
                </CardHeader>
                <CardContent>
                     {isLoading ? (
                        <div className="flex items-center justify-center h-60">
                           <Skeleton className="h-full w-full" />
                        </div>
                     ) : (
                        <ChartContainer config={chartConfig} className="h-60 w-full">
                          <ResponsiveContainer>
                            <BarChart accessibilityLayer data={metrics.locationDistribution} layout="vertical">
                                <CartesianGrid vertical={false} />
                                <XAxis type="number" />
                                <YAxis 
                                    dataKey="location" 
                                    type="category" 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tickMargin={10}
                                    width={isMobile ? 70 : 80}
                                    className="text-xs truncate"
                                />
                                <ChartTooltip 
                                    content={<ChartTooltipContent />} 
                                />
                                <Bar dataKey="barriles50L" stackId="a" fill={chartConfig.barriles50L.color} name="50L" />
                                <Bar dataKey="barriles30LSLIM" stackId="a" fill={chartConfig.barriles30LSLIM.color} name="30L SLIM" />
                                <Bar dataKey="barriles30L" stackId="a" fill={chartConfig.barriles30L.color} name="30L" />
                                <Bar dataKey="co2" stackId="a" fill={chartConfig.co2.color} name="CO2" />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                     )}
                </CardContent>
            </Card>

            <Card className="lg:col-span-3">
                <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        Top Clientes por Activos
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4 h-60 pr-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 flex-1" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <ChartContainer config={{...chartConfig, assets: {label: "Activos"}}} className="h-60 w-full">
                          <ResponsiveContainer>
                            <BarChart accessibilityLayer data={metrics.topCustomers} layout="vertical" margin={{ left: 10, right: 30 }}>
                                <CartesianGrid horizontal={false} />
                                <XAxis type="number" dataKey="assets" />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tickMargin={10}
                                    width={isMobile ? 80 : 120}
                                    className="text-xs truncate"
                                />
                                <ChartTooltip 
                                    cursor={false}
                                    content={<ChartTooltipContent indicator="dot" />} 
                                />
                                <Bar dataKey="assets" radius={4} fill="hsl(var(--primary))" />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
              title="Movimientos (Últimas 24h)" 
              value={metrics.movimientosUltimas24h} 
              icon={<History className="h-4 w-4 text-muted-foreground" />} 
              href="/dashboard/overview"
          />
          <StatCard 
              title="Activos Críticos (>=30 días)" 
              value={metrics.activosCriticos} 
              icon={<AlertTriangle className="h-4 w-4 text-destructive" />} 
              href="/dashboard/overview"
          />
          <StatCard 
              title="Activos Totales" 
              value={metrics.totalAssets} 
              icon={<Package className="h-4 w-4 text-muted-foreground" />} 
              href="/dashboard/assets"
          />
           <StatCard 
              title="Clientes Totales" 
              value={customers.length} 
              icon={<Users className="h-4 w-4 text-muted-foreground" />} 
              href="/dashboard/customers"
          />
        </div>
      </main>
    </div>
  );
}

    