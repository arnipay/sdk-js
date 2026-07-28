import axios, { AxiosHeaders, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiErrorResponse, ApiSuccessResponse } from '../interfaces';
import { GatewayError } from './GatewayError';
import { SignatureService } from './SignatureService';

export const PRODUCTION_BASE_URL = 'https://arnipay.com.py/api/v1';
export const SANDBOX_BASE_URL = 'https://sandbox.arnipay.com.py/api/v1';

export class Client {
  private readonly clientId: string;
  private readonly privateKey: string;
  private baseUrl: string;
  private verifySsl: boolean = true;
  private axiosInstance: AxiosInstance;
  private readonly signatureService: SignatureService;

  constructor(
    clientId: string,
    privateKey: string,
    baseUrl: string = PRODUCTION_BASE_URL
  ) {
    this.clientId = clientId;
    this.privateKey = privateKey;
    this.baseUrl = baseUrl;
    this.signatureService = new SignatureService();
    this.axiosInstance = this.createAxiosInstance();
  }

  /**
   * Override the API base URL.
   * When verifySsl is true, the URL must start with https://.
   */
  public setBaseUrl(baseUrl: string, verifySsl: boolean = true): this {
    if (verifySsl && !baseUrl.startsWith('https://')) {
      throw new Error('Base URL must use HTTPS when SSL verification is enabled.');
    }

    this.baseUrl = baseUrl;
    this.verifySsl = verifySsl;
    this.axiosInstance = this.createAxiosInstance();
    return this;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public async request<T>(method: string, endpoint: string, data?: unknown): Promise<T> {
    const methodUpper = method.toUpperCase();
    const { requestUrl, canonicalUri } = this.resolveRequestTarget(endpoint);
    const timestamp = Math.floor(Date.now() / 1000);
    const body = this.prepareRequestBody(methodUpper, data);
    const signature = this.signatureService.generate(
      methodUpper,
      canonicalUri,
      timestamp,
      this.clientId,
      this.privateKey,
      body
    );

    const headers = AxiosHeaders.from({
      'Content-Type': 'application/json',
      'X-Client-ID': this.clientId,
      'X-Timestamp': String(timestamp),
      'X-Signature': signature
    });

    const config: AxiosRequestConfig = {
      method: methodUpper,
      url: requestUrl,
      headers,
      data: body.length > 0 ? body : undefined,
      // Node http adapter uses this for TLS; ignored for http://
      ...(this.verifySsl === false ? { httpsAgent: this.getInsecureHttpsAgent() } : {})
    };

    try {
      const response: AxiosResponse<ApiSuccessResponse<T>> = await this.axiosInstance(config);
      return response.data.data;
    } catch (error: any) {
      if (error.response) {
        const { data: responseData, status } = error.response;
        const errorResponse = responseData as ApiErrorResponse;

        throw new GatewayError(
          errorResponse?.message || 'An error occurred during the request',
          status,
          errorResponse?.errors
        );
      }

      throw new GatewayError(error.message || 'An unexpected error occurred', error.status || 0);
    }
  }

  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: this.baseUrl,
      transformRequest: [(data) => data],
      ...(this.verifySsl === false ? { httpsAgent: this.getInsecureHttpsAgent() } : {})
    });
  }

  private getInsecureHttpsAgent(): any {
    // Lazy require so browsers/bundlers without node:https still work for http APIs
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const https = require('https');
      return new https.Agent({ rejectUnauthorized: false });
    } catch {
      return undefined;
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

  private prepareRequestBody(method: string, data?: unknown): string {
    if (!['POST', 'PUT', 'PATCH'].includes(method)) {
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

    if (typeof data === 'object' && Object.keys(data as object).length === 0) {
      return '';
    }

    return this.stringifyJson(data);
  }

  private stringifyJson(payload: unknown): string {
    const json = JSON.stringify(payload);
    return json ? json.replace(/\\\//g, '/') : '';
  }
}
