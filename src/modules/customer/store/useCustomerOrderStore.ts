import { create } from 'zustand';

export interface CartItem {
  id: string; // unique cart item id (to allow same product with different notes)
  product: any;
  quantity: number;
  notes?: string;
}

interface CustomerOrderState {
  cart: CartItem[];
  outletId: string | null;
  tableToken: string | null;
  customerName: string;
  customerPhone: string;
  
  // Actions
  setSession: (outletId: string, tableToken: string) => void;
  addItem: (product: any, quantity?: number, notes?: string) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  setCustomerDetails: (name: string, phone: string) => void;
  clearCart: () => void;
  
  // Computed
  getCartTotal: () => number;
  getItemCount: () => number;
}

export const useCustomerOrderStore = create<CustomerOrderState>((set, get) => ({
  cart: [],
  outletId: null,
  tableToken: null,
  customerName: '',
  customerPhone: '',

  setSession: (outletId, tableToken) => set({ outletId, tableToken }),

  addItem: (product, quantity = 1, notes = '') => set((state) => {
    // If exact same product and notes exist, increase quantity
    const existingIndex = state.cart.findIndex(
      (item) => item.product.id === product.id && item.notes === notes
    );

    if (existingIndex >= 0) {
      const newCart = [...state.cart];
      newCart[existingIndex].quantity += quantity;
      return { cart: newCart };
    }

    // Otherwise add new line item
    return {
      cart: [
        ...state.cart,
        {
          id: Math.random().toString(36).substring(7),
          product,
          quantity,
          notes
        }
      ]
    };
  }),

  removeItem: (cartItemId) => set((state) => ({
    cart: state.cart.filter((item) => item.id !== cartItemId)
  })),

  updateQuantity: (cartItemId, delta) => set((state) => ({
    cart: state.cart.map((item) => {
      if (item.id === cartItemId) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    })
  })),

  setCustomerDetails: (name, phone) => set({ customerName: name, customerPhone: phone }),
  
  clearCart: () => set({ cart: [] }),

  getCartTotal: () => {
    return get().cart.reduce((total, item) => {
      const price = item.product.selling_price || item.product.sellingPrice || 0;
      return total + (price * item.quantity);
    }, 0);
  },

  getItemCount: () => {
    return get().cart.reduce((total, item) => total + item.quantity, 0);
  }
}));
