
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import type { Timestamp } from "firebase/firestore/lite";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button";

interface AppLog {
    id: string;
    timestamp: Timestamp;
    level: 'ERROR' | 'INFO' | 'WARNING';
    message: string;
    component: string;
    stack?: string;
    userEmail?: string;
}

export default function LogsPage() {
    const [logs, setLogs] = useState<AppLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<AppLog | null>(null);
    const userRole = useUserRole();
    const router = useRouter();

    useEffect(() => {
        if (userRole && userRole !== 'Admin') {
            router.push('/dashboard');
        }
    }, [userRole, router]);

    useEffect(() => {
        if (userRole === 'Admin') {
            const fetchLogs = async () => {
                setIsLoading(true);
                try {
                    const { collection, query, orderBy, getDocs } = await import("firebase/firestore/lite");
                    const firestore = db();
                    const logsQuery = query(collection(firestore, "app_logs"), orderBy("timestamp", "desc"));
                    const logsSnapshot = await getDocs(logsQuery);
                    const logsData = logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppLog));
                    setLogs(logsData);
                } catch (error) {
                    console.error("Error fetching app logs:", error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchLogs();
        }
    }, [userRole]);
    
    const formatDate = (timestamp: Timestamp) => {
        if (!timestamp || !timestamp.toDate) return 'Fecha inválida';
        return timestamp.toDate().toLocaleString();
    };

    const getLevelVariant = (level: AppLog['level']) => {
        switch (level) {
            case 'ERROR': return 'destructive';
            case 'WARNING': return 'default';
            default: return 'secondary';
        }
    }

    if (!userRole || userRole !== 'Admin') {
        return (
             <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex flex-1 flex-col">
            <PageHeader
                title="Logs del Sistema"
                description="Registro de errores y eventos importantes de la aplicación."
            />
            <main className="flex-1 p-4 pt-0 md:p-6 md:pt-0">
                <AlertDialog>
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Nivel</TableHead>
                                        <TableHead>Mensaje</TableHead>
                                        <TableHead>Componente</TableHead>
                                        <TableHead>Usuario</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                                            </TableCell>
                                        </TableRow>
                                    ) : logs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                No hay logs para mostrar. ¡Todo parece estar en orden!
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        logs.map((log) => (
                                            <AlertDialogTrigger asChild key={log.id}>
                                                <TableRow className="cursor-pointer" onClick={() => setSelectedLog(log)}>
                                                    <TableCell>{formatDate(log.timestamp)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={getLevelVariant(log.level)}>{log.level}</Badge>
                                                    </TableCell>
                                                    <TableCell className="font-medium truncate max-w-xs">{log.message}</TableCell>
                                                    <TableCell>{log.component}</TableCell>
                                                    <TableCell>{log.userEmail || 'N/A'}</TableCell>
                                                </TableRow>
                                            </AlertDialogTrigger>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                     {selectedLog && (
                        <AlertDialogContent className="max-w-3xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Detalles del Log</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Información detallada sobre el evento registrado.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4">
                                <div><strong>Fecha:</strong> {formatDate(selectedLog.timestamp)}</div>
                                <div><strong>Nivel:</strong> <Badge variant={getLevelVariant(selectedLog.level)}>{selectedLog.level}</Badge></div>
                                <div><strong>Componente:</strong> {selectedLog.component}</div>
                                <div><strong>Usuario:</strong> {selectedLog.userEmail || 'N/A'}</div>
                                <div className="md:col-span-2"><strong>Mensaje:</strong> {selectedLog.message}</div>
                                {selectedLog.stack && (
                                    <div className="md:col-span-2">
                                        <strong>Stack Trace:</strong>
                                        <ScrollArea className="h-48 mt-2 rounded-md border bg-muted p-2">
                                            <pre className="text-xs whitespace-pre-wrap break-all">
                                                <code>{selectedLog.stack}</code>
                                            </pre>
                                        </ScrollArea>
                                    </div>
                                )}
                            </div>
                        </AlertDialogContent>
                    )}
                </AlertDialog>
            </main>
        </div>
    );
}
