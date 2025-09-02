
"use client";

import { AlertCircle, ArrowDownToLine, Share, Download } from "lucide-react";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useIsMobile } from "@/hooks/use-mobile";

export function InstallPWA() {
  const { canInstall, promptInstall, isIOS } = usePWAInstall();
  const isMobile = useIsMobile();

  const buttonContent = (
    <>
      <Download />
      <span>Instalar App</span>
    </>
  );

  if (isIOS) {
    if (!isMobile) return null; // Only show on mobile iOS

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="w-full justify-start gap-2 p-2 text-sm font-normal">
            {buttonContent}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Instalar en iPhone/iPad</AlertTitle>
            <AlertDescription>
              <ol className="list-decimal pl-4 mt-2 space-y-1">
                <li>Toca el icono de <strong>Compartir</strong> en la barra de Safari.</li>
                <li>Busca y selecciona <strong>"Añadir a la pantalla de inicio"</strong>.</li>
              </ol>
            </AlertDescription>
          </Alert>
        </PopoverContent>
      </Popover>
    );
  }

  if (canInstall) {
    const Comp = isMobile ? Button : "button";
    const props = isMobile ? { variant: "ghost", className: "w-full justify-start gap-2 p-2 text-sm font-normal" } : { variant: "outline", size: "sm" };
    
    return (
      <Comp {...props} onClick={promptInstall}>
        {buttonContent}
      </Comp>
    );
  }

  return null;
}

    