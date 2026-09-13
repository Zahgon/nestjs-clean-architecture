import { Request, Response, Router } from 'express';
import { ResponseEnvelope } from '@api/response-envelope';
import { TerminusOptionsService } from '@infrastructure/health/terminus-options.check';

export class HealthController {
  readonly router: Router = Router();

  constructor(
    private readonly terminusOptionsService: TerminusOptionsService,
    private readonly envelope: ResponseEnvelope,
  ) {
    this.router.get('/', this.check);
  }

  private check = async (req: Request, res: Response): Promise<void> => {
    const result = await this.terminusOptionsService.check();
    res.status(200).json(this.envelope.wrap(result, req));
  };
}
