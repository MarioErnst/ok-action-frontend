import { useMutation } from '@tanstack/react-query';
import { forgotPasswordUseCase } from '../../application/use-cases/forgotPasswordUseCase';
import { HttpAuthRepository } from '../../infrastructure/repositories/HttpAuthRepository';
const repository = new HttpAuthRepository();

type ForgotPasswordOptions = {
  onSuccess?: () => void;
};

export const useForgotPasswordMutation = (options?: ForgotPasswordOptions) => {
  return useMutation({
    mutationFn: (email: string) => forgotPasswordUseCase(repository, email),
    onSuccess: () => {
      options?.onSuccess?.();
    },
  });
};
