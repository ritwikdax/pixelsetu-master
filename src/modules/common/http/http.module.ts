import { DynamicModule } from '@nestjs/common';
import { HttpService } from './http.service';
import { create, CreateAxiosDefaults } from 'axios';
import { HTTP_CLIENT } from './http.constants';

export class HttpModule {
  static register(config: CreateAxiosDefaults): DynamicModule {
    return {
      module: HttpModule,
      providers: [
        HttpService,
        {
          provide: HTTP_CLIENT,
          useFactory: () => {
            return create({
              ...config,
            });
          },
        },
      ],
      exports: [HttpService],
    };
  }
}
