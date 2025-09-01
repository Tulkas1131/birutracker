
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
  Plus,
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
import { InstallPWA } from "@/components/install-pwa";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface UserData {
    email?: string;
    photoURL?: string;
    role: string;
}

const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Panel" },
    { href: "/dashboard/assets", icon: Package, label: "Activos" },
    { href: "/dashboard/movements", icon: Truck, label: "Registrar" },
    { href: "/dashboard/customers", icon: Users, label: "Clientes" },
    { href: "/dashboard/history", icon: History, label: "Historial" },
];

function BottomNavBar() {
    const pathname = usePathname();
    const isMobile = useIsMobile();

    if (!isMobile) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm md:hidden">
            <div className="grid h-16 grid-cols-5 items-center">
                {navItems.map((item, index) => {
                    const isActive = pathname === item.href;
                    if (item.href === "/dashboard/movements") {
                        return (
                             <Link href={item.href} key={item.href} className="relative flex justify-center items-center h-full">
                                <div className="flex items-center justify-center size-16 -translate-y-4 rounded-full bg-primary text-primary-foreground shadow-lg">
                                    <Plus className="size-8" />
                                </div>
                            </Link>
                        )
                    }
                    return (
                        <Link href={item.href} key={item.href} className={cn("flex flex-col items-center justify-center gap-1 h-full", isActive ? "text-primary" : "text-muted-foreground")}>
                            <item.icon className="size-6" />
                            <span className="text-xs font-medium">{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}

export function DashboardLayoutContent({ children, user }: { children: React.React.Node, user: UserData }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    const authInstance = auth();
    await signOut(authInstance);
    window.location.href = '/';
  };
  
  return (
    <SidebarProvider>
      <Sidebar className="hidden md:block">
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
                    <span>{item.label === 'Registrar' ? 'Registrar Movimiento' : item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
             <SidebarMenuItem>
                <ThemeToggle />
            </SidebarMenuItem>
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
              <button onClick={handleSignOut} title="Cerrar Sesión">
                <LogOut className="size-5" />
              </button>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className={cn(isMobile ? "pb-16" : "")}>
         <PageHeader
            title=""
            className="h-14 justify-start px-4 md:px-6"
            action={<div className="flex items-center gap-2">
                <SidebarTrigger className="md:hidden" />
                <InstallPWA />
            </div>}
         />
        {children}
      </SidebarInset>
      <BottomNavBar />
    </SidebarProvider>
  );
}
