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

export default function MovementsPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const form = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      event_type: "SALIDA_LLENO",
    },
  });

  function onSubmit(data: MovementFormData) {
    console.log(data);
    toast({
      title: "Movement Logged",
      description: `Successfully logged movement for asset.`,
    });
    // In a real app, you would also update the asset's status here.
    form.reset();
    router.push("/dashboard/history");
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Log a Movement"
        description="Record an asset going to or coming from a customer."
      />
      <main className="flex-1 p-4 pt-0 md:p-6 md:pt-0">
        <Card className="mx-auto w-full max-w-2xl">
          <CardHeader>
            <CardTitle>New Movement Details</CardTitle>
            <CardDescription>Select an asset, an event type, and a customer.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="asset_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an asset to move" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mockAssets.map(asset => (
                            <SelectItem key={asset.id} value={asset.id}>
                              {asset.code} ({asset.format}) - <span className="text-muted-foreground">{asset.status}</span>
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
                      <FormLabel>Event Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an event type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SALIDA_LLENO">SALIDA_LLENO (Check-out)</SelectItem>
                          <SelectItem value="DEVOLUCION_VACIO">DEVOLUCION_VACIO (Return)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select the associated customer" />
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
                <Button type="submit" size="lg" className="w-full">Save Movement</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
