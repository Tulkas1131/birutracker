
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authInstance = auth();
  const firestore = db();
  const [user, loading, error] = useAuthState(authInstance);
  const userRole = useUserRole();
  const router = useRouter();

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
          // User exists in Auth but not in Firestore (old user), create their profile.
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
    return null; // or a redirect component
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo className="size-7" />
            <span className="text-lg font-semibold">BiruTracker</span>
            <SidebarTrigger className="ml-auto" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Panel de Control">
                <Link href="/dashboard">
                  <LayoutDashboard />
                  <span>Panel de Control</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Activos">
                <Link href="/dashboard/assets">
                  <Package />
                  <span>Activos</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Clientes">
                <Link href="/dashboard/customers">
                  <Users />
                  <span>Clientes</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Registrar Movimiento">
                <Link href="/dashboard/movements">
                  <Truck />
                  <span>Registrar Movimiento</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Historial">
                <Link href="/dashboard/history">
                  <History />
                  <span>Historial</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
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
            <button onClick={handleSignOut} className="ml-auto">
              <LogOut className="size-5" />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
