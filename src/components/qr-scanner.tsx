
"use client";

import { useEffect, memo } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useToast } from "@/hooks/use-toast";

interface QrScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanError: (errorMessage: string) => void;
}

function QrScannerComponent({ onScanSuccess, onScanError }: QrScannerProps) {
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
            false /* verbose */
        );

        html5QrcodeScanner.render(onScanSuccess, onScanError);

        return () => {
            html5QrcodeScanner.clear().catch(error => {
                // This can happen if the component is unmounted before the scanner is fully initialized.
                // It's safe to ignore in this context.
                console.log("QR Scanner clear failed, likely due to fast unmount:", error);
            });
        };
    }, [onScanSuccess, onScanError, toast]);

    return <div id="qr-reader" className="w-full"></div>;
}

// Memoize the component to prevent unnecessary re-renders
export const QrScanner = memo(QrScannerComponent);
