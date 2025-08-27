"use client";

import { useState } from "react";
import { MoreHorizontal, PlusCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { mockCustomers } from "@/lib/data";
import type { Customer } from "@/lib/types";
import { CustomerForm } from "@/components/customer-form";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormOpen(true);
  };
  
  const handleNew = () => {
    setSelectedCustomer(undefined);
    setFormOpen(true);
  };
  
  const handleDelete = (id: string) => {
    setCustomers(customers.filter((customer) => customer.id !== id));
  };
  
  const handleFormSubmit = (data: Customer) => {
    if (selectedCustomer) {
      setCustomers(customers.map((customer) => (customer.id === selectedCustomer.id ? { ...data, id: customer.id } : customer)));
    } else {
      setCustomers([...customers, { ...data, id: (customers.length + 1).toString() }]);
    }
    setFormOpen(false);
    setSelectedCustomer(undefined);
  };

  return (
    <div className="flex flex-1 flex-col">
       <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
        <PageHeader
          title="Customers"
          description="Manage your clients and distributors."
          action={
            <DialogTrigger asChild>
                <Button size="lg" onClick={handleNew}>
                    <PlusCircle className="mr-2 h-5 w-5" />
                    New Customer
                </Button>
            </DialogTrigger>
          }
        />
        <main className="flex-1 p-4 pt-0 md:p-6 md:pt-0">
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{customer.type}</Badge>
                      </TableCell>
                      <TableCell>{customer.address}</TableCell>
                      <TableCell>{customer.contact}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => handleEdit(customer)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleDelete(customer.id)}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{selectedCustomer ? "Edit Customer" : "Create New Customer"}</DialogTitle>
            </DialogHeader>
            <CustomerForm
              defaultValues={selectedCustomer}
              onSubmit={handleFormSubmit}
              onCancel={() => setFormOpen(false)}
            />
        </DialogContent>
      </Dialog>
    </div>
  );
}
