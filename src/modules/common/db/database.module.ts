import { Global, Module } from '@nestjs/common';
import { MongoDbModule } from './mongo.module';

@Global()
@Module({
  imports: [MongoDbModule.forRootAsync()],
  controllers: [],
  providers: [],
  // Re-export the module that owns MONGO_DB. Nest only allows a module to
  // export providers declared locally or from a directly imported module.
  exports: [MongoDbModule],
})
export class DatabaseModule {}
