import { useMutation } from '@tanstack/react-query';
import { socialLoginUseCase } from '../../application/use-cases/socialLoginUseCase';
import type { SocialLoginData } from '../../domain/repositories/AuthRepository';
import { HttpAuthRepository } from '../../infrastructure/repositories/HttpAuthRepository';

const repository = new HttpAuthRepository();

type SocialLoginOptions = {
  onSuccess?: () => void;
};

export const useSocialLoginMutation = (options?: SocialLoginOptions) => {
  return useMutation({
    mutationFn: (data: SocialLoginData) => socialLoginUseCase(repository, data),
    onSuccess: () => {
      options?.onSuccess?.();
    },
  });
};
