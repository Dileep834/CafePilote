import type { CategoryFilters, ProductFilters, ProductGroupBy } from '../types';
import { DEFAULT_CATEGORY_FILTERS, DEFAULT_PRODUCT_FILTERS } from '../types';

const PRODUCT_KEY = 'cafepilots.menu.productFilters.v1';
const CATEGORY_KEY = 'cafepilots.menu.categoryFilters.v1';
const GROUP_KEY = 'cafepilots.menu.productGroupBy.v1';
const PAGE_SIZE_KEY = 'cafepilots.menu.pageSize.v1';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

export function loadProductFilters(): ProductFilters {
  return readJson(PRODUCT_KEY, DEFAULT_PRODUCT_FILTERS);
}

export function saveProductFilters(filters: ProductFilters) {
  try {
    localStorage.setItem(PRODUCT_KEY, JSON.stringify(filters));
  } catch {
    // ignore quota
  }
}

export function loadCategoryFilters(): CategoryFilters {
  return readJson(CATEGORY_KEY, DEFAULT_CATEGORY_FILTERS);
}

export function saveCategoryFilters(filters: CategoryFilters) {
  try {
    localStorage.setItem(CATEGORY_KEY, JSON.stringify(filters));
  } catch {
    // ignore
  }
}

export function loadGroupBy(): ProductGroupBy {
  try {
    const v = localStorage.getItem(GROUP_KEY);
    if (v === 'category' || v === 'brand' || v === 'flat') return v;
  } catch {
    // ignore
  }
  return 'flat';
}

export function saveGroupBy(groupBy: ProductGroupBy) {
  try {
    localStorage.setItem(GROUP_KEY, groupBy);
  } catch {
    // ignore
  }
}

export function loadPageSize(): 25 | 50 | 100 {
  try {
    const n = Number(localStorage.getItem(PAGE_SIZE_KEY));
    if (n === 25 || n === 50 || n === 100) return n;
  } catch {
    // ignore
  }
  return 25;
}

export function savePageSize(size: 25 | 50 | 100) {
  try {
    localStorage.setItem(PAGE_SIZE_KEY, String(size));
  } catch {
    // ignore
  }
}
