
"use client";

import { useEffect, useRef, memo, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Camera, FileUp, AlertTriangle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
    const [permissionError, setPermissionError] = useState(false);
    const isMobile = useIsMobile();

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const getCamerasAndStart = async () => {
            try {
                const devices = await Html5Qrcode.getCameras();
                if (devices && devices.length) {
                    setPermissionError(false);
                    setCameras(devices);
                    const rearCamera = devices.find(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('rear'));
                    const selectedCameraId = rearCamera ? rearCamera.id : devices[0].id;
                    
                    if (!scannerRef.current) {
                        const config = {
                            fps: 10,
                            qrbox: { width: 250, height: 250 },
                            rememberLastUsedCamera: false,
                            supportedScanTypes: [],
                        };
                        
                        const html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", config, false);
                        scannerRef.current = html5QrcodeScanner;
                    }
                    
                    if (scannerRef.current.getState() !== Html5QrcodeScannerState.SCANNING) {
                         scannerRef.current.render(onScanSuccess, onScanError, {
                            deviceId: { exact: selectedCameraId }
                        });
                        setActiveCameraId(selectedCameraId);
                    }
                } else {
                     setPermissionError(true);
                }
            } catch (err: any) {
                console.error("Error getting cameras", err);
                if (err.name === "NotAllowedError" || err.name === "NotFoundError") {
                    setPermissionError(true);
                }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    const switchCamera = () => {
        if (cameras.length > 1 && activeCameraId) {
            const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
            const nextIndex = (currentIndex + 1) % cameras.length;
            const nextCameraId = cameras[nextIndex].id;

            if (scannerRef.current) {
                 scannerRef.current.clear().then(() => {
                    setActiveCameraId(nextCameraId);
                     scannerRef.current?.render(onScanSuccess, onScanError, {
                        deviceId: { exact: nextCameraId }
                    });
                }).catch(err => {
                    console.error("Failed to clear scanner for camera switch", err);
                });
            }
        }
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            const html5QrCode = new Html5Qrcode("qr-reader-file-scanner", false);
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
             {permissionError && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No se pudo acceder a la cámara</AlertTitle>
                    <AlertDescription>
                        Asegúrate de tener una cámara conectada y de haber otorgado los permisos necesarios en tu navegador.
                    </AlertDescription>
                </Alert>
            )}
            <div id="qr-reader" className="w-full"></div>
            <div id="qr-reader-file-scanner" className="hidden"></div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                 {cameras.length > 1 && !permissionError && (
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
