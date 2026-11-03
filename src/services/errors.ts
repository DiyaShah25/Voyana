export type ServiceError = Error & { status?: number; statusCode?: number; latencyMs?: number };

export function toError(value: unknown): ServiceError {
  return value instanceof Error ? value as ServiceError : new Error(String(value));
}
