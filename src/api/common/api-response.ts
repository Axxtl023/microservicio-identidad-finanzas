import type { PaginationMeta } from '../../common/pagination.types';
export type { PaginationMeta };

export class ApiResponse<T> {
  readonly success: boolean;
  readonly data: T | null;
  readonly message: string;
  readonly meta: PaginationMeta | null;

  private constructor(
    success: boolean,
    data: T | null,
    message: string,
    meta: PaginationMeta | null = null,
  ) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.meta = meta;
  }

  static ok<T>(data: T, message = 'OK'): ApiResponse<T> {
    return new ApiResponse(true, data, message);
  }

  static paginated<T>(data: T[], meta: PaginationMeta, message = 'OK'): ApiResponse<T[]> {
    return new ApiResponse(true, data, message, meta);
  }

  static fail<T>(message: string): ApiResponse<T> {
    return new ApiResponse<T>(false, null, message);
  }
}
