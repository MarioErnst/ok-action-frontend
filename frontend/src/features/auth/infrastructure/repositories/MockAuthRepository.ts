import type {
  AuthRepository,
  LoginCredentials,
  RegisterUserData,
} from '../../domain/repositories/AuthRepository';
import type { User } from '../../domain/entities/User';

export class MockAuthRepository implements AuthRepository {
  async login(credentials: LoginCredentials): Promise<User> {
    await new Promise((r) => setTimeout(r, 600));
    return {
      id: 'dev-user-1',
      email: credentials.email,
      fullName: 'Dev User',
      isActive: true,
    };
  }

  async register(data: RegisterUserData): Promise<User> {
    await new Promise((r) => setTimeout(r, 800));
    const user = {
      id: 'dev-user-new',
      email: data.email,
      fullName: data.fullName,
      isActive: true,
    };
    import('../../presentation/store/authStore').then(({ useAuthStore }) => {
      useAuthStore.getState().setAuth(user, 'mock-token');
    });
    return user;
  }

  async forgotPassword(email: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 600));
    console.log('Mock forgot password requested for', email);
  }

  async socialLogin(data: import('../../domain/repositories/AuthRepository').SocialLoginData): Promise<User> {
    await new Promise((r) => setTimeout(r, 800));
    const user = {
      id: 'dev-user-social',
      email: data.email,
      fullName: data.fullName,
      isActive: true,
    };
    import('../../presentation/store/authStore').then(({ useAuthStore }) => {
      useAuthStore.getState().setAuth(user, 'mock-social-token');
    });
    return user;
  }
}
