import type { User } from '../../domain/entities/User';
import type { AuthRepository, RegisterUserData } from '../../domain/repositories/AuthRepository';

export const registerUseCase = async (
  repository: AuthRepository,
  data: RegisterUserData,
): Promise<User> => {
  return repository.register(data);
};


