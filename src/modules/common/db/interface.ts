export interface StandardFilter {
  limit?: number;
  sort: 'asc' | 'desc';
  nextToken?: string;
}
