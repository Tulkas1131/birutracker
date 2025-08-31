
"use client";

import { AlertCircle, ArrowDownToLine, Share } from "lucide-react";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function InstallPWA() {
  const { canInstall, promptInstall, isIOS } = usePWAInstall();

  if (isIOS) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="hidden sm:inline-flex">
            <Share className="mr-2 h-4 w-4" /> Instalar App
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
    return (
      <Button variant="outline" size="sm" onClick={promptInstall}>
        <ArrowDownToLine className="mr-2 h-4 w-4" /> Instalar App
      </Button>
    );
  }

  return null;
}
