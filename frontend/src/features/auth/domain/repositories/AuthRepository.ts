import type { User } from '../entities/User';

export type LoginCredentials = {
  email: string;
  password: string;
};

export interface AuthRepository {
  login(credentials: LoginCredentials): Promise<User>;
}

