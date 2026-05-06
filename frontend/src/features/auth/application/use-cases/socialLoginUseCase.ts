import type { User } from '../../domain/entities/User';
import type { AuthRepository, SocialLoginData } from '../../domain/repositories/AuthRepository';

export const socialLoginUseCase = async (
  repository: AuthRepository,
  data: SocialLoginData,
): Promise<User> => {
  return repository.socialLogin(data);
};
