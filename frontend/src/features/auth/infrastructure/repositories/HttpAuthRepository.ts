import { ApiError, apiRequest } from '../../../../api/client';
import { AuthError } from '../../domain/errors/AuthError';
import type {
  AuthRepository,
  LoginCredentials,
} from '../../domain/repositories/AuthRepository';
import type { User } from '../../domain/entities/User';
import type { LoginResponseDto } from '../dto/AuthDtos';
import { toLoginRequestDto, toUser } from '../mappers/authMapper';
import { useAuthStore } from '../../presentation/store/authStore';

const mapApiErrorToAuthError = (error: ApiError): AuthError => {
  if (error.status === 401) {
    return new AuthError('invalid_credentials', 'Credenciales inválidas', error.details);
  }

  if (error.status === 403) {
    return new AuthError('unauthorized', 'No autorizado', error.details);
  }

  if (error.status >= 500) {
    return new AuthError('network_error', 'Error de red o servidor', error.details);
  }

  return new AuthError('unknown_error', error.message, error.details);
};

export class HttpAuthRepository implements AuthRepository {
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const payload = await apiRequest<LoginResponseDto, ReturnType<typeof toLoginRequestDto>>(
        '/auth/login',
        {
          method: 'POST',
          body: toLoginRequestDto(credentials),
        },
      );

      const user = toUser(payload);
      useAuthStore.getState().setAuth(user, payload.access_token);
      return user;
    } catch (error) {
      if (error instanceof ApiError) {
        throw mapApiErrorToAuthError(error);
      }

      throw new AuthError('unknown_error', 'Error inesperado en autenticación', error);
    }
  }
}
