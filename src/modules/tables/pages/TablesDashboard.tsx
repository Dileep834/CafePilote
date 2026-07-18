import React, { useEffect, useMemo, useState } from 'react';
import {
  getCombinedCapacity,
  getMergeGroup,
  getMergeLabel,
  getNextStatusAction,
  isMergePrimary,
  useTableStore,
  type TableFormInput,
} from '../store/useTableStore';
import { useTableBillStore } from '../store/useTableBillStore';
import { syncTableForQr } from '../lib/resolveTableByQr';
import { TableFormModal } from '../components/TableFormModal';
import { MergeTablesModal } from '../components/MergeTablesModal';
import { MoveTableModal } from '../components/MoveTableModal';
import { TableQrPrintModal } from '../components/TableQrPrintModal';
import { TableQrPreview } from '../components/TableQrPreview';
import { TableViewModeToggle } from '../components/TableViewModeToggle';
import { useSettingsStore } from '@/modules/settings/store/useSettingsStore';
import { openTableOnPOS } from '@/modules/pos/store/usePOSStore';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAuthStore } from '@/store/useAuthStore';
import { BRAND } from '@/constants';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import type { Table, TableStatus } from '@/types';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Users,
  QrCode,
  LayoutGrid,
  ArrowRight,
  Pencil,
  Trash2,
  Copy,
  Check,
  Sparkles,
  CircleDot,
  Combine,
  Unlink,
  Receipt,
  UtensilsCrossed,
  ArrowRightLeft,
  Printer,
} from 'lucide-react';

const FloorOpsView = React.lazy(() =>
  import('@/modules/floordesigner/pages/FloorDesignerPage').then((m) => ({
    default: m.FloorDesignerPage,
  }))
);

const STATUS_META: Record<
  TableStatus,
  { label: string; chip: string; ring: string; dot: string; soft: string }
> = {
  available: {
    label: 'Available',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ring: 'border-emerald-400',
    dot: 'bg-emerald-500',
    soft: 'bg-emerald-50/80 border-emerald-200',
  },
  occupied: {
    label: 'Occupied',
    chip: 'bg-rose-50 text-rose-700 border-rose-200',
    ring: 'border-rose-400',
    dot: 'bg-rose-500',
    soft: 'bg-rose-50/80 border-rose-200',
  },
  reserved: {
    label: 'Reserved',
    chip: 'bg-amber-50 text-amber-800 border-amber-200',
    ring: 'border-amber-400',
    dot: 'bg-amber-500',
    soft: 'bg-amber-50/80 border-amber-200',
  },
  cleaning: {
    label: 'Cleaning',
    chip: 'bg-sky-50 text-sky-700 border-sky-200',
    ring: 'border-sky-400',
    dot: 'bg-sky-500',
    soft: 'bg-sky-50/80 border-sky-200',
  },
};

const FLOW_STEPS: { status: TableStatus; label: string }[] = [
  { status: 'available', label: 'Open' },
  { status: 'occupied', label: 'Seated' },
  { status: 'cleaning', label: 'Clear' },
  { status: 'available', label: 'Ready' },
];

export function TablesDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const outletId = user?.outletId || 'current-outlet';
  const tableViewMode = useSettingsStore((s) => s.tableViewMode);
  const setTableViewMode = useSettingsStore((s) => s.setTableViewMode);

  const {
    tables,
    isLoading,
    lastError,
    cloudEnabled,
    fetchTables,
    addTable,
    updateTable,
    updateTableStatus,
    deleteTable,
    generateQR,
    migrateLocalOutlet,
    mergeTables,
    unmergeTables,
    removeFromMerge,
  } = useTableStore();

  const getOpenBillForTable = useTableBillStore((s) => s.getOpenBillForTable);
  const getBillTotal = useTableBillStore((s) => s.getBillTotal);
  const hydrateOpenBills = useTableBillStore((s) => s.hydrateOpenBills);
  const movePartyToTable = useTableBillStore((s) => s.movePartyToTable);
  const billError = useTableBillStore((s) => s.lastError);

  const [filter, setFilter] = useState<TableStatus | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [mergeOpen, setMergeOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [qrPrintOpen, setQrPrintOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [qrSyncMsg, setQrSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchTables(outletId);
    void hydrateOpenBills(outletId);
  }, [outletId, fetchTables, hydrateOpenBills]);

  // Align seed / local tables to the signed-in outlet so QR links work
  useEffect(() => {
    if (!user?.outletId) return;
    migrateLocalOutlet('current-outlet', user.outletId);
  }, [user?.outletId, migrateLocalOutlet]);

  const outletTables = useMemo(
    () => tables.filter((t) => t.outletId === outletId || t.outletId === 'current-outlet'),
    [tables, outletId]
  );

  const selected = useMemo(
    () => outletTables.find((t) => t.id === selectedId) || null,
    [outletTables, selectedId]
  );

  const counts = useMemo(() => {
    const base: Record<TableStatus | 'all', number> = {
      all: outletTables.length,
      available: 0,
      occupied: 0,
      reserved: 0,
      cleaning: 0,
    };
    outletTables.forEach((t) => {
      base[t.status] += 1;
    });
    return base;
  }, [outletTables]);

  const filteredTables =
    filter === 'all' ? outletTables : outletTables.filter((t) => t.status === filter);

  const nextAction = selected ? getNextStatusAction(selected.status) : null;
  const selectedGroup = selected ? getMergeGroup(outletTables, selected) : [];
  const selectedMerged = selectedGroup.length > 1;
  const selectedSeats = selectedMerged
    ? getCombinedCapacity(selectedGroup)
    : selected?.capacity || 0;
  const selectedBill = selected ? getOpenBillForTable(selected, outletTables) : undefined;
  const selectedBillTotal = selectedBill ? getBillTotal(selectedBill) : 0;

  const goToTableBill = (table: Table, checkout = false) => {
    openTableOnPOS(table);
    navigate(checkout ? '/erp/pos/checkout' : '/erp/pos');
  };

  const menuUrl = (table: Table) => {
    const token = table.qrCodeToken || '';
    // Short public path — resolves by token in the cloud (guest phones)
    return `${window.location.origin}/menu/t/${encodeURIComponent(token)}`;
  };

  const ensureQrReady = async (table: Table) => {
    let current = table;
    if (!current.qrCodeToken) {
      const token = await generateQR(current.id);
      if (!token) return null;
      current = { ...current, qrCodeToken: token };
    }
    const synced = await syncTableForQr(current);
    setQrSyncMsg(
      synced
        ? 'QR ready for guest phones'
        : 'Saved locally — run dining_tables_schema.sql so guests can open this link'
    );
    return current;
  };

  const openAdd = () => {
    setFormMode('add');
    setFormOpen(true);
  };

  const openEdit = () => {
    if (!selected) return;
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleFormSubmit = async (input: TableFormInput) => {
    if (formMode === 'add') {
      const created = await addTable(input);
      if (created) setSelectedId(created.id);
      return !!created;
    }
    if (!selected) return false;
    return updateTable(selected.id, {
      tableNumber: input.tableNumber,
      capacity: input.capacity,
      type: input.type,
      status: input.status,
      outletId: input.outletId,
    });
  };

  const applyStatus = async (status: TableStatus) => {
    if (!selected) return;
    setBusy(true);
    await updateTableStatus(selected.id, status);
    setBusy(false);
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete table ${selected.tableNumber}? This cannot be undone.`)) return;
    setBusy(true);
    await deleteTable(selected.id);
    setBusy(false);
    setSelectedId(null);
  };

  const handleCopyQr = async () => {
    if (!selected) return;
    setBusy(true);
    const ready = await ensureQrReady(selected);
    setBusy(false);
    if (!ready?.qrCodeToken) return;
    const url = menuUrl(ready);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt('Copy QR menu link:', url);
    }
  };

  if (tableViewMode === 'floor') {
    return (
      <div className="flex flex-col h-full min-h-0 -m-4 md:-m-6">
        <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-white">
          <div>
            <h1 className="text-lg font-bold text-[#0D1B2A] flex items-center gap-2">
              <LayoutGrid className="w-5 h-5" style={{ color: BRAND.orange }} />
              Table Management
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Floor plan view · change anytime in Settings or here
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <TableViewModeToggle value={tableViewMode} onChange={setTableViewMode} size="sm" />
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-xl text-xs font-bold"
              onClick={() => navigate('/erp/floor')}
            >
              Edit layout
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <React.Suspense
            fallback={
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Loading floor plan…
              </div>
            }
          >
            <FloorOpsView variant="ops" />
          </React.Suspense>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full min-h-0 p-4 sm:p-6 space-y-5 overflow-auto"
      style={{
        background: `linear-gradient(165deg, ${BRAND.gray} 0%, #fff 45%, ${BRAND.cream}33 100%)`,
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1B2A] flex items-center gap-2 tracking-tight">
            <LayoutGrid className="w-6 h-6" style={{ color: BRAND.orange }} />
            Floor board
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Seat → serve → clear → ready. Tap a table to solve the next step.
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {cloudEnabled ? 'Synced with cloud' : 'Saved on this device'}
            {isLoading ? ' · Loading…' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <TableViewModeToggle value={tableViewMode} onChange={setTableViewMode} />
          <Button
            onClick={openAdd}
            className="h-11 px-5 rounded-xl text-white font-bold shadow-md"
            style={{ backgroundColor: BRAND.orange }}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add table
          </Button>
        </div>
      </div>

      {/* Lifecycle ribbon */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          <Sparkles className="w-3.5 h-3.5" style={{ color: BRAND.orange }} />
          Service flow
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#0D1B2A]">
          {FLOW_STEPS.map((step, i) => (
            <React.Fragment key={`${step.label}-${i}`}>
              {i > 0 && <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs',
                  STATUS_META[step.status].chip
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_META[step.status].dot)} />
                {step.label}
              </span>
            </React.Fragment>
          ))}
          <span className="text-slate-300 mx-1">·</span>
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs', STATUS_META.reserved.chip)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_META.reserved.dot)} />
            Reserve anytime
          </span>
        </div>
      </div>

      {/* Filters + counts */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'available', 'occupied', 'reserved', 'cleaning'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn(
              'px-3.5 py-2 rounded-xl text-sm font-bold capitalize transition-all border',
              filter === status
                ? 'bg-[#0D1B2A] text-white border-[#0D1B2A] shadow-sm'
                : 'bg-white/90 text-slate-600 border-slate-200 hover:border-slate-300'
            )}
          >
            <span className="inline-flex items-center gap-2">
              {status !== 'all' && (
                <span className={cn('w-2 h-2 rounded-full', STATUS_META[status].dot)} />
              )}
              {status === 'all' ? 'All' : STATUS_META[status].label}
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-md font-black',
                  filter === status ? 'bg-white/15' : 'bg-slate-100 text-slate-500'
                )}
              >
                {counts[status]}
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {filteredTables.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/50 py-16 px-6 text-center">
          <CircleDot className="w-10 h-10 text-slate-300 mb-3" />
          <p className="font-bold text-[#0D1B2A]">No tables in this view</p>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            {outletTables.length === 0
              ? 'Add your first table to start the floor board.'
              : 'Try another status filter, or clear the filter.'}
          </p>
          {outletTables.length === 0 && (
            <Button
              onClick={openAdd}
              className="mt-4 rounded-xl text-white font-bold"
              style={{ backgroundColor: BRAND.orange }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add table
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-8">
          {filteredTables.map((table) => {
            const meta = STATUS_META[table.status];
            const action = getNextStatusAction(table.status);
            const active = selectedId === table.id;
            const group = getMergeGroup(outletTables, table);
            const merged = group.length > 1;
            const seats = merged ? getCombinedCapacity(group) : table.capacity;
            const primary = isMergePrimary(table);
            const bill = getOpenBillForTable(table, outletTables);
            const billTotal = bill ? getBillTotal(bill) : 0;
            return (
              <button
                key={table.id}
                type="button"
                onClick={() => setSelectedId(table.id)}
                className={cn(
                  'relative text-left rounded-2xl border-2 p-4 transition-all duration-200',
                  'hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/50',
                  meta.soft,
                  active && 'ring-2 ring-[#FF6A00] shadow-md -translate-y-0.5',
                  merged && !primary && 'border-dashed opacity-90'
                )}
              >
                <div className="absolute top-3 right-3 flex items-center gap-1 text-slate-600/80">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">{seats}</span>
                </div>

                {merged && (
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide bg-[#0D1B2A] text-white">
                      <Combine className="w-2.5 h-2.5" />
                      {primary ? 'Merge' : 'Linked'}
                    </span>
                  </div>
                )}

                <div
                  className={cn(
                    'mx-auto mt-1 mb-3 flex flex-col items-center justify-center bg-white/80 border-[3px] shadow-inner',
                    table.type === 'round'
                      ? 'w-[4.5rem] h-[4.5rem] rounded-full'
                      : table.type === 'sofa'
                        ? 'w-24 h-14 rounded-2xl'
                        : 'w-[4.5rem] h-[4.5rem] rounded-xl',
                    meta.ring
                  )}
                >
                  <span className="text-lg font-black tracking-tight text-[#0D1B2A]">{table.tableNumber}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    {merged ? getMergeLabel(group) : table.type}
                  </span>
                </div>

                <div className="text-center space-y-1">
                  <span
                    className={cn(
                      'inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border',
                      meta.chip
                    )}
                  >
                    {meta.label}
                  </span>
                  {bill && bill.items.length > 0 ? (
                    <p className="text-[11px] font-black leading-snug" style={{ color: BRAND.orange }}>
                      {formatCurrency(billTotal)} open
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 font-medium leading-snug">
                      {merged && !primary
                        ? `With ${group.find((g) => g.id === table.mergePrimaryId)?.tableNumber || 'group'}`
                        : `Next: ${action.label}`}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Action sheet — modern problem-solving panel */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-white p-0 gap-0">
          {selected && nextAction && (
            <>
              <SheetHeader className="p-5 border-b border-slate-100 bg-[#F3F3F8]">
                <SheetTitle className="text-xl font-bold text-[#0D1B2A] flex items-center gap-2 flex-wrap">
                  {selectedMerged ? getMergeLabel(selectedGroup) : selected.tableNumber}
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-md border font-bold uppercase',
                      STATUS_META[selected.status].chip
                    )}
                  >
                    {STATUS_META[selected.status].label}
                  </span>
                </SheetTitle>
                <SheetDescription className="text-slate-500">
                  {selectedSeats} seats
                  {selectedMerged ? ` · ${selectedGroup.length} tables merged` : ` · ${selected.type}`}
                  {' · '}Solve the next step
                </SheetDescription>
              </SheetHeader>

              <div className="p-5 space-y-5 overflow-y-auto flex-1">
                {/* Primary CTA */}
                <div
                  className="rounded-2xl p-4 border"
                  style={{
                    background: `linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.steel} 100%)`,
                    borderColor: BRAND.steel,
                  }}
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1">
                    Recommended next
                  </p>
                  <p className="text-white font-bold text-lg">{nextAction.label}</p>
                  <p className="text-white/70 text-sm mt-1 mb-4">{nextAction.hint}</p>
                  <Button
                    disabled={busy}
                    onClick={() => applyStatus(nextAction.next)}
                    className="w-full h-12 rounded-xl font-bold text-white"
                    style={{ backgroundColor: BRAND.orange }}
                  >
                    {nextAction.label}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>

                {/* Billing */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#0D1B2A]">
                      <Receipt className="w-4 h-4" style={{ color: BRAND.orange }} />
                      Table bill
                    </div>
                    {selectedBill && selectedBill.items.length > 0 && (
                      <span className="text-sm font-black" style={{ color: BRAND.orange }}>
                        {formatCurrency(selectedBillTotal)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {selectedBill && selectedBill.items.length > 0
                      ? `${selectedBill.items.length} line${selectedBill.items.length === 1 ? '' : 's'} on the open check. Add more at POS or take payment.`
                      : 'Open a check at POS, or guests can order via QR — then pay here.'}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-11 rounded-xl font-bold"
                      onClick={() => goToTableBill(selected, false)}
                    >
                      <UtensilsCrossed className="w-4 h-4 mr-1.5" />
                      {selectedBill?.items.length ? 'Add items' : 'Open bill'}
                    </Button>
                    <Button
                      type="button"
                      className="flex-1 h-11 rounded-xl font-bold text-white"
                      style={{ backgroundColor: BRAND.orange }}
                      disabled={!selectedBill || selectedBill.items.length === 0}
                      onClick={() => goToTableBill(selected, true)}
                    >
                      <Receipt className="w-4 h-4 mr-1.5" />
                      Pay bill
                    </Button>
                  </div>
                </div>

                {/* Move party */}
                {(selected.status === 'occupied' || selected.status === 'reserved') && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#0D1B2A]">
                      <ArrowRightLeft className="w-4 h-4" style={{ color: BRAND.orange }} />
                      Move table
                    </div>
                    <p className="text-xs text-slate-500">
                      Guests need a different table? Transfer the party
                      {selectedBill ? ' and open bill' : ''} to an available table. This table goes to
                      cleaning.
                    </p>
                    <Button
                      type="button"
                      className="w-full h-11 rounded-xl font-bold text-white"
                      style={{ backgroundColor: BRAND.navy }}
                      disabled={busy}
                      onClick={() => setMoveOpen(true)}
                    >
                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                      Move to another table
                    </Button>
                  </div>
                )}

                {/* Merge controls */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#0D1B2A]">
                    <Combine className="w-4 h-4" style={{ color: BRAND.orange }} />
                    Merge tables
                  </div>
                  {selectedMerged ? (
                    <>
                      <p className="text-xs text-slate-500">
                        This party uses {getMergeLabel(selectedGroup)} ({selectedSeats} seats). Status
                        changes apply to the whole group.
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedGroup.map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-700"
                          >
                            {t.tableNumber}
                            {t.id === selected.mergePrimaryId && (
                              <span className="text-[9px] uppercase text-[#FF6A00]">primary</span>
                            )}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 h-10 rounded-xl font-bold"
                          disabled={busy || selected.status === 'cleaning'}
                          onClick={() => setMergeOpen(true)}
                        >
                          <Plus className="w-4 h-4 mr-1.5" />
                          Add table
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 h-10 rounded-xl font-bold"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            await unmergeTables(selected.id);
                            setBusy(false);
                          }}
                        >
                          <Unlink className="w-4 h-4 mr-1.5" />
                          Unmerge all
                        </Button>
                      </div>
                      {!isMergePrimary(selected) && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full h-9 rounded-xl text-xs font-bold text-slate-600"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            await removeFromMerge(selected.id);
                            setBusy(false);
                          }}
                        >
                          Remove {selected.tableNumber} from merge
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-slate-500">
                        Need more seats? Merge nearby tables into one party.
                      </p>
                      <Button
                        type="button"
                        className="w-full h-11 rounded-xl font-bold text-white"
                        style={{ backgroundColor: BRAND.navy }}
                        disabled={busy || selected.status === 'cleaning'}
                        onClick={() => setMergeOpen(true)}
                      >
                        <Combine className="w-4 h-4 mr-2" />
                        Merge with other tables
                      </Button>
                    </>
                  )}
                </div>

                {/* Manual status */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Or set status
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(STATUS_META) as TableStatus[]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={busy || selected.status === status}
                        onClick={() => applyStatus(status)}
                        className={cn(
                          'h-11 rounded-xl text-sm font-bold border capitalize transition-all disabled:opacity-50',
                          selected.status === status
                            ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]'
                            : cn('bg-white hover:shadow-sm', STATUS_META[status].chip)
                        )}
                      >
                        {STATUS_META[status].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* QR */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#0D1B2A]">
                    <QrCode className="w-4 h-4" style={{ color: BRAND.orange }} />
                    Guest menu QR
                  </div>
                  {selected.qrCodeToken ? (
                    <>
                      <div className="flex justify-center rounded-xl bg-white border border-slate-200 p-3">
                        <TableQrPreview
                          url={menuUrl(selected)}
                          size={148}
                          className="rounded-lg"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 break-all font-mono bg-white border border-slate-200 rounded-lg px-2.5 py-2">
                        {menuUrl(selected)}
                      </p>
                      {qrSyncMsg && (
                        <p className="text-[11px] font-medium text-slate-500">{qrSyncMsg}</p>
                      )}
                      <Button
                        type="button"
                        className="w-full h-11 rounded-xl font-bold text-white"
                        style={{ backgroundColor: BRAND.orange }}
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          await ensureQrReady(selected);
                          setBusy(false);
                          setQrPrintOpen(true);
                        }}
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        Print / export QR
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 h-10 rounded-xl font-bold"
                          disabled={busy}
                          onClick={handleCopyQr}
                        >
                          {copied ? (
                            <>
                              <Check className="w-4 h-4 mr-1.5 text-emerald-600" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-1.5" /> Copy link
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 rounded-xl font-bold"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            await generateQR(selected.id);
                            const latest = useTableStore.getState().tables.find((t) => t.id === selected.id);
                            if (latest) await ensureQrReady(latest);
                            setBusy(false);
                          }}
                        >
                          Regen
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full h-9 text-xs font-bold text-slate-600"
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          window.open(menuUrl(selected), '_blank', 'noopener,noreferrer');
                          await ensureQrReady(selected);
                          setBusy(false);
                        }}
                      >
                        Open guest menu
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="w-full h-10 rounded-xl font-bold text-white"
                      style={{ backgroundColor: BRAND.navy }}
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        await generateQR(selected.id);
                        const latest = useTableStore.getState().tables.find((t) => t.id === selected.id);
                        if (latest) await ensureQrReady(latest);
                        setBusy(false);
                      }}
                    >
                      Generate QR link
                    </Button>
                  )}
                </div>
              </div>

              <SheetFooter className="p-4 border-t border-slate-100 flex-row gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-11 rounded-xl font-bold"
                  onClick={openEdit}
                >
                  <Pencil className="w-4 h-4 mr-1.5" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-11 rounded-xl font-bold text-rose-600 border-rose-200 hover:bg-rose-50"
                  disabled={busy}
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <TableFormModal
        open={formOpen}
        mode={formMode}
        initial={formMode === 'edit' ? selected : null}
        defaultOutletId={outletId}
        error={lastError}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <MergeTablesModal
        open={mergeOpen}
        primary={selected}
        outletTables={outletTables}
        error={lastError}
        onClose={() => setMergeOpen(false)}
        onMerge={async (partnerIds) => {
          if (!selected) return false;
          return mergeTables(selected.id, partnerIds);
        }}
      />

      <MoveTableModal
        open={moveOpen}
        source={selected}
        outletTables={outletTables}
        error={billError || lastError}
        onClose={() => setMoveOpen(false)}
        onMove={async (targetId) => {
          if (!selected) return false;
          setBusy(true);
          const ok = await movePartyToTable(selected, targetId, outletTables);
          setBusy(false);
          if (ok) {
            setSelectedId(targetId);
            setMoveOpen(false);
          }
          return ok;
        }}
      />

      <TableQrPrintModal
        open={qrPrintOpen}
        table={selected}
        menuUrl={selected?.qrCodeToken ? menuUrl(selected) : ''}
        onClose={() => setQrPrintOpen(false)}
      />
    </div>
  );
}
