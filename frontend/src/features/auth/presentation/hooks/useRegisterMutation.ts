import { useMutation } from '@tanstack/react-query';
import { registerUseCase } from '../../application/use-cases/registerUseCase';
import type { RegisterUserData } from '../../domain/repositories/AuthRepository';
import type { User } from '../../domain/entities/User';
import { HttpAuthRepository } from '../../infrastructure/repositories/HttpAuthRepository';
import { MockAuthRepository } from '../../infrastructure/repositories/MockAuthRepository';
import { useAuthStore } from '../store/authStore';

const repository = import.meta.env.DEV ? new MockAuthRepository() : new HttpAuthRepository();

export const useRegisterMutation = () => {
  const setUser = useAuthStore((state: { setUser: (user: User | null) => void }) => state.setUser);

  return useMutation({
    mutationFn: (data: RegisterUserData) => registerUseCase(repository, data),
    onSuccess: (user: User) => {
      setUser(user);
    },
  });
};

