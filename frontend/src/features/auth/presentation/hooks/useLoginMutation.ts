import { useMutation } from '@tanstack/react-query';
import { loginUseCase } from '../../application/use-cases/loginUseCase';
import type { LoginCredentials } from '../../domain/repositories/AuthRepository';
import { HttpAuthRepository } from '../../infrastructure/repositories/HttpAuthRepository';

const repository = new HttpAuthRepository();

export const useLoginMutation = () => {
  return useMutation({
    mutationFn: (credentials: LoginCredentials) => loginUseCase(repository, credentials),
  });
};
