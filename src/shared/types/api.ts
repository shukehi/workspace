import type { ApiErrorCode } from '@/shared/constants/api';

export interface ValidationErrorItem {
  field?: string;
  code: string;
  message: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success?: false;
  error?: string;
  code?: ApiErrorCode | string;
  message?: string;
  details?: unknown;
  errors?: ValidationErrorItem[];
}

export type ApiEnvelope<T> = ApiSuccessResponse<T> | T;
