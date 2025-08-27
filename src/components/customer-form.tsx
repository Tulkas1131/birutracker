
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { customerSchema, type CustomerFormData } from "@/lib/types";

interface CustomerFormProps {
  defaultValues?: CustomerFormData;
  onSubmit: (data: CustomerFormData) => void;
  onCancel: () => void;
}

export function CustomerForm({ defaultValues, onSubmit, onCancel }: CustomerFormProps) {
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: defaultValues || {
      name: "",
      address: "",
      contact: "",
      type: "BAR",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Cliente</FormLabel>
              <FormControl>
                <Input placeholder="ej., El Bar de la Esquina" {...field} />
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
                    <SelectValue placeholder="Selecciona el tipo de cliente" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="BAR">BAR</SelectItem>
                  <SelectItem value="DISTRIBUIDOR">DISTRIBUIDOR</SelectItem>
                  <SelectItem value="OTRO">OTRO</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <Input placeholder="ej., Av. Siempre Viva 123" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contacto</FormLabel>
              <FormControl>
                <Input placeholder="ej., Juan Pérez" {...field} />
              </FormControl>
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
