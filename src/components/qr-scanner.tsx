
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
                scannerRef.current?.pause(true); // Pause after a successful scan
                onScanSuccess(decodedText);
            };

            const errorCallback: QrCodeErrorCallback = (errorMessage) => {
                onScanError(errorMessage);
            };

            scannerRef.current.render(successCallback, errorCallback);
        }

        // Cleanup function to clear the scanner
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                    console.error("Failed to clear html5QrcodeScanner.", error);
                });
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
