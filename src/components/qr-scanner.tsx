
"use client";

import { useEffect, useRef, memo } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats, Html5QrcodeScannerState } from 'html5-qrcode';
import { useToast } from "@/hooks/use-toast";

interface QrScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanError: (errorMessage: string) => void;
}

function QrScannerComponent({ onScanSuccess, onScanError }: QrScannerProps) {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            supportedScanTypes: [],
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
        };
        
        const html5QrcodeScanner = new Html5QrcodeScanner(
            "qr-reader", 
            config, 
            false
        );

        scannerRef.current = html5QrcodeScanner;

        const startScanner = async () => {
             try {
                await Html5QrcodeScanner.getCameras();
                if (scannerRef.current && scannerRef.current.getState() !== Html5QrcodeScannerState.SCANNING) {
                  html5QrcodeScanner.render(onScanSuccess, onScanError);
                }
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
            if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
                 scannerRef.current.clear().catch(error => {
                    console.error("Failed to clear html5QrcodeScanner.", error);
                });
            }
        };
    }, [onScanSuccess, onScanError, toast]);

    return <div id="qr-reader" className="w-full"></div>;
}

// Memoize the component to prevent unnecessary re-renders
export const QrScanner = memo(QrScannerComponent);
