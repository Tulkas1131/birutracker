
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Beer, Building, Globe, Phone } from 'lucide-react';
import type { Asset, Event } from '@/lib/types';
import { Logo } from '@/components/logo';

// This is a server component, so we can fetch data directly.
async function getAssetData(id: string) {
    const { doc, getDoc, collection, query, where, orderBy, limit } = await import("firebase/firestore/lite");
    const firestore = db();
    
    const assetRef = doc(firestore, "assets", id);
    const assetSnap = await getDoc(assetRef);

    if (!assetSnap.exists()) {
        return null;
    }

    const asset = { id: assetSnap.id, ...assetSnap.data() } as Asset;

    // Find the last event where the asset was filled with a variety
    const eventsQuery = query(
        collection(firestore, "events"),
        where("asset_id", "==", id),
        where("event_type", "in", ["SALIDA_A_REPARTO", "DEVOLUCION"]),
        orderBy("timestamp", "desc"),
        limit(1)
    );

    const eventsSnap = await getDoc(eventsQuery);
    const lastFillEvent = eventsSnap.docs[0]?.data() as Event | undefined;

    return { asset, lastVariety: lastFillEvent?.variety };
}


export default async function AssetInfoPage({ params }: { params: { id: string } }) {
    const data = await getAssetData(params.id);

    if (!data) {
        notFound();
    }

    const { asset, lastVariety } = data;

    const ownerInfo = {
        name: "Pukalan",
        address: "Av. de la Cerveza 123, Lúpulo, Chile",
        phone: "+56 9 1234 5678",
        website: "www.pukalan.cl",
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <Logo className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle className="mt-4 text-2xl font-bold">Información del Activo</CardTitle>
                    <CardDescription>Este activo es propiedad de Pukalan.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-lg border bg-background p-4">
                        <h3 className="text-lg font-semibold">{asset.code}</h3>
                        <p className="text-muted-foreground">{asset.format} {asset.type === 'BARRIL' ? 'Barril' : 'Cilindro CO2'}</p>
                        {lastVariety && asset.type === 'BARRIL' && (
                            <div className="mt-2 flex items-center text-sm">
                                <Beer className="mr-2 h-4 w-4 text-amber-500" />
                                <span>Última variedad: <strong>{lastVariety}</strong></span>
                            </div>
                        )}
                    </div>
                    <Separator />
                    <div className="space-y-3 text-sm">
                        <h4 className="font-semibold text-foreground">Información de Contacto</h4>
                         <div className="flex items-start">
                            <Building className="mr-3 mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            <span>{ownerInfo.address}</span>
                        </div>
                        <div className="flex items-center">
                            <Phone className="mr-3 h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${ownerInfo.phone}`} className="hover:underline">{ownerInfo.phone}</a>
                        </div>
                        <div className="flex items-center">
                            <Globe className="mr-3 h-4 w-4 text-muted-foreground" />
                            <a href={`https://${ownerInfo.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                {ownerInfo.website}
                            </a>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

    