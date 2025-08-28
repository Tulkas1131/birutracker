
"use client";

import { useEffect, useRef, memo, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode, QrCodeSuccessCallback, QrCodeErrorCallback, Html5QrcodeScannerState } from 'html5-qrcode';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Camera, FileUp } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [cameras, setCameras] = useState<CameraDevice[]>([]);
    const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
    const isMobile = useIsMobile();

    useEffect(() => {
        const getCamerasAndStart = async () => {
            try {
                const devices = await Html5Qrcode.getCameras();
                if (devices && devices.length) {
                    setCameras(devices);
                    // Prioritize rear camera ('environment')
                    const rearCamera = devices.find(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('rear'));
                    const selectedCameraId = rearCamera ? rearCamera.id : devices[0].id;
                    setActiveCameraId(selectedCameraId);

                    const config = {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        rememberLastUsedCamera: false,
                        supportedScanTypes: [],
                        camera: {
                            deviceId: { exact: selectedCameraId }
                        }
                    };
                    
                    const html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", config, false);
                    scannerRef.current = html5QrcodeScanner;
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

        getCamerasAndStart();

        return () => {
            if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
                scannerRef.current.clear().catch(error => {
                    console.warn("QR Scanner clear failed, likely already cleared:", error);
                });
            }
        };
    }, [onScanSuccess, onScanError, toast]);

    const switchCamera = () => {
        if (cameras.length > 1 && activeCameraId) {
            const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
            const nextIndex = (currentIndex + 1) % cameras.length;
            const nextCameraId = cameras[nextIndex].id;

            if (scannerRef.current) {
                scannerRef.current.clear().then(() => {
                    setActiveCameraId(nextCameraId); // This will trigger the useEffect to restart the scanner
                }).catch(err => {
                    console.error("Failed to clear scanner for camera switch", err);
                });
            } else {
                 setActiveCameraId(nextCameraId);
            }
        }
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            const html5QrCode = new Html5Qrcode("qr-reader", false);
            try {
                const decodedText = await html5QrCode.scanFile(file, false);
                onScanSuccess(decodedText);
            } catch (err) {
                 toast({
                    title: "Error de Escaneo",
                    description: "No se pudo encontrar un código QR en la imagen seleccionada.",
                    variant: "destructive",
                });
                onScanError(String(err));
            }
        }
    };


    return (
        <div className="relative space-y-4">
            <div id="qr-reader" className="w-full"></div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                 {cameras.length > 1 && (
                    <Button 
                        onClick={switchCamera} 
                        variant="outline"
                        className="w-full"
                    >
                        <Camera className="mr-2 h-5 w-5" />
                        Cambiar Cámara
                    </Button>
                )}
                {!isMobile && (
                    <>
                        <Input 
                            type="file" 
                            id="qr-file-input" 
                            className="hidden" 
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                         <Label htmlFor="qr-file-input" className="w-full">
                            <Button asChild variant="outline" className="w-full cursor-pointer">
                                <div>
                                    <FileUp className="mr-2 h-5 w-5" />
                                    Escanear desde Archivo
                                </div>
                            </Button>
                        </Label>
                    </>
                )}
            </div>
        </div>
    );
}

export const QrScanner = memo(QrScannerComponent);
