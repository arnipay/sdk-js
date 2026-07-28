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
  is_paid: boolean;
  source?: string;
}
