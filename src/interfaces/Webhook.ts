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
  | 'payment.failed'
  | 'payment.pending'
  | 'pending_refund'
  | 'auto_refunded'
  | string;

export interface WebhookEventPayload {
  event: WebhookEventType;
  timestamp: string;
  data: WebhookEventData;
}
