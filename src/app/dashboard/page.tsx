
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { History, Package, Users, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { collection, getCountFromServer, query, where, Timestamp } from "firebase/firestore";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({
    enPlanta: 0,
    enCliente: 0,
    enReparto: 0,
    activosCriticos: 0,
    totalAssets: 0,
    totalCustomers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    const firestore = db;
    try {
      const assetsCollection = collection(firestore, "assets");
      const customersCollection = collection(firestore, "customers");

      const thirtyDaysAgo = Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 30)));

      const [
        enPlantaSnap,
        enClienteSnap,
        enRepartoSnap,
        totalAssetsSnap,
        totalCustomersSnap,
        activosCriticosSnap,
      ] = await Promise.all([
        getCountFromServer(query(assetsCollection, where("location", "==", "EN_PLANTA"))),
        getCountFromServer(query(assetsCollection, where("location", "==", "EN_CLIENTE"))),
        getCountFromServer(query(assetsCollection, where("location", "==", "EN_REPARTO"))),
        getCountFromServer(assetsCollection),
        getCountFromServer(customersCollection),
        // Esta es la consulta más compleja y que puede requerir un índice.
        // Contamos los eventos de entrega a cliente de hace más de 30 días
        // para activos que AÚN están en cliente. Es una aproximación.
        getCountFromServer(
          query(
            collection(firestore, "events"),
            where("event_type", "==", "ENTREGA_A_CLIENTE"),
            where("timestamp", "<=", thirtyDaysAgo)
          )
        ),
      ]);

      setMetrics({
        enPlanta: enPlantaSnap.data().count,
        enCliente: enClienteSnap.data().count,
        enReparto: enRepartoSnap.data().count,
        totalAssets: totalAssetsSnap.data().count,
        totalCustomers: totalCustomersSnap.data().count,
        activosCriticos: activosCriticosSnap.data().count,
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // En caso de error, muestra 0 para no bloquear la UI.
      setMetrics({
        enPlanta: 0, enCliente: 0, enReparto: 0,
        activosCriticos: 0, totalAssets: 0, totalCustomers: 0
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);
  
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
              title="Activos Totales" 
              value={metrics.totalAssets} 
              icon={<Package className="h-4 w-4 text-muted-foreground" />} 
              href="/dashboard/assets"
          />
          <StatCard 
              title="Clientes Totales" 
              value={metrics.totalCustomers} 
              icon={<Users className="h-4 w-4 text-muted-foreground" />} 
              href="/dashboard/customers"
          />
           <StatCard 
              title="Activos en Planta" 
              value={metrics.enPlanta} 
              icon={<Package className="h-4 w-4 text-muted-foreground" />} 
          />
          <StatCard 
              title="Activos en Cliente" 
              value={metrics.enCliente} 
              icon={<Users className="h-4 w-4 text-muted-foreground" />} 
          />
          <StatCard 
              title="Activos en Reparto" 
              value={metrics.enReparto} 
              icon={<History className="h-4 w-4 text-muted-foreground" />} 
              href="/dashboard/overview"
          />
          <StatCard 
              title="Activos Críticos (>=30 días)" 
              value={metrics.activosCriticos} 
              icon={<AlertTriangle className="h-4 w-4 text-destructive" />} 
              href="/dashboard/overview"
          />
        </div>
      </main>
    </div>
  );
}
