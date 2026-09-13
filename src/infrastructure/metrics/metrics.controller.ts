import { Request, Response, Router } from 'express';
import { register } from 'prom-client';
import { ResponseEnvelope } from '@api/response-envelope';

/**
 * Sets the prometheus content type and then hands the scrape text to the same
 * envelope every other handler uses. The result is the oddity the original
 * shipped with: a JSON body served as `text/plain; version=0.0.4`, with the
 * metrics sitting in `message` because the envelope collapses strings.
 */
export class MetricsController {
  readonly router: Router = Router();

  constructor(private readonly envelope: ResponseEnvelope) {
    this.router.get('/', this.index);
  }

  private index = async (req: Request, res: Response): Promise<void> => {
    res.header('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.status(200).json(this.envelope.wrap(metrics, req));
  };
}
