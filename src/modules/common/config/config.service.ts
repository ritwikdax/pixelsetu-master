import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../type';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  getConfig<K extends keyof AppConfig>(configName: K): AppConfig[K] {
    return this.config.get<AppConfig[K]>(configName) as AppConfig[K];
  }
}
