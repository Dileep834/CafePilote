import { z } from 'zod';

export const businessInfoSchema = z.object({
  companyName: z.string().trim().min(2, 'Company name is required'),
  businessType: z.enum(['Cafe', 'Restaurant', 'Bakery', 'Cloud Kitchen', 'Bar', 'Food Court']),
  ownerName: z.string().trim().min(2, 'Owner name is required'),
  mobile: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,15}$/, 'Enter a valid mobile number'),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
  gstNumber: z.string().trim().optional(),
  fssai: z.string().trim().optional(),
  country: z.string().trim().min(2),
  state: z.string().trim().optional(),
  city: z.string().trim().optional(),
  timezone: z.string().trim().min(2),
  currency: z.string().trim().min(3).max(3),
  language: z.string().trim().min(2),
  planId: z.enum(['lite', 'starter', 'professional', 'enterprise', 'growth']),
  trialDays: z.number().int().min(0).max(90),
  logoDataUrl: z.string().nullable().optional(),
});

export type BusinessInfoInput = z.infer<typeof businessInfoSchema>;

export function validateBusinessInfo(data: unknown) {
  return businessInfoSchema.safeParse(data);
}
