import { api } from "./api.js";
import { wind } from "./styles.js";
import { matcher } from "./errors.js";

import { store } from "@context/store.js";
import { html, raw } from "@context/escape.js";
import { delegate } from "@context/delegate.js";
import { component } from "@context/component.js";

import { saveToken } from "@shared/http/auth.js";

export function renderLogin(outlet) {
  const state = store({ status: "idle", errorMsg: null });

  component(outlet, state, ({ status, errorMsg }) => {
    const loading = status === "loading";
    return html`
      <main class="${wind.page}">
        <div class="${wind.wrap}">

          <div class="${wind.brandWrap}">
            <h1 class="${wind.brandTitle}">SPLICE WC26</h1>
            <p class="${wind.brandSub}">Official Data Terminal</p>
          </div>

          <section class="${wind.card}" aria-labelledby="login-heading">
            <div class="${wind.notchL}" aria-hidden="true"></div>
            <div class="${wind.notchR}" aria-hidden="true"></div>

            <header class="${wind.stub}">
              <div class="${wind.stubTagWrap}">
                <span class="${wind.stubTag}">Identificacion</span>
                <span class="${wind.stubLabel}">ACCESS PASS</span>
              </div>
              <div class="${wind.pill}" role="status" aria-label="Sistema en linea">
                <div class="${wind.pillDot}" aria-hidden="true"></div>
                <span class="${wind.pillText}">Live</span>
              </div>
            </header>

            <div class="${wind.perf}" aria-hidden="true"></div>

            <div class="${wind.body}">
              <div class="${wind.headGroup}">
                <h2 id="login-heading" class="${wind.cardTitle}">Welcome</h2>
                <p class="${wind.cardSub}">Ingrese sus credenciales de acceso para el simulador oficial de la Copa Mundial 2026.</p>
              </div>

              <form class="${wind.form}" novalidate>
                <div class="${wind.formInner}">
                  <div class="${wind.fieldWrap}">
                    <label for="email" class="${wind.label}">Email Address</label>
                    <div class="${wind.inputWrap}">
                      <div class="${wind.inputIcon}" aria-hidden="true">
                        <span class="${wind.inputIconEl}">alternate_email</span>
                      </div>
                      <input id="email" name="email" type="email" required autocomplete="email"
                        placeholder="usuario@splicewc26.com"
                        class="${wind.input}" />
                    </div>
                  </div>

                  <div class="${wind.fieldWrap}">
                    <div class="${wind.labelRow}">
                      <label for="password" class="${wind.label}">Access Token</label>
                      <a href="#" class="${wind.forgotLink}">Forgot Token?</a>
                    </div>
                    <div class="${wind.inputWrap}">
                      <div class="${wind.inputIcon}" aria-hidden="true">
                        <span class="${wind.inputIconEl}">lock</span>
                      </div>
                      <input id="password" name="password" type="password" required autocomplete="current-password"
                        placeholder="••••••••••••"
                        class="${wind.input}" />
                    </div>
                  </div>
                </div>

                ${raw(errorMsg ? `<p role="alert" class="${wind.error}">${errorMsg}</p>` : "")}

                <div class="${wind.rememberRow}">
                  <input id="remember" name="remember" type="checkbox" class="${wind.checkbox}" />
                  <label for="remember" class="${wind.checkboxLabel}">Recordar mi sesion en este terminal</label>
                </div>

                <button type="submit" ${loading ? "disabled" : ""} class="${wind.btn}"
                  aria-busy="${loading ? "true" : "false"}">
                  <span>${loading ? "Validando..." : "Iniciar Sesion"}</span>
                  <span class="${wind.btnIcon}" aria-hidden="true">${loading ? "sync" : "arrow_forward"}</span>
                </button>
              </form>
            </div>

            <footer class="${wind.footer}">
              <div class="${wind.footerL}">
                <span class="${wind.footerIcon}" aria-hidden="true">sensors</span>
                <span class="${wind.footerTxt}">Terminal: WC26-SECURE-04</span>
              </div>
              <time class="${wind.footerDate}" datetime="2026-06-11">EST 2026.06.11</time>
            </footer>
          </section>

          <nav class="${wind.links}" aria-label="Legal">
            <a href="#" class="${wind.link}">Terminos de Servicio</a>
            <a href="#" class="${wind.link}">Seguridad de Datos</a>
            <a href="#" class="${wind.link}">Soporte</a>
          </nav>
        </div>

        <div class="${wind.stampTL}" aria-hidden="true">
          <div class="${wind.stampTLBox}">CONFIDENTIAL<br/>PROTOTYPE</div>
        </div>
        <div class="${wind.stampBR}" aria-hidden="true">
          <div class="flex flex-col items-end">
            <span class="${wind.stampBRLine}">AUTH_NODE_VAL: 0x93FA</span>
            <span class="${wind.stampBRLine}">LOC: 19.4326 N, 99.1332 W</span>
          </div>
        </div>
      </main>
    `;
  });

  delegate(outlet, "submit", "form", async (e) => {
    e.preventDefault();
    if (state.get().status === "loading") return;

    const { email, password } = e.target;
    state.set({ status: "loading", errorMsg: null });

    try {
      const data = await api.login(email.value.trim(), password.value);
      saveToken(data.token);
      location.hash = "/home";
    } catch (err) {
      state.set({ status: "error", errorMsg: matcher(err) });
    }
  });

  return () => state.destroy();
}
