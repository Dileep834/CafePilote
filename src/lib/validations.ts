import { z } from 'zod';

export const CheckoutItemSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string().min(1),
  quantity: z.number().positive().finite(),
  unit_price: z.number().nonnegative().finite(),
  total_price: z.number().nonnegative().finite(),
  tax_rate: z.number().nonnegative().max(100).optional(),
  tax_amount: z.number().nonnegative().finite().optional()
});

export const CheckoutPayloadSchema = z.object({
  outlet_id: z.string().uuid(),
  user_id: z.string().uuid(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  total_amount: z.number().nonnegative().finite(),
  tax_amount: z.number().nonnegative().finite(),
  tendered_amount: z.number().nonnegative().finite(),
  change_due: z.number().nonnegative().finite(),
  payment_method: z.string().min(1),
  inventory_mode: z.enum(['disabled', 'track', 'strict']),
  items: z.array(CheckoutItemSchema).min(1, 'Cart cannot be empty')
});

export type CheckoutPayload = z.infer<typeof CheckoutPayloadSchema>;
