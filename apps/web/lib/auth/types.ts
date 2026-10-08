export type UserPublic = {
  id: string;
  email: string;
  roles: string[];
  is_active: boolean;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

export type ApiErrorBody = {
  detail?: string | { msg: string; loc: unknown[] }[];
};

export type RegistrationTokenResponse = {
  registration_token: string;
};
