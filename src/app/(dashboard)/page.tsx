
"use client";

import Link from "next/link";
import { History, Package, Truck, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

const features = [
  {
    title: "Gestionar Activos",
    description: "Ver, crear y editar barriles y cilindros.",
    href: "/assets",
    icon: <Package className="h-8 w-8 text-primary" />,
  },
  {
    title: "Gestionar Clientes",
    description: "Mantén un registro de tus clientes y distribuidores.",
    href: "/customers",
    icon: <Users className="h-8 w-8 text-primary" />,
  },
  {
    title: "Registrar un Movimiento",
    description: "Registra entregas y retornos de activos.",
    href: "/movements",
    icon: <Truck className="h-8 w-8 text-primary" />,
  },
  {
    title: "Ver Historial",
    description: "Explora el historial completo de movimientos.",
    href: "/history",
    icon: <History className="h-8 w-8 text-primary" />,
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Panel de Control" description="¡Bienvenido de nuevo! Aquí tienes un resumen rápido." />
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
        </div>
      </main>
    </div>
  );
}
