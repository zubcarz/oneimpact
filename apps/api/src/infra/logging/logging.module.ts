import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { LoggerModule } from 'nestjs-pino';
import type { IncomingMessage } from 'node:http';

/**
 * Structured request logging via `nestjs-pino`. Wired into the global Nest
 * logger in `main.ts` (`app.useLogger(app.get(Logger))`), replacing Nest's
 * default console logger for every module -- the plain `new Logger(ClassName)`
 * call sites already scattered through the domain modules (listeners,
 * `OutboxRelay`, etc.) keep working unchanged, since `useLogger` only swaps
 * what backs them.
 *
 * Deliberately NOT wired into `test/utils/create-test-app.ts` (plan decision
 * D7, `.claude/plans/20260824-api-dashboard-metrics-and-outbox.plan.md`): e2e
 * specs keep Nest's quieter built-in logger instead of drowning the suite
 * output in pino JSON. The `NODE_ENV === 'test'` -> `silent` level below is a
 * second, independent safety net in case `useLogger` is ever wired into a
 * test context later.
 */
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const nodeEnv = config.get<string>('NODE_ENV', 'development');
        return {
          pinoHttp: {
            level: nodeEnv === 'test' ? 'silent' : nodeEnv === 'production' ? 'info' : 'debug',
            // Fall back to a fresh id only when nothing upstream (e.g. a
            // proxy) already tagged the request -- never log the JWT itself.
            genReqId: (req: IncomingMessage) => {
              const incoming = req.headers['x-request-id'];
              return typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
            },
            // The access/refresh JWT must never reach a log line -- see
            // `.claude/rules/00-base-rules.md` #5 and `payments`' "no PAN in
            // logs" invariant, same principle applied to auth headers.
            redact: ['req.headers.authorization'],
          },
        };
      },
    }),
  ],
  exports: [LoggerModule],
})
export class LoggingModule {}
