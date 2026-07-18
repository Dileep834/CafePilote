import type { TableStatus } from '@/types';
import type { CanvasTableStatus } from './Object';
import { BRAND } from '@/constants';

export const TABLE_STATUS_COLORS: Record<CanvasTableStatus, string> = {
  available: '#10B981',
  occupied: '#F43F5E',
  reserved: '#F59E0B',
  billing: '#FF6A00',
  cleaning: '#0EA5E9',
  disabled: '#94A3B8',
  selected: BRAND.navy,
};

/** Map operational table status (+ open bill) to canvas color key */
export function toCanvasStatus(
  status: TableStatus | undefined,
  opts?: { hasOpenBill?: boolean; selected?: boolean; disabled?: boolean }
): CanvasTableStatus {
  if (opts?.selected) return 'selected';
  if (opts?.disabled) return 'disabled';
  if (opts?.hasOpenBill && status === 'occupied') return 'billing';
  if (!status) return 'available';
  return status;
}
