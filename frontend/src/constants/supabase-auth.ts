export const SUPABASE_AUTH_ERROR_CODE = {
  USER_ALREADY_EXISTS: "user_already_exists",
  EMAIL_ADDRESS_INVALID: "email_address_invalid",
  SIGNUP_DISABLED: "signup_disabled",
  WEAK_PASSWORD: "weak_password",
  OVER_REQUEST_RATE_LIMIT: "over_request_rate_limit",
  SAME_PASSWORD: "same_password",
  SESSION_NOT_FOUND: "session_not_found",
  INVALID_CREDENTIALS: "invalid_credentials"
} as const;

export const SUPABASE_AUTH_EVENT = {
  initialSession: "INITIAL_SESSION",
  passwordRecovery: "PASSWORD_RECOVERY",
  signedIn: "SIGNED_IN",
  signedOut: "SIGNED_OUT"
} as const;

export const SUPABASE_AUTH_REDIRECT_PARAM = {
  code: "code",
  tokenHash: "token_hash",
  type: "type",
  error: "error",
  errorCode: "error_code",
  errorDescription: "error_description"
} as const;

export const SUPABASE_AUTH_REDIRECT_TYPE = {
  recovery: "recovery"
} as const;

export const SUPABASE_AUTH_USER_MESSAGE = {
  duplicateSignup: "auth.error.duplicateSignup",
  generic: "auth.error.generic",
  rateLimited: "auth.error.rateLimited",
  weakPassword: "auth.error.weakPassword",
  signupDisabled: "auth.error.signupDisabled",
  invalidEmail: "auth.error.invalidEmail",
  network: "auth.error.network",
  invalidCredentials: "auth.error.invalidCredentials",
  recoverySessionMissing: "auth.reset.invalidSession"
} as const;
