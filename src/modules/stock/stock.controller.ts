import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  Patch,
} from '@nestjs/common';
import { StockService } from './stock.service';
import { ValidateSchema } from '@common';
import { LotSchema } from './lot.schema';
import z from 'zod';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @ValidateSchema({
    query: z.object({
      limit: z.number().optional(),
      sort: z.enum(['asc', 'desc']).optional(),
      nextToken: z.string().optional(),
    }),
  })
  @Get()
  async getStock() {
    return this.stockService.getStockData();
  }

  @ValidateSchema({
    body: LotSchema,
  })
  @Post()
  async createLot(@Body() body: any) {
    return this.stockService.createLot(body);
  }

  @ValidateSchema({
    body: LotSchema.partial(),
  })
  @Patch(':id')
  async updateLot(@Param('id') id: string, @Body() body: any) {
    return this.stockService.updateLot(id, body);
  }

  @ValidateSchema({
    params: z.uuidv7(),
  })
  @Delete(':id')
  async deleteLot(@Param('id') id: string) {
    return this.stockService.deleteLot(id);
  }
}
