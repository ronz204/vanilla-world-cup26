import "./style.css";

import { router, route } from "@context/routing.js";
import { createGuards } from "@context/guards.js";
import { mountShell } from "@shared/shell/view.js";
import { renderLogin }     from "@features/authen/view.js";
import { renderDreamTeam }   from "@features/dream-team/view.js";
import { renderHeadToHead } from "@features/search-faced/view.js";
import { renderTracker }   from "@features/lucky-surprise/view.js";

const shell  = mountShell(document.querySelector('#shell'));
const outlet = document.querySelector('#app');
const { withAuth, withLogin } = createGuards(shell);

function renderComingSoon(label) {
  return (out) => {
    out.innerHTML = `
      <div class="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6">
        <div class="af-ticket bg-surface rounded-[10px] overflow-hidden border border-border max-w-xs w-full">
          <div class="p-4 bg-surface-raised flex items-center justify-between">
            <span class="font-mono text-ink-soft text-[10px] tracking-widest uppercase">${label}</span>
          </div>
          <div class="af-perf h-1 w-full opacity-50"></div>
          <div class="p-8 text-center">
            <span class="material-symbols-outlined text-[40px] text-ink-dim">construction</span>
            <p class="font-mono text-[11px] text-ink-dim mt-3 uppercase tracking-wider">Próximamente</p>
          </div>
        </div>
      </div>
    `;
  };
}

router([
  route('/',             withLogin(renderLogin)),
  route('/dream-team',   withAuth(renderDreamTeam)),
  route('/head-to-head', withAuth(renderHeadToHead)),
  route('/tracker',      withAuth(renderTracker)),
  route('/quiniela',     withAuth(renderComingSoon('Quiniela'))),
  route('/draw',         withAuth(renderComingSoon('Sorteo Loco'))),
], outlet);
