/**
 * KADAI — Error Pages Controller (error.js)
 * Shared controller for 404, 403, 401, 500, 502 error flows.
 * Handles recovery workflows:
 * - 401: Preserves return URL (?next=) on login and registration links
 * - 403: Provides quick account switch / logout
 * - 404: Parses invalid pathname into smart product search suggestion
 * - 500: Handles retry with button busy state
 * - 502: Real-time network connectivity ping and online/offline event listeners
 */

import { qs } from "../core/dom.js";
import { logout } from "../services/auth.js";
import { toast } from "../components/toast.js";

export function init() {
  const status = document.body.dataset.status || "";

  // 1. Common: Bind retry buttons
  bindRetryButtons();

  // 2. Status-specific behaviors
  if (status === "401") {
    handle401Auth();
  } else if (status === "403") {
    handle403Forbidden();
  } else if (status === "404") {
    handle404NotFound();
  } else if (status === "502") {
    handle502Gateway();
  }
}

/** Retry button with busy spinner feedback */
function bindRetryButtons() {
  const retryBtn = qs(".js-error-retry");
  if (!retryBtn) return;

  retryBtn.addEventListener("click", () => {
    retryBtn.setAttribute("aria-busy", "true");
    retryBtn.disabled = true;
    setTimeout(() => {
      window.location.reload();
    }, 400);
  });
}

/** 401 Unauthorized: forward original destination via ?next= */
function handle401Auth() {
  const params = new URLSearchParams(window.location.search);
  let next = params.get("next");

  // Fallback to referrer if from same origin
  if (!next && document.referrer) {
    try {
      const refUrl = new URL(document.referrer);
      if (refUrl.origin === window.location.origin) {
        next = refUrl.pathname + refUrl.search;
      }
    } catch {
      /* ignore invalid referrer */
    }
  }

  if (next) {
    const signinLink = qs(".js-signin-link");
    const registerLink = qs(".js-register-link");
    if (signinLink) signinLink.href = `login.html?next=${encodeURIComponent(next)}`;
    if (registerLink) registerLink.href = `register.html?next=${encodeURIComponent(next)}`;
  }
}

/** 403 Forbidden: quick account switch */
function handle403Forbidden() {
  const switchBtn = qs(".js-switch-account");
  if (!switchBtn) return;

  switchBtn.addEventListener("click", async () => {
    switchBtn.setAttribute("aria-busy", "true");
    switchBtn.disabled = true;
    try {
      await logout();
      toast("Signed out. Redirecting to sign in…", "ok");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 500);
    } catch (e) {
      toast("Couldn’t sign out right now. Please try again.", "error");
      switchBtn.removeAttribute("aria-busy");
      switchBtn.disabled = false;
    }
  });
}

/** 404 Not Found: derive suggested search term from URL */
function handle404NotFound() {
  const searchInput = qs(".error-search-form input");
  if (!searchInput) return;

  // If user navigated to a broken path like /steel-kadai or /cookware-pots
  const pathname = window.location.pathname;
  const filename = pathname.split("/").pop() || "";
  const candidate = filename.replace(/\.(html|php|asp|htm)$/i, "").replace(/[-_]+/g, " ").trim();

  // If candidate is a sensible word (not random numbers or standard files)
  if (candidate && candidate.length > 2 && !["404", "error", "index"].includes(candidate.toLowerCase())) {
    searchInput.value = candidate;
  }
}

/** 502 Bad Gateway: live connectivity ping and network listener */
function handle502Gateway() {
  const dot = qs(".js-connection-dot");
  const label = qs(".js-connection-label");
  const pingBtn = qs(".js-check-connection");

  const updateState = (online) => {
    if (!dot || !label) return;
    if (online) {
      dot.className = "status-indicator__dot status-indicator__dot--online";
      label.textContent = "Network reconnected · Ready to reload";
    } else {
      dot.className = "status-indicator__dot status-indicator__dot--offline";
      label.textContent = "Offline · Check your internet connection";
    }
  };

  window.addEventListener("online", () => updateState(true));
  window.addEventListener("offline", () => updateState(false));

  if (pingBtn) {
    pingBtn.addEventListener("click", async () => {
      pingBtn.setAttribute("aria-busy", "true");
      try {
        const res = await fetch("index.html", { method: "HEAD", cache: "no-store" });
        if (res.ok) {
          updateState(true);
          toast("Connection restored! Reloading…", "ok");
          setTimeout(() => window.location.reload(), 600);
        } else {
          updateState(false);
          toast("Gateway still responding with status: " + res.status, "error");
        }
      } catch {
        updateState(false);
        toast("Unable to reach store server. Please try again shortly.", "error");
      } finally {
        pingBtn.removeAttribute("aria-busy");
      }
    });
  }
}
