import {
  ClipboardList,
  History,
  MoreHorizontal,
  PackagePlus,
  Pencil,
  ShoppingCart,
  Store,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { InventoryItem } from '../types';

export type InventoryRowAction =
  | 'receive'
  | 'adjust'
  | 'history'
  | 'supplier'
  | 'recipe'
  | 'edit'
  | 'purchase'
  | 'delete';

type Props = {
  item: InventoryItem;
  onAction: (action: InventoryRowAction, item: InventoryItem) => void;
};

type MenuAction = {
  id: InventoryRowAction;
  label: string;
  icon: LucideIcon;
};

const STOCK_ACTIONS: MenuAction[] = [
  { id: 'receive', label: 'Receive Stock', icon: PackagePlus },
  { id: 'adjust', label: 'Adjust Stock', icon: ClipboardList },
  { id: 'history', label: 'History', icon: History },
];

const CATALOG_ACTIONS: MenuAction[] = [
  { id: 'supplier', label: 'Supplier', icon: Store },
  { id: 'recipe', label: 'Recipe', icon: UtensilsCrossed },
  { id: 'edit', label: 'Edit', icon: Pencil },
];

const PURCHASE_ACTIONS: MenuAction[] = [
  { id: 'purchase', label: 'Generate Purchase Order', icon: ShoppingCart },
];

function MenuRow({
  action,
  item,
  onAction,
}: {
  action: MenuAction;
  item: InventoryItem;
  onAction: Props['onAction'];
}) {
  const Icon = action.icon;
  return (
    <DropdownMenuItem
      className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-700 focus:bg-slate-100"
      onClick={() => onAction(action.id, item)}
    >
      <Icon className="h-4 w-4 text-slate-400" aria-hidden />
      {action.label}
    </DropdownMenuItem>
  );
}

export function ActionMenu({ item, onAction }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-800"
            aria-label={`Actions for ${item.productName}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-56 rounded-xl border-slate-200 p-1.5 shadow-lg ring-1 ring-black/5"
      >
        <div className="px-2.5 py-1.5">
          <p className="truncate text-xs font-semibold text-slate-900">{item.productName}</p>
          <p className="truncate text-[11px] text-slate-400">{item.productCode || 'No SKU'}</p>
        </div>
        <DropdownMenuSeparator className="my-1" />

        {STOCK_ACTIONS.map((action) => (
          <MenuRow key={action.id} action={action} item={item} onAction={onAction} />
        ))}
        <DropdownMenuSeparator className="my-1" />

        {CATALOG_ACTIONS.map((action) => (
          <MenuRow key={action.id} action={action} item={item} onAction={onAction} />
        ))}
        <DropdownMenuSeparator className="my-1" />

        {PURCHASE_ACTIONS.map((action) => (
          <MenuRow key={action.id} action={action} item={item} onAction={onAction} />
        ))}
        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuItem
          className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-red-600 focus:bg-red-50 focus:text-red-700"
          onClick={() => onAction('delete', item)}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
