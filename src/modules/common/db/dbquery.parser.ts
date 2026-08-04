import { AppError } from '../error/app.error';
import {
  CursorPayload,
  FilterOperator,
  ListQuery,
  ListQueryOptions,
  ListQueryRelation,
  ParsedListQuery,
} from './interface';

const FILTER_OPERATORS: FilterOperator[] = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'nin',
  'contains',
  'startsWith',
  'endsWith',
  'exists',
];

const ISO_DATE_REGEX =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

export class ListQueryParser {
  static parse(
    query: ListQuery,
    options?: ListQueryOptions,
  ): ParsedListQuery {
    const defaultLimit = options?.defaultLimit ?? 100;
    const maxLimit = options?.maxLimit ?? 100;
    const rawLimit = query.limit ?? defaultLimit;
    const limit = Math.min(Math.max(1, rawLimit), maxLimit);

    const sort = this.parseSort(query.sort);
    const filterParts: Record<string, unknown>[] = [];

    if (options?.baseFilter) {
      filterParts.push(options.baseFilter);
    }

    const parsedFilter = this.parseFilter(query.filter);
    if (parsedFilter) {
      filterParts.push(parsedFilter);
    }

    const searchFilter = this.buildSearchFilter(
      query.search,
      options?.searchFields,
    );
    if (searchFilter) {
      filterParts.push(searchFilter);
    }

    if (query.next) {
      filterParts.push(this.buildCursorFilter(sort, this.decodeCursor(query.next)));
    }

    const filter =
      filterParts.length === 0
        ? {}
        : filterParts.length === 1
          ? filterParts[0]
          : { $and: filterParts };

    const projection = this.parseFields(query.fields);
    const lookups = this.buildLookups(query.include, options?.relations);

    return { limit, filter, sort, projection, lookups };
  }

  static encodeCursor(
    doc: Record<string, unknown>,
    sort: Record<string, 1 | -1>,
  ): string {
    const v: Record<string, unknown> = {};
    for (const field of Object.keys(sort)) {
      v[field] = doc[field];
    }
    const payload: CursorPayload = { v, id: doc.id as string };
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  static decodeCursor(token: string): CursorPayload {
    try {
      const payload = JSON.parse(
        Buffer.from(token, 'base64url').toString('utf8'),
      ) as CursorPayload;
      if (!payload?.id || !payload?.v) {
        throw new Error('Invalid cursor structure');
      }
      return {
        id: payload.id,
        v: this.restoreCursorValues(payload.v),
      };
    } catch {
      throw new AppError('ValidationError', 'Invalid pagination cursor');
    }
  }

  private static parseCommaSeparated(value?: string): string[] {
    if (!value?.trim()) {
      return [];
    }
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  private static parseSort(sort?: string): Record<string, 1 | -1> {
    const result: Record<string, 1 | -1> = {};

    for (const field of this.parseCommaSeparated(sort)) {
      if (field.startsWith('-')) {
        result[field.slice(1)] = -1;
      } else if (field.startsWith('+')) {
        result[field.slice(1)] = 1;
      } else {
        result[field] = 1;
      }
    }

    if (!result.id) {
      result.id = 1;
    }

    return result;
  }

  private static parseFilter(filter?: string): Record<string, unknown> | null {
    if (!filter?.trim()) {
      return null;
    }

    const conditions = this.parseCommaSeparated(filter);
    const mongoConditions = conditions.map((condition) =>
      this.parseFilterCondition(condition),
    );

    if (mongoConditions.length === 1) {
      return mongoConditions[0];
    }

    return { $and: mongoConditions };
  }

  private static parseFilterCondition(condition: string): Record<string, unknown> {
    const firstColon = condition.indexOf(':');
    const secondColon = condition.indexOf(':', firstColon + 1);

    if (firstColon === -1 || secondColon === -1) {
      throw new AppError(
        'ValidationError',
        `Invalid filter condition: ${condition}`,
      );
    }

    const field = condition.slice(0, firstColon).trim();
    const operator = condition.slice(firstColon + 1, secondColon).trim();
    const value = condition.slice(secondColon + 1);

    if (!field) {
      throw new AppError(
        'ValidationError',
        `Invalid filter condition: ${condition}`,
      );
    }

    if (!FILTER_OPERATORS.includes(operator as FilterOperator)) {
      throw new AppError(
        'ValidationError',
        `Unsupported filter operator: ${operator}`,
      );
    }

    return this.buildFilterCondition(
      field,
      operator as FilterOperator,
      value,
    );
  }

  private static buildFilterCondition(
    field: string,
    operator: FilterOperator,
    rawValue: string,
  ): Record<string, unknown> {
    switch (operator) {
      case 'eq':
        return { [field]: this.coerceValue(rawValue) };
      case 'neq':
        return { [field]: { $ne: this.coerceValue(rawValue) } };
      case 'gt':
        return { [field]: { $gt: this.coerceValue(rawValue) } };
      case 'gte':
        return { [field]: { $gte: this.coerceValue(rawValue) } };
      case 'lt':
        return { [field]: { $lt: this.coerceValue(rawValue) } };
      case 'lte':
        return { [field]: { $lte: this.coerceValue(rawValue) } };
      case 'in':
        return {
          [field]: { $in: this.parseListValue(rawValue) },
        };
      case 'nin':
        return {
          [field]: { $nin: this.parseListValue(rawValue) },
        };
      case 'contains':
        return {
          [field]: {
            $regex: this.escapeRegex(rawValue),
            $options: 'i',
          },
        };
      case 'startsWith':
        return {
          [field]: {
            $regex: `^${this.escapeRegex(rawValue)}`,
            $options: 'i',
          },
        };
      case 'endsWith':
        return {
          [field]: {
            $regex: `${this.escapeRegex(rawValue)}$`,
            $options: 'i',
          },
        };
      case 'exists': {
        const exists = this.coerceValue(rawValue);
        return {
          [field]: {
            $exists: exists === true || exists === 'true',
          },
        };
      }
    }
  }

  private static buildSearchFilter(
    search?: string,
    searchFields?: string[],
  ): Record<string, unknown> | null {
    if (!search?.trim() || !searchFields?.length) {
      return null;
    }

    const regex = {
      $regex: this.escapeRegex(search.trim()),
      $options: 'i',
    };

    return {
      $or: searchFields.map((field) => ({ [field]: regex })),
    };
  }

  private static buildCursorFilter(
    sort: Record<string, 1 | -1>,
    cursor: CursorPayload,
  ): Record<string, unknown> {
    const sortEntries = Object.entries(sort);
    const orConditions: Record<string, unknown>[] = [];

    for (let i = 0; i < sortEntries.length; i++) {
      const prefix: Record<string, unknown> = {};
      for (let j = 0; j < i; j++) {
        const [field] = sortEntries[j];
        prefix[field] = cursor.v[field];
      }

      const [field, direction] = sortEntries[i];
      const op = direction === 1 ? '$gt' : '$lt';
      orConditions.push({
        ...prefix,
        [field]: { [op]: cursor.v[field] },
      });
    }

    const idPrefix: Record<string, unknown> = {};
    for (const [field] of sortEntries) {
      idPrefix[field] = cursor.v[field];
    }
    orConditions.push({
      ...idPrefix,
      id: { $gt: cursor.id },
    });

    return { $or: orConditions };
  }

  private static parseFields(fields?: string): Record<string, 0 | 1> | undefined {
    const fieldList = this.parseCommaSeparated(fields);
    if (!fieldList.length) {
      return undefined;
    }

    const projection: Record<string, 0 | 1> = { _id: 0 };
    for (const field of fieldList) {
      projection[field] = 1;
    }
    return projection;
  }

  private static buildLookups(
    include?: string,
    relations?: ListQueryRelation[],
  ): Record<string, unknown>[] {
    if (!include?.trim() || !relations?.length) {
      return [];
    }

    const includes = this.parseCommaSeparated(include);
    const lookups: Record<string, unknown>[] = [];

    for (const relation of relations) {
      const alias = relation.as ?? relation.field;
      if (!includes.includes(alias) && !includes.includes(relation.field)) {
        continue;
      }

      lookups.push({
        $lookup: {
          from: relation.collection,
          localField: relation.localField ?? relation.field,
          foreignField: relation.foreignField ?? 'id',
          as: alias,
        },
      });
    }

    return lookups;
  }

  private static parseListValue(rawValue: string): unknown[] {
    return rawValue
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => this.coerceValue(part));
  }

  private static coerceValue(rawValue: string): unknown {
    const value = rawValue.trim();

    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
    if (value === 'null') {
      return null;
    }

    if (ISO_DATE_REGEX.test(value)) {
      return new Date(value);
    }

    const asNumber = Number(value);
    if (value !== '' && !Number.isNaN(asNumber)) {
      return asNumber;
    }

    return value;
  }

  private static restoreCursorValues(
    values: Record<string, unknown>,
  ): Record<string, unknown> {
    const restored: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(values)) {
      if (typeof value === 'string' && ISO_DATE_REGEX.test(value)) {
        restored[key] = new Date(value);
      } else {
        restored[key] = value;
      }
    }

    return restored;
  }

  private static escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
