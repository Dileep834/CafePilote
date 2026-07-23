import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BRAND } from '@/constants';
import { cn } from '@/lib/utils';
import { useFloorStore } from '../store/floorStore';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useZoom } from '../hooks/useZoom';
import type { AlignAction } from '../lib/align';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  Download,
  Eye,
  Grid3X3,
  Hand,
  Magnet,
  Maximize2,
  Moon,
  MousePointer2,
  Pencil,
  Redo2,
  Save,
  Sparkles,
  Sun,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
  CopyPlus,
  QrCode,
  ChevronDown,
  LayoutTemplate,
  Link2,
} from 'lucide-react';

type Props = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onGenerateQr: () => void;
  onUploadBlueprint: (file: File) => void;
  /** Slim chrome for Table Management floor view */
  opsMode?: boolean;
};

export function FloorToolbar({
  containerRef,
  onGenerateQr,
  onUploadBlueprint,
  opsMode = false,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const blueprintRef = useRef<HTMLInputElement>(null);
  const [alignOpen, setAlignOpen] = useState(false);

  const mode = useFloorStore((s) => s.mode);
  const setMode = useFloorStore((s) => s.setMode);
  const tool = useFloorStore((s) => s.tool);
  const setTool = useFloorStore((s) => s.setTool);
  const layout = useFloorStore((s) => s.layout);
  const selectedIds = useFloorStore((s) => s.selectedIds);
  const isDirty = useFloorStore((s) => s.isDirty);
  const isSaving = useFloorStore((s) => s.isSaving);
  const save = useFloorStore((s) => s.save);
  const undo = useFloorStore((s) => s.undo);
  const redo = useFloorStore((s) => s.redo);
  const setGrid = useFloorStore((s) => s.setGrid);
  const duplicateFloor = useFloorStore((s) => s.duplicateFloor);
  const exportJson = useFloorStore((s) => s.exportJson);
  const importJson = useFloorStore((s) => s.importJson);
  const alignSelected = useFloorStore((s) => s.alignSelected);
  const loadSampleLayout = useFloorStore((s) => s.loadSampleLayout);
  const repairTableLinks = useFloorStore((s) => s.repairTableLinks);
  const historyPast = useFloorStore((s) => s.historyPast);
  const historyFuture = useFloorStore((s) => s.historyFuture);

  const { mode: themeMode, toggleTheme } = useThemeContext();
  const { zoomIn, zoomOut, fit, scale } = useZoom(containerRef);

  const canAlign = mode === 'design' && selectedIds.length >= 2;
  const canAuto = mode === 'design' && selectedIds.length >= 1;

  const ToolBtn = ({
    title,
    onClick,
    active,
    disabled,
    children,
  }: {
    title: string;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-xl border transition-colors touch-manipulation disabled:opacity-40 sm:h-9 sm:w-9',
        active
          ? 'border-[#FF6A00]/40 bg-orange-50 text-[#FF6A00] shadow-sm'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      )}
    >
      {children}
    </button>
  );

  const runAlign = (action: AlignAction) => {
    alignSelected(action);
    setAlignOpen(false);
  };

  if (opsMode) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <ToolBtn
          title="Select table"
          active={tool === 'select'}
          onClick={() => setTool('select')}
        >
          <MousePointer2 className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn
          title="Pan floor (H) — or hold Space"
          active={tool === 'pan'}
          onClick={() => setTool(tool === 'pan' ? 'select' : 'pan')}
        >
          <Hand className="w-4 h-4" />
        </ToolBtn>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <ToolBtn title="Zoom in" onClick={zoomIn}>
          <ZoomIn className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn title="Zoom out" onClick={zoomOut}>
          <ZoomOut className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn title="Fit screen" onClick={fit}>
          <Maximize2 className="w-4 h-4" />
        </ToolBtn>
        <span className="w-12 text-center text-xs font-semibold text-slate-600">
          {Math.round(scale * 100)}%
        </span>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <ToolBtn title="Generate / print QR" onClick={onGenerateQr}>
          <QrCode className="w-4 h-4" />
        </ToolBtn>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 touch-pan-x gap-1.5 overflow-x-auto overscroll-x-contain border-b border-slate-200 bg-white px-2 py-2 shadow-sm [-webkit-overflow-scrolling:touch] sm:flex-wrap sm:overflow-visible sm:px-3 sm:py-2.5">
      <div className="flex min-w-max items-center gap-1.5 sm:min-w-0 sm:flex-wrap">
      <Button
        type="button"
        className="h-10 shrink-0 rounded-xl bg-[#FF6A00] px-3 font-bold text-white hover:bg-[#e55f00] sm:h-9 sm:px-4"
        disabled={isSaving || !isDirty}
        onClick={() => void save()}
      >
        <Save className="w-4 h-4 mr-1.5" />
        {isSaving ? 'Saving…' : 'Save'}
      </Button>

      <div className="w-px h-6 bg-slate-200 mx-1" />

      <ToolBtn
        title="Select (V)"
        active={mode === 'design' && tool === 'select'}
        disabled={mode === 'preview'}
        onClick={() => setTool('select')}
      >
        <MousePointer2 className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        title="Pan floor (H) — or hold Space"
        active={mode === 'design' && tool === 'pan'}
        disabled={mode === 'preview'}
        onClick={() => setTool(tool === 'pan' ? 'select' : 'pan')}
      >
        <Hand className="w-4 h-4" />
      </ToolBtn>

      <div className="w-px h-6 bg-slate-200 mx-1" />

      <ToolBtn title="Undo" onClick={undo} disabled={!historyPast.length}>
        <Undo2 className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn title="Redo" onClick={redo} disabled={!historyFuture.length}>
        <Redo2 className="w-4 h-4" />
      </ToolBtn>

      <div className="w-px h-6 bg-slate-200 mx-1" />

      <ToolBtn title="Zoom in" onClick={zoomIn}>
        <ZoomIn className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn title="Zoom out" onClick={zoomOut}>
        <ZoomOut className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn title="Fit screen" onClick={fit}>
        <Maximize2 className="w-4 h-4" />
      </ToolBtn>
      <span className="w-12 text-center text-xs font-semibold text-slate-600">
          {Math.round(scale * 100)}%
        </span>

      <div className="w-px h-6 bg-slate-200 mx-1" />

      <ToolBtn
        title="Auto align selected"
        active={false}
        disabled={!canAuto}
        onClick={() => alignSelected('auto')}
      >
        <Sparkles className="w-4 h-4" />
      </ToolBtn>

      <div className="relative">
        <button
          type="button"
          title="Align options"
          disabled={!canAlign && !canAuto}
          onClick={() => setAlignOpen((o) => !o)}
          className={cn(
            'h-9 px-2.5 rounded-xl flex items-center gap-1 border transition-colors disabled:opacity-40',
            alignOpen
              ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          )}
        >
          <AlignCenterHorizontal className="w-4 h-4" />
          <ChevronDown className="w-3.5 h-3.5 opacity-70" />
        </button>
        {alignOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default"
              aria-label="Close align menu"
              onClick={() => setAlignOpen(false)}
            />
            <div className="absolute left-0 top-11 z-50 w-56 rounded-2xl border border-slate-200 bg-white shadow-xl p-2">
              <p className="px-2 py-1 text-sm font-semibold text-slate-700">Align</p>
              <div className="grid grid-cols-3 gap-1 mb-2">
                {(
                  [
                    ['left', AlignStartVertical, 'Left'],
                    ['center', AlignCenterVertical, 'Center'],
                    ['right', AlignEndVertical, 'Right'],
                    ['top', AlignStartHorizontal, 'Top'],
                    ['middle', AlignCenterHorizontal, 'Middle'],
                    ['bottom', AlignEndHorizontal, 'Bottom'],
                  ] as const
                ).map(([action, Icon, label]) => (
                  <button
                    key={action}
                    type="button"
                    disabled={!canAlign}
                    title={label}
                    onClick={() => runAlign(action)}
                    className="h-9 rounded-xl border border-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
              <p className="px-2 py-1 text-sm font-semibold text-slate-700">Distribute</p>
              <div className="grid grid-cols-2 gap-1 mb-2">
                <button
                  type="button"
                  disabled={selectedIds.length < 3}
                  title="Distribute horizontally"
                  onClick={() => runAlign('distributeH')}
                  className="h-9 rounded-xl border border-slate-100 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <AlignHorizontalDistributeCenter className="w-4 h-4" />
                  H
                </button>
                <button
                  type="button"
                  disabled={selectedIds.length < 3}
                  title="Distribute vertically"
                  onClick={() => runAlign('distributeV')}
                  className="h-9 rounded-xl border border-slate-100 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <AlignVerticalDistributeCenter className="w-4 h-4" />
                  V
                </button>
              </div>
              <button
                type="button"
                disabled={!canAuto}
                onClick={() => runAlign('auto')}
                className="w-full h-9 rounded-xl font-bold text-white text-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
                style={{ backgroundColor: BRAND.orange }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Auto align
              </button>
            </div>
          </>
        )}
      </div>

      <div className="w-px h-6 bg-slate-200 mx-1" />

      <ToolBtn
        title="Toggle grid"
        active={!!layout?.grid.visible}
        onClick={() => setGrid({ visible: !layout?.grid.visible })}
      >
        <Grid3X3 className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        title="Snap to grid"
        active={!!layout?.grid.snap}
        onClick={() => setGrid({ snap: !layout?.grid.snap })}
      >
        <Magnet className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        title={mode === 'preview' ? 'Design mode' : 'Preview mode'}
        active={mode === 'preview'}
        onClick={() => setMode(mode === 'preview' ? 'design' : 'preview')}
      >
        {mode === 'preview' ? <Pencil className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </ToolBtn>

      <div className="w-px h-6 bg-slate-200 mx-1" />

      <ToolBtn
        title="Export layout JSON"
        onClick={() => {
          const json = exportJson();
          if (!json) return;
          const blob = new Blob([json], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `floor-${layout?.floorId || 'layout'}.json`;
          a.click();
        }}
      >
        <Download className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn title="Import layout JSON" onClick={() => importRef.current?.click()}>
        <Upload className="w-4 h-4" />
      </ToolBtn>
      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const text = await file.text();
          await importJson(text);
          e.target.value = '';
        }}
      />

      <ToolBtn
        title="Duplicate floor"
        onClick={() => void duplicateFloor()}
      >
        <CopyPlus className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        title="Load sample café layout"
        onClick={() => void loadSampleLayout()}
      >
        <LayoutTemplate className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        title="Repair table links by number"
        onClick={() => {
          const n = repairTableLinks();
          alert(n ? `Linked ${n} table(s) by number` : 'All table links look OK');
        }}
      >
        <Link2 className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn title="Generate / print QR" onClick={onGenerateQr}>
        <QrCode className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn title="Upload blueprint PNG/JPG" onClick={() => blueprintRef.current?.click()}>
        <Upload className="w-4 h-4 opacity-70" />
      </ToolBtn>
      <input
        ref={blueprintRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUploadBlueprint(file);
          e.target.value = '';
        }}
      />

      <div className="flex-1" />

      {mode === 'design' && tool === 'pan' && (
        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
          Pan · drag floor
        </span>
      )}

      <ToolBtn title="Dark mode" onClick={toggleTheme} active={themeMode === 'dark'}>
        {themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </ToolBtn>

      {isDirty && (
        <span className="px-2 text-xs font-semibold text-amber-700">Unsaved</span>
      )}
      <input ref={fileRef} type="file" className="hidden" />
      </div>
    </div>
  );
}
