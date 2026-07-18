import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PrinterSize = '58mm' | '80mm' | 'standard';
/** How Table Management displays tables */
export type TableViewMode = 'normal' | 'floor';
/** Card grid vs dense list inside the normal board */
export type TableBoardLayout = 'grid' | 'list';

interface SettingsState {
  printerSize: PrinterSize;
  cafeName: string;
  cafeAddress: string;
  cafePhone: string;
  taxNumber: string;
  receiptFooterMessage: string;
  /** Preferred table board: card grid or live floor plan */
  tableViewMode: TableViewMode;
  /** Grid cards or list rows when tableViewMode is normal */
  tableBoardLayout: TableBoardLayout;

  setPrinterSize: (size: PrinterSize) => void;
  setTableViewMode: (mode: TableViewMode) => void;
  setTableBoardLayout: (layout: TableBoardLayout) => void;
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
      tableBoardLayout: 'grid',

      setPrinterSize: (size) => set({ printerSize: size }),
      setTableViewMode: (mode) => set({ tableViewMode: mode }),
      setTableBoardLayout: (layout) => set({ tableBoardLayout: layout }),
      updateSettings: (settings) => set((state) => ({ ...state, ...settings })),
    }),
    {
      name: 'cafepilot-settings',
    }
  )
);
