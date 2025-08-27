import type { Asset, Customer, Event } from './types';
import { Timestamp } from 'firebase/firestore';

export const mockAssets: Asset[] = [
  { id: '1', code: 'KEG-001', type: 'BARRIL', format: '50L', status: 'LLENO' },
  { id: '2', code: 'KEG-002', type: 'BARRIL', format: '50L', status: 'EN_PLANTA' },
  { id: '3', code: 'KEG-003', type: 'BARRIL', format: '30L', status: 'VACIO' },
  { id: '4', code: 'KEG-004', type: 'BARRIL', format: '30L', status: 'EN_CLIENTE' },
  { id: '5', code: 'KEG-005', type: 'BARRIL', format: '20L', status: 'LLENO' },
  { id: '6', code: 'CO2-01', type: 'CO2', format: '6kg', status: 'LLENO' },
  { id: '7', code: 'CO2-02', type: 'CO2', format: '6kg', status: 'EN_CLIENTE' },
  { id: '8', code: 'CO2-03', type: 'CO2', format: '10kg', status: 'VACIO' },
];

export const mockCustomers: Customer[] = [
    { id: '1', name: 'Bar La Esquina', type: 'BAR', address: 'Av. Siempre Viva 123', contact: 'Juan Pérez' },
    { id: '2', name: 'Distribuidora del Sur', type: 'DISTRIBUIDOR', address: 'Calle Falsa 456', contact: 'Ana Gómez' },
    { id: '3', name: 'El Refugio Cervecero', type: 'BAR', address: 'Ruta 7 km 8', contact: 'Carlos Ruiz' },
    { id: '4', name: 'Otro Cliente', type: 'OTRO', address: 'Desconocida', contact: 'Misterio' },
];

export const mockEvents: Event[] = [
    { 
        id: '1', 
        asset_id: '1', 
        asset_code: 'KEG-001', 
        event_type: 'SALIDA_LLENO', 
        customer_id: '1', 
        customer_name: 'Bar La Esquina', 
        user_id: 'user1', 
        timestamp: Timestamp.fromDate(new Date('2023-10-26T10:00:00Z')),
        variety: 'IPA' 
    },
    { 
        id: '2', 
        asset_id: '4', 
        asset_code: 'KEG-004', 
        event_type: 'DEVOLUCION_VACIO', 
        customer_id: '3', 
        customer_name: 'El Refugio Cervecero', 
        user_id: 'user2', 
        timestamp: Timestamp.fromDate(new Date('2023-10-25T15:30:00Z'))
    },
     { 
        id: '3', 
        asset_id: '7', 
        asset_code: 'CO2-02', 
        event_type: 'SALIDA_LLENO', 
        customer_id: '2', 
        customer_name: 'Distribuidora del Sur', 
        user_id: 'user1', 
        timestamp: Timestamp.fromDate(new Date('2023-10-25T11:00:00Z'))
    },
];
