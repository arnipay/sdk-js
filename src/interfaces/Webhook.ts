export interface WebhookEventData {
  link_id?: string;
  payment_id?: string;
  status?: string;
  payment_method?: string;
  amount?: number;
  reference?: string;
  payment_details?: {
    payment_date: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export type WebhookEventType =
  | 'payment.completed'
  | 'payment.pending'
  | 'payment.failed'
  | 'payment.cancelled'
  | 'payment.refund_pending'
  | 'payment.refunded'
  | 'payment.expired'
  | 'payment.voided'
  | 'payment.void_pending'
  | 'payment.chargeback_pending'
  | string;

export interface WebhookEventPayload {
  event: WebhookEventType;
  timestamp: string;
  data: WebhookEventData;
}
