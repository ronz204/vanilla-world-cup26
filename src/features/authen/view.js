import { api } from "./api.js";
import { wind } from "./styles.js";
import { matcher } from "./errors.js";

import { store } from "@context/store.js";
import { html, raw } from "@context/escape.js";
import { delegate } from "@context/delegate.js";
import { component } from "@context/component.js";

import { saveToken } from "@shared/http/auth.js";

export function renderLogin(outlet) {
  const store = createStore({ status: "idle", errorMsg: null });

  component(outlet, store, ({ status, errorMsg }) => {
    const loading = status === "loading";
    return html`
      <div class="${wind.page}">
        <div class="${wind.wrap}">
          <div class="${wind.logoWrap}">
            <p class="${wind.logo}">⚽</p>
            <h1 class="${wind.title}">Mundial 2026</h1>
          </div>
          <div class="${wind.card}">
            <h2 class="${wind.cardTitle}">Iniciar sesión</h2>
            <form class="${wind.form}">
              <div>
                <label class="${wind.label}">Email</label>
                <input name="email" type="email" required autocomplete="email" class="${wind.input}" />
              </div>
              <div>
                <label class="${wind.label}">Contraseña</label>
                <input name="password" type="password" required autocomplete="current-password" class="${wind.input}" />
              </div>
              ${raw(errorMsg ? `<p class="${wind.error}">${errorMsg}</p>` : "")}
              <button type="submit" ${loading ? "disabled" : ""} class="${wind.btn}">
                ${loading ? "Cargando..." : "Iniciar sesión"}
              </button>
            </form>
          </div>
        </div>
      </div>
    `;
  });

  delegate(outlet, "submit", "form", async (e) => {
    e.preventDefault();
    if (store.get().status === "loading") return;

    const { email, password } = e.target;
    store.set({ status: "loading", errorMsg: null });

    try {
      const data = await login(email.value.trim(), password.value);
      saveToken(data.token);
      location.hash = "/home";
    } catch (err) {
      store.set({ status: "error", errorMsg: matcher(err) });
    };
  });

  return () => store.destroy();
};
