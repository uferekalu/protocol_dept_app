// Shared password complexity rule — anywhere a *new* password is being set
// (SignupDto, CreateProtocolMemberDto, ChangePasswordDto). Never applied to login,
// which validates against an already-stored password, not a new one.
// At least one lowercase, one uppercase, one digit, one special character, 6+ chars.
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

export const PASSWORD_REQUIREMENTS_MESSAGE =
  'Password must be at least 6 characters and include an uppercase letter, a lowercase letter, a number, and a special character';
