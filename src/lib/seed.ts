"use server";

import { collection, writeBatch, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import type { Asset, Customer } from "./types";

const mockAssets: Omit<Asset, 'id'>[] = [
  { code: 'KEG-001', type: 'BARRIL', format: '50L', status: 'LLENO' },
  { code: 'KEG-002', type: 'BARRIL', format: '50L', status: 'EN_PLANTA' },
  { code: 'KEG-003', type: 'BARRIL', format: '30L', status: 'VACIO' },
  { code: 'KEG-004', type: 'BARRIL', format: '30L', status: 'EN_CLIENTE' },
  { code: 'KEG-005', type: 'BARRIL', format: '20L', status: 'LLENO' },
  { code: 'CO2-01', type: 'CO2', format: '6kg', status: 'LLENO' },
  { code: 'CO2-02', type: 'CO2', format: '6kg', status: 'EN_CLIENTE' },
  { code: 'CO2-03', type: 'CO2', format: '10kg', status: 'VACIO' },
];

const mockCustomers: Omit<Customer, 'id'>[] = [
  { name: 'Bar La Esquina', type: 'BAR', address: 'Av. Siempre Viva 123', contact: 'Juan Pérez' },
  { name: 'Distribuidora del Sur', type: 'DISTRIBUIDOR', address: 'Calle Falsa 456', contact: 'Ana Gómez' },
  { name: 'El Refugio Cervecero', type: 'BAR', address: 'Ruta 7 km 8', contact: 'Carlos Ruiz' },
  { name: 'Otro Cliente', type: 'OTRO', address: 'Desconocida', contact: 'Misterio' },
];

async function clearCollection(collectionName: string) {
  const collectionRef = collection(db, collectionName);
  const querySnapshot = await getDocs(collectionRef);
  const batch = writeBatch(db);
  querySnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}

export async function seedDatabase() {
  try {
    // Clear existing data to prevent duplicates
    await clearCollection('assets');
    await clearCollection('customers');
    await clearCollection('events');

    // Batch write assets
    const assetsBatch = writeBatch(db);
    mockAssets.forEach((asset) => {
      const docRef = collection(db, 'assets').doc(); // Auto-generate ID
      assetsBatch.set(docRef, asset);
    });
    await assetsBatch.commit();
    console.log('Assets successfully seeded.');

    // Batch write customers
    const customersBatch = writeBatch(db);
    mockCustomers.forEach((customer) => {
      const docRef = collection(db, 'customers').doc(); // Auto-generate ID
      customersBatch.set(docRef, customer);
    });
    await customersBatch.commit();
    console.log('Customers successfully seeded.');

  } catch (error) {
    console.error('Error seeding database: ', error);
    throw new Error('Failed to seed database.');
  }
}
