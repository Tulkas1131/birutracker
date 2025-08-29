
"use client";

import { useEffect, useRef, memo } from 'react';
import { Html5QrcodeScanner, type QrCodeSuccessCallback, type QrCodeErrorCallback } from 'html5-qrcode';

interface QrScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanError: (errorMessage: string) => void;
}

const scannerRegionId = "qr-scanner-region";

function QrScannerComponent({ onScanSuccess, onScanError }: QrScannerProps) {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // Ensure this runs only once per mount
        if (!scannerRef.current) {
            const scanner = new Html5QrcodeScanner(
                scannerRegionId,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    rememberLastUsedCamera: true,
                },
                false // verbose
            );

            const successCallback: QrCodeSuccessCallback = (decodedText, decodedResult) => {
                onScanSuccess(decodedText);
            };

            const errorCallback: QrCodeErrorCallback = (errorMessage) => {
                onScanError(errorMessage);
            };

            scanner.render(successCallback, errorCallback);
            scannerRef.current = scanner;
        }

        // Cleanup function to run decisively on component unmount
        return () => {
            const scanner = scannerRef.current;
            if (scanner) {
                scanner.clear().catch(error => {
                    console.error("Failed to clear html5QrcodeScanner.", error);
                }).finally(() => {
                    scannerRef.current = null;
                });
            }
        };
    }, [onScanSuccess, onScanError]);

    return (
        <div className="space-y-4">
            <div id={scannerRegionId} className="w-full rounded-md border" />
        </div>
    );
}

// Memoize the component to prevent unnecessary re-renders
export const QrScanner = memo(QrScannerComponent);
