import { ApiResponse } from '@api/dto/common/api-response.dto';
import { RequestContext, ResponseService } from '@application/services/response.service';

/**
 * Wraps whatever a handler produced into the success envelope. The branch order
 * is load bearing: a value carrying its own `message` is passed through, and a
 * string collapses into `message` with no `data` key at all - which is why
 * /api/v1/metrics answers with the prometheus text in `message`.
 */
export class ResponseEnvelope {
  constructor(private readonly responseService: ResponseService) {}

  wrap(data: unknown, req: RequestContext): ApiResponse {
    if (data && typeof data === 'object' && 'message' in data) {
      return this.responseService.withRequest(data as ApiResponse, req);
    }

    if (data === null || data === undefined) {
      return this.responseService.withRequest(
        this.responseService.success('Operation completed successfully'),
        req,
      );
    }

    if (typeof data === 'string') {
      return this.responseService.withRequest(
        this.responseService.success(data),
        req,
      );
    }

    if (typeof data === 'object' && 'access_token' in data) {
      return this.responseService.withRequest(
        this.responseService.success('Authentication successful', data),
        req,
      );
    }

    return this.responseService.withRequest(
      this.responseService.success('Operation completed successfully', data),
      req,
    );
  }
}
