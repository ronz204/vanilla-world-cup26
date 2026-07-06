import { router, route } from "@context/routing.js";
import { renderLogin } from "@features/authen/view";

const outlet = document.querySelector("#app");

router([
  route("/", renderLogin),
], outlet);
