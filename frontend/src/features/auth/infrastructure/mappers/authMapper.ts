import type { User } from '../../domain/entities/User';
import type { LoginRequestDto, LoginResponseDto } from '../dto/AuthDtos';
import type { LoginCredentials } from '../../domain/repositories/AuthRepository';

export const toLoginRequestDto = (credentials: LoginCredentials): LoginRequestDto => ({
  email: credentials.email,
  password: credentials.password,
});

export const toUser = (dto: LoginResponseDto): User => ({
  id: dto.id,
  email: dto.email,
  fullName: dto.full_name,
});

