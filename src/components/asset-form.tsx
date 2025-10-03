
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assetSchema, type AssetFormData, barrelFormats, co2Formats } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Lock } from "lucide-react";

interface AssetFormProps {
  defaultValues?: AssetFormData;
  onSubmit: (data: Omit<AssetFormData, 'code'>) => void;
  onCancel: () => void;
  isLocked?: boolean;
}

export function AssetForm({ defaultValues, onSubmit, onCancel, isLocked = false }: AssetFormProps) {
  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: defaultValues ? {
      ...defaultValues,
      variety: defaultValues.variety ?? "",
      valveType: defaultValues.valveType ?? "",
    } : {
      code: "Será autogenerado",
      type: "BARRIL",
      format: "",
      state: "VACIO",
      location: "EN_PLANTA",
      variety: "",
      valveType: "",
    },
  });

  const isCreating = !defaultValues;
  const assetType = form.watch('type');
  
  const formatOptions = assetType === 'BARRIL' ? barrelFormats : co2Formats;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {isLocked && !isCreating && (
             <Alert variant="default">
                <Lock className="h-4 w-4" />
                <AlertTitle>Activo Bloqueado</AlertTitle>
                <AlertDescription>
                    El tipo, formato y variedad no se pueden cambiar porque el activo no está en planta.
                </AlertDescription>
            </Alert>
        )}
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código de Activo</FormLabel>
              <FormControl>
                <Input placeholder="ej., KEG-001" {...field} disabled />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select 
                onValueChange={(value) => {
                    field.onChange(value);
                    form.resetField('format'); // Reset format when type changes
                }} 
                defaultValue={field.value} 
                disabled={isLocked}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo de activo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="BARRIL">BARRIL (KEG)</SelectItem>
                  <SelectItem value="CO2">CO2</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="format"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Formato</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLocked}>
                 <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un formato" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {formatOptions.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estado</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el estado" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="LLENO">LLENO</SelectItem>
                  <SelectItem value="VACIO">VACÍO</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
         {form.watch('state') === 'LLENO' && (
             <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="variety"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Variedad</FormLabel>
                        <FormControl>
                            <Input placeholder="ej., IPA" {...field} disabled={isLocked} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="valveType"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Válvula</FormLabel>
                        <FormControl>
                            <Input placeholder="ej., G" {...field} disabled={isLocked} maxLength={1} style={{ textTransform: 'uppercase' }} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
             </div>
         )}
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ubicación</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la ubicación" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="EN_PLANTA">EN PLANTA</SelectItem>
                  <SelectItem value="EN_CLIENTE">EN CLIENTE</SelectItem>
                  <SelectItem value="EN_REPARTO">EN REPARTO</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Form>
  );
}
