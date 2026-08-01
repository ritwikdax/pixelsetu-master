import { Inject } from '@nestjs/common';
import { MONGO_CLIENT, MONGO_DB } from './const';

const InjectDb = () => Inject(MONGO_DB);
const InjectDbClient = () => Inject(MONGO_CLIENT);

export { InjectDb, InjectDbClient };
