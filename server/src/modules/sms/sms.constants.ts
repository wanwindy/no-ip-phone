export const SMS_PROVIDER_NOOP = 'noop';
export const SMS_PROVIDER_ALIYUN = 'aliyun';
export const SMS_PROVIDER_TENCENT = 'tencent';

export const SUPPORTED_SMS_PROVIDER_NAMES = [
  SMS_PROVIDER_NOOP,
  SMS_PROVIDER_ALIYUN,
  SMS_PROVIDER_TENCENT,
] as const;

export const IMPLEMENTED_SMS_PROVIDER_NAMES = [SMS_PROVIDER_NOOP] as const;

export function normalizeSmsProvider(value?: string): string {
  return value?.trim().toLowerCase() || SMS_PROVIDER_NOOP;
}

export function resolveSmsProviderName(value?: string): string {
  const provider = normalizeSmsProvider(value);

  if ((SUPPORTED_SMS_PROVIDER_NAMES as readonly string[]).includes(provider)) {
    return provider;
  }

  throw new Error(
    `Unknown SMS provider "${provider}". Supported values: ${SUPPORTED_SMS_PROVIDER_NAMES.join(', ')}.`,
  );
}

export function isImplementedSmsProvider(value?: string): boolean {
  const provider = resolveSmsProviderName(value);
  return (IMPLEMENTED_SMS_PROVIDER_NAMES as readonly string[]).includes(provider);
}

export function isNoopSmsProvider(value?: string): boolean {
  return resolveSmsProviderName(value) === SMS_PROVIDER_NOOP;
}
