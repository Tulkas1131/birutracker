
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { History, Package, Users, AlertTriangle, PieChart as PieChartIcon, BarChart as BarChartIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/firebase";
import { type Asset, type Event, type Customer } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, XAxis, YAxis, Bar, Tooltip } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import { differenceInDays } from 'date-fns';

const chartConfig = {
  assets: {
    label: "Activos",
  },
  enPlanta: {
    label: "En Planta",
    color: "hsl(var(--chart-2))",
  },
  enReparto: {
    label: "En Reparto",
    color: "hsl(var(--chart-3))",
  },
  enCliente: {
    label: "En Cliente",
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
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { collection, query, getDocs, orderBy } = await import("firebase/firestore/lite");
        const firestore = db();
        
        const assetsQuery = query(collection(firestore, "assets"));
        const eventsQuery = query(collection(firestore, "events"), orderBy("timestamp", "desc"));
        const customersQuery = query(collection(firestore, "customers"));
        
        const [assetsSnapshot, eventsSnapshot, customersSnapshot] = await Promise.all([
          getDocs(assetsQuery),
          getDocs(eventsQuery),
          getDocs(customersQuery),
        ]);
        
        const assetsData = assetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
        const eventsData = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
        const customersData = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));

        setAssets(assetsData);
        setEvents(eventsData);
        setCustomers(customersData);
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
    const assetsEnCliente = assets.filter(asset => asset.location === 'EN_CLIENTE');
    const assetsEnPlanta = assets.filter(asset => asset.location === 'EN_PLANTA');
    const assetsEnReparto = assets.filter(asset => asset.location === 'EN_REPARTO');
    
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const movimientosUltimas24h = events.filter(event => event.timestamp.toDate() > twentyFourHoursAgo).length;

    // Create a set of asset IDs that are currently with a customer for quick lookup.
    const assetsEnClienteIds = new Set(assetsEnCliente.map(a => a.id));
    
    // Create a map of the most recent 'ENTREGA_A_CLIENTE' event for each asset.
    const lastDeliveryEventMap = new Map<string, Date>();
    events
        .filter(e => e.event_type === 'ENTREGA_A_CLIENTE')
        .forEach(e => {
            // Since events are sorted descending, the first one we find is the latest.
            // Crucially, we only consider it if the asset is STILL with a customer.
            if (!lastDeliveryEventMap.has(e.asset_id) && assetsEnClienteIds.has(e.asset_id)) {
                lastDeliveryEventMap.set(e.asset_id, e.timestamp.toDate());
            }
        });

    const activosCriticos = assetsEnCliente.filter(asset => {
        const lastDeliveryDate = lastDeliveryEventMap.get(asset.id);
        if (lastDeliveryDate) {
            return differenceInDays(now, lastDeliveryDate) >= 30;
        }
        return false;
    }).length;
    
    const assetDistribution = [
      { name: "En Planta", value: assetsEnPlanta.length, fill: "var(--color-enPlanta)" },
      { name: "En Reparto", value: assetsEnReparto.length, fill: "var(--color-enReparto)" },
      { name: "En Cliente", value: assetsEnCliente.length, fill: "var(--color-enCliente)" },
    ];
    
    const customerAssetCount = assetsEnCliente.reduce((acc, asset) => {
        const lastEvent = events.find(e => e.asset_id === asset.id && e.event_type === 'ENTREGA_A_CLIENTE');
        if (lastEvent) {
           acc[lastEvent.customer_name] = (acc[lastEvent.customer_name] || 0) + 1;
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
      assetDistribution,
      topCustomers,
      totalAssets: assets.length
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
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
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PieChartIcon className="h-5 w-5 text-muted-foreground" />
                        Distribución de Activos
                    </CardTitle>
                </CardHeader>
                <CardContent>
                     {isLoading ? (
                        <div className="flex items-center justify-center h-60">
                            <Skeleton className="h-48 w-48 rounded-full" />
                        </div>
                     ) : (
                        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-60">
                            <PieChart>
                                <ChartTooltip content={<ChartTooltipContent nameKey="value" hideLabel />} />
                                <Pie
                                    data={metrics.assetDistribution}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={50}
                                    strokeWidth={2}
                                >
                                {metrics.assetDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                                </Pie>
                            </PieChart>
                        </ChartContainer>
                     )}
                </CardContent>
            </Card>

            <Card className="lg:col-span-3">
                <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <BarChartIcon className="h-5 w-5 text-muted-foreground" />
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
                        <ChartContainer config={chartConfig} className="h-60 w-full">
                            <BarChart accessibilityLayer data={metrics.topCustomers} layout="vertical" margin={{ left: 10, right: 30 }}>
                                <XAxis type="number" hide />
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
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
