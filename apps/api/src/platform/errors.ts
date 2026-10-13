/** Errors the domain is allowed to raise. The HTTP layer maps them with ts-pattern. */
export class NotFoundError extends Error {
  readonly kind = 'not_found' as const
}

export class NotReadyError extends Error {
  readonly kind = 'not_ready' as const
}

export type DomainError = NotFoundError | NotReadyError

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof NotFoundError || error instanceof NotReadyError
}
