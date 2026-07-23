import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStore } from '@/store/useTenantStore';
import { useFloorStore } from '../store/floorStore';
import { useTableStore } from '@/modules/tables/store/useTableStore';
import { useKeyboard } from '../hooks/useKeyboard';
import { FloorToolbar } from '../components/FloorToolbar';
import { FloorSidebar } from '../components/FloorSidebar';
import { FloorPropertiesPanel } from '../components/FloorPropertiesPanel';
import { FloorOpsPanel } from '../components/FloorOpsPanel';
import { FloorTabs } from '../components/FloorTabs';
import { FloorCanvas } from '../components/FloorCanvas';
import { FloorContextMenu } from '../components/FloorContextMenu';
import { FloorMiniMap } from '../components/FloorMiniMap';
import { MobileOpsTableList } from '../components/MobileOpsTableList';
import { TableQrPrintModal } from '@/modules/tables/components/TableQrPrintModal';
import { PlaceTableModal } from '../components/PlaceTableModal';
import { syncTableForQr } from '@/modules/tables/lib/resolveTableByQr';
import { getCatalogItem } from '../lib/catalog';
import type { ObjectKind } from '../types';
import { BRAND } from '@/constants';
import type { Table } from '@/types';
import { cn } from '@/lib/utils';
import { LayoutTemplate, SlidersHorizontal } from 'lucide-react';

type Props = {
  /**
   * designer = full Floor Designer edit tools
   * ops = Table Management floor plan (live status, bills) — preview locked
   */
  variant?: 'designer' | 'ops';
};

export function FloorDesignerPage({ variant = 'designer' }: Props) {
  const isOps = variant === 'ops';
  const navigate = useNavigate();
  const { floorId: routeFloorId } = useParams();
  const user = useAuthStore((s) => s.user);
  const activeOutletId = useTenantStore((s) => s.activeOutletId);
  const hydrateTenant = useTenantStore((s) => s.hydrateFromUser);
  const outletId =
    activeOutletId || user?.outletId || useTenantStore.getState().resolvedOutletId(user);
  const containerRef = useRef<HTMLDivElement>(null);

  const hydrate = useFloorStore((s) => s.hydrate);
  const switchFloor = useFloorStore((s) => s.switchFloor);
  const isLoading = useFloorStore((s) => s.isLoading);
  const lastError = useFloorStore((s) => s.lastError);
  const selectedIds = useFloorStore((s) => s.selectedIds);
  const layout = useFloorStore((s) => s.layout);
  const setBlueprint = useFloorStore((s) => s.setBlueprint);
  const mode = useFloorStore((s) => s.mode);
  const setMode = useFloorStore((s) => s.setMode);
  const setTool = useFloorStore((s) => s.setTool);
  const addFromCatalog = useFloorStore((s) => s.addFromCatalog);
  const activeFloorId = useFloorStore((s) => s.activeFloorId);
  const pendingPlace = useFloorStore((s) => s.pendingPlace);
  const setPendingPlace = useFloorStore((s) => s.setPendingPlace);
  const setLibraryOpen = useFloorStore((s) => s.setLibraryOpen);
  const setPropsOpen = useFloorStore((s) => s.setPropsOpen);
  const libraryOpen = useFloorStore((s) => s.libraryOpen);
  const propsOpen = useFloorStore((s) => s.propsOpen);
  const repairTableLinks = useFloorStore((s) => s.repairTableLinks);

  const tables = useTableStore((s) => s.tables);
  const fetchTables = useTableStore((s) => s.fetchTables);
  const generateQR = useTableStore((s) => s.generateQR);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrTable, setQrTable] = useState<Table | null>(null);

  const nextTableNumber = useMemo(() => {
    const existing = tables.filter(
      (t) => t.outletId === outletId || t.outletId === 'current-outlet'
    );
    return `T-${String(existing.length + 1).padStart(2, '0')}`;
  }, [tables, outletId]);

  useKeyboard();

  useEffect(() => {
    void hydrateTenant(user);
  }, [user, hydrateTenant]);

  useEffect(() => {
    void hydrate(outletId);
    void fetchTables(outletId);
  }, [outletId, hydrate, fetchTables]);

  useEffect(() => {
    if (isOps) {
      setMode('preview');
      setTool('select');
      setLibraryOpen(false);
      setPropsOpen(true);
      // Fix orphaned T-01 labels without linkedTableId
      const n = repairTableLinks();
      if (n > 0) void useFloorStore.getState().save();
    }
  }, [isOps, setMode, setTool, setLibraryOpen, setPropsOpen, repairTableLinks]);

  useEffect(() => {
    if (routeFloorId && routeFloorId !== activeFloorId && !isLoading) {
      void switchFloor(routeFloorId);
    }
  }, [routeFloorId, activeFloorId, isLoading, switchFloor]);

  const selectedObject = useMemo(() => {
    if (!layout || selectedIds.length !== 1) return null;
    return layout.objects.find((o) => o.id === selectedIds[0]) || null;
  }, [layout, selectedIds]);

  const resolveQrTable = async (): Promise<Table | null> => {
    const linkedId = selectedObject?.linkedTableId;
    const num = selectedObject?.tableNumber?.trim().toUpperCase();
    let table =
      (linkedId ? tables.find((t) => t.id === linkedId) : undefined) ||
      (num ? tables.find((t) => t.tableNumber.toUpperCase() === num) : undefined) ||
      null;
    if (!table) return null;
    if (!table.qrCodeToken) {
      const token = await generateQR(table.id);
      table = useTableStore.getState().tables.find((t) => t.id === table!.id) || {
        ...table,
        qrCodeToken: token || undefined,
      };
    }
    if (table.qrCodeToken) await syncTableForQr(table);
    return table;
  };

  const handleGenerateQr = async () => {
    const table = await resolveQrTable();
    if (!table?.qrCodeToken) {
      alert('Select a linked table object first.');
      return;
    }
    setQrTable(table);
    setQrOpen(true);
  };

  const menuUrl = (table: Table) =>
    `${window.location.origin}/menu/t/${encodeURIComponent(table.qrCodeToken || '')}`;

  const handleUploadBlueprint = (file: File) => {
    if (isOps) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        setBlueprint({
          url,
          opacity: 0.45,
          locked: true,
          x: 0,
          y: 0,
          width: Math.min(img.width, 1200),
          height: Math.min(img.height, 800),
        });
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isOps || mode === 'preview') return;
    const kind = e.dataTransfer.getData('catalog-kind') as ObjectKind;
    if (!kind || !layout || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldX = (screenX - layout.viewport.x) / layout.viewport.scale;
    const worldY = (screenY - layout.viewport.y) / layout.viewport.scale;
    const item = getCatalogItem(kind);
    if (!item) return;
    if (item.isTable) setPendingPlace({ item, x: worldX, y: worldY });
    else void addFromCatalog(item, worldX, worldY);
  };

  useEffect(() => {
    if (isOps) return;
    const mq = window.matchMedia('(max-width: 1023px)');
    const collapse = () => {
      if (mq.matches) {
        setLibraryOpen(false);
        setPropsOpen(false);
      }
    };
    collapse();
    mq.addEventListener('change', collapse);
    return () => mq.removeEventListener('change', collapse);
  }, [isOps, setLibraryOpen, setPropsOpen]);

  return (
    <div
      className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden font-sans erp-crisp-text"
      style={{ backgroundColor: BRAND.gray }}
    >
      {!isOps && (
        <div className="flex shrink-0 flex-wrap items-end justify-between gap-2 border-b border-slate-200/80 bg-white/80 px-3 py-2.5 backdrop-blur-md sm:gap-3 sm:px-4 sm:py-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Floor Designer
            </h1>
            <p className="mt-0.5 text-xs font-medium text-slate-600 sm:text-sm">
              <span className="sm:hidden">
                {mode === 'preview' ? 'Preview' : 'Edit'}
                {layout ? ` · ${layout.objects.length}` : ''}
              </span>
              <span className="hidden sm:inline">
                Drag furniture onto the plan · {mode === 'preview' ? 'Live preview' : 'Edit mode'}
                {layout ? (
                  <span className="text-slate-500">
                    {' '}
                    · {layout.objects.length} object{layout.objects.length === 1 ? '' : 's'}
                  </span>
                ) : null}
              </span>
            </p>
          </div>
        </div>
      )}

      {!isOps && (
        <FloorToolbar
          containerRef={containerRef}
          onGenerateQr={() => void handleGenerateQr()}
          onUploadBlueprint={handleUploadBlueprint}
        />
      )}

      {isOps && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white/90 px-3 py-2">
          <p className="min-w-0 flex-1 text-sm font-medium text-slate-600">Live floor</p>
          <FloorToolbar
            containerRef={containerRef}
            onGenerateQr={() => void handleGenerateQr()}
            onUploadBlueprint={handleUploadBlueprint}
            opsMode
          />
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        {!isOps && <FloorSidebar />}

        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          <div
            ref={containerRef}
            className="relative h-full w-full min-h-0 touch-pan-x touch-pan-y overflow-hidden"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleCanvasDrop}
          >
            {isLoading ? (
              <div className="flex h-full animate-pulse items-center justify-center text-slate-400">
                Loading floors…
              </div>
            ) : (
              <>
                {isOps && (
                  <div className="h-full md:hidden">
                    <MobileOpsTableList />
                  </div>
                )}
                <div className={cn('h-full w-full', isOps && 'hidden md:block')}>
                  <FloorCanvas containerRef={containerRef} />
                  <div className="hidden lg:block">
                    <FloorMiniMap />
                  </div>
                </div>
              </>
            )}
            {lastError && (
              <div className="absolute left-1/2 top-3 z-30 max-w-[min(24rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {lastError}
              </div>
            )}
          </div>

          {/* Mobile / tablet quick open */}
          {!isOps && (
            <div
              className={cn(
                'pointer-events-none absolute bottom-3 left-3 right-3 z-30 flex items-end justify-between gap-2 md:bottom-4 lg:hidden',
                (libraryOpen || propsOpen) && 'invisible'
              )}
            >              <button
                type="button"
                className="pointer-events-auto flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-800 shadow-lg touch-manipulation"
                onClick={() => {
                  setLibraryOpen(true);
                  setPropsOpen(false);
                }}
              >
                <LayoutTemplate className="h-4 w-4 text-[#FF6A00]" />
                Library
              </button>
              <button
                type="button"
                className="pointer-events-auto flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-800 shadow-lg touch-manipulation"
                onClick={() => {
                  setPropsOpen(true);
                  setLibraryOpen(false);
                }}
              >
                <SlidersHorizontal className="h-4 w-4 text-[#FF6A00]" />
                Properties
              </button>
            </div>
          )}
        </div>

        {isOps ? (
          <div className="hidden shrink-0 md:flex">
            <FloorOpsPanel
              onPrintQr={() => void handleGenerateQr()}
              onEditLayout={() => navigate('/erp/floor')}
            />
          </div>
        ) : (
          <FloorPropertiesPanel onPrintQr={() => void handleGenerateQr()} />
        )}
      </div>

      <FloorTabs opsMode={isOps} />
      {!isOps && <FloorContextMenu />}

      <TableQrPrintModal
        open={qrOpen}
        table={qrTable}
        menuUrl={qrTable?.qrCodeToken ? menuUrl(qrTable) : ''}
        onClose={() => setQrOpen(false)}
      />

      {!isOps && (
        <PlaceTableModal
          open={!!pendingPlace}
          item={pendingPlace?.item || null}
          defaultTableNumber={nextTableNumber}
          onClose={() => setPendingPlace(null)}
          onConfirm={(opts) => {
            if (!pendingPlace) return;
            void addFromCatalog(pendingPlace.item, pendingPlace.x, pendingPlace.y, {
              tableNumber: opts.tableNumber,
              capacity: opts.capacity,
              chairLayout: opts.chairLayout,
              linkTableId: opts.linkTableId,
            }).then((created) => {
              if (!created) {
                const err = useFloorStore.getState().lastError;
                if (err) alert(err);
                return;
              }
              setPendingPlace(null);
            });
          }}
        />
      )}
    </div>
  );
}
