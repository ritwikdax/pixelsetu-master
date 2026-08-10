import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'App is running, Version 2.0.0, Latest';
  }
}
