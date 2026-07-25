import { Injectable } from '@nestjs/common';
import { Repository } from '@common';

@Injectable()
export class StockService {
  constructor(private readonly repo: Repository<any>) {}

  async getStockData() {
    return await this.repo.findAll('stock');
  }

  async createLot(lotData: any) {
    return await this.repo.create('stock', lotData);
  }

  async updateLot(lotData: any) {
    return await this.repo.update('stock', lotData.symbol, lotData);
  }

  async deleteLot(id: string) {
    return await this.repo.delete('stock', id);
  }
}
