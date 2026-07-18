import { supabase } from '@/lib/supabase';
import type { Floor } from '../types/Floor';
import {
  emptyLayout,
  normalizeLayoutDoc,
  type FloorLayoutDocument,
  LAYOUT_SCHEMA_VERSION,
} from '../types/Layout';

const LOCAL_FLOORS_KEY = 'cafepilots-floors';
const LOCAL_LAYOUT_PREFIX = 'cafepilots-floor-layout:';

function nowIso() {
  return new Date().toISOString();
}

function readLocalFloors(): Floor[] {
  try {
    const raw = localStorage.getItem(LOCAL_FLOORS_KEY);
    return raw ? (JSON.parse(raw) as Floor[]) : [];
  } catch {
    return [];
  }
}

function writeLocalFloors(floors: Floor[]) {
  localStorage.setItem(LOCAL_FLOORS_KEY, JSON.stringify(floors));
}

function readLocalLayout(floorId: string): FloorLayoutDocument | null {
  try {
    const raw = localStorage.getItem(LOCAL_LAYOUT_PREFIX + floorId);
    return raw ? (JSON.parse(raw) as FloorLayoutDocument) : null;
  } catch {
    return null;
  }
}

function writeLocalLayout(doc: FloorLayoutDocument) {
  localStorage.setItem(LOCAL_LAYOUT_PREFIX + doc.floorId, JSON.stringify(doc));
}

function fromFloorRow(row: any): Floor {
  return {
    id: row.id,
    outletId: row.outlet_id,
    brandId: row.brand_id || undefined,
    name: row.name,
    sortOrder: Number(row.sort_order) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** REST-shaped API — Supabase now, ASP.NET later behind same methods */
export const layoutService = {
  async listFloors(outletId: string): Promise<Floor[]> {
    try {
      const { data, error } = await supabase
        .from('floors')
        .select('*')
        .eq('outlet_id', outletId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      if (data?.length) {
        const floors = data.map(fromFloorRow);
        writeLocalFloors([
          ...readLocalFloors().filter((f) => f.outletId !== outletId),
          ...floors,
        ]);
        return floors;
      }
    } catch {
      /* fall through */
    }
    let local = readLocalFloors().filter((f) => f.outletId === outletId);
    if (local.length === 0) {
      const ground = await layoutService.createFloor(outletId, 'Ground Floor');
      local = [ground];
    }
    return local.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async createFloor(outletId: string, name: string): Promise<Floor> {
    const sortOrder = readLocalFloors().filter((f) => f.outletId === outletId).length;
    const draft: Floor = {
      id: crypto.randomUUID(),
      outletId,
      name,
      sortOrder,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    try {
      const { data, error } = await supabase
        .from('floors')
        .insert([
          {
            id: draft.id,
            outlet_id: outletId,
            name,
            sort_order: sortOrder,
          },
        ])
        .select('*')
        .single();
      if (error) throw error;
      const floor = fromFloorRow(data);
      const layout = emptyLayout(floor.id, outletId);
      await layoutService.saveLayout(layout);
      writeLocalFloors([...readLocalFloors().filter((f) => f.id !== floor.id), floor]);
      return floor;
    } catch {
      writeLocalFloors([...readLocalFloors(), draft]);
      writeLocalLayout(emptyLayout(draft.id, outletId));
      return draft;
    }
  },

  async renameFloor(floorId: string, name: string): Promise<boolean> {
    const floors = readLocalFloors().map((f) =>
      f.id === floorId ? { ...f, name, updatedAt: nowIso() } : f
    );
    writeLocalFloors(floors);
    try {
      const { error } = await supabase
        .from('floors')
        .update({ name, updated_at: nowIso() })
        .eq('id', floorId);
      if (error) throw error;
      return true;
    } catch {
      return true;
    }
  },

  async deleteFloor(floorId: string): Promise<boolean> {
    writeLocalFloors(readLocalFloors().filter((f) => f.id !== floorId));
    localStorage.removeItem(LOCAL_LAYOUT_PREFIX + floorId);
    try {
      await supabase.from('floor_layouts').delete().eq('floor_id', floorId);
      await supabase.from('floors').delete().eq('id', floorId);
    } catch {
      /* local ok */
    }
    return true;
  },

  /** GET /api/layout/{floorId} */
  async getLayout(floorId: string, outletId?: string): Promise<FloorLayoutDocument> {
    try {
      const { data, error } = await supabase
        .from('floor_layouts')
        .select('*')
        .eq('floor_id', floorId)
        .maybeSingle();
      if (error) throw error;
      if (data?.layout) {
        const doc = normalizeLayoutDoc(data.layout as FloorLayoutDocument);
        writeLocalLayout(doc);
        return doc;
      }
    } catch {
      /* fall through */
    }
    const local = readLocalLayout(floorId);
    if (local) return normalizeLayoutDoc(local);
    const empty = emptyLayout(floorId, outletId || 'current-outlet');
    writeLocalLayout(empty);
    return empty;
  },

  /** POST /api/layout/save */
  async saveLayout(doc: FloorLayoutDocument): Promise<FloorLayoutDocument> {
    const next: FloorLayoutDocument = {
      ...doc,
      schemaVersion: LAYOUT_SCHEMA_VERSION,
      version: (doc.version || 0) + 1,
      updatedAt: nowIso(),
    };
    writeLocalLayout(next);
    try {
      const { error } = await supabase.from('floor_layouts').upsert(
        {
          floor_id: next.floorId,
          outlet_id: next.outletId,
          brand_id: next.brandId || null,
          schema_version: next.schemaVersion,
          layout: next,
          version: next.version,
          updated_at: next.updatedAt,
        },
        { onConflict: 'floor_id' }
      );
      if (error) throw error;
    } catch {
      /* local persist is enough offline */
    }
    return next;
  },

  /** PUT /api/layout/update — alias for save with version check hook */
  async updateLayout(doc: FloorLayoutDocument): Promise<FloorLayoutDocument> {
    return layoutService.saveLayout(doc);
  },

  /** POST /api/layout/duplicate */
  async duplicateFloor(floorId: string, newName?: string): Promise<Floor | null> {
    const floors = readLocalFloors();
    const source = floors.find((f) => f.id === floorId);
    if (!source) {
      try {
        const { data } = await supabase.from('floors').select('*').eq('id', floorId).single();
        if (!data) return null;
        const src = fromFloorRow(data);
        const layout = await layoutService.getLayout(floorId, src.outletId);
        const created = await layoutService.createFloor(
          src.outletId,
          newName || `${src.name} Copy`
        );
        await layoutService.saveLayout({
          ...layout,
          floorId: created.id,
          outletId: created.outletId,
          version: 0,
        });
        return created;
      } catch {
        return null;
      }
    }
    const layout = await layoutService.getLayout(floorId, source.outletId);
    const created = await layoutService.createFloor(
      source.outletId,
      newName || `${source.name} Copy`
    );
    await layoutService.saveLayout({
      ...layout,
      floorId: created.id,
      outletId: created.outletId,
      objects: layout.objects.map((o) => ({
        ...o,
        id: `obj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        linkedTableId: undefined,
      })),
      version: 0,
    });
    return created;
  },

  exportLayoutJson(doc: FloorLayoutDocument): string {
    return JSON.stringify(doc, null, 2);
  },

  importLayoutJson(raw: string, floorId: string, outletId: string): FloorLayoutDocument {
    const parsed = JSON.parse(raw) as FloorLayoutDocument;
    return normalizeLayoutDoc({
      ...emptyLayout(floorId, outletId),
      ...parsed,
      floorId,
      outletId,
      schemaVersion: LAYOUT_SCHEMA_VERSION,
      objects: (parsed.objects || []).map((o) => ({
        ...o,
        id: o.id || `obj-${Math.random().toString(36).slice(2, 9)}`,
      })),
      version: 0,
      updatedAt: nowIso(),
    });
  },
};

/** Future SignalR / presence — no-op stub for P2 */
export const presenceService = {
  join(_floorId: string, _userId: string) {
    /* no-op */
  },
  leave(_floorId: string) {
    /* no-op */
  },
  getActiveEditors(): string[] {
    return [];
  },
};
