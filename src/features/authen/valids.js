const MSG = {
  emptyEmail:    "El email es obligatorio.",
  invalidEmail:  "Ingresá un email válido.",
  emptyPassword: "La contraseña es obligatoria.",
};

export function validate({ email, password }) {
  if (!email)                                     return MSG.emptyEmail;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))  return MSG.invalidEmail;
  if (!password)                                  return MSG.emptyPassword;
  return null;
}
