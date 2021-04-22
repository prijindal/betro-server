export interface PaginatedResponse<T> {
  next: boolean;
  limit: number;
  total: number;
  after: Date;
  data: Array<T>;
}
