import { useMutation } from '@tanstack/react-query';
import { loginUseCase } from '../../application/use-cases/loginUseCase';
import type { LoginCredentials } from '../../domain/repositories/AuthRepository';
import type { User } from '../../domain/entities/User';
import { HttpAuthRepository } from '../../infrastructure/repositories/HttpAuthRepository';
import { useAuthStore } from '../store/authStore';

const repository = new HttpAuthRepository();

export const useLoginMutation = () => {
  const setUser = useAuthStore((state: { setUser: (user: User | null) => void }) => state.setUser);

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => loginUseCase(repository, credentials),
    onSuccess: (user: User) => {
      setUser(user);
    },
  });
};

