export * from './PaymentLink';
export * from './Webhook';
export * from './Transaction';
export * from './PaymentMethod';

export interface ApiErrorResponse {
  status: 'error';
  message: string;
  errors?: Record<string, string[]>;
}

export interface ApiSuccessResponse<T> {
  status: 'success';
  message?: string;
  data: T;
}
