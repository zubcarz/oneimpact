import { createZodDto } from 'nestjs-zod';
import { createSubscriptionSchema } from '@oneimpact/shared';

/**
 * Request DTO for `POST /v1/subscriptions`. `createSubscriptionSchema` is
 * `.strict()`: a body whose `card` carries an extra `number`/`pan`/`cvv`
 * field fails validation (400) instead of being silently dropped, which
 * would let the raw PAN reach the server and, potentially, a log line --
 * see `simulatedCardSchema` in `packages/shared/src/schemas/payment.ts`. The
 * server never accepts, stores or forwards the full card number; this is
 * where that invariant is enforced at the HTTP edge.
 */
export class CreateSubscriptionDto extends createZodDto(createSubscriptionSchema) {}
