import React, { lazy, Suspense, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BRAND } from '@/constants';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import type { Table, TableStatus } from '@/types';
import type { TableBill } from '../store/useTableBillStore';
import {
  getCombinedCapacity,
  getMergeGroup,
  getMergeLabel,
  getNextStatusAction,
  isClearBlockedByOpenBill,
  isMergePrimary,
} from '../store/useTableStore';
import {
  ArrowRightLeft,
  Check,
  ChevronDown,
  Combine,
  Copy,
  ExternalLink,
  Pencil,
  Printer,
  Receipt,
  RefreshCw,
  Trash2,
  Unlink,
  UtensilsCrossed,
  Users,
  Clock3,
  ChefHat,
  History,
  QrCode,
} from 'lucide-react';

const TableQrPreview = lazy(() =>
  import('./TableQrPreview').then((m) => ({ default: m.TableQrPreview }))
);

const STATUS_META: Record<
  TableStatus,
  { label: string; chip: string; soft: string; active: string }
> = {
  available: {
    label: 'Available',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    soft: 'text-emerald-700',
    active: 'bg-emerald-600 text-white shadow-sm',
  },
  occupied: {
    label: 'Occupied',
    chip: 'bg-rose-50 text-rose-700 border-rose-200',
    soft: 'text-rose-700',
    active: 'bg-rose-600 text-white shadow-sm',
  },
  reserved: {
    label: 'Reserved',
    chip: 'bg-amber-50 text-amber-800 border-amber-200',
    soft: 'text-amber-800',
    active: 'bg-amber-500 text-white shadow-sm',
  },
  cleaning: {
    label: 'Cleaning',
    chip: 'bg-sky-50 text-sky-700 border-sky-200',
    soft: 'text-sky-700',
    active: 'bg-sky-600 text-white shadow-sm',
  },
};

function minutesSince(dateIso?: string | null) {
  if (!dateIso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(dateIso).getTime()) / 60000));
}

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function timeLabel(dateIso?: string | null) {
  if (!dateIso) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateIso));
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left transition duration-150 hover:bg-slate-50 active:scale-[0.99]"
      >
        <span className="text-xs font-bold uppercase tracking-wide text-slate-600">{title}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
            open && 'rotate-180'
          )}
          aria-hidden
        />
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 border-t border-slate-100 px-3.5 pb-3.5 pt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

function buildActivityTimeline(
  table: Table,
  bill: TableBill | undefined,
  unfired: number
): Array<{ id: string; time: string; label: string }> {
  const events: Array<{ id: string; time: string; sort: number; label: string }> = [];

  if (table.status === 'available' && !bill) {
    events.push({
      id: 'ready',
      time: timeLabel(new Date().toISOString()),
      sort: Date.now(),
      label: 'Ready for next guests',
    });
  }
  if (table.status === 'reserved') {
    events.push({
      id: 'reserved',
      time: timeLabel(new Date().toISOString()),
      sort: Date.now(),
      label: 'Table reserved',
    });
  }
  if (table.status === 'cleaning') {
    events.push({
      id: 'cleaning',
      time: timeLabel(new Date().toISOString()),
      sort: Date.now(),
      label: 'Cleaning in progress',
    });
  }
  if (bill) {
    events.push({
      id: 'seated',
      time: timeLabel(bill.createdAt),
      sort: new Date(bill.createdAt).getTime(),
      label: 'Guest seated',
    });
    if (bill.items.length > 0) {
      events.push({
        id: 'ordered',
        time: timeLabel(bill.createdAt),
        sort: new Date(bill.createdAt).getTime() + 1,
        label: 'Order placed',
      });
      const anyFired = bill.items.some((item) => item.fired);
      if (anyFired) {
        events.push({
          id: 'kot',
          time: timeLabel(bill.updatedAt),
          sort: new Date(bill.updatedAt).getTime() - 2,
          label: 'KOT Sent',
        });
      }
      if (anyFired && unfired === 0) {
        events.push({
          id: 'served',
          time: timeLabel(bill.updatedAt),
          sort: new Date(bill.updatedAt).getTime() - 1,
          label: 'Food Served',
        });
      }
      events.push({
        id: 'bill',
        time: timeLabel(bill.updatedAt),
        sort: new Date(bill.updatedAt).getTime(),
        label: 'Bill Generated',
      });
      events.push({
        id: 'pay',
        time: timeLabel(bill.updatedAt),
        sort: new Date(bill.updatedAt).getTime() + 1,
        label: bill.status === 'paid' ? 'Paid' : 'Payment Pending',
      });
    }
  }

  return events
    .sort((a, b) => b.sort - a.sort)
    .slice(0, 8)
    .map(({ id, time, label }) => ({ id, time, label }));
}

export type TableActionPanelProps = {
  table: Table;
  outletTables: Table[];
  bill?: TableBill;
  billTotal: number;
  unfiredCount: number;
  waiterName: string;
  busy: boolean;
  copied: boolean;
  qrSyncMsg: string | null;
  menuUrl: (table: Table) => string;
  onApplyStatus: (status: TableStatus) => void;
  onPayBill: () => void;
  onAddItems: () => void;
  onOpenMoveModal: () => void;
  onMoveTo: (targetId: string) => Promise<boolean>;
  onOpenMergeModal: () => void;
  onMergeWith: (partnerId: string) => Promise<boolean>;
  onUnmerge: () => Promise<void>;
  onRemoveFromMerge: () => Promise<void>;
  onCopyQr: () => void;
  onOpenGuestMenu: () => void;
  onPrintQr: () => void;
  onRegenQr: () => void;
  onGenerateQr: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function TableActionPanel({
  table,
  outletTables,
  bill,
  billTotal,
  unfiredCount,
  waiterName,
  busy,
  copied,
  qrSyncMsg,
  menuUrl,
  onApplyStatus,
  onPayBill,
  onAddItems,
  onOpenMoveModal,
  onMoveTo,
  onOpenMergeModal,
  onMergeWith,
  onUnmerge,
  onRemoveFromMerge,
  onCopyQr,
  onOpenGuestMenu,
  onPrintQr,
  onRegenQr,
  onGenerateQr,
  onEdit,
  onDelete,
}: TableActionPanelProps) {
  const nextAction = getNextStatusAction(table.status);
  const group = getMergeGroup(outletTables, table);
  const merged = group.length > 1;
  const seats = merged ? getCombinedCapacity(group) : table.capacity;
  const hasOpenBillItems = !!(bill && bill.items.length > 0);
  const clearBlocked =
    isClearBlockedByOpenBill(table.status, hasOpenBillItems) &&
    (nextAction.next === 'cleaning' || nextAction.next === 'available');
  const running = bill ? durationLabel(minutesSince(bill.createdAt)) : '0m';
  const paymentLabel = !hasOpenBillItems ? 'No open bill' : bill?.status === 'paid' ? 'Paid' : 'Payment Pending';
  const canMove = table.status === 'occupied' || table.status === 'reserved';

  const availableTargets = useMemo(
    () =>
      outletTables
        .filter((t) => {
          if (t.id === table.id) return false;
          if (table.mergeGroupId && t.mergeGroupId === table.mergeGroupId) return false;
          if (t.status !== 'available') return false;
          if (t.mergeGroupId) return false;
          return true;
        })
        .sort((a, b) =>
          a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true })
        )
        .slice(0, 6),
    [outletTables, table]
  );

  const mergeTargets = useMemo(
    () =>
      outletTables
        .filter((t) => {
          if (t.id === table.id) return false;
          if (t.status === 'cleaning') return false;
          if (merged && t.mergeGroupId === table.mergeGroupId) return false;
          if (t.mergeGroupId && t.mergeGroupId !== table.mergeGroupId) return false;
          return true;
        })
        .sort((a, b) =>
          a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true })
        )
        .slice(0, 6),
    [outletTables, table, merged]
  );

  const activity = useMemo(
    () => buildActivityTimeline(table, bill, unfiredCount),
    [table, bill, unfiredCount]
  );

  const handleClear = () => {
    if (clearBlocked) {
      window.alert('Pay the open bill before clearing this table.');
      return;
    }
    const target =
      table.status === 'occupied' || table.status === 'reserved'
        ? 'cleaning'
        : table.status === 'cleaning'
          ? 'available'
          : nextAction.next;
    onApplyStatus(target);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Compact header — always visible */}
      <div className="shrink-0 border-b border-slate-100 bg-[#F3F3F8] px-4 py-3.5 pr-12">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-black tracking-tight text-[#0D1B2A]">
            {merged ? getMergeLabel(group) : table.tableNumber}
          </h2>
          <span
            className={cn(
              'rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors duration-150',
              STATUS_META[table.status].chip
            )}
          >
            {STATUS_META[table.status].label}
          </span>
          {hasOpenBillItems ? (
            <span className="text-base font-black tabular-nums" style={{ color: BRAND.orange }}>
              {formatCurrency(billTotal)}
            </span>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1" title="Guests / capacity">
            <Users className="h-3 w-3 text-slate-400" aria-hidden />
            Guests {seats}
          </span>
          <span className="inline-flex items-center gap-1" title="Running time">
            <Clock3 className="h-3 w-3 text-slate-400" aria-hidden />
            Running {running}
          </span>
          <span className="inline-flex items-center gap-1" title="Assigned waiter">
            Waiter {waiterName}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1',
              unfiredCount > 0 ? 'text-amber-700' : ''
            )}
            title="Pending kitchen tickets"
          >
            <ChefHat className="h-3 w-3" aria-hidden />
            Pending KOT {unfiredCount}
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">
          {table.status === 'available'
            ? 'Ready for next guests'
            : clearBlocked
              ? 'Open bill unpaid — take payment before clearing'
              : nextAction.hint}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {/* Bill summary — always visible */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Current Bill
              </p>
              <p className="mt-0.5 text-2xl font-black tabular-nums text-[#0D1B2A]">
                {hasOpenBillItems ? formatCurrency(billTotal) : '₹0'}
              </p>
            </div>
            <span
              className={cn(
                'rounded-md px-2 py-1 text-[10px] font-bold uppercase',
                hasOpenBillItems && bill?.status !== 'paid'
                  ? 'bg-amber-50 text-amber-700'
                  : hasOpenBillItems
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
              )}
            >
              {paymentLabel}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-600">
            <span>Items {bill?.items.length || 0}</span>
            <span>Started {timeLabel(bill?.createdAt)}</span>
          </div>
        </div>

        {/* Quick Actions — always visible */}
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Quick Actions
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              className="h-11 rounded-xl font-bold text-white active:scale-[0.98]"
              style={{ backgroundColor: BRAND.orange }}
              disabled={!hasOpenBillItems || busy}
              onClick={onPayBill}
            >
              <Receipt className="mr-1.5 h-4 w-4" />
              Pay Bill
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl font-bold active:scale-[0.98]"
              disabled={busy}
              onClick={onAddItems}
            >
              <UtensilsCrossed className="mr-1.5 h-4 w-4" />
              Add Items
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl font-bold active:scale-[0.98]"
              disabled={busy || clearBlocked || table.status === 'available'}
              title={clearBlocked ? 'Pay the open bill before clearing' : 'Clear table'}
              onClick={handleClear}
            >
              Clear Table
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl font-bold active:scale-[0.98]"
              disabled={busy || !canMove}
              onClick={onOpenMoveModal}
            >
              <ArrowRightLeft className="mr-1.5 h-4 w-4" />
              Transfer
            </Button>
          </div>
        </div>

        {/* One-click move */}
        {canMove && availableTargets.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Move To
            </p>
            <div className="flex flex-wrap gap-2">
              {availableTargets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={busy}
                  title={`Transfer party to ${t.tableNumber}`}
                  onClick={() => void onMoveTo(t.id)}
                  className="h-10 min-w-[3.25rem] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-[#0D1B2A] transition duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm active:scale-[0.98] disabled:opacity-50"
                >
                  {t.tableNumber}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* One-click merge */}
        {!merged && mergeTargets.length > 0 && table.status !== 'cleaning' ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Merge With
              </p>
              <button
                type="button"
                className="text-[11px] font-bold text-[#FF6A00] hover:underline"
                onClick={onOpenMergeModal}
              >
                More…
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {mergeTargets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={busy}
                  title={`Merge with ${t.tableNumber}`}
                  onClick={() => void onMergeWith(t.id)}
                  className="h-10 min-w-[3.25rem] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-[#0D1B2A] transition duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm active:scale-[0.98] disabled:opacity-50"
                >
                  {t.tableNumber}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <CollapsibleSection title="QR & Guest Menu">
          <div className="flex items-center gap-2 text-sm font-bold text-[#0D1B2A]">
            <QrCode className="h-4 w-4" style={{ color: BRAND.orange }} aria-hidden />
            Guest menu QR
          </div>
          {table.qrCodeToken ? (
            <>
              <div className="flex justify-center rounded-xl border border-slate-200 bg-white p-3">
                <Suspense
                  fallback={
                    <div className="flex h-[140px] w-[140px] items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-400">
                      Loading QR…
                    </div>
                  }
                >
                  <TableQrPreview url={menuUrl(table)} size={140} className="rounded-lg" />
                </Suspense>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Guest Menu URL
                </p>
                <p className="break-all rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 font-mono text-[11px] text-slate-600">
                  {menuUrl(table)}
                </p>
              </div>
              {qrSyncMsg ? (
                <p className="text-[11px] font-medium text-slate-500">{qrSyncMsg}</p>
              ) : null}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600">
                <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Last Updated</p>
                  <p className="mt-0.5">Active</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Scan Count</p>
                  <p className="mt-0.5">{bill?.source === 'qr' ? '1+' : '—'}</p>
                </div>
                <div className="col-span-2 rounded-lg bg-slate-50 px-2.5 py-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Last Scan Time</p>
                  <p className="mt-0.5">
                    {bill?.source === 'qr' ? timeLabel(bill.updatedAt) : 'No scans yet'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl font-bold active:scale-[0.98]"
                  disabled={busy}
                  onClick={onCopyQr}
                >
                  {copied ? (
                    <>
                      <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-4 w-4" /> Copy
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl font-bold active:scale-[0.98]"
                  disabled={busy}
                  onClick={onOpenGuestMenu}
                >
                  <ExternalLink className="mr-1.5 h-4 w-4" /> Open
                </Button>
                <Button
                  type="button"
                  className="h-10 rounded-xl font-bold text-white active:scale-[0.98]"
                  style={{ backgroundColor: BRAND.orange }}
                  disabled={busy}
                  onClick={onPrintQr}
                >
                  <Printer className="mr-1.5 h-4 w-4" /> Print
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl font-bold active:scale-[0.98]"
                  disabled={busy}
                  onClick={onRegenQr}
                >
                  <RefreshCw className="mr-1.5 h-4 w-4" /> Regenerate
                </Button>
              </div>
            </>
          ) : (
            <Button
              type="button"
              className="h-10 w-full rounded-xl font-bold text-white active:scale-[0.98]"
              style={{ backgroundColor: BRAND.navy }}
              disabled={busy}
              onClick={onGenerateQr}
            >
              Generate QR link
            </Button>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Merge & Split">
          {merged ? (
            <>
              <p className="text-xs text-slate-500">
                Party uses {getMergeLabel(group)} ({seats} seats). Status applies to the whole group.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700"
                  >
                    {t.tableNumber}
                    {t.id === table.mergePrimaryId ? (
                      <span className="text-[9px] uppercase text-[#FF6A00]">primary</span>
                    ) : null}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex-1 rounded-xl font-bold active:scale-[0.98]"
                  disabled={busy || table.status === 'cleaning'}
                  onClick={onOpenMergeModal}
                >
                  Add table
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex-1 rounded-xl font-bold active:scale-[0.98]"
                  disabled={busy}
                  onClick={() => void onUnmerge()}
                >
                  <Unlink className="mr-1.5 h-4 w-4" />
                  Unmerge
                </Button>
              </div>
              {!isMergePrimary(table) ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-full rounded-xl text-xs font-bold text-slate-600"
                  disabled={busy}
                  onClick={() => void onRemoveFromMerge()}
                >
                  Remove {table.tableNumber} from merge
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500">Need more seats? Merge nearby tables into one party.</p>
              <Button
                type="button"
                className="h-10 w-full rounded-xl font-bold text-white active:scale-[0.98]"
                style={{ backgroundColor: BRAND.navy }}
                disabled={busy || table.status === 'cleaning'}
                onClick={onOpenMergeModal}
              >
                <Combine className="mr-2 h-4 w-4" />
                Merge with other tables
              </Button>
            </>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Change Status">
          <div
            role="radiogroup"
            aria-label="Table status"
            className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5 sm:grid-cols-4"
          >
            {(Object.keys(STATUS_META) as TableStatus[]).map((status) => {
              const blockedByBill =
                hasOpenBillItems && (status === 'cleaning' || status === 'available');
              const active = table.status === status;
              return (
                <button
                  key={status}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={busy || active || blockedByBill}
                  title={
                    blockedByBill
                      ? 'Pay the open bill before clearing this table'
                      : STATUS_META[status].label
                  }
                  onClick={() => onApplyStatus(status)}
                  className={cn(
                    'h-11 rounded-lg text-xs font-bold transition-all duration-150 active:scale-[0.98] disabled:opacity-50',
                    active
                      ? STATUS_META[status].active
                      : 'bg-white text-slate-600 hover:bg-white hover:shadow-sm'
                  )}
                >
                  {STATUS_META[status].label}
                </button>
              );
            })}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Table Activity">
          <ol className="relative space-y-0 border-l border-slate-200 pl-4">
            {activity.map((item) => (
              <li key={item.id} className="relative pb-3 last:pb-0">
                <span className="absolute -left-[1.15rem] mt-1 flex h-2.5 w-2.5 rounded-full bg-[#FF6A00] ring-4 ring-white" />
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {item.time}
                </p>
                <p className="text-sm font-semibold text-slate-800">{item.label}</p>
              </li>
            ))}
          </ol>
          {activity.length === 0 ? (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <History className="h-3.5 w-3.5" aria-hidden />
              No activity yet for this table.
            </p>
          ) : null}
        </CollapsibleSection>

        <CollapsibleSection title="Advanced Settings">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1 rounded-xl font-bold active:scale-[0.98]"
              onClick={onEdit}
            >
              <Pencil className="mr-1.5 h-4 w-4" />
              Edit table
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1 rounded-xl font-bold text-rose-600 border-rose-200 hover:bg-rose-50 active:scale-[0.98]"
              disabled={busy}
              onClick={onDelete}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
