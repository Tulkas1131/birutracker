
import { cn } from "@/lib/utils";

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between p-4 md:p-6", className)} {...props}>
      <div className="grid gap-1">
        <h1 className={cn("text-2xl font-bold tracking-tight md:text-3xl")}>{title}</h1>
        {description && <p className={cn("text-muted-foreground")}>{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
