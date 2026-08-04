export interface StandardFilter {
  limit?: number;
  sort: 'asc' | 'desc';
  nextToken?: string;
}

export interface ListQuery {
  limit?: number;
  next?: string;
  sort?: string;
  search?: string;
  filter?: string;
  fields?: string;
  include?: string;
}

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'exists';

export interface ListQueryRelation {
  field: string;
  collection: string;
  as?: string;
  localField?: string;
  foreignField?: string;
}

export interface ListQueryOptions {
  searchFields?: string[];
  relations?: ListQueryRelation[];
  defaultLimit?: number;
  maxLimit?: number;
  baseFilter?: Record<string, unknown>;
}

export interface ParsedListQuery {
  limit: number;
  filter: Record<string, unknown>;
  sort: Record<string, 1 | -1>;
  projection?: Record<string, 0 | 1>;
  lookups: Record<string, unknown>[];
}

export interface ListQueryResult<T> {
  data: T[];
  next?: string;
}

export interface CursorPayload {
  v: Record<string, unknown>;
  id: string;
}
