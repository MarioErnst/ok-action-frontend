import type { User } from '../../domain/entities/User';
import type {
  AuthRepository,
  LoginCredentials,
} from '../../domain/repositories/AuthRepository';

export const loginUseCase = async (
  repository: AuthRepository,
  credentials: LoginCredentials,
): Promise<User> => {
  return repository.login(credentials);
};

