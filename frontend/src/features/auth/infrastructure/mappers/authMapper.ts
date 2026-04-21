import type { User } from '../../domain/entities/User';
import type {
  LoginRequestDto,
  LoginResponseDto,
  RegisterRequestDto,
} from '../dto/AuthDtos';
import type {
  LoginCredentials,
  RegisterUserData,
} from '../../domain/repositories/AuthRepository';

export const toLoginRequestDto = (credentials: LoginCredentials): LoginRequestDto => ({
  email: credentials.email,
  password: credentials.password,
});

export const toUser = (dto: LoginResponseDto): User => ({
  id: dto.user.id,
  email: dto.user.email,
  fullName: dto.user.full_name,
  isActive: dto.user.is_active,
});

export const toRegisterRequestDto = (data: RegisterUserData): RegisterRequestDto => ({
  full_name: data.fullName,
  email: data.email,
  password: data.password,
});

