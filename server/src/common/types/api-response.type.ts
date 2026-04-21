import { ErrorCode } from '../constants/error-codes';

export interface ApiResponse<T = unknown> {
  code: ErrorCode;
  message: string;
  data: T | null;
}
