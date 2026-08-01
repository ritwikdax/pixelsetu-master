import { Inject, Injectable } from '@nestjs/common';
import type { AxiosInstance, AxiosResponse } from 'axios';
import { HTTP_CLIENT } from './http.constants';

@Injectable()
export class HttpService {
  constructor(@Inject(HTTP_CLIENT) private readonly client: AxiosInstance) {}

  async get<T>(
    url: string,
    params?: Record<string, any>,
  ): Promise<AxiosResponse<T>> {
    const response = await this.client.get<T>(url, { params });
    return response as AxiosResponse<T>;
  }

  async post<T>(url: string, data?: any): Promise<AxiosResponse<T>> {
    const response = await this.client.post<T>(url, data);
    return response as AxiosResponse<T>;
  }

  async put<T>(url: string, data?: any): Promise<AxiosResponse<T>> {
    const response = await this.client.put<T>(url, data);
    return response as AxiosResponse<T>;
  }

  async delete<T>(url: string): Promise<AxiosResponse<T>> {
    const response = await this.client.delete<T>(url);
    return response as AxiosResponse<T>;
  }
}
