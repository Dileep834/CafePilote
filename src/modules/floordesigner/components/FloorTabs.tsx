import React, { useState } from 'react';
import { BRAND } from '@/constants';
import { cn } from '@/lib/utils';
import { useFloorStore } from '../store/floorStore';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';

type Props = {
  /** Hide floor edit controls in Table Management ops view */
  opsMode?: boolean;
};

export function FloorTabs({ opsMode = false }: Props) {
  const floors = useFloorStore((s) => s.floors);
  const activeFloorId = useFloorStore((s) => s.activeFloorId);
  const switchFloor = useFloorStore((s) => s.switchFloor);
  const createFloor = useFloorStore((s) => s.createFloor);
  const renameFloor = useFloorStore((s) => s.renameFloor);
  const deleteFloor = useFloorStore((s) => s.deleteFloor);
  const layout = useFloorStore((s) => s.layout);
  const isDirty = useFloorStore((s) => s.isDirty);
  const mode = useFloorStore((s) => s.mode);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const linkedCount = layout?.objects.filter((o) => o.linkedTableId).length || 0;

  return (
    <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-t border-slate-200 bg-white">
      <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0">
        {floors.map((f) => {
          const active = f.id === activeFloorId;
          const editing = editingId === f.id;
          return (
            <div
              key={f.id}
              className={cn(
                'shrink-0 flex items-center gap-1 rounded-xl border px-2.5 h-9',
                active
                  ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              )}
            >
              {editing && !opsMode ? (
                <>
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-28 h-7 rounded-lg px-2 text-xs text-[#0D1B2A]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        void renameFloor(f.id, editName.trim() || f.name);
                        setEditingId(null);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void renameFloor(f.id, editName.trim() || f.name);
                      setEditingId(null);
                    }}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => setEditingId(null)}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="text-xs font-bold whitespace-nowrap"
                    onClick={() => void switchFloor(f.id)}
                  >
                    {f.name}
                  </button>
                  {active && !opsMode && (
                    <>
                      <button
                        type="button"
                        className="opacity-70 hover:opacity-100"
                        onClick={() => {
                          setEditingId(f.id);
                          setEditName(f.name);
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      {floors.length > 1 && (
                        <button
                          type="button"
                          className="opacity-70 hover:opacity-100"
                          onClick={() => {
                            if (confirm(`Delete floor “${f.name}”?`)) void deleteFloor(f.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          );
        })}
        {!opsMode && (
          <button
            type="button"
            className="shrink-0 h-9 px-3 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:border-[#FF6A00] hover:text-[#0D1B2A] flex items-center gap-1"
            onClick={() => {
              const name = prompt('Floor name', `Floor ${floors.length + 1}`);
              if (name?.trim()) {
                void createFloor(name.trim()).then(() => {
                  const err = useFloorStore.getState().lastError;
                  if (err) alert(err);
                });
              }
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Floor
          </button>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-3 text-[11px] text-slate-500 font-medium">
        {opsMode ? (
          <>
            <span>Live</span>
            {layout?.floorSize && (
              <span>
                {layout.floorSize.widthM}×{layout.floorSize.heightM} m
              </span>
            )}
            <span>
              {linkedCount} table{linkedCount === 1 ? '' : 's'}
            </span>
          </>
        ) : (
          <>
            <span className="capitalize">{mode}</span>
            {layout?.floorSize && (
              <span>
                {layout.floorSize.widthM}×{layout.floorSize.heightM} m
              </span>
            )}
            <span>{layout?.objects.length || 0} objects</span>
            {isDirty ? (
              <span className="font-bold" style={{ color: BRAND.orange }}>
                Unsaved
              </span>
            ) : (
              <span className="text-emerald-600 font-bold">Saved</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
