import { useMutation } from '@tanstack/react-query';
import { loginUseCase } from '../../application/use-cases/loginUseCase';
import type { LoginCredentials } from '../../domain/repositories/AuthRepository';
import { HttpAuthRepository } from '../../infrastructure/repositories/HttpAuthRepository';
import type { User } from '../../domain/entities/User';

type UseLoginMutationOptions = {
  onSuccess?: (user: User) => void
}

const repository = new HttpAuthRepository();

export const useLoginMutation = (options?: UseLoginMutationOptions) => {
  return useMutation({
    mutationFn: (credentials: LoginCredentials) => loginUseCase(repository, credentials),
    onSuccess: options?.onSuccess,
  });
};
