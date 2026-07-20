import {
  Archive,
  Copy,
  Eye,
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
import type { CatalogProduct } from '../types';

export type ProductRowAction = 'view' | 'edit' | 'duplicate' | 'archive' | 'delete';

type Props = {
  product: CatalogProduct;
  onAction: (action: ProductRowAction, product: CatalogProduct) => void;
};

export function ProductActionMenu({ product, onAction }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label={`Actions for ${product.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-48 rounded-xl border-slate-200 p-1.5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem
          className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm font-medium"
          onClick={() => onAction('view', product)}
        >
          <Eye className="h-4 w-4 text-slate-400" /> View
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm font-medium"
          onClick={() => onAction('edit', product)}
        >
          <Pencil className="h-4 w-4 text-slate-400" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm font-medium"
          onClick={() => onAction('duplicate', product)}
        >
          <Copy className="h-4 w-4 text-slate-400" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm font-medium"
          onClick={() => onAction('archive', product)}
        >
          <Archive className="h-4 w-4 text-slate-400" /> Archive
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-red-600 focus:bg-red-50"
          onClick={() => onAction('delete', product)}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
