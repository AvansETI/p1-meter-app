import path from 'node:path';
import Fastify, { type FastifyError } from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { API_BASE, type ErrorResponse } from '@p1/shared';
import type { Config } from './config';
import { CapabilityService } from './data/capabilities';
import { FakeDataSource } from './data/fake';
import { InfluxDataSource } from './data/influx';
import type { HouseholdDataSource } from './data/source';
import { loggerOptions } from './logging';
import { healthRoutes } from './routes/health';
import { HistoryService } from './history/service';
import { historyRoutes } from './routes/history';
import { backupDaily, openDatabase } from './db/database';
import { TariffRepository } from './db/tariffs';
import { liveRoutes } from './routes/live';
import { CostService } from './costs/service';
import { CostViews } from './costs/views';
import { CostCache } from './db/costs';
import { costRoutes } from './routes/costs';
import { TARIFF_WRITES_PER_HOUR, tariffRoutes } from './routes/tariffs';
import { PriceJob, httpFetchers } from './prices/job';
import { InfluxPriceStore, type PriceReader } from './prices/store';
import { sessionRoutes } from './routes/session';
import { LivePoller } from './live/poller';
import { LiveService } from './live/service';
import { AttemptCounter, SessionStore } from './sessions';

const HOUR_MS = 60 * 60 * 1000;

/** Maps TRUST_PROXY onto Fastify: a hop count becomes a function, a list becomes an array. */
function trustProxy(
  value: Config['TRUST_PROXY'],
): boolean | string | string[] | ((address: string, hop: number) => boolean) {
  if (typeof value === 'number') return (_address, hop) => hop < value;
  if (typeof value === 'string' && value.includes(','))
    return value.split(',').map((part) => part.trim());
  return value;
}

export interface ServerDeps {
  source?: HouseholdDataSource;
  /** Price reader for the cost engine; from PRICES_INFLUX_* otherwise. */
  prices?: PriceReader;
  /** Overrides for tests. */
  pollIntervalMs?: number;
  heartbeatMs?: number;
}

function createSource(config: Config): HouseholdDataSource {
  const { INFLUX_URL, INFLUX_ORG, INFLUX_BUCKET, INFLUX_TOKEN, INFLUX_TIMEOUT_MS } = config;
  if (INFLUX_URL && INFLUX_ORG && INFLUX_BUCKET && INFLUX_TOKEN) {
    return new InfluxDataSource({
      url: INFLUX_URL,
      org: INFLUX_ORG,
      bucket: INFLUX_BUCKET,
      token: INFLUX_TOKEN,
      timeoutMs: INFLUX_TIMEOUT_MS,
    });
  }
  // Only reachable in tests: loadConfig() requires InfluxDB settings everywhere else.
  return new FakeDataSource();
}

export async function buildServer(config: Config, deps: ServerDeps = {}) {
  const app = Fastify({
    logger: loggerOptions(config),
    trustProxy: trustProxy(config.TRUST_PROXY),
  });
  const source = deps.source ?? createSource(config);

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error.statusCode === 429) {
      return reply.code(429).send({ error: 'rate_limited' } satisfies ErrorResponse);
    }
    if (error.statusCode === 400) {
      return reply.code(400).send({ error: 'invalid_format' } satisfies ErrorResponse);
    }
    return reply.send(error);
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      // HTTPS is enforced by the reverse proxy; upgrading here breaks plain-HTTP LAN testing.
      directives: { 'upgrade-insecure-requests': null },
    },
  });

  await app.register(rateLimit, {
    max: config.RATE_LIMIT_PER_MINUTE,
    timeWindow: '1 minute',
    // Static files of the web app are not limited; only the API is.
    allowList: (request) => !request.url.startsWith(API_BASE),
    errorResponseBuilder: (_request, context) =>
      Object.assign(new Error('rate_limited'), { statusCode: context.statusCode }),
  });

  const sessions = new SessionStore(config.SESSION_TTL_HOURS * HOUR_MS);
  const capabilities = new CapabilityService(source);
  const live = new LiveService(source);
  const poller = new LivePoller(source, live, app.log, deps.pollIntervalMs);
  app.addHook('onClose', () => poller.stop());

  // App database (tariffs, #36): in memory for tests, a file in DATA_DIR otherwise.
  const db = openDatabase(config.NODE_ENV === 'test' ? ':memory:' : config.DATA_DIR);
  const tariffs = new TariffRepository(db);
  if (config.NODE_ENV !== 'test') {
    const backup = () => {
      try {
        const file = backupDaily(db, config.DATA_DIR);
        if (file) app.log.info({ file }, 'database backup written');
      } catch (error) {
        app.log.error({ err: error }, 'database backup failed');
      }
    };
    backup();
    const backupTimer = setInterval(backup, 60 * 60_000);
    backupTimer.unref();
    app.addHook('onClose', () => clearInterval(backupTimer));
  }
  app.addHook('onClose', () => db.close());

  // Price bucket: read by the cost engine (#42); filled by the price job (#33) only where
  // ENTSOE_TOKEN is set (production). Neither runs in tests.
  let priceJob: PriceJob | undefined;
  let prices = deps.prices;
  const { INFLUX_URL, INFLUX_ORG, PRICES_INFLUX_BUCKET, PRICES_INFLUX_TOKEN, ENTSOE_TOKEN } =
    config;
  if (
    config.NODE_ENV !== 'test' &&
    INFLUX_URL &&
    INFLUX_ORG &&
    PRICES_INFLUX_BUCKET &&
    PRICES_INFLUX_TOKEN
  ) {
    const store = new InfluxPriceStore({
      url: INFLUX_URL,
      org: INFLUX_ORG,
      bucket: PRICES_INFLUX_BUCKET,
      token: PRICES_INFLUX_TOKEN,
    });
    prices = store;
    if (ENTSOE_TOKEN) {
      const job = new PriceJob(store, httpFetchers(ENTSOE_TOKEN), app.log, { pauseMs: 2_000 });
      job.start();
      priceJob = job;
      app.addHook('onClose', () => job.stop());
    } else {
      app.log.info('price job disabled (ENTSOE_TOKEN not set)');
    }
    app.addHook('onClose', () => store.close());
  } else if (config.NODE_ENV !== 'test') {
    app.log.info('prices unavailable (PRICES_INFLUX_* not set)');
  }

  const costs = new CostService(source, prices, tariffs, new CostCache(db));
  const costViews = new CostViews(costs);

  await app.register(
    async (api) => {
      await api.register(healthRoutes, {
        source,
        ...(priceJob && { prices: () => priceJob.status() }),
      });
      await api.register(tariffRoutes, {
        sessions,
        capabilities,
        tariffs,
        writes: new AttemptCounter(HOUR_MS),
        writesPerHour: TARIFF_WRITES_PER_HOUR,
      });
      await api.register(costRoutes, { sessions, capabilities, costs, views: costViews });
      await api.register(historyRoutes, {
        sessions,
        capabilities,
        history: new HistoryService(source),
        costs: costViews,
      });
      await api.register(liveRoutes, {
        sessions,
        capabilities,
        live,
        poller,
        heartbeatMs: deps.heartbeatMs,
      });
      await api.register(sessionRoutes, {
        sessions,
        capabilities,
        failedLookups: new AttemptCounter(HOUR_MS),
        dailyAttempts: new AttemptCounter(24 * HOUR_MS),
        limits: {
          perMinute: config.SESSION_LIMIT_PER_MINUTE,
          perDay: config.SESSION_LIMIT_PER_DAY,
          failedPerHour: config.FAILED_LOOKUPS_PER_HOUR,
        },
      });
    },
    { prefix: API_BASE },
  );

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
