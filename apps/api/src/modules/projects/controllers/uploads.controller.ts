import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { SignedUpload } from '@oneimpact/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { StorageService } from '../../../infra/storage/storage.service';
import { SignedUploadDto } from './dto/signed-upload.dto';
import { UploadSignDto } from './dto/upload-sign.dto';

/**
 * `@Controller('uploads')` -> mounted under the global `v1` prefix set in
 * `main.ts`, so the real path is `/v1/uploads/sign`. Do NOT prefix the
 * decorator with `/v1`.
 *
 * Class-level `@Roles('ADMIN')`: only admins publish project covers/media, so
 * only admins may request a signed upload URL. No `@Public()` anywhere;
 * `JwtAuthGuard` (global) rejects an unauthenticated request with 401 before
 * `RolesGuard` runs.
 *
 * Thin controller: delegates to `StorageService` (`src/infra/storage`),
 * never touches `PrismaService` or any storage SDK directly. See
 * `StorageService` for the `simulated: true` fallback (decision D6) when
 * Supabase credentials are not configured.
 */
@ApiTags('uploads')
@Roles('ADMIN')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post('sign')
  @ApiCreatedResponse({ type: SignedUploadDto })
  @ApiResponse({ status: 403, description: 'El usuario autenticado no es ADMIN.' })
  sign(@Body() body: UploadSignDto): Promise<SignedUpload> {
    return this.storage.signUpload(body);
  }
}
