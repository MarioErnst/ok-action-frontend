import type { User } from '../entities/User';

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterUserData = {
  fullName: string;
  email: string;
  password: string;
};

export interface AuthRepository {
  login(credentials: LoginCredentials): Promise<User>;
  register(data: RegisterUserData): Promise<User>;
}

