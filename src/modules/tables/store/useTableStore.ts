import { create } from 'zustand';
import type { Table, TableStatus } from '@/types';

interface TableState {
  tables: Table[];
  isLoading: boolean;
  
  // Actions
  addTable: (table: Omit<Table, 'id' | 'qrCodeToken'>) => void;
  updateTableStatus: (id: string, status: TableStatus) => void;
  generateQR: (id: string) => void;
  assignOrder: (tableId: string, orderId: string) => void;
}

export const useTableStore = create<TableState>((set) => ({
  tables: [
    { id: 't1', outletId: 'current-outlet', tableNumber: 'T-01', capacity: 2, status: 'available', type: 'square', qrCodeToken: 't1-xyz123' },
    { id: 't2', outletId: 'current-outlet', tableNumber: 'T-02', capacity: 4, status: 'occupied', type: 'round', currentOrderId: 'order-123' },
    { id: 't3', outletId: 'current-outlet', tableNumber: 'T-03', capacity: 4, status: 'available', type: 'square' },
    { id: 't4', outletId: 'current-outlet', tableNumber: 'T-04', capacity: 6, status: 'reserved', type: 'sofa' },
    { id: 't5', outletId: 'current-outlet', tableNumber: 'T-05', capacity: 2, status: 'cleaning', type: 'round' },
    { id: 't6', outletId: 'current-outlet', tableNumber: 'T-06', capacity: 8, status: 'available', type: 'sofa' },
  ],
  isLoading: false,

  addTable: (tableData) => set((state) => ({
    tables: [...state.tables, { 
      ...tableData, 
      id: `t${Date.now()}`,
      qrCodeToken: `tok-${Date.now()}` 
    }]
  })),

  updateTableStatus: (id, status) => set((state) => ({
    tables: state.tables.map(t => t.id === id ? { ...t, status } : t)
  })),

  generateQR: (id) => set((state) => ({
    tables: state.tables.map(t => t.id === id ? { ...t, qrCodeToken: `tok-${Math.random().toString(36).substring(7)}` } : t)
  })),

  assignOrder: (tableId, orderId) => set((state) => ({
    tables: state.tables.map(t => t.id === tableId ? { ...t, currentOrderId: orderId, status: 'occupied' } : t)
  }))
}));
