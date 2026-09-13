import {
  SuccessResponseDto,
  ErrorResponseDto,
  PaginatedResponseDto,
  PaginationMeta,
  ApiResponse,
} from '@api/dto/common/api-response.dto';

/**
 * The slice of a request this layer needs. Structural on purpose: the
 * application layer stays free of express while an express `Request` still
 * satisfies it.
 */
export interface RequestContext {
  path: string;
  method: string;
  originalUrl?: string;
}

/**
 * Inside a mounted router express rewrites `req.url`, so `req.path` is relative
 * to the mount point. `originalUrl` is the client-visible path; the query
 * string is cut because the envelope never carried it.
 */
const requestPath = (req: RequestContext): string => {
  if (typeof req.originalUrl !== 'string') {
    return req.path;
  }
  const queryStart = req.originalUrl.indexOf('?');
  return queryStart === -1
    ? req.originalUrl
    : req.originalUrl.slice(0, queryStart);
};

export class ResponseService {
  /**
   * Create a successful response
   */
  success<T>(message: string, data?: T): SuccessResponseDto<T> {
    return new SuccessResponseDto(message, data);
  }

  /**
   * Create an error response
   */
  error(message: string, code: string, details?: any): ErrorResponseDto {
    return new ErrorResponseDto(message, code, details);
  }

  /**
   * Create a paginated response
   */
  paginated<T>(
    message: string,
    data: T[],
    page: number,
    limit: number,
    total: number,
  ): PaginatedResponseDto<T> {
    const totalPages = Math.ceil(total / limit);
    const pagination: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return new PaginatedResponseDto(message, data, pagination);
  }

  /**
   * Create response with request context
   */
  withRequest<T>(response: ApiResponse<T>, req: RequestContext): ApiResponse<T> {
    response.path = requestPath(req);
    response.method = req.method;
    return response;
  }

  /**
   * Common success responses
   */
  created<T>(
    data?: T,
    message = 'Resource created successfully',
  ): SuccessResponseDto<T> {
    return this.success(message, data);
  }

  updated<T>(
    data?: T,
    message = 'Resource updated successfully',
  ): SuccessResponseDto<T> {
    return this.success(message, data);
  }

  deleted(message = 'Resource deleted successfully'): SuccessResponseDto {
    return this.success(message);
  }

  retrieved<T>(
    data: T,
    message = 'Resource retrieved successfully',
  ): SuccessResponseDto<T> {
    return this.success(message, data);
  }

  /**
   * Common error responses
   */
  notFound(
    message = 'Resource not found',
    code = 'NOT_FOUND',
  ): ErrorResponseDto {
    return this.error(message, code);
  }

  unauthorized(
    message = 'Unauthorized access',
    code = 'AUTHENTICATION_ERROR',
  ): ErrorResponseDto {
    return this.error(message, code);
  }

  forbidden(
    message = 'Access forbidden',
    code = 'AUTHORIZATION_ERROR',
  ): ErrorResponseDto {
    return this.error(message, code);
  }

  badRequest(
    message = 'Bad request',
    code = 'BAD_REQUEST',
    details?: any,
  ): ErrorResponseDto {
    return this.error(message, code, details);
  }

  validationError(
    details: any,
    message = 'Validation failed',
  ): ErrorResponseDto {
    return this.error(message, 'VALIDATION_ERROR', details);
  }

  internalError(
    message = 'Internal server error',
    code = 'INTERNAL_ERROR',
  ): ErrorResponseDto {
    return this.error(message, code);
  }
}
