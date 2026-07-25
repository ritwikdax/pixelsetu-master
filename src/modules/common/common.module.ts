import { Global, Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './db/database.module';

@Global()
@Module({
  imports: [DatabaseModule, AppConfigModule],
  controllers: [],
  providers: [DatabaseModule, AppConfigModule],
})
export class CommonModule {}
