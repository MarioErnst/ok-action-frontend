export type LoginRequestDto = {
  email: string;
  password: string;
};

export type LoginResponseDto = {
  access_token: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    is_active: boolean;
  };
};

export type RegisterRequestDto = {
  full_name: string;
  email: string;
  password: string;
};

export type RegisterResponseDto = LoginResponseDto;
