/**
 * KADAI — startup video preloader
 * The page is revealed only after boot and video completion; the safety timer
 * prevents a stuck screen when a browser cannot play the asset.
 */

const MAX_PRELOADER_MS = 10000;

export function initPreloader() {
  const isHomePage = document.body?.dataset.page === "home";
  const preloader = document.querySelector(".site-preloader");

  if (!isHomePage) {
    if (preloader) preloader.remove();
    return () => {};
  }

  if (!preloader) return () => {};

  const video = preloader.querySelector("video");
  let bootReady = false;
  let videoReady = !video;
  let dismissed = false;

  const tryDismiss = () => {
    if (!bootReady || !videoReady || dismissed) return;
    dismiss();
  };

  if (video && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    video.pause();
    videoReady = true;
  } else if (video) {
    video.addEventListener("ended", () => {
      videoReady = true;
      tryDismiss();
    }, { once: true });
    video.addEventListener("error", () => {
      videoReady = true;
      tryDismiss();
    }, { once: true });
    if (video.ended) videoReady = true;
    video.play().catch(() => {
      videoReady = true;
      tryDismiss();
    });
  }

  const timer = window.setTimeout(dismiss, MAX_PRELOADER_MS);

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    window.clearTimeout(timer);
    preloader.classList.add("is-done");
    window.setTimeout(() => preloader.remove(), 320);
  }

  return () => {
    bootReady = true;
    tryDismiss();
  };
}
