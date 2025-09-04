
"use client";

import { useEffect, useRef, memo } from 'react';
import { Html5QrcodeScanner, type QrCodeSuccessCallback, type QrCodeErrorCallback } from 'html5-qrcode';

interface QrScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanError: (errorMessage: string) => void;
    isScannerOpen: boolean;
}

const scannerRegionId = "qr-scanner-region";

function QrScannerComponent({ onScanSuccess, onScanError, isScannerOpen }: QrScannerProps) {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const lastScanResult = useRef<string | null>(null);

    useEffect(() => {
        if (isScannerOpen && !scannerRef.current) {
            // Delay initialization slightly to ensure the DOM element is ready
            const timeoutId = setTimeout(() => {
                 if (!document.getElementById(scannerRegionId)) {
                    console.warn("QR scanner region not found in DOM.");
                    return;
                }
                
                lastScanResult.current = null; // Reset last scan result
                
                const scanner = new Html5QrcodeScanner(
                    scannerRegionId,
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        rememberLastUsedCamera: true,
                        supportedScanTypes: [],
                    },
                    false // verbose
                );

                const successCallback: QrCodeSuccessCallback = (decodedText, decodedResult) => {
                    // Prevent multiple rapid-fire scans of the same code
                    if (decodedText !== lastScanResult.current) {
                        lastScanResult.current = decodedText;
                        onScanSuccess(decodedText);
                    }
                };

                const errorCallback: QrCodeErrorCallback = (errorMessage) => {
                    onScanError(errorMessage);
                };

                scanner.render(successCallback, errorCallback);
                scannerRef.current = scanner;
            }, 100);

            return () => clearTimeout(timeoutId);

        } else if (!isScannerOpen && scannerRef.current) {
            scannerRef.current.clear().catch(error => {
                console.error("Failed to clear html5QrcodeScanner.", error);
            }).finally(() => {
                scannerRef.current = null;
            });
        }
    }, [isScannerOpen, onScanSuccess, onScanError]);


    // Final cleanup on component unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                     console.error("Cleanup failed on unmount.", error);
                });
            }
        };
    }, []);

    return (
        <div className="space-y-4">
            <div id={scannerRegionId} className="w-full rounded-md border" />
        </div>
    );
}

export const QrScanner = memo(QrScannerComponent);
