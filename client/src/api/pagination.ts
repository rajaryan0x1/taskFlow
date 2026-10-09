export interface Page<T> { data: T[]; pagination: { nextCursor: string | null } }
export const nextCursor = <T>(page: Page<T>) => page.pagination.nextCursor ?? undefined;
