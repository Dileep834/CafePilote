import React, { useState } from 'react';
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
    <div className="flex shrink-0 items-center gap-2 border-t border-slate-200 bg-white px-2 py-2 shadow-[0_-1px_2px_rgba(15,23,42,0.04)] sm:gap-2 sm:px-3 sm:py-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto touch-pan-x [-webkit-overflow-scrolling:touch]">
        {floors.map((f) => {
          const active = f.id === activeFloorId;
          const editing = editingId === f.id;
          return (
            <div
              key={f.id}
              className={cn(
                'flex h-9 shrink-0 items-center gap-1 rounded-xl border px-2.5',
                active
                  ? 'border-[#FF6A00]/40 bg-orange-50 text-[#FF6A00]'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
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
                    className="text-sm font-semibold whitespace-nowrap"
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

      <div className="hidden shrink-0 items-center gap-3 text-sm font-medium text-slate-600 sm:flex">
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
              <span className="rounded-md bg-orange-100 px-2 py-0.5 text-xs font-semibold text-[#FF6A00]">
                Unsaved
              </span>
            ) : (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                Saved
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
