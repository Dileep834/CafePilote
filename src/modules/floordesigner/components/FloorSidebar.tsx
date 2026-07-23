import React from 'react';
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
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

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
      <p className="mb-2 px-1 text-sm font-semibold text-slate-700">{title}</p>
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
                'min-h-[44px] rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-left transition-all hover:border-[#FF6A00]/50 hover:shadow-sm disabled:opacity-40',
                'active:scale-[0.98] touch-manipulation'
              )}
            >
              <div
                className="mb-1.5 flex h-10 items-center justify-center rounded-lg border"
                style={{
                  backgroundColor: isTable ? '#FFF7ED' : '#F3F3F8',
                  borderColor: isTable ? '#FFD4A8' : '#E2E8F0',
                }}
              >
                <Icon
                  className="h-5 w-5"
                  style={{ color: isTable ? BRAND.orange : BRAND.navy }}
                />
              </div>
              <p className="text-sm font-semibold leading-tight text-slate-900">{item.label}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LibraryPanel({
  onClose,
  showClose,
}: {
  onClose?: () => void;
  showClose?: boolean;
}) {
  const mode = useFloorStore((s) => s.mode);
  const addFromCatalog = useFloorStore((s) => s.addFromCatalog);
  const setPendingPlace = useFloorStore((s) => s.setPendingPlace);
  const setLibraryOpen = useFloorStore((s) => s.setLibraryOpen);
  const [tab, setTab] = React.useState<'furniture' | 'structure' | 'decor'>('furniture');

  const onPick = (item: CatalogItem, x: number, y: number) => {
    if (item.isTable) setPendingPlace({ item, x, y });
    else void addFromCatalog(item, x, y);
    // Close drawer after place on phone/tablet
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      setLibraryOpen(false);
      onClose?.();
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="border-b border-slate-100 px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-bold tracking-tight text-slate-900">Component library</p>
            <p className="mt-0.5 text-sm font-medium text-slate-600">
              Tap to place · tables ask for seats
            </p>
          </div>
          {showClose ? (
            <button
              type="button"
              onClick={() => {
                setLibraryOpen(false);
                onClose?.();
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 touch-manipulation"
              aria-label="Close library"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="mt-2 flex gap-1">
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
                'min-h-10 flex-1 rounded-lg border py-2 text-xs font-semibold touch-manipulation',
                tab === id
                  ? 'border-[#FF6A00]/40 bg-orange-50 text-[#FF6A00]'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain p-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
  );
}

export function FloorSidebar() {
  const libraryOpen = useFloorStore((s) => s.libraryOpen);
  const setLibraryOpen = useFloorStore((s) => s.setLibraryOpen);

  return (
    <>
      {/* Desktop / large tablet docked */}
      <div className="relative hidden h-full shrink-0 lg:flex">
        <AnimatePresence initial={false}>
          {libraryOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-hidden border-r border-slate-200 bg-white"
            >
              <div className="h-full w-[240px]">
                <LibraryPanel />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setLibraryOpen(!libraryOpen)}
          className="relative z-10 mt-3 -ml-3 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow touch-manipulation"
          title={libraryOpen ? 'Collapse library' : 'Expand library'}
        >
          {libraryOpen ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Phone / tablet overlay drawer */}
      <AnimatePresence>
        {libraryOpen && (
          <div className="lg:hidden">
            <motion.button
              type="button"
              aria-label="Close library"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-slate-950/45"
              onClick={() => setLibraryOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="fixed inset-y-0 left-0 z-[65] flex w-[min(20rem,88vw)] flex-col shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Component library"
            >
              <LibraryPanel showClose />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
