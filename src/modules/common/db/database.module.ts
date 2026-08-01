import { Global, Module } from '@nestjs/common';
import { MongoDbModule } from './mongo.module';

@Global()
@Module({
  imports: [MongoDbModule.forRootAsync()],
  controllers: [],
  providers: [],
  exports: [MongoDbModule],
})
export class DatabaseModule {}
