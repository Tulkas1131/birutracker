import Link from "next/link";
import { History, Package, Truck, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

const features = [
  {
    title: "Manage Assets",
    description: "View, create, and edit kegs and cylinders.",
    href: "/dashboard/assets",
    icon: <Package className="h-8 w-8 text-primary" />,
  },
  {
    title: "Manage Customers",
    description: "Keep track of your clients and distributors.",
    href: "/dashboard/customers",
    icon: <Users className="h-8 w-8 text-primary" />,
  },
  {
    title: "Log a Movement",
    description: "Record asset check-outs and returns.",
    href: "/dashboard/movements",
    icon: <Truck className="h-8 w-8 text-primary" />,
  },
  {
    title: "View History",
    description: "Browse the complete history of movements.",
    href: "/dashboard/history",
    icon: <History className="h-8 w-8 text-primary" />,
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Dashboard" description="Welcome back! Here's a quick overview." />
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
