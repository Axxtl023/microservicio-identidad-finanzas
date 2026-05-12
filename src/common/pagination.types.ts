export interface PaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface PaginatedServiceResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export function buildMeta(total: number, page: number, limit: number): PaginationMeta {
  const safeLimit = Math.max(1, limit);
  const safePage = Math.max(1, page);
  const totalPages = Math.ceil(total / safeLimit);
  const itemCount = Math.max(0, Math.min(safeLimit, total - (safePage - 1) * safeLimit));
  return {
    totalItems: total,
    itemCount,
    itemsPerPage: safeLimit,
    totalPages,
    currentPage: safePage,
  };
}
