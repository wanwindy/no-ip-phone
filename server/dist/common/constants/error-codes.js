"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = void 0;
var ErrorCode;
(function (ErrorCode) {
    ErrorCode[ErrorCode["SUCCESS"] = 0] = "SUCCESS";
    ErrorCode[ErrorCode["PHONE_INVALID"] = 40001] = "PHONE_INVALID";
    ErrorCode[ErrorCode["CODE_INVALID"] = 40002] = "CODE_INVALID";
    ErrorCode[ErrorCode["CODE_WRONG"] = 40101] = "CODE_WRONG";
    ErrorCode[ErrorCode["CODE_EXPIRED"] = 40102] = "CODE_EXPIRED";
    ErrorCode[ErrorCode["ACCESS_TOKEN_INVALID"] = 40103] = "ACCESS_TOKEN_INVALID";
    ErrorCode[ErrorCode["REFRESH_TOKEN_INVALID"] = 40104] = "REFRESH_TOKEN_INVALID";
    ErrorCode[ErrorCode["ACCOUNT_BANNED"] = 40301] = "ACCOUNT_BANNED";
    ErrorCode[ErrorCode["SMS_SEND_TOO_FREQUENT"] = 42901] = "SMS_SEND_TOO_FREQUENT";
    ErrorCode[ErrorCode["CODE_FAILED_TOO_MANY"] = 42902] = "CODE_FAILED_TOO_MANY";
    ErrorCode[ErrorCode["IP_TOO_FREQUENT"] = 42903] = "IP_TOO_FREQUENT";
    ErrorCode[ErrorCode["SMS_SEND_FAILED"] = 50001] = "SMS_SEND_FAILED";
    ErrorCode[ErrorCode["INTERNAL_ERROR"] = 50002] = "INTERNAL_ERROR";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
