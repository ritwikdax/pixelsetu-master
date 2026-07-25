import { Injectable } from '@nestjs/common';
import { Db } from 'mongodb';
import { InjectDb } from '../common/common.decorators';

@Injectable()
export class StockService {
  constructor(@InjectDb() private readonly db: Db) {}

  async getStockData() {
    const stockCollection = this.db.collection('stock');
    const stockData = await stockCollection.find().toArray();
    return stockData;
  }

  async createLot(lotData: any) {
    const stockCollection = this.db.collection('stock');
    const result = await stockCollection.insertOne(lotData);
    return result;
  }
}
