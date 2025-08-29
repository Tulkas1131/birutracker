
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  History,
  LayoutDashboard,
  LogOut,
  Package,
  Truck,
  Users,
  Loader2
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { PageHeader } from "@/components/page-header";
import { useUserRole } from "@/hooks/use-user-role";
import { Logo } from "@/components/logo";

export function DashboardLayoutContent({ children }: { children: React.React.Node }) {
  const authInstance = auth();
  const [user, loading, error] = useAuthState(authInstance);
  const userRole = useUserRole();
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Panel de Control" },
    { href: "/dashboard/assets", icon: Package, label: "Activos" },
    { href: "/dashboard/customers", icon: Users, label: "Clientes" },
    { href: "/dashboard/movements", icon: Truck, label: "Registrar Movimiento" },
    { href: "/dashboard/history", icon: History, label: "Historial" },
  ];

  const handleSignOut = async () => {
    await signOut(authInstance);
    router.push('/');
  };

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
       <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
     return (
       <div className="flex h-screen w-full items-center justify-center">
        <p className="text-destructive">Error: {error.message}</p>
      </div>
    );
  }
  
  if (!user) {
    return null;
  }
  
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo className="size-7" />
            <span className="text-lg font-semibold">BiruTracker</span>
             <div className="ml-auto">
                <div className="sr-only">Toggle Sidebar</div>
             </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild tooltip={item.label} isActive={pathname === item.href}>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-2 p-2">
             <Avatar className="size-8">
                {user.photoURL && <AvatarImage src={user.photoURL} alt="Avatar del usuario" />}
                <AvatarFallback>{user.email?.[0].toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-sm">
                {userRole ? (
                  <span className="font-semibold">{userRole}</span>
                ) : (
                  <span className="font-semibold text-muted-foreground">Cargando...</span>
                )}
                <span className="text-muted-foreground truncate">{user.email}</span>
              </div>
            <button onClick={handleSignOut} className="ml-auto" title="Cerrar Sesión">
              <LogOut className="size-5" />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
         <PageHeader
            title=""
            className="h-14 justify-start px-4 md:px-6"
            action={<SidebarTrigger />}
         />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
