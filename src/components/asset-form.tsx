"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assetSchema, type AssetFormData } from "@/lib/types";

interface AssetFormProps {
  defaultValues?: AssetFormData;
  onSubmit: (data: AssetFormData) => void;
  onCancel: () => void;
}

export function AssetForm({ defaultValues, onSubmit, onCancel }: AssetFormProps) {
  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: defaultValues || {
      code: "",
      type: "BARRIL",
      format: "",
      status: "EN_PLANTA",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código del Activo</FormLabel>
              <FormControl>
                <Input placeholder="ej., KEG-001" {...field} />
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo de activo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="BARRIL">BARRIL</SelectItem>
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
              <FormControl>
                <Input placeholder="ej., 50 L o 6 kg" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
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
                  <SelectItem value="VACIO">VACIO</SelectItem>
                  <SelectItem value="EN_CLIENTE">EN CLIENTE</SelectItem>
                  <SelectItem value="EN_PLANTA">EN PLANTA</SelectItem>
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
