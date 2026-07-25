import { SetMetadata, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { SchemaValidationPipe } from './schema.pipe';

export const VALIDATE_SCHEMA_KEY = Symbol('VALIDATE_SCHEMA');

export interface ValidateSchemaOptions {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
}

export const ValidateSchema = (
  options: ValidateSchemaOptions,
): MethodDecorator => {
  const setMetadata = SetMetadata(VALIDATE_SCHEMA_KEY, options);

  return (target, propertyKey, descriptor) => {
    setMetadata(target, propertyKey, descriptor);
    UsePipes(new SchemaValidationPipe(undefined, descriptor.value as Function))(
      target,
      propertyKey,
      descriptor,
    );
  };
};
