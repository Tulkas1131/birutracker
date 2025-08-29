
"use client";

import { useEffect, useRef, memo, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState, QrcodeErrorCallback, QrcodeSuccessCallback } from 'html5-qrcode';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Camera, FileUp, AlertTriangle, Loader2, Play, Video } from 'lucide-react';
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

type ScannerStatus = 'idle' | 'initializing' | 'scanning' | 'paused' | 'permissionDenied' | 'noCameras' | 'error';

function QrScannerComponent({ onScanSuccess, onScanError }: QrScannerProps) {
    const { toast } = useToast();
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [cameras, setCameras] = useState<CameraDevice[]>([]);
    const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
    const [status, setStatus] = useState<ScannerStatus>('idle');
    const isMobile = useIsMobile();
    const qrReaderId = "qr-reader";

    const startScannerWithCamera = useCallback(async (cameraId: string) => {
        if (!scannerRef.current) return;
        
        try {
            await scannerRef.current.start(
                cameraId,
                {
                    fps: 10,
                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                        const qrboxSize = Math.floor(minEdge * 0.7);
                        return { width: qrboxSize, height: qrboxSize };
                    },
                },
                onScanSuccess as QrcodeSuccessCallback,
                onScanError as QrcodeErrorCallback
            );
            setStatus('scanning');
        } catch (err) {
            console.error("Failed to start scanner with camera:", err);
            onScanError("Failed to start camera");
            setStatus('error');
        }
    }, [onScanError, onScanSuccess]);

    const handleActivateCamera = useCallback(async () => {
        setStatus('initializing');
        try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
                setCameras(devices);
                
                let selectedCameraId = devices[0].id;
                if (isMobile) {
                    const rearCamera = devices.find(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('rear'));
                    if (rearCamera) {
                        selectedCameraId = rearCamera.id;
                    }
                }
                
                setActiveCameraId(selectedCameraId);
                await startScannerWithCamera(selectedCameraId);

            } else {
                setStatus('noCameras');
            }
        } catch (err: any) {
            console.error("Error getting cameras", err);
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                setStatus('permissionDenied');
            } else {
                setStatus('error');
            }
        }
    }, [isMobile, startScannerWithCamera]);

    useEffect(() => {
        // Initialize the scanner object only once
        if (typeof window !== 'undefined' && !scannerRef.current) {
            scannerRef.current = new Html5Qrcode(qrReaderId, false);
        }

        // Cleanup function
        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(error => {
                    console.warn("QR Scanner stop failed on unmount:", error);
                });
            }
        };
    }, []);

    const switchCamera = async () => {
        if (cameras.length > 1 && activeCameraId && scannerRef.current && scannerRef.current.isScanning) {
            const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
            const nextIndex = (currentIndex + 1) % cameras.length;
            const nextCameraId = cameras[nextIndex].id;

            try {
                await scannerRef.current.stop();
                setActiveCameraId(nextCameraId);
                await startScannerWithCamera(nextCameraId);
            } catch (err) {
                console.error("Failed to switch camera", err);
                setStatus('error');
            }
        }
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            const fileScanner = new Html5Qrcode(qrReaderId, false);
            try {
                const decodedText = await fileScanner.scanFile(file, false);
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

    const renderOverlayContent = () => {
        switch (status) {
            case 'idle':
                return (
                     <div className="flex flex-col items-center justify-center space-y-4 h-full bg-slate-100 dark:bg-slate-800">
                        <Button onClick={handleActivateCamera} size="lg">
                            <Video className="mr-2 h-6 w-6" /> Activar Cámara
                        </Button>
                    </div>
                );
            case 'initializing':
                return (
                    <div className="flex flex-col items-center justify-center space-y-2 h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Iniciando cámara...</p>
                    </div>
                );
            case 'permissionDenied':
                return (
                    <Alert variant="destructive" className="m-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Permiso de Cámara Denegado</AlertTitle>
                        <AlertDescription>
                            Necesitas otorgar permiso para usar la cámara. Por favor, habilítalo en la configuración de tu navegador y vuelve a intentarlo.
                        </AlertDescription>
                    </Alert>
                );
            case 'noCameras':
                return (
                    <div className="m-4">
                        <Alert>
                            <Camera className="h-4 w-4" />
                            <AlertTitle>No se encontraron cámaras</AlertTitle>
                            <AlertDescription>
                                No se detectó ninguna cámara. Puedes escanear un código QR subiendo una imagen.
                            </AlertDescription>
                        </Alert>
                    </div>
                );
            case 'error':
                 return (
                    <Alert variant="destructive" className="m-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error de Cámara</AlertTitle>
                        <AlertDescription>
                           Ocurrió un error al iniciar la cámara. Por favor, asegúrate de que no esté en uso por otra aplicación e intenta de nuevo.
                        </AlertDescription>
                    </Alert>
                );
            case 'scanning':
            default:
                return null;
        }
    };

    return (
        <div className="space-y-4">
            <div className="relative w-full aspect-square overflow-hidden rounded-md border bg-slate-100 dark:bg-slate-800">
                <div id={qrReaderId} className="w-full h-full" />
                {status !== 'scanning' && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                        {renderOverlayContent()}
                    </div>
                )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                 {status === 'scanning' && cameras.length > 1 && (
                    <Button 
                        onClick={switchCamera} 
                        variant="outline"
                        className="w-full"
                    >
                        <Camera className="mr-2 h-5 w-5" />
                        Cambiar Cámara
                    </Button>
                )}
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
            </div>
        </div>
    );
}

export const QrScanner = memo(QrScannerComponent);
