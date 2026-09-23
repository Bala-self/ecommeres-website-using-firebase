/**
 * KADAI — Policies & Legal Center controller (policies.js)
 * Features:
 * - Hash scrolling & deep-link recognition
 * - IntersectionObserver to sync active state in sidebar TOC and mobile tabs
 * - Live keyword search with match counter and card filtering
 * - Copy section link to clipboard with toast notification
 * - Print / PDF trigger
 */

import { qs, qsa } from "../core/dom.js";
import { toast } from "../components/toast.js";

export function init() {
  bindHashNavigation();
  bindScrollObserver();
  bindCopyLinks();
  bindSearch();
  bindPrint();

  // If page loaded with a specific hash (e.g., #returns), smooth scroll to it
  if (window.location.hash) {
    const target = qs(window.location.hash);
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveSection(window.location.hash.slice(1));
      }, 100);
    }
  }
}

/** Keep active section state updated across TOC sidebar & mobile tabs */
function setActiveSection(id) {
  if (!id) return;

  // Sidebar links
  const tocLinks = qsa(".js-policy-toc a");
  tocLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (href === `#${id}`) {
      link.classList.add("is-active");
    } else {
      link.classList.remove("is-active");
    }
  });

  // Mobile tabs
  const mobileTabs = qsa(".policy-tab-link");
  mobileTabs.forEach((tab) => {
    const href = tab.getAttribute("href") || "";
    if (href === `#${id}`) {
      tab.classList.add("is-active");
      tab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    } else {
      tab.classList.remove("is-active");
    }
  });
}

/** Deep link and hash change binding */
function bindHashNavigation() {
  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      setActiveSection(hash);
      const target = qs(`#${hash}`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  // Click on TOC or mobile tabs
  document.addEventListener("click", (e) => {
    const link = e.target.closest(".js-policy-toc a, .policy-tab-link");
    if (!link) return;
    const href = link.getAttribute("href");
    if (href && href.startsWith("#")) {
      const id = href.slice(1);
      setActiveSection(id);
    }
  });
}

/** IntersectionObserver to track visible section while reading */
function bindScrollObserver() {
  const cards = qsa(".policy-card");
  if (!cards.length || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      // Find the first intersecting entry with significant visibility
      const visible = entries.find((entry) => entry.isIntersecting);
      if (visible && visible.target?.id) {
        setActiveSection(visible.target.id);
      }
    },
    {
      rootMargin: "-20% 0px -60% 0px",
      threshold: 0,
    }
  );

  cards.forEach((card) => observer.observe(card));
}

/** Copy link to clipboard with user feedback */
function bindCopyLinks() {
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".js-copy-link");
    if (!btn) return;

    const hash = btn.dataset.hash;
    const url = new URL(window.location.href);
    url.hash = hash;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url.href);
      } else {
        // Fallback for older browsers
        const input = document.createElement("input");
        input.value = url.href;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }
      toast("Section link copied to clipboard!", "ok");
    } catch {
      toast("Link ready: " + url.href, "info");
    }
  });
}

/** Live keyword search within policy sections */
function bindSearch() {
  const input = qs("#policy-search-input");
  const container = qs(".js-policies-container");
  if (!input || !container) return;

  let debounceTimer = null;

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = input.value.trim().toLowerCase();
      const cards = qsa(".policy-card", container);

      if (!query) {
        // Reset view
        cards.forEach((card) => {
          card.style.display = "";
          // Remove highlights
          const marks = card.querySelectorAll("mark.policy-highlight");
          marks.forEach((mark) => {
            const parent = mark.parentNode;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
          });
        });
        return;
      }

      let matchCount = 0;
      cards.forEach((card) => {
        const text = card.textContent.toLowerCase();
        if (text.includes(query)) {
          card.style.display = "";
          matchCount++;
        } else {
          card.style.display = "none";
        }
      });

      if (matchCount === 0) {
        toast(`No policy clauses matching "${query}"`, "info", 2000);
      }
    }, 250);
  });
}

/** Print / Save PDF */
function bindPrint() {
  qs(".js-print-policies")?.addEventListener("click", () => {
    window.print();
  });
}
