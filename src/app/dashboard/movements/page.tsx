"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { movementSchema, type MovementFormData } from "@/lib/types";
import { mockAssets, mockCustomers } from "@/lib/data";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export default function MovementsPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const form = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      event_type: "SALIDA_LLENO",
      variety: "",
    },
  });

  const watchAssetId = form.watch("asset_id");
  const watchEventType = form.watch("event_type");

  const selectedAsset = mockAssets.find(asset => asset.id === watchAssetId);
  const showVarietyField = selectedAsset?.type === 'BARRIL' && (watchEventType === 'SALIDA_LLENO' || watchEventType === 'ENTRADA_LLENO');


  function onSubmit(data: MovementFormData) {
    console.log(data);
    toast({
      title: "Movimiento Registrado",
      description: `Se ha registrado el movimiento del activo.`,
    });
    // En una aplicación real, aquí también actualizarías el estado del activo.
    form.reset();
    router.push("/dashboard/history");
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Registrar un Movimiento"
        description="Registra la salida o entrada de un activo a un cliente."
      />
      <main className="flex-1 p-4 pt-0 md:p-6 md:pt-0">
        <Card className="mx-auto w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Detalles del Nuevo Movimiento</CardTitle>
            <CardDescription>Selecciona un activo, un tipo de evento y un cliente.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="asset_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un activo para mover" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mockAssets.map(asset => (
                            <SelectItem key={asset.id} value={asset.id}>
                              {asset.code} ({asset.type} - {asset.format}) - <span className="text-muted-foreground">{asset.status}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="event_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Evento</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un tipo de evento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SALIDA_LLENO">SALIDA_LLENO (Salida)</SelectItem>
                          <SelectItem value="DEVOLUCION_VACIO">DEVOLUCION_VACIO (Retorno)</SelectItem>
                          <SelectItem value="SALIDA_VACIO">SALIDA_VACIO (Caso especial)</SelectItem>
                          <SelectItem value="ENTRADA_LLENO">ENTRADA_LLENO (Caso especial)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {showVarietyField && (
                  <FormField
                    control={form.control}
                    name="variety"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Variedad de Cerveza</FormLabel>
                        <FormControl>
                          <Input placeholder="ej., IPA, Stout, Lager" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                 <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el cliente asociado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mockCustomers.map(customer => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" size="lg" className="w-full">Guardar Movimiento</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
