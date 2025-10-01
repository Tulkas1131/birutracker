
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex items-center justify-center py-20", className)}>
        <div className="flex flex-col items-center text-center max-w-sm">
            <div className="mb-4 text-primary">
                {icon}
            </div>
            <h3 className="text-xl font-semibold tracking-tight mb-2">{title}</h3>
            <p className="text-muted-foreground mb-6">{description}</p>
            {action}
        </div>
    </div>
  );
}
