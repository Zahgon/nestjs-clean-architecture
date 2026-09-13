import { Request, Response, Router } from 'express';
import { executionTimeMiddleware } from '@api/middleware/execution-time.middleware';
import { ResponseEnvelope } from '@api/response-envelope';
import { LoggerService } from '@application/services/logger.service';
import { ResponseService } from '@application/services/response.service';

export class HelloController {
  readonly router: Router = Router();

  constructor(
    private readonly logger: LoggerService,
    private readonly responseService: ResponseService,
    private readonly envelope: ResponseEnvelope,
  ) {
    this.router.use(executionTimeMiddleware);
    this.router.get('/', this.get);
  }

  private get = (req: Request, res: Response): void => {
    this.logger.logger('Hello World!', { module: 'HelloController', method: 'get' });
    const body = this.responseService.success('Hello World!', 'Hello World!');
    res.status(200).json(this.envelope.wrap(body, req));
  };
}
