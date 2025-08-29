
"use client";

import { useEffect, useRef, memo } from 'react';
import { Html5QrcodeScanner, type QrCodeSuccessCallback, type QrCodeErrorCallback } from 'html5-qrcode';
import { useToast } from "@/hooks/use-toast";

interface QrScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanError: (errorMessage: string) => void;
}

const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    rememberLastUsedCamera: true,
    supportedScanTypes: [],
};

const scannerRegionId = "qr-scanner-region";

function QrScannerComponent({ onScanSuccess, onScanError }: QrScannerProps) {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (!scannerRef.current) {
            scannerRef.current = new Html5QrcodeScanner(
                scannerRegionId,
                config,
                false // verbose
            );

            const successCallback: QrCodeSuccessCallback = (decodedText, decodedResult) => {
                // No pausar el scanner aquí para permitir múltiples escaneos si es necesario,
                // la limpieza se encargará al cerrar el modal.
                onScanSuccess(decodedText);
            };

            const errorCallback: QrCodeErrorCallback = (errorMessage) => {
                onScanError(errorMessage);
            };

            scannerRef.current.render(successCallback, errorCallback);
        }

        // Cleanup function to properly destroy the scanner instance
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                    // Este error puede ocurrir si el componente se desmonta rápidamente.
                    // Es seguro ignorarlo en la mayoría de los casos.
                    console.warn("Failed to clear html5QrcodeScanner, this can happen on fast unmounts.", error);
                });
                // Anular la referencia para asegurar que se cree una nueva instancia la próxima vez.
                scannerRef.current = null;
            }
        };
    }, [onScanSuccess, onScanError]);

    return (
        <div className="space-y-4">
            <div id={scannerRegionId} className="w-full border rounded-md" />
        </div>
    );
}

export const QrScanner = memo(QrScannerComponent);
