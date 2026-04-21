#!/usr/bin/env node

const fs = require('node:fs');
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

function resolveBaseUrl() {
  const configured =
    normalize(process.env.SMOKE_BASE_URL) ||
    normalize(process.env.SERVER_BASE_URL);

  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  const port = normalize(process.env.PORT, '3000');
  return `http://127.0.0.1:${port}`;
}

function resolveSmokeCode() {
  const explicit = normalize(process.env.SMOKE_AUTH_CODE);
  if (explicit) {
    return explicit;
  }

  const nodeEnv = normalize(process.env.NODE_ENV, 'development').toLowerCase();
  if (nodeEnv !== 'production') {
    return normalize(process.env.AUTH_FIXED_CODE, '123456');
  }

  return '';
}

async function request(method, pathName, body, accessToken) {
  const baseUrl = resolveBaseUrl();
  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${method} ${pathName} failed with HTTP ${response.status}: ${text}`);
  }

  if (!payload || payload.code !== 0) {
    throw new Error(`${method} ${pathName} returned unexpected payload: ${text}`);
  }

  return payload.data;
}

async function main() {
  const code = resolveSmokeCode();
  if (!/^\d{6}$/.test(code)) {
    throw new Error(
      'Smoke auth code is unavailable. Set SMOKE_AUTH_CODE=6digit, or in non-production keep AUTH_FIXED_CODE.',
    );
  }

  const phone = normalize(process.env.SMOKE_PHONE, '13900001061');
  const deviceId = normalize(
    process.env.SMOKE_DEVICE_ID,
    `round4-smoke-${Date.now()}`,
  );
  const countryCode = normalize(process.env.SMOKE_COUNTRY_CODE, 'CN');

  console.log(`[step] send-code ${phone}`);
  await request('POST', '/api/v1/auth/send-code', { phone });

  console.log('[step] login');
  const loginData = await request('POST', '/api/v1/auth/login', {
    phone,
    code,
    deviceId,
  });

  console.log('[step] me');
  const meData = await request('GET', '/api/v1/auth/me', undefined, loginData.accessToken);

  console.log('[step] dial-prefixes');
  await request(
    'GET',
    `/api/v1/config/dial-prefixes?countryCode=${encodeURIComponent(countryCode)}`,
    undefined,
    loginData.accessToken,
  );

  console.log('[step] notices');
  await request('GET', '/api/v1/config/notices', undefined, loginData.accessToken);

  console.log('[step] refresh');
  const refreshData = await request('POST', '/api/v1/auth/refresh', {
    refreshToken: loginData.refreshToken,
    deviceId,
  });

  console.log('[step] logout');
  await request(
    'POST',
    '/api/v1/auth/logout',
    { refreshToken: refreshData.refreshToken },
    refreshData.accessToken,
  );

  console.log(`[ok] Minimal smoke passed for ${meData.phone} via ${resolveBaseUrl()}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
