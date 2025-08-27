import type { Asset, Customer, Event } from './types';

export const mockAssets: Asset[] = [
  { id: '1', code: 'KEG-001', type: 'BARRIL', format: '50 L', status: 'EN_CLIENTE' },
  { id: '2', code: 'KEG-002', type: 'BARRIL', format: '30 L', status: 'LLENO' },
  { id: '3', code: 'CO2-001', type: 'CO2', format: '6 kg', status: 'EN_PLANTA' },
  { id: '4', code: 'KEG-003', type: 'BARRIL', format: '50 L', status: 'VACIO' },
  { id: '5', code: 'CO2-002', type: 'CO2', format: '10 kg', status: 'LLENO' },
];

export const mockCustomers: Customer[] = [
  { id: '1', name: 'Bar La Esquina', address: '123 Main St', contact: 'John Doe', type: 'BAR' },
  { id: '2', name: 'Distribuidora del Centro', address: '456 Oak Ave', contact: 'Jane Smith', type: 'DISTRIBUIDOR' },
  { id: '3', name: 'El Festival Anual', address: '789 Pine Ln', contact: 'Sam Wilson', type: 'OTRO' },
  { id: '4', name: 'The Thirsty Monk', address: '101 Beer Rd', contact: 'Mike Ross', type: 'BAR' },
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
    timestamp: '2025-08-25T10:00:00Z',
    variety: 'IPA',
  },
  {
    id: '2',
    asset_id: '4',
    asset_code: 'KEG-003',
    event_type: 'DEVOLUCION_VACIO',
    customer_id: '2',
    customer_name: 'Distribuidora del Centro',
    user_id: 'user1',
    timestamp: '2025-08-24T14:30:00Z',
  },
  {
    id: '3',
    asset_id: '2',
    asset_code: 'KEG-002',
    event_type: 'SALIDA_LLENO',
    customer_id: '4',
    customer_name: 'The Thirsty Monk',
    user_id: 'user2',
    timestamp: '2025-08-23T11:00:00Z',
    variety: 'Stout',
  },
  {
    id: '4',
    asset_id: '4',
    asset_code: 'KEG-003',
    event_type: 'SALIDA_VACIO',
    customer_id: '1',
    customer_name: 'Bar La Esquina',
    user_id: 'user1',
    timestamp: '2025-08-22T09:00:00Z',
  },
  {
    id: '5',
    asset_id: '1',
    asset_code: 'KEG-001',
    event_type: 'ENTRADA_LLENO',
    customer_id: '3',
    customer_name: 'El Festival Anual',
    user_id: 'user2',
    timestamp: '2025-08-21T18:00:00Z',
    variety: 'Blonde Ale',
  },
];
