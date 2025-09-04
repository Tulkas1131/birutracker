
"use client";

import { useEffect, useRef, memo } from 'react';
import { Html5QrcodeScanner, Html5Qrcode, type QrCodeSuccessCallback, type QrCodeErrorCallback } from 'html5-qrcode';

interface QrScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanError: (errorMessage: string) => void;
    isScannerOpen: boolean;
}

const scannerRegionId = "qr-scanner-region";

function QrScannerComponent({ onScanSuccess, onScanError, isScannerOpen }: QrScannerProps) {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        if (isScannerOpen && scannerRef.current) {
            scannerRef.current.resume();
        } else if (!isScannerOpen && scannerRef.current?.isScanning) {
            scannerRef.current.pause(true);
        }
    }, [isScannerOpen]);

    useEffect(() => {
        // Initialize the scanner only once when the component mounts
        const timeoutId = setTimeout(() => {
            if (document.getElementById(scannerRegionId) && !scannerRef.current) {
                const scanner = new Html5QrcodeScanner(
                    scannerRegionId,
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        rememberLastUsedCamera: true,
                        supportedScanTypes: [], // Use all supported scan types
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
        }, 100);

        // Cleanup function to run when the component unmounts (e.g., user navigates away)
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
        // Empty dependency array ensures this effect runs only once on mount and unmount
    }, [onScanSuccess, onScanError]);

    return (
        <div className="space-y-4">
            <div id={scannerRegionId} className="w-full rounded-md border" />
        </div>
    );
}

// Memoize the component to prevent unnecessary re-renders
export const QrScanner = memo(QrScannerComponent);
