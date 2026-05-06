import { useMutation } from '@tanstack/react-query';
import { registerUseCase } from '../../application/use-cases/registerUseCase';
import type { RegisterUserData } from '../../domain/repositories/AuthRepository';
import { HttpAuthRepository } from '../../infrastructure/repositories/HttpAuthRepository';

const repository = new HttpAuthRepository();

type RegisterOptions = {
  onSuccess?: () => void;
};

export const useRegisterMutation = (options?: RegisterOptions) => {
  return useMutation({
    mutationFn: (data: RegisterUserData) => registerUseCase(repository, data),
    onSuccess: () => {
      options?.onSuccess?.();
    },
  });
};

