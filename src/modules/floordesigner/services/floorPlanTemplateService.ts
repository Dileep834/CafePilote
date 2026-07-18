import { supabase } from '@/lib/supabase';
import {
  buildLayoutFromTemplate,
  getTemplateTableSpecs,
  listBuiltinFloorPlanTemplates,
  type FloorPlanTemplateId,
  type FloorPlanTemplateMeta,
} from '../lib/templateCatalog';
import { layoutService } from './layoutService';
import { useTableStore } from '@/modules/tables/store/useTableStore';

export type OutletFloorPlanMap = {
  outletId: string;
  companyId?: string | null;
  templateId: string;
  appliedAt?: string | null;
  appliedFloorId?: string | null;
  updatedAt: string;
};

const LOCAL_MAP_KEY = 'cafepilots-outlet-floor-plan-maps';

function readLocalMaps(): OutletFloorPlanMap[] {
  try {
    const raw = localStorage.getItem(LOCAL_MAP_KEY);
    return raw ? (JSON.parse(raw) as OutletFloorPlanMap[]) : [];
  } catch {
    return [];
  }
}

function writeLocalMaps(maps: OutletFloorPlanMap[]) {
  localStorage.setItem(LOCAL_MAP_KEY, JSON.stringify(maps));
}

function upsertLocalMap(map: OutletFloorPlanMap) {
  const rest = readLocalMaps().filter((m) => m.outletId !== map.outletId);
  writeLocalMaps([...rest, map]);
}

function fromMapRow(row: any): OutletFloorPlanMap {
  return {
    outletId: row.outlet_id,
    companyId: row.company_id,
    templateId: row.template_id,
    appliedAt: row.applied_at,
    appliedFloorId: row.applied_floor_id,
    updatedAt: row.updated_at,
  };
}

function fromTemplateRow(row: any): FloorPlanTemplateMeta {
  return {
    id: row.id as FloorPlanTemplateId,
    slug: row.slug,
    name: row.name,
    description: row.description || '',
    category: row.category || 'cafe',
    tableCount: Number(row.table_count) || 0,
    seats: Number(row.seats) || 0,
    previewHint: row.preview_hint || '',
    sortOrder: Number(row.sort_order) || 0,
  };
}

export const floorPlanTemplateService = {
  /** Built-in + optional cloud catalog rows */
  async listTemplates(): Promise<FloorPlanTemplateMeta[]> {
    const builtin = listBuiltinFloorPlanTemplates();
    try {
      const { data, error } = await supabase
        .from('floor_plan_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      if (!data?.length) return builtin;

      const byId = new Map(builtin.map((t) => [t.id, t] as const));
      for (const row of data) {
        const meta = fromTemplateRow(row);
        // Prefer cloud name/description; keep built-in builders by id
        byId.set(meta.id, { ...(byId.get(meta.id) || meta), ...meta });
      }
      return [...byId.values()].sort((a, b) => a.sortOrder - b.sortOrder);
    } catch {
      return builtin;
    }
  },

  async getOutletMap(outletId: string): Promise<OutletFloorPlanMap | null> {
    try {
      const { data, error } = await supabase
        .from('outlet_floor_plan_maps')
        .select('*')
        .eq('outlet_id', outletId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        const map = fromMapRow(data);
        upsertLocalMap(map);
        return map;
      }
    } catch {
      /* local */
    }
    return readLocalMaps().find((m) => m.outletId === outletId) || null;
  },

  async listOutletMaps(companyId?: string | null): Promise<OutletFloorPlanMap[]> {
    try {
      let query = supabase.from('outlet_floor_plan_maps').select('*');
      if (companyId) query = query.eq('company_id', companyId);
      const { data, error } = await query;
      if (error) throw error;
      if (data?.length) {
        const maps = data.map(fromMapRow);
        for (const m of maps) upsertLocalMap(m);
        return maps;
      }
    } catch {
      /* local */
    }
    const local = readLocalMaps();
    if (!companyId) return local;
    return local.filter((m) => !m.companyId || m.companyId === companyId);
  },

  /** Save chosen template for a branch (does not apply layout until applyTemplateToOutlet) */
  async assignTemplateToOutlet(params: {
    outletId: string;
    templateId: string;
    companyId?: string | null;
  }): Promise<OutletFloorPlanMap> {
    const now = new Date().toISOString();
    const existing = await floorPlanTemplateService.getOutletMap(params.outletId);
    const map: OutletFloorPlanMap = {
      outletId: params.outletId,
      companyId: params.companyId,
      templateId: params.templateId,
      appliedAt: existing?.appliedAt,
      appliedFloorId: existing?.appliedFloorId,
      updatedAt: now,
    };

    try {
      const { data, error } = await supabase
        .from('outlet_floor_plan_maps')
        .upsert(
          [
            {
              outlet_id: params.outletId,
              company_id: params.companyId || null,
              template_id: params.templateId,
              updated_at: now,
            },
          ],
          { onConflict: 'outlet_id' }
        )
        .select('*')
        .single();
      if (error) throw error;
      const saved = fromMapRow(data);
      upsertLocalMap(saved);
      return saved;
    } catch {
      upsertLocalMap(map);
      return map;
    }
  },

  /**
   * Apply mapped (or provided) template onto the outlet's primary floor.
   * Creates dining tables as needed and links them by table number.
   */
  async applyTemplateToOutlet(params: {
    outletId: string;
    templateId?: string;
    companyId?: string | null;
    floorName?: string;
  }): Promise<{ ok: true; floorId: string; templateId: string } | { ok: false; message: string }> {
    const map = await floorPlanTemplateService.getOutletMap(params.outletId);
    const templateId = params.templateId || map?.templateId;
    if (!templateId) {
      return { ok: false, message: 'Choose a floor plan template for this branch first.' };
    }

    const specs = getTemplateTableSpecs(templateId);
    if (!specs.length) {
      return { ok: false, message: 'Unknown floor plan template.' };
    }

    // Persist assignment
    await floorPlanTemplateService.assignTemplateToOutlet({
      outletId: params.outletId,
      templateId,
      companyId: params.companyId,
    });

    const floors = await layoutService.listFloors(params.outletId);
    let floor = floors[0];
    if (!floor) {
      floor = await layoutService.createFloor(
        params.outletId,
        params.floorName || 'Ground Floor',
        params.companyId || undefined
      );
    }

    const tableStore = useTableStore.getState();
    await tableStore.fetchTables(params.outletId);

    const linkByNumber: Record<string, string> = {};
    for (const spec of specs) {
      const existing = tableStore.tables.find(
        (t) =>
          (t.outletId === params.outletId || t.outletId === 'current-outlet') &&
          t.tableNumber.toUpperCase() === spec.tableNumber.toUpperCase()
      );
      if (existing) {
        linkByNumber[spec.tableNumber] = existing.id;
        continue;
      }
      const created = await tableStore.addTable({
        outletId: params.outletId,
        tableNumber: spec.tableNumber,
        capacity: spec.capacity,
        type: spec.type,
        status: 'available',
        companyId: params.companyId || undefined,
      });
      if (created) {
        linkByNumber[spec.tableNumber] = created.id;
        await tableStore.generateQR(created.id);
      }
    }

    await tableStore.fetchTables(params.outletId);
    for (const spec of specs) {
      if (linkByNumber[spec.tableNumber]) continue;
      const again = tableStore.tables.find(
        (t) =>
          (t.outletId === params.outletId || t.outletId === 'current-outlet') &&
          t.tableNumber.toUpperCase() === spec.tableNumber.toUpperCase()
      );
      if (again) linkByNumber[spec.tableNumber] = again.id;
    }

    const layout = buildLayoutFromTemplate(
      templateId,
      floor.id,
      params.outletId,
      linkByNumber
    );
    if (!layout) {
      return { ok: false, message: 'Could not build floor layout from template.' };
    }
    if (params.companyId) layout.companyId = params.companyId;

    await layoutService.saveLayout(layout);

    const now = new Date().toISOString();
    const updated: OutletFloorPlanMap = {
      outletId: params.outletId,
      companyId: params.companyId,
      templateId,
      appliedAt: now,
      appliedFloorId: floor.id,
      updatedAt: now,
    };

    try {
      await supabase
        .from('outlet_floor_plan_maps')
        .upsert(
          [
            {
              outlet_id: params.outletId,
              company_id: params.companyId || null,
              template_id: templateId,
              applied_at: now,
              applied_floor_id: floor.id,
              updated_at: now,
            },
          ],
          { onConflict: 'outlet_id' }
        );
    } catch {
      /* local only */
    }
    upsertLocalMap(updated);

    return { ok: true, floorId: floor.id, templateId };
  },
};
