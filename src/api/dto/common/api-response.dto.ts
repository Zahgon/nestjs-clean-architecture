// Base response interface
export interface ApiResponse<T = any> {
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: any;
  };
  timestamp?: string;
  path?: string;
  method?: string;
}

// Success response DTO
export class SuccessResponseDto<T = any> implements ApiResponse<T> {
  message: string;

  data?: T;

  timestamp?: string;

  path?: string;

  method?: string;

  constructor(message: string, data?: T, meta?: any) {
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
    if (meta) {
      this.path = meta.path;
      this.method = meta.method;
    }
  }
}

// Error response DTO
export class ErrorResponseDto implements ApiResponse {
  message: string;

  error: {
    code: string;
    details?: any;
  };

  timestamp?: string;

  path?: string;

  method?: string;

  constructor(message: string, code: string, details?: any, meta?: any) {
    this.message = message;
    this.error = { code, details };
    this.timestamp = new Date().toISOString();
    if (meta) {
      this.path = meta.path;
      this.method = meta.method;
    }
  }
}

// Pagination metadata
export class PaginationMeta {
  page: number;

  limit: number;

  total: number;

  totalPages: number;

  hasNext: boolean;

  hasPrev: boolean;
}

// Paginated response
export class PaginatedResponseDto<T = any> extends SuccessResponseDto<T[]> {
  pagination: PaginationMeta;

  constructor(
    message: string,
    data: T[],
    pagination: PaginationMeta,
    meta?: any,
  ) {
    super(message, data, meta);
    this.pagination = pagination;
  }
}
