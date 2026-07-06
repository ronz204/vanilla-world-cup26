import { HttpError, NetworkError } from "@shared/http/errors";

export const ERRORS = {
  network:     "Sin conexión. Revisá tu red e intentá de nuevo.",
  credentials: "Email o contraseña incorrectos.",
  default:     "Algo salió mal. Intentá de nuevo.",
};

export const matcher = (err) => {
  if (err instanceof NetworkError) return ERRORS.network;
  if (err instanceof HttpError && err.status === 400) return ERRORS.credentials;
  return ERRORS.default;
};
