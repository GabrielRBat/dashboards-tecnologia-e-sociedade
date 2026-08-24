import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { carregarAmbiente } from './config/ambiente';

carregarAmbiente();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:3000',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const porta = Number(process.env.API_PORT ?? 3333);
  await app.listen(porta);
  // eslint-disable-next-line no-console
  console.log(`API de argamassas ouvindo em http://localhost:${porta}/api`);
}

void bootstrap();
