export type AuthErrorCode =
  | 'invalid_credentials'
  | 'unauthorized'
  | 'network_error'
  | 'unknown_error'
  | 'user_not_found';

export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

