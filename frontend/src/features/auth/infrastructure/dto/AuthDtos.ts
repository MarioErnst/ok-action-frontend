export type LoginRequestDto = {
  email: string;
  password: string;
};

export type LoginResponseDto = {
  id: string;
  email: string;
  full_name: string;
  access_token: string;
};

