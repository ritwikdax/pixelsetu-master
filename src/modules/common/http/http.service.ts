import { Inject, Injectable } from '@nestjs/common';
import type { AxiosInstance, AxiosResponse } from 'axios';
import { isAxiosError } from 'axios';
import { HTTP_CLIENT } from './http.constants';
import { AppLogger } from '../logging/app.logger';

@Injectable()
export class HttpService {
  private readonly logger = new AppLogger(HttpService.name);

  constructor(@Inject(HTTP_CLIENT) private readonly client: AxiosInstance) {}

  async get<T>(
    url: string,
    params?: Record<string, any>,
  ): Promise<AxiosResponse<T>> {
    this.logger.debug(`GET ${url}`);
    try {
      const response = await this.client.get<T>(url, { params });
      return response as AxiosResponse<T>;
    } catch (err) {
      this.logHttpError('GET', url, err);
      throw err;
    }
  }

  async post<T>(url: string, data?: any): Promise<AxiosResponse<T>> {
    this.logger.debug(`POST ${url}`);
    try {
      const response = await this.client.post<T>(url, data);
      return response as AxiosResponse<T>;
    } catch (err) {
      this.logHttpError('POST', url, err);
      throw err;
    }
  }

  async put<T>(url: string, data?: any): Promise<AxiosResponse<T>> {
    this.logger.debug(`PUT ${url}`);
    try {
      const response = await this.client.put<T>(url, data);
      return response as AxiosResponse<T>;
    } catch (err) {
      this.logHttpError('PUT', url, err);
      throw err;
    }
  }

  async delete<T>(url: string): Promise<AxiosResponse<T>> {
    this.logger.debug(`DELETE ${url}`);
    try {
      const response = await this.client.delete<T>(url);
      return response as AxiosResponse<T>;
    } catch (err) {
      this.logHttpError('DELETE', url, err);
      throw err;
    }
  }

  private logHttpError(method: string, url: string, err: unknown) {
    if (isAxiosError(err)) {
      this.logger.error(
        `${method} ${url} failed status=${err.response?.status ?? 'n/a'} message=${err.message}`,
      );
      return;
    }
    this.logger.error(
      `${method} ${url} failed`,
      err instanceof Error ? err.stack : String(err),
    );
  }
}
