export class HttpError extends Error {
  constructor(status, message, endpoint) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.endpoint = endpoint;
  };
};

export class AuthError extends HttpError {
  constructor(endpoint) {
    super(401, "Session expired or invalid token", endpoint);
    this.name = "AuthError";
  };
};

export class RateLimitError extends HttpError {
  constructor(endpoint) {
    super(429, "Rate limit exceeded", endpoint);
    this.name = "RateLimitError";
  };
};

export class ServerError extends HttpError {
  constructor(endpoint) {
    super(500, "Internal server error", endpoint);
    this.name = "ServerError";
  };
};

export class NetworkError extends Error {
  constructor(endpoint, cause) {
    super("Network request failed");
    this.name = "NetworkError";
    this.endpoint = endpoint;
    this.cause = cause;
  };
};
