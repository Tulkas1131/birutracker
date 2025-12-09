
"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Timestamp, collection, query, orderBy, getDocs } from "firebase/firestore";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useIsMobile } from "@/hooks/use-mobile";
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

const ITEMS_PER_PAGE = 10;

export default function LogsPage() {
    const [logs, setLogs] = useState<AppLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<AppLog | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const userRole = useUserRole();
    const router = useRouter();
    const isMobile = useIsMobile();

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

    const totalPages = Math.ceil(logs.length / ITEMS_PER_PAGE);
    const paginatedLogs = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return logs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [logs, currentPage]);
    
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

    const LogCardMobile = ({ log }: { log: AppLog }) => (
        <AlertDialogTrigger asChild>
            <div className="rounded-lg border bg-card p-4 cursor-pointer" onClick={() => setSelectedLog(log)}>
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1.5">
                        <span className="font-semibold truncate max-w-[200px]">{log.message}</span>
                        <span className="text-sm text-muted-foreground">{log.component}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(log.timestamp)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <Badge variant={getLevelVariant(log.level)}>{log.level}</Badge>
                    </div>
                </div>
            </div>
        </AlertDialogTrigger>
    );

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
                             {isLoading ? (
                                <div className="flex justify-center items-center py-10 h-60">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                             ) : isMobile ? (
                                <div className="space-y-4 p-4">
                                  {paginatedLogs.length > 0 ? (
                                      paginatedLogs.map((log) => (
                                          <LogCardMobile key={log.id} log={log} />
                                      ))
                                  ) : (
                                      <div className="py-10 text-center text-muted-foreground">
                                          No hay logs para mostrar.
                                      </div>
                                  )}
                                </div>
                             ) : (
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
                                        {paginatedLogs.length > 0 ? (
                                            paginatedLogs.map((log) => (
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
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center">
                                                    No hay logs para mostrar. ¡Todo parece estar en orden!
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                             )}
                        </CardContent>
                        {totalPages > 1 && (
                            <CardFooter className="flex items-center justify-between border-t py-4">
                                <span className="text-sm text-muted-foreground">
                                    Página {currentPage} de {totalPages}
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Anterior
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Siguiente
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardFooter>
                        )}
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

    