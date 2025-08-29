
import * as React from "react";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import { DashboardLayoutContent } from "./layout-client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense 
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
