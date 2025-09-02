
"use client";

import { AlertCircle, Download, Rocket } from "lucide-react";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUpdateNotification } from "@/hooks/use-update-notification";

export function PwaInstallButton() {
  const { canInstall, promptInstall, isIOS } = usePWAInstall();
  const { updateAvailable, refreshCacheAndReload } = useUpdateNotification();
  const isMobile = useIsMobile();
  
  const installButtonContent = (
    <>
      <Download className="h-4 w-4" />
      <span className="sr-only sm:not-sr-only sm:ml-2">Instalar</span>
    </>
  );

  const updateButtonContent = (
    <>
        <Rocket className="h-4 w-4" />
        <span className="sr-only sm:not-sr-only sm:ml-2">Actualizar</span>
    </>
  );

  // Highest priority: show update button if an update is available
  if (updateAvailable) {
    return (
        <Button variant="outline" size={isMobile ? "icon" : "sm"} onClick={refreshCacheAndReload}>
            {updateButtonContent}
        </Button>
    );
  }

  // Next priority: show install button for iOS
  if (isIOS) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size={isMobile ? "icon" : "sm"}>
            {installButtonContent}
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

  // Finally, show install button for other platforms (Android/Desktop)
  if (canInstall) {
    return (
        <Button variant="outline" size={isMobile ? "icon" : "sm"} onClick={promptInstall}>
            {installButtonContent}
        </Button>
    );
  }

  // If no action is available, render nothing
  return null;
}
