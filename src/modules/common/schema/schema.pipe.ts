import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { z } from 'zod';
import {
  VALIDATE_SCHEMA_KEY,
  type ValidateSchemaOptions,
} from './schema.decorator';
import { AppError } from '../error/app.error';

@Injectable()
export class SchemaValidationPipe<
  TSchema extends z.ZodTypeAny,
> implements PipeTransform {
  constructor(
    private readonly schema?: TSchema,
    private readonly handler?: Function,
  ) {}

  transform(value: unknown, metadata: ArgumentMetadata): z.infer<TSchema> {
    const schema = this.getSchema(metadata);

    if (!schema) {
      return value as z.infer<TSchema>;
    }

    const result = schema.safeParse(value);

    if (!result.success) {
      throw new AppError(
        'SchemaValidationError',
        result.error.issues.map((err) => err.message).join(', '),
      );
    }

    return result.data as z.infer<TSchema>;
  }

  private getSchema(metadata: ArgumentMetadata): z.ZodTypeAny | undefined {
    if (!this.handler) {
      return this.schema;
    }

    const schemas = Reflect.getMetadata(VALIDATE_SCHEMA_KEY, this.handler) as
      ValidateSchemaOptions | undefined;

    switch (metadata.type) {
      case 'body':
        return schemas?.body;
      case 'query':
        return schemas?.query;
      case 'param':
        return schemas?.params;
      default:
        return undefined;
    }
  }
}
