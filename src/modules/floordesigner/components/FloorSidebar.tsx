import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BRAND } from '@/constants';
import { cn } from '@/lib/utils';
import {
  DECORATION_CATALOG,
  FURNITURE_CATALOG,
  STRUCTURE_CATALOG,
  type CatalogItem,
} from '../lib/catalog';
import { useFloorStore } from '../store/floorStore';
import { getCatalogIcon } from '../lib/catalogIcons';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function CatalogSection({
  title,
  items,
  disabled,
  onPick,
}: {
  title: string;
  items: CatalogItem[];
  disabled?: boolean;
  onPick: (item: CatalogItem, x: number, y: number) => void;
}) {
  const layout = useFloorStore((s) => s.layout);

  const placeAtView = (item: CatalogItem) => {
    if (disabled || !layout) return;
    const cx = (-layout.viewport.x + 200) / layout.viewport.scale;
    const cy = (-layout.viewport.y + 160) / layout.viewport.scale;
    onPick(item, cx, cy);
  };

  return (
    <div className="mb-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-2">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((item) => {
          const Icon = getCatalogIcon(item.kind);
          const isTable = !!item.isTable;
          return (
            <button
              key={item.kind}
              type="button"
              disabled={disabled}
              draggable={!disabled}
              onDragStart={(e) => {
                e.dataTransfer.setData('catalog-kind', item.kind);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => placeAtView(item)}
              className={cn(
                'rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-left hover:border-[#FF6A00]/50 hover:shadow-sm transition-all disabled:opacity-40',
                'active:scale-[0.98]'
              )}
            >
              <div
                className="h-10 rounded-lg mb-1.5 border flex items-center justify-center"
                style={{
                  backgroundColor: isTable ? '#FFF7ED' : '#F3F3F8',
                  borderColor: isTable ? '#FFD4A8' : '#E2E8F0',
                }}
              >
                <Icon
                  className="w-5 h-5"
                  style={{ color: isTable ? BRAND.orange : BRAND.navy }}
                />
              </div>
              <p className="text-[11px] font-semibold text-[#0D1B2A] leading-tight">{item.label}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FloorSidebar() {
  const libraryOpen = useFloorStore((s) => s.libraryOpen);
  const setLibraryOpen = useFloorStore((s) => s.setLibraryOpen);
  const mode = useFloorStore((s) => s.mode);
  const addFromCatalog = useFloorStore((s) => s.addFromCatalog);
  const setPendingPlace = useFloorStore((s) => s.setPendingPlace);
  const [tab, setTab] = React.useState<'furniture' | 'structure' | 'decor'>('furniture');

  const onPick = (item: CatalogItem, x: number, y: number) => {
    if (item.isTable) setPendingPlace({ item, x, y });
    else void addFromCatalog(item, x, y);
  };

  return (
    <div className="relative shrink-0 flex">
      <AnimatePresence initial={false}>
        {libraryOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full border-r border-slate-200 bg-white overflow-hidden"
          >
            <div className="w-[240px] h-full flex flex-col">
              <div className="px-3 py-3 border-b border-slate-100">
                <p className="text-sm font-bold" style={{ color: BRAND.navy }}>
                  Component library
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tables ask for seats (2+2, 1+1+1+1…)
                </p>
                <div className="flex gap-1 mt-2">
                  {(
                    [
                      ['furniture', 'Furniture'],
                      ['structure', 'Structure'],
                      ['decor', 'Decor'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTab(id)}
                      className={cn(
                        'flex-1 text-[10px] font-bold uppercase tracking-wide py-1.5 rounded-lg border',
                        tab === id
                          ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2.5">
                {tab === 'furniture' && (
                  <CatalogSection
                    title="Furniture"
                    items={FURNITURE_CATALOG}
                    disabled={mode === 'preview'}
                    onPick={onPick}
                  />
                )}
                {tab === 'structure' && (
                  <CatalogSection
                    title="Structure"
                    items={STRUCTURE_CATALOG}
                    disabled={mode === 'preview'}
                    onPick={onPick}
                  />
                )}
                {tab === 'decor' && (
                  <CatalogSection
                    title="Decoration"
                    items={DECORATION_CATALOG}
                    disabled={mode === 'preview'}
                    onPick={onPick}
                  />
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setLibraryOpen(!libraryOpen)}
        className="w-6 h-6 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center text-slate-500"
        style={{ position: 'relative', marginLeft: -12, marginTop: 12 }}
        title={libraryOpen ? 'Collapse library' : 'Expand library'}
      >
        {libraryOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
