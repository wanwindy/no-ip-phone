"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMPLEMENTED_SMS_PROVIDER_NAMES = exports.SUPPORTED_SMS_PROVIDER_NAMES = exports.SMS_PROVIDER_TENCENT = exports.SMS_PROVIDER_ALIYUN = exports.SMS_PROVIDER_NOOP = void 0;
exports.normalizeSmsProvider = normalizeSmsProvider;
exports.resolveSmsProviderName = resolveSmsProviderName;
exports.isImplementedSmsProvider = isImplementedSmsProvider;
exports.isNoopSmsProvider = isNoopSmsProvider;
exports.SMS_PROVIDER_NOOP = 'noop';
exports.SMS_PROVIDER_ALIYUN = 'aliyun';
exports.SMS_PROVIDER_TENCENT = 'tencent';
exports.SUPPORTED_SMS_PROVIDER_NAMES = [
    exports.SMS_PROVIDER_NOOP,
    exports.SMS_PROVIDER_ALIYUN,
    exports.SMS_PROVIDER_TENCENT,
];
exports.IMPLEMENTED_SMS_PROVIDER_NAMES = [exports.SMS_PROVIDER_NOOP];
function normalizeSmsProvider(value) {
    return value?.trim().toLowerCase() || exports.SMS_PROVIDER_NOOP;
}
function resolveSmsProviderName(value) {
    const provider = normalizeSmsProvider(value);
    if (exports.SUPPORTED_SMS_PROVIDER_NAMES.includes(provider)) {
        return provider;
    }
    throw new Error(`Unknown SMS provider "${provider}". Supported values: ${exports.SUPPORTED_SMS_PROVIDER_NAMES.join(', ')}.`);
}
function isImplementedSmsProvider(value) {
    const provider = resolveSmsProviderName(value);
    return exports.IMPLEMENTED_SMS_PROVIDER_NAMES.includes(provider);
}
function isNoopSmsProvider(value) {
    return resolveSmsProviderName(value) === exports.SMS_PROVIDER_NOOP;
}
