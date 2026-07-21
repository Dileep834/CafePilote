import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TaxMode = 'none' | 'flat' | 'per_product';
export type ServiceChargeMode = 'disabled' | 'fixed' | 'percentage';
export type RoundingRule = 'none' | 'up' | 'down' | 'nearest_1' | 'nearest_0_5';

interface SettingsState {
  viewScale: number;
  setViewScale: (scale: number) => void;
  
  // Tax Engine Settings
  taxMode: TaxMode;
  defaultTaxRate: number;
  taxInclusive: boolean;
  
  serviceChargeMode: ServiceChargeMode;
  serviceChargeValue: number;
  
  roundingRule: RoundingRule;
  
  updateTaxSettings: (settings: Partial<Pick<SettingsState, 'taxMode' | 'defaultTaxRate' | 'taxInclusive' | 'serviceChargeMode' | 'serviceChargeValue' | 'roundingRule'>>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      viewScale: 100,
      setViewScale: (scale) => set({ viewScale: scale }),
      
      taxMode: 'flat',
      defaultTaxRate: 5,
      taxInclusive: true,
      
      serviceChargeMode: 'disabled',
      serviceChargeValue: 0,
      
      roundingRule: 'nearest_1',
      
      updateTaxSettings: (settings) => set((state) => ({ ...state, ...settings })),
    }),
    {
      name: 'app-settings',
    }
  )
);
