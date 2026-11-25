import { INestApplication, ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded, Request, Response, NextFunction } from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Application } from 'express';
import { HttpMetrics } from './observability';

function traceIdFor(parent: string | undefined) {
  const parsed = parent?.match(
    /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/,
  );
  if (parsed && /[^0]/.test(parsed[1]) && /[^0]/.test(parsed[2]))
    return parsed[1];
  return randomBytes(16).toString('hex');
}
export function configureApp(app: INestApplication) {
  const config = app.get(ConfigService),
    logger = new Logger('HTTP');
  const metrics = app.get(HttpMetrics);
  app.setGlobalPrefix('api');
  const proxies = config.get<string[]>('TRUSTED_PROXIES', []);
  if (proxies.length) {
    const express = app.getHttpAdapter().getInstance() as Application;
    express.set('trust proxy', proxies);
  }
  app.enableShutdownHooks();
  app.use(helmet());
  app.enableCors({
    origin: config.get<string>('CORS_ORIGINS', '').split(',').filter(Boolean),
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'Range',
      'traceparent',
    ],
    exposedHeaders: [
      'X-Request-Id',
      'X-Trace-Id',
      'Accept-Ranges',
      'Content-Range',
      'ETag',
      'Retry-After',
      'WWW-Authenticate',
    ],
  });
  app.use(
    (
      req: Request & { requestId?: string },
      res: Response,
      next: NextFunction,
    ) => {
      req.requestId = randomUUID();
      const traceId = traceIdFor(req.get('traceparent'));
      res.setHeader('X-Request-Id', req.requestId);
      res.setHeader('X-Trace-Id', traceId);
      res.setHeader('Cache-Control', 'no-store');
      const start = performance.now();
      res.on('finish', () => {
        const route =
          (req.route as { path?: string } | undefined)?.path ?? 'unmatched';
        const durationMs = performance.now() - start;
        if (route !== '/api/ops/metrics')
          metrics.observe(req.method, route, res.statusCode, durationMs / 1000);
        logger.log({
          requestId: req.requestId,
          traceId,
          method: req.method,
          path: route,
          status: res.statusCode,
          durationMs: Math.round(durationMs),
        });
      });
      next();
    },
  );
  app.use(json({ limit: '256kb' }));
  app.use(urlencoded({ extended: false, limit: '256kb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validationError: { target: false, value: false },
    }),
  );
  if (config.get<string>('NODE_ENV') !== 'production') {
    const options = new DocumentBuilder()
      .setTitle('LexiMind API')
      .setDescription(
        'Bearer sessions. Register and login, then use the access token.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addSecurityRequirements('bearer')
      .build();
    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, options),
    );
  }
}
