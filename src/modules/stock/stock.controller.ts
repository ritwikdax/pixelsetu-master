import { Controller, Get, Post, Body, Delete, Param } from '@nestjs/common';
import { StockService } from './stock.service';
import { ValidateSchema } from '@common';
import { LotSchema } from './lot.schema';
import z from 'zod';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

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
  @Post('update')
  async updateLot(@Body() body: any) {
    return this.stockService.updateLot(body);
  }

  @ValidateSchema({
    params: z.uuidv7(),
  })
  @Delete(':id')
  async deleteLot(@Param('id') id: string) {
    return this.stockService.deleteLot(id);
  }
}
