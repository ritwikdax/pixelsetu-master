import { Inject } from '@nestjs/common';
import { GDRIVE_CLIENT } from './client.module';

export const GdriveClient = () => Inject(GDRIVE_CLIENT);
