
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assetBatchSchema, type AssetBatchFormData, barrelFormats, co2Formats } from "@/lib/types";

interface AssetBatchFormProps {
  onSubmit: (data: AssetBatchFormData) => void;
  onCancel: () => void;
}

export function AssetBatchForm({ onSubmit, onCancel }: AssetBatchFormProps) {
  const form = useForm<AssetBatchFormData>({
    resolver: zodResolver(assetBatchSchema),
    defaultValues: {
      type: "BARRIL",
      format: "",
      quantity: 10,
    },
  });
  
  const assetType = form.watch('type');
  const formatOptions = assetType === 'BARRIL' ? barrelFormats : co2Formats;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Activo</FormLabel>
              <Select onValueChange={(value) => {
                  field.onChange(value);
                  form.resetField('format'); // Reset format when type changes
              }} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo de activo a crear" />
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cantidad a Crear</FormLabel>
              <FormControl>
                <Input type="number" placeholder="ej., 25" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit">Crear Lote</Button>
        </div>
      </form>
    </Form>
  );
}
