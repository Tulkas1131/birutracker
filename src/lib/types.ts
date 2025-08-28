import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

// Data types
export type Asset = {
  id: string;
  code: string;
  type: 'BARRIL' | 'CO2';
  format: string;
  state: 'LLENO' | 'VACIO';
  location: 'EN_CLIENTE' | 'EN_PLANTA' | 'EN_PROVEEDOR';
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
  event_type: 'SALIDA_LLENO' | 'RETORNO_VACIO' | 'SALIDA_VACIO' | 'DEVOLUCION_LLENO';
  customer_id: string;
  customer_name: string;
  user_id: string; // This would be the authenticated user's ID
  timestamp: Timestamp;
  variety?: string;
};

// Zod Schemas for form validation
export const assetSchema = z.object({
  id: z.string().optional(),
  code: z.string(),
  type: z.enum(['BARRIL', 'CO2']),
  format: z.string().min(1, 'Format is required'),
  state: z.enum(['LLENO', 'VACIO']),
  location: z.enum(['EN_CLIENTE', 'EN_PLANTA', 'EN_PROVEEDOR']),
});

export type AssetFormData = z.infer<typeof assetSchema>;

export const assetBatchSchema = z.object({
  type: z.enum(['BARRIL', 'CO2'], { required_error: 'Debes seleccionar un tipo.' }),
  format: z.string().min(1, 'El formato es requerido.'),
  quantity: z.coerce.number().int().min(1, 'La cantidad debe ser al menos 1.').max(100, 'No se pueden crear más de 100 activos a la vez.'),
});

export type AssetBatchFormData = z.infer<typeof assetBatchSchema>;


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
  event_type: z.enum(['SALIDA_LLENO', 'RETORNO_VACIO', 'SALIDA_VACIO', 'DEVOLUCION_LLENO']),
  customer_id: z.string().min(1, "Please select a customer."),
  variety: z.string().optional(),
});

export type MovementFormData = z.infer<typeof movementSchema>;
