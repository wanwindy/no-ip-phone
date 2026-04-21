#!/usr/bin/env node

const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { config } = require('dotenv');

const envFile = process.env.ENV_FILE
  ? path.resolve(process.cwd(), process.env.ENV_FILE)
  : path.resolve(process.cwd(), '.env');

if (fs.existsSync(envFile)) {
  config({ path: envFile });
}

function normalize(value, fallback = '') {
  return value && typeof value === 'string' ? value.trim() : fallback;
}

function resolveRedisEndpoint(env) {
  const redisUrl = normalize(env.REDIS_URL);
  if (redisUrl) {
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || (parsed.protocol === 'rediss:' ? 6380 : 6379)),
      protocol: parsed.protocol,
      via: 'REDIS_URL',
    };
  }

  const host = normalize(env.REDIS_HOST);
  const port = Number(env.REDIS_PORT);
  if (!host || !Number.isInteger(port) || port <= 0) {
    return null;
  }

  return {
    host,
    port,
    protocol: 'redis:',
    via: 'REDIS_HOST/REDIS_PORT',
  };
}

function validateReleaseEnv(env) {
  const errors = [];
  const warnings = [];
  const nodeEnv = normalize(env.NODE_ENV, 'development').toLowerCase();
  const driver = normalize(env.RATE_LIMIT_DRIVER, 'memory').toLowerCase();
  const fallbackRaw = normalize(env.RATE_LIMIT_ALLOW_FALLBACK);
  const smsProvider = normalize(env.SMS_PROVIDER, 'noop').toLowerCase();
  const endpoint = resolveRedisEndpoint(env);
  const supportedSmsProviders = ['noop', 'aliyun', 'tencent'];

  if (nodeEnv !== 'production') {
    errors.push('NODE_ENV must be production for release/pre-release validation.');
  }

  if (driver !== 'redis') {
    errors.push('RATE_LIMIT_DRIVER must be redis.');
  }

  if (fallbackRaw !== 'false') {
    errors.push('RATE_LIMIT_ALLOW_FALLBACK must be explicitly set to false.');
  }

  if (!endpoint) {
    errors.push('Provide REDIS_URL or both REDIS_HOST and REDIS_PORT.');
  } else if (endpoint.protocol === 'rediss:') {
    warnings.push('REDIS_URL uses rediss://, TCP ping is skipped. Validate network reachability separately.');
  }

  if (!supportedSmsProviders.includes(smsProvider)) {
    errors.push(
      `SMS_PROVIDER must be one of: ${supportedSmsProviders.join(', ')}.`,
    );
  } else if (smsProvider === 'noop') {
    errors.push('SMS_PROVIDER must point to a real SMS provider. noop is local-only and cannot be used for release validation.');
  } else {
    errors.push(
      `SMS provider "${smsProvider}" is not implemented in the current build. Integrate it before release validation can pass.`,
    );
  }

  return { errors, warnings, endpoint };
}

function pingRedis(endpoint) {
  if (!endpoint || endpoint.protocol === 'rediss:') {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: endpoint.host,
      port: endpoint.port,
    });

    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`timeout after 2000ms while connecting to ${endpoint.host}:${endpoint.port}`));
    }, 2000);

    socket.once('connect', () => {
      clearTimeout(timeout);
      socket.end();
      resolve();
    });

    socket.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function main() {
  const { errors, warnings, endpoint } = validateReleaseEnv(process.env);

  if (warnings.length > 0) {
    for (const warning of warnings) {
      console.warn(`[warn] ${warning}`);
    }
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`[error] ${error}`);
    }
    process.exit(1);
  }

  try {
    await pingRedis(endpoint);
  } catch (error) {
    console.error(
      `[error] Redis connectivity check failed via ${endpoint.via}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    process.exit(1);
  }

  console.log(
    `[ok] Release preflight passed with Redis ${endpoint.host}:${endpoint.port} via ${endpoint.via}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
