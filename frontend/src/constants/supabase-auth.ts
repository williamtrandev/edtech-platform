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

export const SUPABASE_AUTH_USER_MESSAGE = {
  duplicateSignup:
    "This email is already registered. Try signing in, or use “Forgot password” if you cannot access the account.",
  generic: "Something went wrong while creating your account. Please try again.",
  rateLimited: "Too many attempts. Please wait a minute and try again.",
  weakPassword: "Password does not meet the security rules for this project.",
  signupDisabled: "New sign-ups are disabled. Contact your administrator.",
  invalidEmail: "That email address does not look valid. Check for typos.",
  network: "Network error. Check your connection and try again.",
  invalidCredentials: "Incorrect email or password. Try again or reset your password from Supabase if enabled."
} as const;
