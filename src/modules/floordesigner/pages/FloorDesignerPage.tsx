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
import { DeviceFrame } from '../components/DeviceFrame';
import { DevicePreviewToggle } from '../components/DevicePreviewToggle';
import { MobileOpsTableList } from '../components/MobileOpsTableList';
import { TableQrPrintModal } from '@/modules/tables/components/TableQrPrintModal';
import { PlaceTableModal } from '../components/PlaceTableModal';
import { syncTableForQr } from '@/modules/tables/lib/resolveTableByQr';
import { getCatalogItem } from '../lib/catalog';
import type { ObjectKind } from '../types';
import { BRAND } from '@/constants';
import type { Table } from '@/types';

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
  const devicePreview = useFloorStore((s) => s.devicePreview);
  const setDevicePreview = useFloorStore((s) => s.setDevicePreview);
  const planLimits = useTenantStore((s) => s.plan());

  const setDevice = (d: typeof devicePreview) => {
    if (!planLimits.devicePreview && d !== 'desktop') {
      alert(`${planLimits.label} plan: Desktop only. Upgrade for Tablet/Mobile preview.`);
      setDevicePreview('desktop');
      return;
    }
    setDevicePreview(d);
  };
  const addFromCatalog = useFloorStore((s) => s.addFromCatalog);
  const activeFloorId = useFloorStore((s) => s.activeFloorId);
  const pendingPlace = useFloorStore((s) => s.pendingPlace);
  const setPendingPlace = useFloorStore((s) => s.setPendingPlace);
  const setLibraryOpen = useFloorStore((s) => s.setLibraryOpen);
  const setPropsOpen = useFloorStore((s) => s.setPropsOpen);
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

  const showMobileList = isOps && devicePreview === 'mobile';

  return (
    <div
      className={
        isOps
          ? 'flex flex-col h-full min-h-0 overflow-hidden'
          : 'flex flex-col h-[calc(100dvh-4rem)] min-h-[560px] -m-4 md:-m-6 overflow-hidden'
      }
      style={{ backgroundColor: BRAND.gray }}
    >
      {!isOps && (
        <div className="px-4 pt-3 pb-1 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div>
            <h1 className="text-lg font-bold" style={{ color: BRAND.navy }}>
              Floor Designer
            </h1>
            <p className="text-xs text-slate-500">
              Page-style floor layout · {mode === 'preview' ? 'Live preview' : 'Edit mode'}
            </p>
          </div>
          <DevicePreviewToggle value={devicePreview} onChange={setDevice} size="sm" />
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
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-white/90 flex-wrap">
          <p className="text-xs text-slate-500 flex-1 min-w-[120px]">
            Live floor · Desktop / Tablet / Mobile preview
          </p>
          <DevicePreviewToggle value={devicePreview} onChange={setDevice} size="sm" />
          <FloorToolbar
            containerRef={containerRef}
            onGenerateQr={() => void handleGenerateQr()}
            onUploadBlueprint={handleUploadBlueprint}
            opsMode
          />
        </div>
      )}

      <div className="flex-1 min-h-0 flex">
        {!isOps && devicePreview === 'desktop' && <FloorSidebar />}

        <div className="relative flex-1 min-w-0 min-h-0 overflow-hidden">
          <DeviceFrame device={devicePreview}>
            <div
              ref={containerRef}
              className="relative h-full w-full min-h-0 overflow-hidden"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleCanvasDrop}
            >
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-slate-400 animate-pulse">
                  Loading floors…
                </div>
              ) : showMobileList ? (
                <MobileOpsTableList />
              ) : (
                <>
                  <FloorCanvas containerRef={containerRef} />
                  {devicePreview === 'desktop' && <FloorMiniMap />}
                </>
              )}
              {lastError && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium px-3 py-2">
                  {lastError}
                </div>
              )}
            </div>
          </DeviceFrame>
        </div>

        {devicePreview !== 'mobile' &&
          (isOps ? (
            <FloorOpsPanel
              onPrintQr={() => void handleGenerateQr()}
              onEditLayout={() => navigate('/erp/floor')}
            />
          ) : (
            <FloorPropertiesPanel onPrintQr={() => void handleGenerateQr()} />
          ))}
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
