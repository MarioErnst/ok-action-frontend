import type { AuthRepository, LoginCredentials } from '../../domain/repositories/AuthRepository';
import type { User } from '../../domain/entities/User';

export class MockAuthRepository implements AuthRepository {
  async login(credentials: LoginCredentials): Promise<User> {
    await new Promise((r) => setTimeout(r, 600));
    return {
      id: 'dev-user-1',
      email: credentials.email,
      fullName: 'Dev User',
    };
  }
}
