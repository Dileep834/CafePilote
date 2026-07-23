import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export type Crumb = { name: string; path?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.name}-${i}`} className="flex items-center gap-1">
              {i > 0 ? <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden /> : null}
              {last || !item.path ? (
                <span className="font-medium text-slate-800" aria-current={last ? 'page' : undefined}>
                  {item.name}
                </span>
              ) : (
                <Link to={item.path} className="hover:text-brand-orange hover:underline">
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
