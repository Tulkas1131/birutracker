
"use client";

import { useEffect, useRef, memo, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Camera, FileUp, AlertTriangle, Loader2 } from 'lucide-react';
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

type ScannerStatus = 'initializing' | 'scanning' | 'permissionDenied' | 'noCameras' | 'error';

function QrScannerComponent({ onScanSuccess, onScanError }: QrScannerProps) {
    const { toast } = useToast();
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [cameras, setCameras] = useState<CameraDevice[]>([]);
    const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
    const [status, setStatus] = useState<ScannerStatus>('initializing');
    const isMobile = useIsMobile();

    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const startScanner = async () => {
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

                    const config = {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        rememberLastUsedCamera: false,
                        supportedScanTypes: [],
                    };
                    
                    const html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", config, false);
                    scannerRef.current = html5QrcodeScanner;
                    
                    html5QrcodeScanner.render(onScanSuccess, onScanError, {
                        deviceId: { exact: selectedCameraId }
                    });
                    setStatus('scanning');

                } else {
                    setStatus('noCameras');
                }
            } catch (err: any) {
                console.error("Error getting cameras", err);
                if (err.name === "NotAllowedError") {
                    setStatus('permissionDenied');
                } else {
                     setStatus('error');
                }
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
                scannerRef.current.clear().catch(error => {
                    console.warn("QR Scanner clear failed:", error);
                });
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    const switchCamera = () => {
        if (cameras.length > 1 && activeCameraId && scannerRef.current) {
            const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
            const nextIndex = (currentIndex + 1) % cameras.length;
            const nextCameraId = cameras[nextIndex].id;

            scannerRef.current.clear().then(() => {
                setActiveCameraId(nextCameraId);
                scannerRef.current?.render(onScanSuccess, onScanError, {
                    deviceId: { exact: nextCameraId }
                });
            }).catch(err => {
                console.error("Failed to clear scanner for camera switch", err);
            });
        }
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            // The file scanner element is only needed for this operation, so it's kept minimal
            const fileScannerElementId = "qr-reader-file-scanner";
            const html5QrCode = new Html5Qrcode(fileScannerElementId, false);
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
    
    const renderContent = () => {
        switch (status) {
            case 'initializing':
                return (
                    <div className="flex flex-col items-center justify-center space-y-2 h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Iniciando cámara...</p>
                    </div>
                );
            case 'permissionDenied':
                return (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Permiso de Cámara Denegado</AlertTitle>
                        <AlertDescription>
                            Necesitas otorgar permiso para usar la cámara. Por favor, habilítalo en la configuración de tu navegador y recarga la página.
                        </AlertDescription>
                    </Alert>
                );
            case 'noCameras':
                 if (!isMobile) {
                    return (
                        <Alert>
                            <Camera className="h-4 w-4" />
                            <AlertTitle>No se encontraron cámaras</AlertTitle>
                            <AlertDescription>
                                No se detectó ninguna cámara en tu PC. Puedes escanear un código QR subiendo una imagen desde tu almacenamiento.
                            </AlertDescription>
                        </Alert>
                    );
                }
                return (
                     <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>No se encontraron cámaras</AlertTitle>
                        <AlertDescription>
                           No se pudo acceder a ninguna cámara en tu dispositivo.
                        </AlertDescription>
                    </Alert>
                );
            case 'error':
                 return (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error Inesperado</AlertTitle>
                        <AlertDescription>
                           Ocurrió un error al intentar iniciar el escáner. Por favor, intenta de nuevo.
                        </AlertDescription>
                    </Alert>
                );
            case 'scanning':
            default:
                return null; // The scanner is rendered into the div, so nothing else is needed here.
        }
    };

    return (
        <div className="relative space-y-4">
            <div id="qr-reader" className="w-full"></div>
            {/* Hidden element for file-based scanning */}
            <div id="qr-reader-file-scanner" className="hidden"></div>
            
            {renderContent()}

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
