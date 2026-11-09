import path from 'node:path';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import { API_BASE } from '@p1/shared';
import type { Config } from './config';
import { healthRoutes } from './routes/health';

function loggerOptions(config: Config): FastifyServerOptions['logger'] {
  if (config.NODE_ENV === 'development') {
    return { level: config.LOG_LEVEL, transport: { target: 'pino-pretty' } };
  }
  return { level: config.LOG_LEVEL };
}

export async function buildServer(config: Config): Promise<FastifyInstance> {
  const app = Fastify({ logger: loggerOptions(config) });

  await app.register(helmet, {
    contentSecurityPolicy: {
      // HTTPS is enforced by the reverse proxy; upgrading here breaks plain-HTTP LAN testing.
      directives: { 'upgrade-insecure-requests': null },
    },
  });
  await app.register(healthRoutes, { prefix: API_BASE });

  if (config.NODE_ENV === 'production') {
    await app.register(fastifyStatic, {
      root: path.resolve(config.WEB_DIST),
      setHeaders(reply, filePath) {
        // Vite puts content-hashed files in assets/; everything else must be revalidated.
        const immutable = filePath.includes(`${path.sep}assets${path.sep}`);
        reply.header(
          'Cache-Control',
          immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
        );
      },
    });

    // SPA fallback: client-side routes get index.html; API routes keep a JSON 404.
    app.setNotFoundHandler((request, reply) => {
      if (request.method !== 'GET' || request.url.startsWith(API_BASE)) {
        return reply.code(404).send({ error: 'not_found' });
      }
      return reply.header('Cache-Control', 'no-cache').sendFile('index.html');
    });
  }

  return app;
}
