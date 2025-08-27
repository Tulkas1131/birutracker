
"use client";

import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useToast } from "@/hooks/use-toast";

interface QrScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanError: (errorMessage: string) => void;
}

export function QrScanner({ onScanSuccess, onScanError }: QrScannerProps) {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            supportedScanTypes: [], // Let the library decide
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
        };
        
        const html5QrcodeScanner = new Html5QrcodeScanner(
            "qr-reader", 
            config, 
            false // verbose
        );

        scannerRef.current = html5QrcodeScanner;

        const startScanner = async () => {
             try {
                await Html5QrcodeScanner.getCameras();
                html5QrcodeScanner.render(onScanSuccess, onScanError);
            } catch (err) {
                console.error("Error getting cameras", err);
                 toast({
                    title: "Error de Cámara",
                    description: "No se pudo acceder a la cámara. Asegúrate de tener una y de haber dado los permisos necesarios.",
                    variant: "destructive",
                });
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current && scannerRef.current.getState() === 2) { // 2 is SCANNING state
                 scannerRef.current.clear().catch(error => {
                    console.error("Failed to clear html5QrcodeScanner.", error);
                });
            }
        };
    }, [onScanSuccess, onScanError, toast]);

    return <div id="qr-reader" className="w-full"></div>;
}
