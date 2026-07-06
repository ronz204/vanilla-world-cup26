import { client } from "@shared/http/client";

const login = (email, password) =>
  client.post("/auth/authenticate", { email, password });

export const api = Object.freeze({ login });
