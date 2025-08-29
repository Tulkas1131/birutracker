
"use client";

import * as React from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { DashboardLayoutContent } from "./layout-client";
import { useUserRole } from "@/hooks/use-user-role";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLayout({
  children,
}: {
  children: React.React.Node;
}) {
  const [user, loading] = useAuthState(auth());
  const userRole = useUserRole();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user || !userRole) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                </div>
            </div>
        </div>
    );
  }

  const userData = {
    email: user.email || undefined,
    photoURL: user.photoURL || undefined,
    role: userRole,
  };

  return (
      <DashboardLayoutContent user={userData}>{children}</DashboardLayoutContent>
  );
}
