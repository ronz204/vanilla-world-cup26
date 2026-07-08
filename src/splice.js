import "./style.css";

import { createGuards } from "@context/guards.js";
import { mountShell } from "@shared/shell/view.js";
import { router, route } from "@context/routing.js";

import { renderLogin } from "@features/authen/view.js";
import { renderDraw } from "@features/crazy-raffle/view.js";
import { renderDreamTeam } from "@features/dream-team/view.js";
import { renderTracker } from "@features/lucky-surprise/view.js";
import { renderHeadToHead } from "@features/search-faced/view.js";
import { renderQuiniela } from "@features/quiniela-local/view.js";

const shell = mountShell(document.querySelector('#shell'));
const outlet = document.querySelector('#app');
const { withAuth, withLogin } = createGuards(shell);

router([
  route('/', withLogin(renderLogin)),
  route('/dream-team', withAuth(renderDreamTeam)),
  route('/head-to-head', withAuth(renderHeadToHead)),
  route('/tracker', withAuth(renderTracker)),
  route('/quiniela', withAuth(renderQuiniela)),
  route('/draw', withAuth(renderDraw)),
], outlet);
