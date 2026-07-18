import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PrinterSize = '58mm' | '80mm' | 'standard';
/** How Table Management displays tables */
export type TableViewMode = 'normal' | 'floor';

interface SettingsState {
  printerSize: PrinterSize;
  cafeName: string;
  cafeAddress: string;
  cafePhone: string;
  taxNumber: string;
  receiptFooterMessage: string;
  /** Preferred table board: card grid or live floor plan */
  tableViewMode: TableViewMode;

  setPrinterSize: (size: PrinterSize) => void;
  setTableViewMode: (mode: TableViewMode) => void;
  updateSettings: (settings: Partial<SettingsState>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      printerSize: '80mm', // default
      cafeName: 'CafePilots',
      cafeAddress: '123 Main Street',
      cafePhone: '555-0199',
      taxNumber: 'TAX-12345678',
      receiptFooterMessage: 'Thank you for your visit!',
      tableViewMode: 'normal',

      setPrinterSize: (size) => set({ printerSize: size }),
      setTableViewMode: (mode) => set({ tableViewMode: mode }),
      updateSettings: (settings) => set((state) => ({ ...state, ...settings })),
    }),
    {
      name: 'cafepilot-settings',
    }
  )
);
