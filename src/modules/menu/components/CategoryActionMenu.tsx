import {
  Archive,
  Copy,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CatalogCategory } from '../types';

export type CategoryRowAction = 'edit' | 'duplicate' | 'hide' | 'unhide' | 'archive' | 'delete';

type Props = {
  category: CatalogCategory;
  onAction: (action: CategoryRowAction, category: CatalogCategory) => void;
};

export function CategoryActionMenu({ category, onAction }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100"
            aria-label={`Actions for ${category.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent
        align="end"
        className="w-48 rounded-xl border-slate-200 p-1.5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm font-medium" onClick={() => onAction('edit', category)}>
          <Pencil className="h-4 w-4 text-slate-400" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm font-medium" onClick={() => onAction('duplicate', category)}>
          <Copy className="h-4 w-4 text-slate-400" /> Duplicate
        </DropdownMenuItem>
        {category.isHidden ? (
          <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm font-medium" onClick={() => onAction('unhide', category)}>
            <Eye className="h-4 w-4 text-slate-400" /> Unhide
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm font-medium" onClick={() => onAction('hide', category)}>
            <EyeOff className="h-4 w-4 text-slate-400" /> Hide
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm font-medium" onClick={() => onAction('archive', category)}>
          <Archive className="h-4 w-4 text-slate-400" /> Archive
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-red-600 focus:bg-red-50" onClick={() => onAction('delete', category)}>
          <Trash2 className="h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
