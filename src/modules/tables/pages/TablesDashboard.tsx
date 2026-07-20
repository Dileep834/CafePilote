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
import { TableActionPanel } from '../components/TableActionPanel';
import { TableViewModeToggle } from '../components/TableViewModeToggle';
import { TableBoardLayoutToggle } from '../components/TableBoardLayoutToggle';
import { useSettingsStore } from '@/modules/settings/store/useSettingsStore';
import { openTableOnPOS } from '@/modules/pos/store/usePOSStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStore } from '@/store/useTenantStore';
import { getPlanLimits } from '@/lib/planLimits';
import { BRAND } from '@/constants';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import type { Table, TableStatus } from '@/types';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Users,
  LayoutGrid,
  Combine,
  CircleDot,
  Search,
  X,
  ChevronRight,
  Clock3,
  ChefHat,
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
  if (!dateIso) return 'Not ordered';
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateIso));
}

export function TablesDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const activeOutletId = useTenantStore((s) => s.activeOutletId);
  const hydrateTenant = useTenantStore((s) => s.hydrateFromUser);
  const planId = useTenantStore((s) => s.planId);
  const outletId =
    activeOutletId || user?.outletId || useTenantStore.getState().resolvedOutletId(user);
  const tableViewMode = useSettingsStore((s) => s.tableViewMode);
  const setTableViewMode = useSettingsStore((s) => s.setTableViewMode);
  const tableBoardLayout = useSettingsStore((s) => s.tableBoardLayout) ?? 'grid';
  const setTableBoardLayout = useSettingsStore((s) => s.setTableBoardLayout);

  useEffect(() => {
    void hydrateTenant(user);
  }, [user, hydrateTenant]);

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
  const getUnfiredItems = useTableBillStore((s) => s.getUnfiredItems);
  const hydrateOpenBills = useTableBillStore((s) => s.hydrateOpenBills);
  const movePartyToTable = useTableBillStore((s) => s.movePartyToTable);
  const billError = useTableBillStore((s) => s.lastError);

  const [filter, setFilter] = useState<TableStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredTables = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return outletTables
      .filter((t) => (filter === 'all' ? true : t.status === filter))
      .filter((t) => {
        if (!q) return true;
        const group = getMergeGroup(outletTables, t);
        const mergeLabel = group.length > 1 ? getMergeLabel(group) : '';
        const hay = [
          t.tableNumber,
          t.type,
          t.status,
          STATUS_META[t.status].label,
          mergeLabel,
          String(t.capacity),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) =>
        a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true, sensitivity: 'base' })
      );
  }, [outletTables, filter, searchQuery]);

  const selectedBill = selected ? getOpenBillForTable(selected, outletTables) : undefined;
  const selectedBillTotal = selectedBill ? getBillTotal(selectedBill) : 0;
  const selectedUnfired = selectedBill ? getUnfiredItems(selectedBill).length : 0;
  const hasOpenBillItems = !!(selectedBill && selectedBill.items.length > 0);
  const waiterName = user?.name?.split(' ')[0] || 'Staff';

  const [isCompactPanel, setIsCompactPanel] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = () => setIsCompactPanel(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

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
    if (
      (status === 'cleaning' || status === 'available') &&
      hasOpenBillItems
    ) {
      window.alert('Pay the open bill before clearing this table.');
      return;
    }
    setBusy(true);
    const ok = await updateTableStatus(selected.id, status);
    setBusy(false);
    if (!ok) {
      window.alert(
        useTableStore.getState().lastError || 'Pay the open bill before clearing this table.'
      );
    }
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
            Seat → serve → clear → ready. Search or tap a table to act.
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {cloudEnabled ? 'Synced with cloud' : 'Saved on this device'}
            {isLoading ? ' · Loading…' : ''}
            {' · '}
            {getPlanLimits(planId).label} · max {getPlanLimits(planId).maxTablesPerOutlet} tables/branch
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

      {/* Search + layout */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search table #, type, status…"
            className="h-11 pl-9 pr-9 rounded-xl border-slate-200 bg-white text-sm font-medium shadow-sm"
            aria-label="Search tables"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <TableBoardLayoutToggle value={tableBoardLayout} onChange={setTableBoardLayout} />
          <span className="hidden sm:inline text-[11px] text-slate-400 font-medium">
            {filteredTables.length}
            {searchQuery.trim() || filter !== 'all' ? ` of ${outletTables.length}` : ''} shown
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

      {/* Board */}
      {filteredTables.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/50 py-16 px-6 text-center">
          <CircleDot className="w-10 h-10 text-slate-300 mb-3" />
          <p className="font-bold text-[#0D1B2A]">
            {outletTables.length === 0 ? 'No tables on this floor yet' : 'No matching tables'}
          </p>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            {outletTables.length === 0
              ? 'Add your first table to start seating guests.'
              : searchQuery.trim()
                ? `Nothing matches “${searchQuery.trim()}”. Try another search or clear filters.`
                : 'Try another status filter, or show all tables.'}
          </p>
          {outletTables.length === 0 ? (
            <Button
              onClick={openAdd}
              className="mt-4 rounded-xl text-white font-bold active:scale-[0.98]"
              style={{ backgroundColor: BRAND.orange }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add table
            </Button>
          ) : searchQuery || filter !== 'all' ? (
            <Button
              type="button"
              variant="outline"
              className="mt-4 rounded-xl font-bold active:scale-[0.98]"
              onClick={() => {
                setSearchQuery('');
                setFilter('all');
              }}
            >
              Clear search & filters
            </Button>
          ) : null}
        </div>
      ) : tableBoardLayout === 'list' ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden pb-2">
          <div className="hidden md:grid grid-cols-[minmax(0,1.1fr)_100px_110px_100px_minmax(0,1fr)_28px] gap-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Table</span>
            <span>Seats</span>
            <span>Status</span>
            <span>Bill</span>
            <span>Next</span>
            <span />
          </div>
          <ul className="divide-y divide-slate-100">
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
              const hasBill = !!(bill && bill.items.length > 0);
              const running = bill ? durationLabel(minutesSince(bill.createdAt)) : '0m';
              const lastOrder = bill ? timeLabel(bill.updatedAt) : 'Not ordered';
              const unfired = bill ? getUnfiredItems(bill).length : 0;

              return (
                <li key={table.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(table.id)}
                    className={cn(
                      'w-full text-left px-4 py-3.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF6A00]/40',
                      active ? 'bg-orange-50/70' : 'hover:bg-slate-50/80',
                      merged && !primary && 'opacity-90'
                    )}
                  >
                    <div className="md:grid md:grid-cols-[minmax(0,1.1fr)_100px_110px_100px_minmax(0,1fr)_28px] md:gap-3 md:items-center flex flex-col gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={cn(
                            'shrink-0 flex items-center justify-center border-2 bg-white font-black text-[#0D1B2A] text-sm',
                            table.type === 'round'
                              ? 'w-10 h-10 rounded-full'
                              : table.type === 'sofa'
                                ? 'w-12 h-8 rounded-lg'
                                : 'w-10 h-10 rounded-lg',
                            meta.ring
                          )}
                        >
                          {table.tableNumber}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#0D1B2A] truncate">
                              Table {table.tableNumber}
                            </span>
                            {merged && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide bg-[#0D1B2A] text-white">
                                <Combine className="w-2.5 h-2.5" />
                                {primary ? 'Merge' : 'Linked'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium capitalize truncate">
                            {merged ? getMergeLabel(group) : table.type}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="tabular-nums">{seats}</span>
                      </div>

                      <div>
                        <span
                          className={cn(
                            'inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border',
                            meta.chip
                          )}
                        >
                          {meta.label}
                        </span>
                      </div>

                      <div className="text-sm font-bold tabular-nums">
                        {hasBill ? (
                          <span style={{ color: BRAND.orange }}>{formatCurrency(billTotal)}</span>
                        ) : (
                          <span className="text-slate-300 font-medium">—</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-500 md:col-span-5">
                        <span
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1"
                          title="Running time"
                        >
                          <Clock3 className="h-3 w-3" aria-hidden />
                          ⏱ {running}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md px-2 py-1',
                            unfired > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100'
                          )}
                          title="Pending kitchen tickets"
                        >
                          <ChefHat className="h-3 w-3" aria-hidden />
                          🍽 {unfired > 0 ? `${unfired} Pending` : hasBill ? 'KOT sent' : 'No KOT'}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1"
                          title="Capacity"
                        >
                          <Users className="h-3 w-3" aria-hidden />
                          👥 {seats} Guests
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
                          Waiter {waiterName}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
                          Last {lastOrder}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <p className="text-[12px] text-slate-500 font-medium truncate">
                          {merged && !primary
                            ? `With ${group.find((g) => g.id === table.mergePrimaryId)?.tableNumber || 'group'}`
                            : hasBill
                              ? `${bill!.items.length} open line${bill!.items.length === 1 ? '' : 's'}`
                              : `Next: ${action.label}`}
                        </p>
                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 md:hidden" />
                      </div>

                      <div className="hidden md:flex justify-end">
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 pb-8">
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
            const hasBill = !!(bill && bill.items.length > 0);
            const running = bill ? durationLabel(minutesSince(bill.createdAt)) : '0m';
            const unfired = bill ? getUnfiredItems(bill).length : 0;
            return (
              <button
                key={table.id}
                type="button"
                onClick={() => setSelectedId(table.id)}
                title={`${meta.label} · ${seats} seats${unfired > 0 ? ` · ${unfired} pending KOT` : ''}`}
                className={cn(
                  'relative text-left rounded-2xl border-2 p-3 transition-all duration-150 bg-white/70',
                  'hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/50 active:scale-[0.98]',
                  meta.soft,
                  active && 'ring-2 ring-[#FF6A00] shadow-md -translate-y-0.5',
                  merged && !primary && 'border-dashed opacity-90'
                )}
              >
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1 text-slate-600/80" title="Capacity">
                  <Users className="w-3.5 h-3.5" aria-hidden />
                  <span className="text-[11px] font-bold tabular-nums">{seats}</span>
                </div>

                {merged && (
                  <div className="absolute top-2.5 left-2.5">
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide bg-[#0D1B2A] text-white">
                      <Combine className="w-2.5 h-2.5" />
                      {primary ? 'Merge' : 'Linked'}
                    </span>
                  </div>
                )}

                <div
                  className={cn(
                    'mx-auto mt-0.5 mb-2.5 flex flex-col items-center justify-center bg-white border-[3px] shadow-inner transition-colors duration-150',
                    table.type === 'round'
                      ? 'w-16 h-16 rounded-full'
                      : table.type === 'sofa'
                        ? 'w-20 h-12 rounded-2xl'
                        : 'w-16 h-16 rounded-xl',
                    meta.ring
                  )}
                >
                  <span className="text-base font-black tracking-tight text-[#0D1B2A]">{table.tableNumber}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    {merged ? getMergeLabel(group) : table.type}
                  </span>
                </div>

                <div className="text-center space-y-1">
                  <span
                    className={cn(
                      'inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-colors duration-150',
                      meta.chip
                    )}
                  >
                    {meta.label}
                  </span>
                  {hasBill ? (
                    <p className="text-[11px] font-black leading-snug" style={{ color: BRAND.orange }}>
                      {formatCurrency(billTotal)}
                    </p>
                  ) : table.status === 'available' ? (
                    <p className="text-[11px] text-emerald-600 font-semibold leading-snug">
                      Ready for next guests
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 font-medium leading-snug">
                      {merged && !primary
                        ? `With ${group.find((g) => g.id === table.mergePrimaryId)?.tableNumber || 'group'}`
                        : `Next: ${action.label}`}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-col gap-0.5 text-[10px] font-bold text-slate-600">
                    <span className="truncate" title="Guests / capacity">
                      👥 {seats} Guests
                    </span>
                    <span className="truncate" title="Running time">
                      ⏱ {running}
                    </span>
                    <span
                      className={cn('truncate', unfired > 0 && 'text-amber-700')}
                      title="Pending kitchen tickets"
                    >
                      🍽 {unfired > 0 ? `${unfired} Pending` : hasBill ? 'KOT sent' : 'No KOT'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Table action panel */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent
          side={isCompactPanel ? 'bottom' : 'right'}
          className={cn(
            'bg-white p-0 gap-0 flex flex-col overflow-hidden',
            isCompactPanel
              ? 'inset-x-0 bottom-0 h-auto max-h-[88vh] rounded-t-2xl border-t'
              : 'w-full sm:max-w-[360px]'
          )}
        >
          {selected ? (
            <TableActionPanel
              table={selected}
              outletTables={outletTables}
              bill={selectedBill}
              billTotal={selectedBillTotal}
              unfiredCount={selectedUnfired}
              waiterName={waiterName}
              busy={busy}
              copied={copied}
              qrSyncMsg={qrSyncMsg}
              menuUrl={menuUrl}
              onApplyStatus={(status) => void applyStatus(status)}
              onPayBill={() => goToTableBill(selected, true)}
              onAddItems={() => goToTableBill(selected, false)}
              onOpenMoveModal={() => setMoveOpen(true)}
              onMoveTo={async (targetId) => {
                setBusy(true);
                const ok = await movePartyToTable(selected, targetId, outletTables);
                setBusy(false);
                if (ok) setSelectedId(targetId);
                return ok;
              }}
              onOpenMergeModal={() => setMergeOpen(true)}
              onMergeWith={async (partnerId) => {
                setBusy(true);
                const ok = await mergeTables(selected.id, [partnerId]);
                setBusy(false);
                return ok;
              }}
              onUnmerge={async () => {
                setBusy(true);
                await unmergeTables(selected.id);
                setBusy(false);
              }}
              onRemoveFromMerge={async () => {
                setBusy(true);
                await removeFromMerge(selected.id);
                setBusy(false);
              }}
              onCopyQr={() => void handleCopyQr()}
              onOpenGuestMenu={() => {
                window.open(menuUrl(selected), '_blank', 'noopener,noreferrer');
                void ensureQrReady(selected);
              }}
              onPrintQr={() => {
                void (async () => {
                  setBusy(true);
                  await ensureQrReady(selected);
                  setBusy(false);
                  setQrPrintOpen(true);
                })();
              }}
              onRegenQr={() => {
                void (async () => {
                  setBusy(true);
                  await generateQR(selected.id);
                  const latest = useTableStore.getState().tables.find((t) => t.id === selected.id);
                  if (latest) await ensureQrReady(latest);
                  setBusy(false);
                })();
              }}
              onGenerateQr={() => {
                void (async () => {
                  setBusy(true);
                  await generateQR(selected.id);
                  const latest = useTableStore.getState().tables.find((t) => t.id === selected.id);
                  if (latest) await ensureQrReady(latest);
                  setBusy(false);
                })();
              }}
              onEdit={openEdit}
              onDelete={() => void handleDelete()}
            />
          ) : null}
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
