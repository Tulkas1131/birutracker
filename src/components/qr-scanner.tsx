
"use client";

import { useEffect, useRef, memo, useState, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Camera, AlertTriangle, Loader2, Video } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface QrScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanError: (errorMessage: string) => void;
}

type ScannerStatus = 'idle' | 'initializing' | 'scanning' | 'permissionDenied' | 'noCamera' | 'error' | 'unsupported';

function QrScannerComponent({ onScanSuccess, onScanError }: QrScannerProps) {
    const { toast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [status, setStatus] = useState<ScannerStatus>('idle');
    const [isBarcodeDetectorSupported, setIsBarcodeDetectorSupported] = useState(true);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        }
    }, []);

    const startScan = useCallback(async (stream: MediaStream) => {
        if (!('BarcodeDetector' in window)) {
            setStatus('unsupported');
            setIsBarcodeDetectorSupported(false);
            return;
        }

        const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const video = videoRef.current;
        if (!video) return;

        const checkQRCode = async () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                try {
                    const barcodes = await barcodeDetector.detect(video);
                    if (barcodes.length > 0) {
                        onScanSuccess(barcodes[0].rawValue);
                        stopCamera();
                        setStatus('idle'); 
                    }
                } catch (error) {
                    console.error('Barcode detection failed:', error);
                    onScanError('Barcode detection failed');
                }
            }
            if (streamRef.current) {
                requestAnimationFrame(checkQRCode);
            }
        };
        
        checkQRCode();

    }, [onScanSuccess, onScanError, stopCamera]);


    const handleActivateCamera = useCallback(async () => {
        setStatus('initializing');
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setStatus('error');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setStatus('scanning');
                startScan(stream);
            }
        } catch (err: any) {
            console.error("Error accessing camera", err);
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                setStatus('permissionDenied');
            } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                setStatus('noCamera');
            } else {
                setStatus('error');
            }
        }
    }, [startScan]);

    useEffect(() => {
        if (!('BarcodeDetector' in window)) {
            setIsBarcodeDetectorSupported(false);
            setStatus('unsupported');
        }
        return () => {
            stopCamera();
        };
    }, [stopCamera]);


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
             case 'unsupported':
                return (
                    <Alert variant="destructive" className="m-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Navegador no compatible</AlertTitle>
                        <AlertDescription>
                            Tu navegador no es compatible con la función de escaneo de QR. Por favor, intenta con Chrome, Edge o Safari en un dispositivo móvil.
                        </AlertDescription>
                    </Alert>
                );
            case 'noCamera':
                return (
                    <div className="m-4">
                        <Alert>
                            <Camera className="h-4 w-4" />
                            <AlertTitle>No se encontró la cámara trasera</AlertTitle>
                            <AlertDescription>
                                No se pudo acceder a la cámara trasera. Asegúrate de que no esté en uso por otra aplicación.
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
                 <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                />
                {status !== 'scanning' && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                        {renderOverlayContent()}
                    </div>
                )}
            </div>
        </div>
    );
}

export const QrScanner = memo(QrScannerComponent);
