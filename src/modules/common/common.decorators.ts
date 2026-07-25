import { MONGO_DB } from './const';
import { Inject } from '@nestjs/common';

const InjectDb = () => Inject(MONGO_DB);

export { InjectDb };
