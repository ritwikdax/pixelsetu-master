import { MONGO_DB } from './const';
import { Inject } from '@nestjs/common';
import { Cache } from './cache/cache.decorator';
import { ValidateSchema } from './schema/schema.decorator';

const InjectDb = () => Inject(MONGO_DB);

export { InjectDb, Cache, ValidateSchema };
