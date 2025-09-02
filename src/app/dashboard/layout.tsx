
"use client";

import * as React from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { DashboardLayoutContent } from "./layout-client";
import { useUserRole } from "@/hooks/use-user-role";
import { Skeleton } from "@/components/ui/skeleton";
import { UpdateNotification } from "@/components/update-notification";

export default function DashboardLayout({
  children,
}: {
  children: React.React.Node;
}) {
  const [user, loading] = useAuthState(auth());
  const userRole = useUserRole();
  const router = useRouter();

  // Redirect if not logged in
  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Memoize user data to prevent re-renders of the layout content
  const userData = React.useMemo(() => {
    if (user && userRole) {
      return {
        email: user.email || undefined,
        photoURL: user.photoURL || undefined,
        role: userRole,
      };
    }
    return null;
  }, [user, userRole]);

  // Show a loading skeleton while auth state or user role is being determined
  if (loading || !user || !userData) {
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

  return (
      <>
        <DashboardLayoutContent user={userData}>{children}</DashboardLayoutContent>
        <UpdateNotification />
      </>
  );
}
