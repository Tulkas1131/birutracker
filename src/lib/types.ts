import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

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
  event_type: 'SALIDA_LLENO' | 'DEVOLUCION_VACIO' | 'SALIDA_VACIO' | 'ENTRADA_LLENO';
  customer_id: string;
  customer_name: string;
  user_id: string; // This would be the authenticated user's ID
  timestamp: Timestamp;
  variety?: string;
};

// Zod Schemas for form validation
export const assetSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, 'El código es requerido'),
  type: z.enum(['BARRIL', 'CO2']),
  format: z.string().min(1, 'El formato es requerido'),
  status: z.enum(['LLENO', 'VACIO', 'EN_CLIENTE', 'EN_PLANTA']),
});

export type AssetFormData = z.infer<typeof assetSchema>;

export const customerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  address: z.string().optional(),
  contact: z.string().optional(),
  type: z.enum(['BAR', 'DISTRIBUIDOR', 'OTRO']),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

export const movementSchema = z.object({
  asset_id: z.string().min(1, "Por favor selecciona un activo."),
  event_type: z.enum(['SALIDA_LLENO', 'DEVOLUCION_VACIO', 'SALIDA_VACIO', 'ENTRADA_LLENO']),
  customer_id: z.string().min(1, "Por favor selecciona un cliente."),
  variety: z.string().optional(),
});

export type MovementFormData = z.infer<typeof movementSchema>;
