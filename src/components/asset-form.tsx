"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assetSchema, type AssetFormData } from "@/lib/types";
import { useEffect } from "react";

interface AssetFormProps {
  defaultValues?: AssetFormData;
  onSubmit: (data: Omit<AssetFormData, 'code'>) => void;
  onCancel: () => void;
}

export function AssetForm({ defaultValues, onSubmit, onCancel }: AssetFormProps) {
  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: defaultValues || {
      code: "Se autogenerará",
      type: "BARRIL",
      format: "",
      status: "EN_PLANTA",
    },
  });

  // When editing, set the actual code value
  useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues);
    } else {
       form.reset({
        code: "Se autogenerará",
        type: "BARRIL",
        format: "",
        status: "EN_PLANTA",
      });
    }
  }, [defaultValues, form]);

  const isEditing = !!defaultValues;

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
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditing}>
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
