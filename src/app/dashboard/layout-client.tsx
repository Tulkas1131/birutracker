
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
  ShieldAlert,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

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
} from "@/components/ui/sidebar";
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

const adminNavItems = [
    { href: "/dashboard/logs", icon: ShieldAlert, label: "Logs" },
];

function BottomNavBar() {
    const pathname = usePathname();
    const isMobile = useIsMobile();

    if (!isMobile) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm md:hidden">
            <div className="grid h-16 grid-cols-5 items-center">
                {navItems.map((item) => {
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

function MobileUserMenu({ user, onSignOut }: { user: UserData, onSignOut: () => void }) {
    const isMobile = useIsMobile();
    if (!isMobile) return null;

    return (
        <Sheet>
            <SheetTrigger asChild>
                 <Button variant="ghost" size="icon" className="size-9">
                    <Avatar className="size-9">
                        {user.photoURL && <AvatarImage src={user.photoURL} alt="Avatar del usuario" />}
                        <AvatarFallback>{user.email?.[0].toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-background p-0">
                <div className="flex flex-col space-y-2 p-4">
                    <div className="flex items-center gap-3 p-2">
                        <Avatar className="size-12">
                            {user.photoURL && <AvatarImage src={user.photoURL} alt="Avatar del usuario" />}
                            <AvatarFallback>{user.email?.[0].toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col text-sm">
                            <span className="font-semibold">{user.role}</span>
                            <span className="text-muted-foreground truncate">{user.email}</span>
                        </div>
                    </div>
                    <Separator />
                     {user.role === 'Admin' && (
                        <>
                            <Link href="/dashboard/logs" className={cn(
                                "flex items-center gap-2 rounded-md p-2 text-sm font-medium hover:bg-accent"
                            )}>
                                <ShieldAlert />
                                <span>Logs del Sistema</span>
                            </Link>
                            <Separator />
                        </>
                    )}
                    <div className="p-1">
                        <ThemeToggle />
                    </div>
                    <Separator />
                    <Button variant="ghost" className="w-full justify-start gap-2 p-2 text-sm text-destructive hover:text-destructive" onClick={onSignOut}>
                        <LogOut />
                        <span>Cerrar Sesión</span>
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function MobileHeader({ user, onSignOut }: { user: UserData, onSignOut: () => void }) {
    const isMobile = useIsMobile();
    if (!isMobile) return null;

    return (
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur-sm md:hidden">
            <div className="flex items-center justify-start w-1/4">
                <MobileUserMenu user={user} onSignOut={onSignOut} />
            </div>
            <div className="flex items-center justify-center w-1/2">
                 <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                    <Logo className="h-6 w-6" />
                    <span>BiruTracker</span>
                 </Link>
            </div>
            <div className="flex items-center justify-end w-1/4">
                <InstallPWA />
            </div>
        </header>
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
            {user.role === 'Admin' && (
                <>
                    <SidebarSeparator />
                    {adminNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild tooltip={item.label} isActive={pathname === item.href}>
                        <Link href={item.href}>
                            <item.icon />
                            <span>{item.label}</span>
                        </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    ))}
                </>
            )}
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
         <MobileHeader user={user} onSignOut={handleSignOut} />
         {children}
      </SidebarInset>
      <BottomNavBar />
    </SidebarProvider>
  );
}
