
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
        // We need to wait for the dialog animation to finish before initializing the scanner
        const timeoutId = setTimeout(() => {
            if (document.getElementById(scannerRegionId) && !scannerRef.current) {
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
        }, 100); // 100ms delay to ensure the DOM is ready

        // Cleanup function
        return () => {
            clearTimeout(timeoutId);
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
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
