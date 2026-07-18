import { create } from 'zustand';
import type { Floor } from '../types/Floor';
import type { FloorObject } from '../types/Object';
import type {
  FloorLayoutDocument,
  FloorSize,
  GridSize,
  LayoutBlueprint,
  LayoutViewport,
} from '../types/Layout';
import { emptyLayout, normalizeFloorSize } from '../types/Layout';
import { layoutService } from '../services/layoutService';
import { createObjectFromCatalog, getCatalogItem, type CatalogItem } from '../lib/catalog';
import { copyObjects, pasteObjects } from '../lib/clipboard';
import { snapPoint } from '../lib/snap';
import { computeAlign, type AlignAction } from '../lib/align';
import {
  buildSampleCafeLayout,
  repairLinksByTableNumber,
  SAMPLE_TABLE_SPECS,
} from '../lib/sampleLayout';
import { checkFloorLimit, checkTableLimit } from '@/lib/planLimits';
import { getTenantCompanyId, useTenantStore } from '@/store/useTenantStore';
import { useTableStore } from '@/modules/tables/store/useTableStore';
import type { TableType } from '@/types';

const HISTORY_MAX = 50;

type DesignerMode = 'design' | 'preview';
export type DesignerTool = 'select' | 'pan';
export type DevicePreview = 'desktop' | 'tablet' | 'mobile';

interface HistoryEntry {
  objects: FloorObject[];
  blueprint: LayoutBlueprint | null | undefined;
}

interface FloorDesignerState {
  outletId: string;
  floors: Floor[];
  activeFloorId: string | null;
  layout: FloorLayoutDocument | null;
  selectedIds: string[];
  mode: DesignerMode;
  /** Active canvas tool while editing (select objects vs pan floor) */
  tool: DesignerTool;
  /** Page-designer device frame */
  devicePreview: DevicePreview;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  lastError: string | null;
  historyPast: HistoryEntry[];
  historyFuture: HistoryEntry[];
  contextMenu: { x: number; y: number; objectId?: string } | null;
  libraryOpen: boolean;
  propsOpen: boolean;
  pendingPlace: { item: CatalogItem; x: number; y: number } | null;

  setOutletId: (id: string) => void;
  hydrate: (outletId: string) => Promise<void>;
  switchFloor: (floorId: string) => Promise<void>;
  createFloor: (name: string) => Promise<void>;
  renameFloor: (floorId: string, name: string) => Promise<void>;
  deleteFloor: (floorId: string) => Promise<void>;
  duplicateFloor: () => Promise<void>;

  setMode: (mode: DesignerMode) => void;
  setTool: (tool: DesignerTool) => void;
  setDevicePreview: (device: DevicePreview) => void;
  setViewport: (viewport: Partial<LayoutViewport>, opts?: { markDirty?: boolean }) => void;
  setGrid: (patch: { size?: GridSize; snap?: boolean; visible?: boolean }) => void;
  setFloorSize: (patch: Partial<FloorSize>) => void;
  setBlueprint: (blueprint: LayoutBlueprint | null) => void;

  select: (ids: string[], additive?: boolean) => void;
  clearSelection: () => void;
  setContextMenu: (menu: FloorDesignerState['contextMenu']) => void;
  setLibraryOpen: (open: boolean) => void;
  setPropsOpen: (open: boolean) => void;
  setPendingPlace: (pending: FloorDesignerState['pendingPlace']) => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  addFromCatalog: (
    item: CatalogItem,
    x: number,
    y: number,
    options?: {
      tableNumber?: string;
      capacity?: number;
      chairLayout?: FloorObject['chairLayout'];
      /** Link an existing dining table instead of creating a new one */
      linkTableId?: string;
    }
  ) => Promise<FloorObject | null>;
  updateObjects: (ids: string[], patch: Partial<FloorObject>) => void;
  linkDiningTable: (objectId: string, diningTableId: string) => boolean;
  unlinkDiningTable: (objectId: string) => void;
  repairTableLinks: () => number;
  loadSampleLayout: (opts?: { force?: boolean }) => Promise<boolean>;
  moveObjects: (ids: string[], dx: number, dy: number) => void;
  setObjectTransform: (
    id: string,
    transform: Partial<Pick<FloorObject, 'x' | 'y' | 'width' | 'height' | 'rotation'>>
  ) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  copySelected: () => void;
  pasteClipboard: () => void;
  bringFront: () => void;
  sendBack: () => void;
  toggleLockSelected: () => void;
  toggleHideSelected: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  alignSelected: (action: AlignAction) => void;

  save: () => Promise<boolean>;
  exportJson: () => string | null;
  importJson: (raw: string) => Promise<boolean>;
  fitView: (stageW: number, stageH: number) => void;
}

function cloneHistory(layout: FloorLayoutDocument | null): HistoryEntry {
  return {
    objects: layout ? layout.objects.map((o) => ({ ...o })) : [],
    blueprint: layout?.blueprint ? { ...layout.blueprint } : null,
  };
}

function mapTableShape(shape?: FloorObject['tableShape']): TableType {
  if (shape === 'round') return 'round';
  if (shape === 'sofa') return 'sofa';
  return 'square';
}

export const useFloorStore = create<FloorDesignerState>((set, get) => ({
  outletId: 'current-outlet',
  floors: [],
  activeFloorId: null,
  layout: null,
  selectedIds: [],
  mode: 'design',
  tool: 'select',
  devicePreview: 'desktop',
  isDirty: false,
  isLoading: false,
  isSaving: false,
  lastError: null,
  historyPast: [],
  historyFuture: [],
  contextMenu: null,
  libraryOpen: true,
  propsOpen: true,
  pendingPlace: null,

  setOutletId: (id) => set({ outletId: id }),

  hydrate: async (outletId) => {
    set({ isLoading: true, lastError: null, outletId });
    try {
      await useTableStore.getState().fetchTables(outletId);
      const floors = await layoutService.listFloors(outletId);
      const active = floors[0];
      if (!active) {
        set({ floors: [], activeFloorId: null, layout: null, isLoading: false });
        return;
      }
      let layout = await layoutService.getLayout(active.id, outletId);

      // Repair broken / number-only links
      const tables = useTableStore.getState().tables;
      const repaired = repairLinksByTableNumber(layout.objects, tables, outletId);
      if (repaired.repaired > 0) {
        layout = { ...layout, objects: repaired.objects };
        await layoutService.saveLayout(layout);
      }

      // Empty floor → seed sample café once
      if (layout.objects.length === 0) {
        set({
          floors,
          activeFloorId: active.id,
          layout,
          isDirty: false,
          historyPast: [],
          historyFuture: [],
          selectedIds: [],
          isLoading: false,
        });
        await get().loadSampleLayout({ force: true });
        return;
      }

      set({
        floors,
        activeFloorId: active.id,
        layout,
        isDirty: false,
        historyPast: [],
        historyFuture: [],
        selectedIds: [],
        isLoading: false,
      });
    } catch (e: any) {
      set({ isLoading: false, lastError: e?.message || 'Failed to load floors' });
    }
  },

  switchFloor: async (floorId) => {
    const { isDirty, layout, outletId } = get();
    if (isDirty && layout) {
      await layoutService.saveLayout(layout);
    }
    set({ isLoading: true });
    const next = await layoutService.getLayout(floorId, outletId);
    set({
      activeFloorId: floorId,
      layout: next,
      isDirty: false,
      selectedIds: [],
      historyPast: [],
      historyFuture: [],
      isLoading: false,
    });
  },

  createFloor: async (name) => {
    const { outletId, floors } = get();
    const planId = useTenantStore.getState().planId;
    const gate = checkFloorLimit(planId, floors.filter((f) => f.outletId === outletId).length);
    if (!gate.ok) {
      set({ lastError: gate.message });
      return;
    }
    const companyId = getTenantCompanyId();
    const floor = await layoutService.createFloor(outletId, name, companyId);
    const nextFloors = await layoutService.listFloors(outletId);
    const layout = await layoutService.getLayout(floor.id, outletId);
    set({
      floors: nextFloors,
      activeFloorId: floor.id,
      layout: { ...layout, companyId },
      isDirty: false,
      selectedIds: [],
      historyPast: [],
      historyFuture: [],
      lastError: null,
    });
  },

  renameFloor: async (floorId, name) => {
    await layoutService.renameFloor(floorId, name);
    set((s) => ({
      floors: s.floors.map((f) => (f.id === floorId ? { ...f, name } : f)),
    }));
  },

  deleteFloor: async (floorId) => {
    await layoutService.deleteFloor(floorId);
    const floors = await layoutService.listFloors(get().outletId);
    if (floors.length === 0) {
      await get().createFloor('Ground Floor');
      return;
    }
    const nextId = floors[0].id;
    const layout = await layoutService.getLayout(nextId, get().outletId);
    set({ floors, activeFloorId: nextId, layout, isDirty: false, selectedIds: [] });
  },

  duplicateFloor: async () => {
    const id = get().activeFloorId;
    if (!id) return;
    const created = await layoutService.duplicateFloor(id);
    if (!created) return;
    const floors = await layoutService.listFloors(get().outletId);
    const layout = await layoutService.getLayout(created.id, get().outletId);
    set({ floors, activeFloorId: created.id, layout, isDirty: false, selectedIds: [] });
  },

  setMode: (mode) =>
    set({
      mode,
      selectedIds: mode === 'preview' ? [] : get().selectedIds,
      tool: mode === 'preview' ? 'select' : get().tool,
    }),

  setTool: (tool) => set({ tool }),

  setDevicePreview: (devicePreview) => set({ devicePreview }),

  setViewport: (viewport, opts) =>
    set((s) => {
      if (!s.layout) return s;
      const markDirty = opts?.markDirty === true;
      return {
        layout: { ...s.layout, viewport: { ...s.layout.viewport, ...viewport } },
        ...(markDirty ? { isDirty: true } : {}),
      };
    }),

  setGrid: (patch) =>
    set((s) => {
      if (!s.layout) return s;
      return {
        layout: { ...s.layout, grid: { ...s.layout.grid, ...patch } },
        isDirty: true,
      };
    }),

  setFloorSize: (patch) =>
    set((s) => {
      if (!s.layout) return s;
      return {
        layout: {
          ...s.layout,
          floorSize: normalizeFloorSize({ ...s.layout.floorSize, ...patch }),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    }),

  setBlueprint: (blueprint) => {
    get().pushHistory();
    set((s) => {
      if (!s.layout) return s;
      return { layout: { ...s.layout, blueprint }, isDirty: true };
    });
  },

  select: (ids, additive) =>
    set((s) => {
      if (additive) {
        const setIds = new Set(s.selectedIds);
        ids.forEach((id) => {
          if (setIds.has(id)) setIds.delete(id);
          else setIds.add(id);
        });
        return { selectedIds: [...setIds] };
      }
      return { selectedIds: ids };
    }),

  clearSelection: () => set({ selectedIds: [], contextMenu: null }),

  setContextMenu: (contextMenu) => set({ contextMenu }),
  setLibraryOpen: (libraryOpen) => set({ libraryOpen }),
  setPropsOpen: (propsOpen) => set({ propsOpen }),
  setPendingPlace: (pendingPlace) => set({ pendingPlace }),

  pushHistory: () => {
    const { layout, historyPast } = get();
    const entry = cloneHistory(layout);
    set({
      historyPast: [...historyPast.slice(-(HISTORY_MAX - 1)), entry],
      historyFuture: [],
    });
  },

  undo: () => {
    const { historyPast, historyFuture, layout } = get();
    if (!historyPast.length || !layout) return;
    const prev = historyPast[historyPast.length - 1];
    set({
      historyPast: historyPast.slice(0, -1),
      historyFuture: [cloneHistory(layout), ...historyFuture].slice(0, HISTORY_MAX),
      layout: { ...layout, objects: prev.objects, blueprint: prev.blueprint },
      isDirty: true,
    });
  },

  redo: () => {
    const { historyPast, historyFuture, layout } = get();
    if (!historyFuture.length || !layout) return;
    const next = historyFuture[0];
    set({
      historyFuture: historyFuture.slice(1),
      historyPast: [...historyPast, cloneHistory(layout)].slice(-HISTORY_MAX),
      layout: { ...layout, objects: next.objects, blueprint: next.blueprint },
      isDirty: true,
    });
  },

  addFromCatalog: async (item, x, y, options) => {
    const { layout, outletId, pushHistory } = get();
    if (!layout || get().mode === 'preview') return null;
    const snapped = snapPoint(x, y, layout.grid.size, layout.grid.snap);
    let linkedTableId: string | undefined;
    let tableNumber: string | undefined;
    const capacity = options?.capacity ?? item.capacity ?? 4;
    const chairLayout =
      options?.chairLayout ??
      (item.isTable
        ? item.kind === 'square_table' || item.kind === 'round_table' || item.kind === 'outdoor_table'
          ? 'all'
          : 'front_back'
        : undefined);

    if (item.isTable) {
      const store = useTableStore.getState();
      const existing = store.tables.filter(
        (t) => t.outletId === outletId || t.outletId === 'current-outlet'
      );

      if (options?.linkTableId) {
        const target = existing.find((t) => t.id === options.linkTableId);
        if (!target) {
          set({ lastError: 'Selected table was not found' });
          return null;
        }
        const alreadyOnFloor = layout.objects.some(
          (o) => o.linkedTableId === target.id
        );
        if (alreadyOnFloor) {
          set({ lastError: `${target.tableNumber} is already on this floor` });
          return null;
        }
        linkedTableId = target.id;
        tableNumber = target.tableNumber;
      } else {
        const n = existing.length + 1;
        tableNumber = (options?.tableNumber?.trim() || `T-${String(n).padStart(2, '0')}`).toUpperCase();
        const dup = existing.find((t) => t.tableNumber.toUpperCase() === tableNumber);
        if (dup) {
          set({
            lastError: `Table ${tableNumber} already exists — link it or choose another number`,
          });
          return null;
        }
        const planId = useTenantStore.getState().planId;
        const tableGate = checkTableLimit(planId, existing.length);
        if (!tableGate.ok) {
          set({ lastError: tableGate.message });
          return null;
        }
        const created = await store.addTable({
          outletId,
          tableNumber,
          capacity,
          type: mapTableShape(item.tableShape),
          status: 'available',
          companyId: getTenantCompanyId(),
        });
        if (!created) {
          set({ lastError: store.lastError || `Could not create ${tableNumber}` });
          return null;
        }
        linkedTableId = created.id;
        tableNumber = created.tableNumber;
        await store.generateQR(created.id);
      }
    }

    pushHistory();
    const maxLayer = layout.objects.reduce((m, o) => Math.max(m, o.layer), 0);
    const obj = createObjectFromCatalog(item, snapped.x, snapped.y, {
      linkedTableId,
      tableNumber,
      layer: maxLayer + 1,
      capacity,
      chairLayout,
      name: tableNumber || item.label,
    });

    set((s) => ({
      layout: s.layout
        ? { ...s.layout, objects: [...s.layout.objects, obj] }
        : emptyLayout(s.activeFloorId || '', outletId),
      selectedIds: [obj.id],
      isDirty: true,
      lastError: null,
    }));
    return obj;
  },

  linkDiningTable: (objectId, diningTableId) => {
    const { layout, outletId, pushHistory } = get();
    if (!layout) return false;
    const obj = layout.objects.find((o) => o.id === objectId);
    if (!obj || !obj.kind.includes('table')) {
      set({ lastError: 'Select a table shape to link' });
      return false;
    }
    const table = useTableStore
      .getState()
      .tables.find(
        (t) =>
          t.id === diningTableId &&
          (t.outletId === outletId || t.outletId === 'current-outlet')
      );
    if (!table) {
      set({ lastError: 'Table not found' });
      return false;
    }
    if (layout.objects.some((o) => o.id !== objectId && o.linkedTableId === table.id)) {
      set({ lastError: `${table.tableNumber} is already linked on this floor` });
      return false;
    }
    pushHistory();
    set((s) => {
      if (!s.layout) return s;
      return {
        layout: {
          ...s.layout,
          objects: s.layout.objects.map((o) =>
            o.id === objectId
              ? {
                  ...o,
                  linkedTableId: table.id,
                  tableNumber: table.tableNumber,
                  name: table.tableNumber,
                  capacity: table.capacity,
                }
              : o
          ),
        },
        isDirty: true,
        lastError: null,
      };
    });
    return true;
  },

  unlinkDiningTable: (objectId) => {
    const { layout, pushHistory } = get();
    if (!layout) return;
    pushHistory();
    set((s) => {
      if (!s.layout) return s;
      return {
        layout: {
          ...s.layout,
          objects: s.layout.objects.map((o) =>
            o.id === objectId
              ? { ...o, linkedTableId: undefined }
              : o
          ),
        },
        isDirty: true,
      };
    });
  },

  repairTableLinks: () => {
    const { layout, outletId } = get();
    if (!layout) return 0;
    const tables = useTableStore.getState().tables;
    const { objects, repaired } = repairLinksByTableNumber(layout.objects, tables, outletId);
    if (repaired === 0) return 0;
    set({
      layout: { ...layout, objects, updatedAt: new Date().toISOString() },
      isDirty: true,
      lastError: null,
    });
    return repaired;
  },

  loadSampleLayout: async (opts) => {
    const { layout, outletId, pushHistory } = get();
    if (!layout) return false;
    if (!opts?.force && layout.objects.length > 0) {
      const ok = window.confirm(
        'Replace the current floor with the sample café layout? Unsaved designer changes may be lost after save.'
      );
      if (!ok) return false;
    }

    const tableStore = useTableStore.getState();
    await tableStore.fetchTables(outletId);

    const linkByNumber: Record<string, string> = {};
    for (const spec of SAMPLE_TABLE_SPECS) {
      const existing = tableStore.tables.find(
        (t) =>
          (t.outletId === outletId || t.outletId === 'current-outlet') &&
          t.tableNumber.toUpperCase() === spec.tableNumber.toUpperCase()
      );
      if (existing) {
        linkByNumber[spec.tableNumber] = existing.id;
        continue;
      }
      const created = await tableStore.addTable({
        outletId,
        tableNumber: spec.tableNumber,
        capacity: spec.capacity,
        type: spec.type,
        status: 'available',
      });
      if (created) {
        linkByNumber[spec.tableNumber] = created.id;
        await tableStore.generateQR(created.id);
      }
    }

    // Refresh after creates
    await tableStore.fetchTables(outletId);
    for (const spec of SAMPLE_TABLE_SPECS) {
      if (linkByNumber[spec.tableNumber]) continue;
      const again = tableStore.tables.find(
        (t) =>
          (t.outletId === outletId || t.outletId === 'current-outlet') &&
          t.tableNumber.toUpperCase() === spec.tableNumber.toUpperCase()
      );
      if (again) linkByNumber[spec.tableNumber] = again.id;
    }

    pushHistory();
    const sample = buildSampleCafeLayout(layout.floorId, outletId, linkByNumber);
    set({
      layout: sample,
      isDirty: true,
      selectedIds: [],
      historyFuture: [],
      lastError: null,
    });
    await layoutService.saveLayout(sample);
    set({ isDirty: false });
    return true;
  },

  updateObjects: (ids, patch) => {
    get().pushHistory();
    set((s) => {
      if (!s.layout) return s;
      return {
        layout: {
          ...s.layout,
          objects: s.layout.objects.map((o) => (ids.includes(o.id) ? { ...o, ...patch } : o)),
        },
        isDirty: true,
      };
    });
  },

  moveObjects: (ids, dx, dy) => {
    set((s) => {
      if (!s.layout) return s;
      return {
        layout: {
          ...s.layout,
          objects: s.layout.objects.map((o) =>
            ids.includes(o.id) && !o.locked ? { ...o, x: o.x + dx, y: o.y + dy } : o
          ),
        },
        isDirty: true,
      };
    });
  },

  setObjectTransform: (id, transform) => {
    set((s) => {
      if (!s.layout) return s;
      const grid = s.layout.grid;
      const next = { ...transform };
      if (next.x !== undefined) next.x = snapPoint(next.x, 0, grid.size, grid.snap).x;
      if (next.y !== undefined) next.y = snapPoint(0, next.y, grid.size, grid.snap).y;
      return {
        layout: {
          ...s.layout,
          objects: s.layout.objects.map((o) => (o.id === id ? { ...o, ...next } : o)),
        },
        isDirty: true,
      };
    });
  },

  deleteSelected: () => {
    const { selectedIds, pushHistory } = get();
    if (!selectedIds.length) return;
    pushHistory();
    set((s) => {
      if (!s.layout) return s;
      return {
        layout: {
          ...s.layout,
          objects: s.layout.objects.filter((o) => !selectedIds.includes(o.id)),
        },
        selectedIds: [],
        isDirty: true,
      };
    });
  },

  duplicateSelected: () => {
    const { layout, selectedIds, pushHistory } = get();
    if (!layout || !selectedIds.length) return;
    pushHistory();
    const clones = layout.objects
      .filter((o) => selectedIds.includes(o.id))
      .map((o) => ({
        ...o,
        id: `obj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        x: o.x + 24,
        y: o.y + 24,
        linkedTableId: undefined,
      }));
    set((s) => ({
      layout: s.layout
        ? { ...s.layout, objects: [...s.layout.objects, ...clones] }
        : null,
      selectedIds: clones.map((c) => c.id),
      isDirty: true,
    }));
  },

  copySelected: () => {
    const { layout, selectedIds } = get();
    if (!layout) return;
    copyObjects(layout.objects.filter((o) => selectedIds.includes(o.id)));
  },

  pasteClipboard: () => {
    const { mode, pushHistory } = get();
    if (mode === 'preview') return;
    const pasted = pasteObjects();
    if (!pasted.length) return;
    pushHistory();
    set((s) => ({
      layout: s.layout
        ? { ...s.layout, objects: [...s.layout.objects, ...pasted] }
        : null,
      selectedIds: pasted.map((p) => p.id),
      isDirty: true,
    }));
  },

  bringFront: () => {
    const { layout, selectedIds, pushHistory } = get();
    if (!layout || !selectedIds.length) return;
    pushHistory();
    const max = layout.objects.reduce((m, o) => Math.max(m, o.layer), 0);
    set((s) => ({
      layout: s.layout
        ? {
            ...s.layout,
            objects: s.layout.objects.map((o) =>
              selectedIds.includes(o.id) ? { ...o, layer: max + 1 } : o
            ),
          }
        : null,
      isDirty: true,
    }));
  },

  sendBack: () => {
    const { layout, selectedIds, pushHistory } = get();
    if (!layout || !selectedIds.length) return;
    pushHistory();
    const min = layout.objects.reduce((m, o) => Math.min(m, o.layer), 0);
    set((s) => ({
      layout: s.layout
        ? {
            ...s.layout,
            objects: s.layout.objects.map((o) =>
              selectedIds.includes(o.id) ? { ...o, layer: min - 1 } : o
            ),
          }
        : null,
      isDirty: true,
    }));
  },

  toggleLockSelected: () => {
    const { layout, selectedIds } = get();
    if (!layout || !selectedIds.length) return;
    const first = layout.objects.find((o) => o.id === selectedIds[0]);
    const locked = !first?.locked;
    get().updateObjects(selectedIds, { locked });
  },

  toggleHideSelected: () => {
    const { layout, selectedIds } = get();
    if (!layout || !selectedIds.length) return;
    const first = layout.objects.find((o) => o.id === selectedIds[0]);
    get().updateObjects(selectedIds, { visible: !first?.visible });
  },

  groupSelected: () => {
    const { selectedIds } = get();
    if (selectedIds.length < 2) return;
    const groupId = `grp-${Date.now().toString(36)}`;
    get().updateObjects(selectedIds, { groupId });
  },

  ungroupSelected: () => {
    const { selectedIds } = get();
    if (!selectedIds.length) return;
    get().updateObjects(selectedIds, { groupId: undefined });
  },

  alignSelected: (action) => {
    const { layout, selectedIds, pushHistory } = get();
    if (!layout || selectedIds.length < 1) return;
    if (action !== 'auto' && selectedIds.length < 2) return;

    const targets = layout.objects.filter((o) => selectedIds.includes(o.id));
    const moves = computeAlign(targets, action, layout.grid.size);
    const ids = Object.keys(moves);
    if (!ids.length) return;

    pushHistory();
    set((s) => {
      if (!s.layout) return s;
      return {
        layout: {
          ...s.layout,
          objects: s.layout.objects.map((o) => {
            const m = moves[o.id];
            return m ? { ...o, x: m.x, y: m.y } : o;
          }),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    });
  },

  save: async () => {
    const { layout } = get();
    if (!layout) return false;
    set({ isSaving: true, lastError: null });
    try {
      const saved = await layoutService.saveLayout(layout);
      set({ layout: saved, isDirty: false, isSaving: false });
      return true;
    } catch (e: any) {
      set({ isSaving: false, lastError: e?.message || 'Save failed' });
      return false;
    }
  },

  exportJson: () => {
    const { layout } = get();
    if (!layout) return null;
    return layoutService.exportLayoutJson(layout);
  },

  importJson: async (raw) => {
    const { activeFloorId, outletId, pushHistory } = get();
    if (!activeFloorId) return false;
    try {
      pushHistory();
      const doc = layoutService.importLayoutJson(raw, activeFloorId, outletId);
      set({ layout: doc, isDirty: true, selectedIds: [] });
      return true;
    } catch {
      set({ lastError: 'Invalid layout JSON' });
      return false;
    }
  },

  fitView: (stageW, stageH) => {
    const { layout } = get();
    if (!layout || layout.objects.length === 0) {
      get().setViewport({ x: 0, y: 0, scale: 1 });
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    layout.objects.forEach((o) => {
      minX = Math.min(minX, o.x);
      minY = Math.min(minY, o.y);
      maxX = Math.max(maxX, o.x + o.width);
      maxY = Math.max(maxY, o.y + o.height);
    });
    const pad = 80;
    const w = Math.max(maxX - minX, 100);
    const h = Math.max(maxY - minY, 100);
    const scale = Math.min((stageW - pad * 2) / w, (stageH - pad * 2) / h, 2);
    get().setViewport({
      scale,
      x: stageW / 2 - ((minX + maxX) / 2) * scale,
      y: stageH / 2 - ((minY + maxY) / 2) * scale,
    });
  },
}));

export function getCatalogByKind(kind: string) {
  return getCatalogItem(kind as any);
}
