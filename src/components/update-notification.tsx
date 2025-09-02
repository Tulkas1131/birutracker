
"use client";

import { useUpdateNotification } from "@/hooks/use-update-notification";
import { Button } from "./ui/button";
import { Rocket } from "lucide-react";

export function UpdateNotification() {
    const { updateAvailable, refreshCacheAndReload } = useUpdateNotification();

    if (!updateAvailable) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-[101]">
            <div className="rounded-lg border bg-background p-4 shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                        <Rocket className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold">¡Actualización Disponible!</p>
                        <p className="text-sm text-muted-foreground">Recarga para obtener la última versión.</p>
                    </div>
                    <Button onClick={refreshCacheAndReload}>Actualizar</Button>
                </div>
            </div>
        </div>
    );
}
