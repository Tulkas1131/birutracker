
"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, PlusCircle, Loader2 } from "lucide-react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
import type { Customer } from "@/lib/types";
import { CustomerForm } from "@/components/customer-form";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);
  const { toast } = useToast();
  const userRole = useUserRole();
  
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "customers"), (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(customersData);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);


  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormOpen(true);
  };
  
  const handleNew = () => {
    setSelectedCustomer(undefined);
    setFormOpen(true);
  };
  
  const handleDelete = async (id: string) => {
    if (userRole !== 'Admin') {
       toast({
        title: "Access Denied",
        description: "You do not have permission to delete customers.",
        variant: "destructive",
      });
      return;
    }
    try {
      await deleteDoc(doc(db, "customers", id));
      toast({
        title: "Customer Deleted",
        description: "The customer has been removed from the database.",
      });
    } catch (error) {
       console.error("Error deleting customer: ", error);
      toast({
        title: "Error",
        description: "Could not delete customer.",
        variant: "destructive",
      });
    }
  };
  
  const handleFormSubmit = async (data: Omit<Customer, 'id'>) => {
    try {
      if (selectedCustomer) {
        await updateDoc(doc(db, "customers", selectedCustomer.id), data);
        toast({
          title: "Customer Updated",
          description: "Changes have been saved.",
        });
      } else {
        await addDoc(collection(db, "customers"), data);
        toast({
          title: "Customer Created",
          description: "The new customer has been added.",
        });
      }
      setFormOpen(false);
      setSelectedCustomer(undefined);
    } catch (error) {
      console.error("Error saving customer: ", error);
      toast({
        title: "Error",
        description: "Could not save data.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-1 flex-col">
       <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
        <PageHeader
          title="Customers"
          description="Manage your customers and distributors."
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
            <CardContent className="p-0">
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
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                        </TableCell>
                      </TableRow>
                    ) : customers.length === 0 ? (
                       <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            No customers yet. Add one to get started!
                          </TableCell>
                        </TableRow>
                    ) : (
                      customers.map((customer) => (
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
                                {userRole === 'Admin' && (
                                  <DropdownMenuItem onSelect={() => handleDelete(customer.id)} className="text-destructive">
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
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
              onCancel={() => {
                setFormOpen(false);
                setSelectedCustomer(undefined);
              }}
            />
        </DialogContent>
      </Dialog>
    </div>
  );
}
