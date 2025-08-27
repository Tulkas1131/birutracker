import { z } from 'zod';

// Data types
export type Asset = {
  id: string;
  code: string;
  type: 'BARRIL' | 'CO2';
  format: string;
  status: 'LLENO' | 'VACIO' | 'EN_CLIENTE' | 'EN_PLANTA';
};

export type Customer = {
  id: string;
  name: string;
  address: string;
  contact: string;
  type: 'BAR' | 'DISTRIBUIDOR' | 'OTRO';
};

export type Event = {
  id: string;
  asset_id: string;
  asset_code: string;
  event_type: 'SALIDA_LLENO' | 'DEVOLUCION_VACIO';
  customer_id: string;
  customer_name: string;
  user_id: string;
  timestamp: string;
};

// Zod Schemas for form validation
export const assetSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, 'Code is required'),
  type: z.enum(['BARRIL', 'CO2']),
  format: z.string().min(1, 'Format is required'),
  status: z.enum(['LLENO', 'VACIO', 'EN_CLIENTE', 'EN_PLANTA']),
});

export type AssetFormData = z.infer<typeof assetSchema>;

export const customerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
  contact: z.string().optional(),
  type: z.enum(['BAR', 'DISTRIBUIDOR', 'OTRO']),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

export const movementSchema = z.object({
  asset_id: z.string().min(1, "Please select an asset."),
  event_type: z.enum(['SALIDA_LLENO', 'DEVOLUCION_VACIO']),
  customer_id: z.string().min(1, "Please select a customer."),
});

export type MovementFormData = z.infer<typeof movementSchema>;
