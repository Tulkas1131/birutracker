
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  History,
  LayoutDashboard,
  LogOut,
  Package,
  Truck,
  Users,
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
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

interface UserData {
    email?: string;
    photoURL?: string;
    role: string;
}

export function DashboardLayoutContent({ children, user }: { children: React.React.Node, user: UserData }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Panel de Control" },
    { href: "/dashboard/assets", icon: Package, label: "Activos" },
    { href: "/dashboard/customers", icon: Users, label: "Clientes" },
    { href: "/dashboard/movements", icon: Truck, label: "Registrar Movimiento" },
    { href: "/dashboard/history", icon: History, label: "Historial" },
  ];

  const handleSignOut = async () => {
    const authInstance = auth();
    await signOut(authInstance);
    // The redirect logic in the layout will handle pushing the user to the login page.
    window.location.href = '/';
  };
  
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
                <span className="font-semibold">{user.role}</span>
                <span className="text-muted-foreground truncate">{user.email}</span>
              </div>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <button onClick={handleSignOut} title="Cerrar Sesión">
                <LogOut className="size-5" />
              </button>
            </div>
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
