import React from 'react';
import { cn } from '@/lib/utils';
import { useFloorStore } from '../store/floorStore';
import {
  BringToFront,
  ClipboardPaste,
  Copy,
  EyeOff,
  Group,
  Lock,
  SendToBack,
  Trash2,
  Unlock,
  Ungroup,
} from 'lucide-react';

export function FloorContextMenu() {
  const menu = useFloorStore((s) => s.contextMenu);
  const mode = useFloorStore((s) => s.mode);
  const setContextMenu = useFloorStore((s) => s.setContextMenu);
  const deleteSelected = useFloorStore((s) => s.deleteSelected);
  const duplicateSelected = useFloorStore((s) => s.duplicateSelected);
  const copySelected = useFloorStore((s) => s.copySelected);
  const pasteClipboard = useFloorStore((s) => s.pasteClipboard);
  const bringFront = useFloorStore((s) => s.bringFront);
  const sendBack = useFloorStore((s) => s.sendBack);
  const toggleLockSelected = useFloorStore((s) => s.toggleLockSelected);
  const toggleHideSelected = useFloorStore((s) => s.toggleHideSelected);
  const groupSelected = useFloorStore((s) => s.groupSelected);
  const ungroupSelected = useFloorStore((s) => s.ungroupSelected);
  const layout = useFloorStore((s) => s.layout);
  const selectedIds = useFloorStore((s) => s.selectedIds);

  if (!menu || mode === 'preview') return null;

  const obj = layout?.objects.find((o) => o.id === (menu.objectId || selectedIds[0]));

  const Item = ({
    icon: Icon,
    label,
    onClick,
    danger,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick: () => void;
    danger?: boolean;
  }) => (
    <button
      type="button"
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 rounded-lg',
        danger && 'text-rose-600'
      )}
      onClick={() => {
        onClick();
        setContextMenu(null);
      }}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <>
      <div className="fixed inset-0 z-[80]" onClick={() => setContextMenu(null)} />
      <div
        className="fixed z-[90] w-52 rounded-xl border border-slate-200 bg-white shadow-xl p-1.5"
        style={{ left: menu.x, top: menu.y }}
      >
        <Item icon={Copy} label="Copy" onClick={copySelected} />
        <Item icon={ClipboardPaste} label="Paste" onClick={pasteClipboard} />
        <Item icon={Copy} label="Duplicate" onClick={duplicateSelected} />
        <div className="h-px bg-slate-100 my-1" />
        <Item icon={BringToFront} label="Bring to front" onClick={bringFront} />
        <Item icon={SendToBack} label="Send to back" onClick={sendBack} />
        <Item icon={Group} label="Group" onClick={groupSelected} />
        <Item icon={Ungroup} label="Ungroup" onClick={ungroupSelected} />
        <Item
          icon={obj?.locked ? Unlock : Lock}
          label={obj?.locked ? 'Unlock' : 'Lock'}
          onClick={toggleLockSelected}
        />
        <Item icon={EyeOff} label={obj?.visible === false ? 'Show' : 'Hide'} onClick={toggleHideSelected} />
        <div className="h-px bg-slate-100 my-1" />
        <Item icon={Trash2} label="Delete" onClick={deleteSelected} danger />
        <p className="px-3 pt-1 pb-0.5 text-xs font-medium text-slate-500">
          CafePilots Floor
        </p>
      </div>
    </>
  );
}
