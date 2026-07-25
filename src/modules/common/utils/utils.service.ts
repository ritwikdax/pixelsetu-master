import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class UtilsService {
  uuid() {
    return randomUUID();
  }
}
