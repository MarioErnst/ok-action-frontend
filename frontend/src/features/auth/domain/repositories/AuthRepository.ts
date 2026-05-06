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

export type SocialLoginData = {
  email: string;
  fullName: string;
  provider: string;
  token: string;
};

export interface AuthRepository {
  login(credentials: LoginCredentials): Promise<User>;
  register(data: RegisterUserData): Promise<User>;
  socialLogin(data: SocialLoginData): Promise<User>;
  forgotPassword(email: string): Promise<void>;
}

