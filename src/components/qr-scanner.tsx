
"use client";

import { useEffect, useRef, memo, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode, QrCodeSuccessCallback, QrCodeErrorCallback, Html5QrcodeScannerState } from 'html5-qrcode';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';

interface QrScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanError: (errorMessage: string) => void;
}

interface CameraDevice {
    id: string;
    label: string;
}

function QrScannerComponent({ onScanSuccess, onScanError }: QrScannerProps) {
    const { toast } = useToast();
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const [cameras, setCameras] = useState<CameraDevice[]>([]);
    const [activeCameraIndex, setActiveCameraIndex] = useState(0);

    useEffect(() => {
        const getCamerasAndStart = async () => {
            try {
                const devices = await Html5Qrcode.getCameras();
                if (devices && devices.length) {
                    setCameras(devices);
                    // Prioritize rear camera ('environment')
                    const rearCameraIndex = devices.findIndex(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('rear'));
                    const initialIndex = rearCameraIndex !== -1 ? rearCameraIndex : 0;
                    setActiveCameraIndex(initialIndex);
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

        getCamerasAndStart();

    }, [toast]);
    
    useEffect(() => {
        if (cameras.length === 0) return;

        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: false,
            supportedScanTypes: [],
            camera: {
                deviceId: { exact: cameras[activeCameraIndex].id }
            }
        };

        const html5QrcodeScanner = new Html5QrcodeScanner(
            "qr-reader",
            config,
            false
        );
        scannerRef.current = html5QrcodeScanner;

        const startScanner = () => {
            if (scannerRef.current && scannerRef.current.getState() !== Html5QrcodeScannerState.SCANNING) {
                html5QrcodeScanner.render(onScanSuccess, onScanError);
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
                scannerRef.current.clear().catch(error => {
                    console.warn("QR Scanner clear failed, likely already cleared:", error);
                });
            }
        };
    }, [activeCameraIndex, cameras, onScanSuccess, onScanError]);

    const switchCamera = () => {
        if (cameras.length > 1) {
            setActiveCameraIndex((prevIndex) => (prevIndex + 1) % cameras.length);
        }
    };


    return (
        <div className="relative">
            <div id="qr-reader" className="w-full"></div>
            {cameras.length > 1 && (
                <Button 
                    onClick={switchCamera} 
                    variant="outline" 
                    size="icon"
                    className="absolute bottom-4 right-4 z-10 bg-background/70 hover:bg-background/90"
                >
                    <Camera className="h-5 w-5" />
                    <span className="sr-only">Cambiar cámara</span>
                </Button>
            )}
        </div>
    );
}

export const QrScanner = memo(QrScannerComponent);
