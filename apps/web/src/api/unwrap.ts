import type { ApiErrorCode } from '@p1/shared';
import type { ApiResult } from './client';

/** Error carrying the API error code, for TanStack Query's error state. */
export class ApiError extends Error {
  constructor(readonly code: ApiErrorCode) {
    super(code);
    this.name = 'ApiError';
  }
}

export async function unwrap<T>(result: Promise<ApiResult<T>>): Promise<T> {
  const value = await result;
  if (!value.ok) throw new ApiError(value.error);
  return value.data;
}
