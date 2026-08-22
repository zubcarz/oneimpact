import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({ origin: config.get<string>('CORS_ORIGINS', '').split(',') });
  app.setGlobalPrefix('v1', { exclude: ['health', 'docs'] });

  const swagger = new DocumentBuilder()
    .setTitle('One Impact API')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`API listening on http://localhost:${port} (docs at /docs)`);
}
void bootstrap();
