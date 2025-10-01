import axios, { AxiosHeaders, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import crypto from 'crypto';
import { ApiErrorResponse, ApiSuccessResponse } from '../interfaces';
import { GatewayError } from './GatewayError';

export class Client {
  private readonly clientId: string;
  private readonly privateKey: string;
  private readonly baseUrl: string;
  private readonly axiosInstance: AxiosInstance;

  constructor(clientId: string, privateKey: string, baseUrl: string = 'https://yourdomain.com/api/v1') {
    this.clientId = clientId;
    this.privateKey = privateKey;
    this.baseUrl = baseUrl;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl
    });
  }

  public async request<T>(method: string, endpoint: string, data?: any): Promise<T> {
    const methodUpper = method.toUpperCase();
    const { requestUrl, canonicalUri } = this.resolveRequestTarget(endpoint);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = this.prepareRequestBody(methodUpper, data);
    const bodyHash = this.hashBody(body);
    const canonical = this.buildCanonicalString(methodUpper, canonicalUri, timestamp, this.clientId, bodyHash);
    const signature = this.computeSignature(canonical);

    const headers = AxiosHeaders.from({
      'Content-Type': 'application/json',
      'X-Client-ID': this.clientId,
      'X-Timestamp': timestamp,
      'X-Signature': signature
    });

    const config: AxiosRequestConfig = {
      method: methodUpper,
      url: requestUrl,
      headers,
      data: body.length > 0 ? body : undefined
    };

    try {
      const response: AxiosResponse<ApiSuccessResponse<T>> = await this.axiosInstance(config);
      return response.data.data;
    } catch (error: any) {
      if (error.response) {
        const { data, status } = error.response;
        const errorResponse = data as ApiErrorResponse;

        throw new GatewayError(
          errorResponse.message || 'An error occurred during the request',
          status,
          errorResponse.errors
        );
      }

      throw new GatewayError(
        error.message || 'An unexpected error occurred',
        error.status || 0
      );
    }
  }

  private resolveRequestTarget(endpoint: string): { requestUrl: string; canonicalUri: string } {
    if (this.isAbsoluteUrl(endpoint)) {
      const absoluteUrl = new URL(endpoint);
      return {
        requestUrl: endpoint,
        canonicalUri: `${absoluteUrl.pathname}${absoluteUrl.search}`
      };
    }

    const normalizedEndpoint = this.normalizeRelativeEndpoint(endpoint);
    const endpointUrl = new URL(normalizedEndpoint, 'http://sdk.local');
    const base = new URL(this.baseUrl);
    const basePath = base.pathname === '/' ? '' : base.pathname.replace(/\/$/, '');
    const relativePath = endpointUrl.pathname.replace(/^\/+/, '');
    const requestPath = `/${relativePath}`.replace(/\/+/g, '/');
    const canonicalPath = `${basePath}/${relativePath}`.replace(/\/+/g, '/');
    const search = endpointUrl.search;

    return {
      requestUrl: `${requestPath}${search}`,
      canonicalUri: `${canonicalPath || '/'}${search}`
    };
  }

  private isAbsoluteUrl(url: string): boolean {
    return /^[a-z][a-z\d+\-.]*:/.test(url);
  }

  private normalizeRelativeEndpoint(endpoint: string): string {
    if (!endpoint) {
      return '/';
    }

    return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  }

  private prepareRequestBody(method: string, data?: any): string {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return '';
    }

    if (data === undefined || data === null) {
      return '';
    }

    if (typeof data === 'string') {
      return data;
    }

    if (Buffer.isBuffer(data)) {
      return data.toString('utf8');
    }

    return this.stringifyJson(data);
  }

  private stringifyJson(payload: any): string {
    const json = JSON.stringify(payload);
    return json ? json.replace(/\\\//g, '/') : '';
  }

  private buildCanonicalString(method: string, uri: string, timestamp: string, clientId: string, bodyHash: string): string {
    return [method.toUpperCase(), uri, timestamp, clientId, bodyHash].join('\n');
  }

  private hashBody(body: string): string {
    return crypto.createHash('sha256').update(body, 'utf8').digest('base64');
  }

  private computeSignature(canonical: string): string {
    return crypto.createHmac('sha256', this.privateKey).update(canonical, 'utf8').digest('hex');
  }
}
