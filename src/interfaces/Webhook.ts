export interface WebhookEventData {
  link_id: string;
  payment_id: string;
  status: string;
  payment_method?: string;
  amount: number;
  payment_details?: {
    payment_date: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface WebhookEvent {
  event: 'payment.completed' | 'payment.failed' | 'payment.pending';
  timestamp: string;
  data: WebhookEventData;
}
