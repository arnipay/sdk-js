export interface PaymentLinkOptions {
  description?: string;
  stock?: number;
  quantity?: number;
  image?: string;
  payment_methods?: string[];
  reference?: string;
  start_date?: string;
  expiration_date?: string;
  approved_redirection_url?: string;
  failed_redirection_url?: string;
  process_redirection_url?: string;
  [key: string]: unknown;
}

export interface PaymentLinkCreateParams extends PaymentLinkOptions {
  price: number;
  title: string;
}

export interface PaymentLinkResponse {
  id: string;
  url: string;
  commerce_id: number;
  title: string;
  price: number;
  description?: string;
  enabled: boolean;
  payment_methods?: string[];
  reference?: string;
  stock?: number | null;
  quantity?: number | null;
  start_date?: string | null;
  expiration_date?: string | null;
  created_at: string;
  updated_at?: string;
  /**
   * True only while a payment on the link is still `paid`.
   * A refund sets this back to false; use `status` to tell that apart from a link that was never paid.
   */
  is_paid: boolean;
  /**
   * Latest payment status, or null when the link has no payment.
   * Present on GET and list. Omitted on create.
   * Refund values are `refunded`, `auto_refunded`, and `pending_refund`.
   */
  status?: string | null;
  source?: string;
}
