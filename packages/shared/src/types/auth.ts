import type { Role } from '../enums';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
}
