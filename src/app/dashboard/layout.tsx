
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
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
import { Logo } from "@/components/logo";
import { useUserRole } from "@/hooks/use-user-role";
import { PageHeader } from "@/components/page-header";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const authInstance = auth();
  const firestore = db();
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
    if (user && !userRole) {
      const getUserRole = async () => {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
          await setDoc(userDocRef, {
            email: user.email,
            role: "Operador",
          });
        }
      };
      getUserRole();
    }
  }, [user, loading, userRole, router, firestore]);

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
               <span className="sr-only">Toggle Sidebar</span>
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
                <AvatarImage src={user.photoURL || "https://picsum.photos/100"} alt="Avatar del usuario" data-ai-hint="user avatar" />
                <AvatarFallback>{user.email?.[0].toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-sm">
                <span className="font-semibold">{userRole || 'Cargando...'}</span>
                <span className="text-muted-foreground truncate">{user.email}</span>
              </div>
            <button onClick={handleSignOut} className="ml-auto" title="Cerrar Sesión">
              <LogOut className="size-5" />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
         <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:px-6">
            <SidebarTrigger />
            <div className="flex-1">
              {/* You can add breadcrumbs or other header elements here */}
            </div>
          </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}
