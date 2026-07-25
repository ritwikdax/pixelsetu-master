import { DynamicModule, Module } from '@nestjs/common';
import { AppConfigModule } from '../common/config/config.module';
import { AppConfigService } from '../common/config/config.service';
import { MongoClient } from 'mongodb';
import { google } from 'googleapis';
//https://drive.google.com/drive/u/0/folders/1KnUBVwFCi3e6pAuKtlDtKg91Tzprz5ix
export const GDRIVE_CLIENT = Symbol('GDRIVE_CLIENT');

@Module({})
export class GDriveClientModule {
  static forRootAsync(): DynamicModule {
    return {
      module: GDriveClientModule,
      imports: [AppConfigModule],
      providers: [
        {
          provide: GDRIVE_CLIENT,
          inject: [AppConfigService],
          useFactory: async (config: AppConfigService) => {
            const json = Buffer.from(
              config.getConfig('GCP_SERVICE_ACCOUNT_B64'),
              'base64',
            ).toString('utf8');
            const auth = new google.auth.GoogleAuth({
              credentials: JSON.parse(json),
              scopes: ['https://www.googleapis.com/auth/drive.readonly'],
            });
            const drive = google.drive({ version: 'v3', auth });
            return drive;
          },
        },
      ],
      exports: [GDRIVE_CLIENT],
    };
  }
}
