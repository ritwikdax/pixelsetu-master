import { Controller, Get, Post, Body } from '@nestjs/common';
import { StockService } from './stock.service';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}
  @Get()
  async getStock() {
    return this.stockService.getStockData();
  }

  @Post()
  async createLot(@Body() body: any) {
    return this.stockService.createLot(body);
  }
}
