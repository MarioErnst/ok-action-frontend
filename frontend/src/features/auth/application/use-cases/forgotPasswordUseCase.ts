import type { AuthRepository } from '../../domain/repositories/AuthRepository';

export const forgotPasswordUseCase = async (
  repository: AuthRepository,
  email: string,
): Promise<void> => {
  return repository.forgotPassword(email);
};
