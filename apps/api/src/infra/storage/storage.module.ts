import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * Infrastructure module (lives in `src/infra/`, not `src/modules/`):
 * `StorageService` signs upload URLs, it does not own a domain aggregate or
 * emit domain events, so it does not belong under `modules/`. Exported so
 * `ProjectsModule` (via `UploadsController`) can inject it.
 */
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
