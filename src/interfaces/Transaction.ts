export interface TransactionFilters {
  link_payment_id?: string | number;
  page?: number;
  [key: string]: string | number | undefined | null;
}

export interface TransactionResponse {
  id: string;
  status?: string;
  amount?: number;
  link_payment_id?: string | number;
  payment_method?: string;
  created_at?: string;
  [key: string]: unknown;
}
