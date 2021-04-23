export interface PaginatedResponse<T> {
  next: boolean;
  limit: number;
  total: number;
  after: string;
  data: Array<T>;
}
