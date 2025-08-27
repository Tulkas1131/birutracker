"use client";

import { useState } from "react";
import Link from "next/link";
import { History, Package, Truck, Users, Dna, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { seedDatabase } from "@/lib/seed";
import { useToast } from "@/hooks/use-toast";

const features = [
  {
    title: "Gestionar Activos",
    description: "Ver, crear y editar barriles y cilindros.",
    href: "/dashboard/assets",
    icon: <Package className="h-8 w-8 text-primary" />,
  },
  {
    title: "Gestionar Clientes",
    description: "Lleva un registro de tus clientes y distribuidores.",
    href: "/dashboard/customers",
    icon: <Users className="h-8 w-8 text-primary" />,
  },
  {
    title: "Registrar un Movimiento",
    description: "Registra las salidas y devoluciones de activos.",
    href: "/dashboard/movements",
    icon: <Truck className="h-8 w-8 text-primary" />,
  },
  {
    title: "Ver Historial",
    description: "Navega por el historial completo de movimientos.",
    href: "/dashboard/history",
    icon: <History className="h-8 w-8 text-primary" />,
  },
];

export default function DashboardPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSeed = async () => {
    setIsLoading(true);
    try {
      await seedDatabase();
      toast({
        title: "Base de Datos Poblada",
        description: "Se han añadido los datos de prueba correctamente.",
      });
    } catch (error) {
      console.error("Error populating database:", error);
      toast({
        title: "Error",
        description: "No se pudieron añadir los datos de prueba.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Panel" description="¡Bienvenido de nuevo! Aquí tienes un resumen rápido." />
      <main className="flex-1 p-4 md:p-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {features.map((feature) => (
            <Link href={feature.href} key={feature.title}>
              <Card className="flex h-full flex-col justify-between transition-transform hover:scale-105 hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="mb-1 text-xl">{feature.title}</CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </div>
                    {feature.icon}
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
            <Card className="flex h-full flex-col justify-between sm:col-span-2 lg:col-span-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="mb-1 text-xl">Datos de Prueba</CardTitle>
                    <CardDescription>
                      Puebla la base de datos con activos y clientes ficticios para probar la aplicación.
                    </CardDescription>
                  </div>
                  <Dna className="h-8 w-8 text-primary" />
                </div>
              </CardHeader>
              <CardFooter>
                 <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full" disabled={isLoading}>
                       {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Poblar Base de Datos
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción eliminará todos los datos existentes y los reemplazará con datos de prueba.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSeed} disabled={isLoading}>
                         {isLoading ? "Poblando..." : "Continuar"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
        </div>
      </main>
    </div>
  );
}
