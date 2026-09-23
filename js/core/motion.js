/**
 * KADAI — lightweight motion system
 * CSS handles the actual animation; this module only observes content that
 * exists now or is rendered later by page modules.
 */

const TARGETS = [
  { selector: ".hero__copy > *, .hero__media", stagger: true },
  { selector: ".breadcrumbs, .page-head, .trust-strip, .home-section > header, .pdp, .pdp-section, .auth-card, .checkout-layout, .detail-panels, .empty-state, .error-state, .form-card, .admin-table-wrap, .cart-lines, .summary-card", stagger: false },
  { selector: ".how-step, .category-card, .product-card, .review, .cart-line, .address-card", stagger: true },
  { selector: ".gallery__main, .gallery__thumbs, .region-loading", stagger: false },
];

function markTargets(root = document) {
  TARGETS.forEach(({ selector, stagger }) => {
    const elements = [
      ...(root.matches?.(selector) ? [root] : []),
      ...root.querySelectorAll(selector),
    ];
    elements.forEach((element, index) => {
      if (!element.classList.contains("motion-reveal")) {
        element.classList.add("motion-reveal");
        if (stagger) {
          element.style.setProperty("--motion-delay", `${Math.min(index * 55, 220)}ms`);
        }
      }
      observeReveal(element);
    });
  });

  const images = [
    ...(root.matches?.("img") ? [root] : []),
    ...root.querySelectorAll("img"),
  ];
  images.forEach(prepareImage);
}

let observer;
function observeReveal(element) {
  if (element.dataset.motionObserved === "true") return;
  element.dataset.motionObserved = "true";
  if (!observer) {
    element.classList.add("is-visible");
    return;
  }
  observer.observe(element);
}

function prepareImage(image) {
  if (image.dataset.motionImage === "true") return;
  image.dataset.motionImage = "true";
  image.classList.add("motion-image");
  const reveal = () => image.classList.add("is-loaded");
  image.addEventListener("load", reveal, { once: true });
  image.addEventListener("error", reveal, { once: true });
  if (image.complete) requestAnimationFrame(reveal);
}

export function pulse(element) {
  if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  element.classList.remove("motion-pop");
  requestAnimationFrame(() => element.classList.add("motion-pop"));
  element.addEventListener("animationend", () => element.classList.remove("motion-pop"), { once: true });
}

export function initMotion() {
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  }

  markTargets();
  const main = document.querySelector("main");
  if (main) {
    const mutations = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) markTargets(node);
      }));
    });
    mutations.observe(main, { childList: true, subtree: true });
  }
}
