import { z } from 'zod';
import { Timestamp } from 'firebase/firestore/lite';

// Data types
export type Asset = {
  id: string;
  code: string;
  type: 'BARRIL' | 'CO2';
  format: string;
  state: 'LLENO' | 'VACIO';
  location: 'EN_CLIENTE' | 'EN_PLANTA' | 'EN_REPARTO';
  variety?: string;
};

export type Customer = {
  id: string;
  name: string;
  address: string;
  contact: string;
  type: 'BAR' | 'DISTRIBUIDOR' | 'OTRO';
  phone?: string;
};

export const movementEventTypes = [
  'LLENADO_EN_PLANTA',
  'SALIDA_A_REPARTO', 
  'ENTREGA_A_CLIENTE', 
  'RECOLECCION_DE_CLIENTE', 
  'RECEPCION_EN_PLANTA', 
  'SALIDA_VACIO', 
  'DEVOLUCION'
] as const;

export type MovementEventType = typeof movementEventTypes[number];


export type Event = {
  id: string;
  asset_id: string;
  asset_code: string;
  event_type: MovementEventType;
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
  location: z.enum(['EN_CLIENTE', 'EN_PLANTA', 'EN_REPARTO']),
  variety: z.string().optional(),
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
  phone: z.string().optional().refine(
    (phones) => {
      if (!phones) return true; // Optional field is valid if empty
      return phones.split(',').every(phone => {
        const trimmedPhone = phone.trim();
        if (trimmedPhone === '') return true; // Ignore empty strings between commas
        const digits = trimmedPhone.replace(/\D/g, ''); // Remove non-digits
        return digits.length >= 9;
      });
    },
    {
      message: "Cada número de teléfono debe tener al menos 9 dígitos (sin contar símbolos o espacios).",
    }
  ),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

export const movementSchema = z.object({
  asset_id: z.string().min(1, "Por favor, selecciona un activo."),
  event_type: z.enum(movementEventTypes),
  customer_id: z.string().min(1, "Por favor, selecciona un cliente."),
  variety: z.string().optional(),
});

export type MovementFormData = z.infer<typeof movementSchema>;
