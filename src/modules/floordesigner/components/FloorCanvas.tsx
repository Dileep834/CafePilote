import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Transformer, Rect } from 'react-konva';
import type Konva from 'konva';
import { useFloorStore } from '../store/floorStore';
import { CanvasGrid } from './CanvasGrid';
import { ObjectRenderer } from './ObjectRenderer';
import { BlueprintLayer } from './BlueprintLayer';
import { FloorBounds } from './FloorBounds';
import { useTableStore } from '@/modules/tables/store/useTableStore';
import { useTableBillStore } from '@/modules/tables/store/useTableBillStore';
import { toCanvasStatus } from '../types';
import { snapPoint } from '../lib/snap';
import { useZoom } from '../hooks/useZoom';

type Props = {
  containerRef: React.RefObject<HTMLDivElement | null>;
};

export function FloorCanvas({ containerRef }: Props) {
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [spacePan, setSpacePan] = useState(false);
  const [panning, setPanning] = useState(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  const layout = useFloorStore((s) => s.layout);
  const isLoadingFloor = useFloorStore((s) => s.isLoading);
  const createFloor = useFloorStore((s) => s.createFloor);
  const loadSampleLayout = useFloorStore((s) => s.loadSampleLayout);
  const mode = useFloorStore((s) => s.mode);
  const tool = useFloorStore((s) => s.tool);
  const selectedIds = useFloorStore((s) => s.selectedIds);
  const select = useFloorStore((s) => s.select);
  const clearSelection = useFloorStore((s) => s.clearSelection);
  const setObjectTransform = useFloorStore((s) => s.setObjectTransform);
  const setViewport = useFloorStore((s) => s.setViewport);
  const pushHistory = useFloorStore((s) => s.pushHistory);
  const setContextMenu = useFloorStore((s) => s.setContextMenu);

  const tables = useTableStore((s) => s.tables);
  const getOpenBillForTable = useTableBillStore((s) => s.getOpenBillForTable);
  const { zoomBy } = useZoom(containerRef);

  /** Hand tool or Space — drag anywhere to pan. Preview still allows tapping tables. */
  const forcePan = tool === 'pan' || spacePan;
  const canEditObjects = mode === 'design' && !forcePan;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [containerRef]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
      e.preventDefault();
      setSpacePan(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePan(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const objects = useMemo(() => {
    if (!layout) return [];
    return [...layout.objects].sort((a, b) => a.layer - b.layer);
  }, [layout]);

  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage || mode === 'preview' || forcePan) {
      tr?.nodes([]);
      return;
    }
    const nodes = selectedIds
      .map((id) => stage.findOne(`#${CSS.escape(id)}`) || stage.findOne(`.${id}`) || stage.findOne(`#${id}`))
      .filter(Boolean) as Konva.Node[];
    const byName = selectedIds
      .map((id) => stage.findOne((n: Konva.Node) => n.name() === id))
      .filter(Boolean) as Konva.Node[];
    tr.nodes(byName.length ? byName : nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, objects, mode, forcePan]);

  if (!layout) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center bg-[#F3F3F8] px-6 text-center">
        {isLoadingFloor ? (
          <p className="animate-pulse text-sm font-medium text-slate-400">Loading floor…</p>
        ) : (
          <>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6A00]">
              <span className="text-lg font-bold">F</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">No floor layout yet</h2>
            <p className="mt-1 max-w-sm text-sm font-medium text-slate-600">
              Create a floor or load the sample café plan to start placing tables.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                className="h-9 rounded-xl bg-[#FF6A00] px-4 text-sm font-bold text-white hover:bg-[#e55f00]"
                onClick={() => void createFloor('Ground Floor')}
              >
                Create floor
              </button>
              <button
                type="button"
                className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
                onClick={() => void loadSampleLayout({ force: true })}
              >
                Load sample café
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  const vp = layout.viewport;

  const statusFor = (obj: (typeof objects)[0]) => {
    const linkedTableId = obj.linkedTableId;
    let table = linkedTableId ? tables.find((t) => t.id === linkedTableId) : undefined;
    if (!table && obj.tableNumber) {
      const num = obj.tableNumber.trim().toUpperCase();
      table = tables.find((t) => t.tableNumber.toUpperCase() === num);
    }
    if (!table) return undefined;
    const bill = getOpenBillForTable(table, tables);
    return toCanvasStatus(table.status, {
      hasOpenBill: !!(bill && bill.items.length > 0),
      selected: selectedIds.includes(obj.id),
    });
  };

  const startPan = (clientX: number, clientY: number) => {
    setPanning(true);
    lastPointer.current = { x: clientX, y: clientY };
  };

  const movePan = (clientX: number, clientY: number) => {
    if (!panning || !lastPointer.current) return;
    const dx = clientX - lastPointer.current.x;
    const dy = clientY - lastPointer.current.y;
    lastPointer.current = { x: clientX, y: clientY };
    setViewport({ x: vp.x + dx, y: vp.y + dy });
  };

  const endPan = () => {
    setPanning(false);
    lastPointer.current = null;
  };

  const cursor = forcePan ? (panning ? 'grabbing' : 'grab') : 'default';

  return (
    <Stage
      ref={stageRef}
      width={size.w}
      height={size.h}
      scaleX={vp.scale}
      scaleY={vp.scale}
      x={vp.x}
      y={vp.y}
      className="bg-[#F3F3F8] touch-none"
      style={{ cursor }}
      onWheel={(e) => {
        e.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        const direction = e.evt.deltaY > 0 ? 1 / 1.08 : 1.08;
        zoomBy(direction, pointer);
      }}
      onMouseDown={(e) => {
        const isMiddle = e.evt.button === 1;
        const onEmpty = e.target === e.target.getStage();
        if (forcePan || isMiddle || (mode === 'preview' && onEmpty)) {
          e.evt.preventDefault();
          startPan(e.evt.clientX, e.evt.clientY);
          return;
        }
        if (onEmpty) {
          clearSelection();
          setContextMenu(null);
        }
      }}
      onMouseMove={(e) => movePan(e.evt.clientX, e.evt.clientY)}
      onMouseUp={endPan}
      onMouseLeave={endPan}
      onTouchStart={(e) => {
        const onEmpty = e.target === e.target.getStage();
        if (forcePan || (mode === 'preview' && onEmpty)) {
          const t = e.evt.touches[0];
          if (t) startPan(t.clientX, t.clientY);
          return;
        }
        if (onEmpty) {
          clearSelection();
        }
      }}
      onTouchMove={(e) => {
        const t = e.evt.touches[0];
        if (t) movePan(t.clientX, t.clientY);
      }}
      onTouchEnd={endPan}
    >
      <CanvasGrid
        width={size.w}
        height={size.h}
        offsetX={vp.x}
        offsetY={vp.y}
        scale={vp.scale}
        size={layout.grid.size}
        visible={layout.grid.visible}
      />

      <FloorBounds floorSize={layout.floorSize} scale={vp.scale} />

      <Layer>
        {layout.blueprint && <BlueprintLayer blueprint={layout.blueprint} />}
      </Layer>

      <Layer>
        <Rect x={-1} y={-1} width={2} height={2} fill="#FF6A00" listening={false} />
        {objects.map((obj) => (
          <ObjectRenderer
            key={obj.id}
            object={obj}
            status={statusFor(obj)}
            selected={selectedIds.includes(obj.id)}
            preview={mode === 'preview'}
            draggable={canEditObjects}
            onSelect={(id, additive) => {
              if (forcePan) return;
              select([id], additive);
            }}
            onDragEnd={(id, x, y) => {
              pushHistory();
              const snapped = snapPoint(x, y, layout.grid.size, layout.grid.snap);
              setObjectTransform(id, { x: snapped.x, y: snapped.y });
            }}
            onContextMenu={(id, x, y) => {
              if (forcePan || mode === 'preview') return;
              select([id]);
              setContextMenu({ x, y, objectId: id });
            }}
          />
        ))}
        {canEditObjects && (
          <Transformer
            ref={trRef}
            rotateEnabled
            enabledAnchors={[
              'top-left',
              'top-right',
              'bottom-left',
              'bottom-right',
              'middle-left',
              'middle-right',
              'top-center',
              'bottom-center',
            ]}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 16 || newBox.height < 16) return oldBox;
              return newBox;
            }}
            onTransformEnd={() => {
              const stage = stageRef.current;
              if (!stage) return;
              pushHistory();
              selectedIds.forEach((id) => {
                const node = stage.findOne((n: Konva.Node) => n.name() === id) as Konva.Group | null;
                if (!node) return;
                const scaleX = node.scaleX();
                const scaleY = node.scaleY();
                const obj = layout.objects.find((o) => o.id === id);
                if (!obj) return;
                const width = Math.max(16, obj.width * scaleX);
                const height = Math.max(16, obj.height * scaleY);
                node.scaleX(1);
                node.scaleY(1);
                const snapped = snapPoint(node.x(), node.y(), layout.grid.size, layout.grid.snap);
                setObjectTransform(id, {
                  x: snapped.x,
                  y: snapped.y,
                  width,
                  height,
                  rotation: node.rotation(),
                });
              });
            }}
          />
        )}
      </Layer>
    </Stage>
  );
}
