/* Hash router for the self-contained bundle (build/standalone.mjs).
   Not shipped on the real multi-page site. Runs after main.js. */
(function () {
  "use strict";
  var app = document.getElementById("app");
  if (!app) return;
  var routeEls = [].slice.call(app.querySelectorAll(".route"));
  var byPath = {};
  routeEls.forEach(function (el) { byPath[el.getAttribute("data-route")] = el; });
  var header = document.querySelector(".site-header");
  var navLinks = [].slice.call(document.querySelectorAll(".site-header .nav a"));
  var first = true;   // main.js already wired the initial route at load

  // Scroll-position memory, per route hash. A real multi-page site gets this
  // for free — the browser restores scroll on Back/Forward. This hash-routed
  // bundle doesn't, because every route "change" is the same document with
  // sections swapped: apply() below always reset scroll to the top, so even
  // once Back correctly returns to the previous ROUTE (main.js's data-back
  // fix), it landed at that route's top rather than the actual PLACE the
  // visitor had scrolled to. Only restore on a real back/forward traversal —
  // a normal link click to an already-visited route still lands at the top,
  // matching ordinary browser behaviour.
  //
  // Telling those apart isn't what it first looks like: `popstate` is NOT a
  // reliable back/forward signal here — in this hash-routed setup it fires on
  // every navigation, including a plain forward click on a nav link, not just
  // on Back/Forward. What DOES reliably tell them apart is history.state: a
  // fresh navigation (a real <a href="#..."> click) always creates a new
  // entry with state:null, whereas traversing to an entry apply() has already
  // tagged (below) arrives with that tag intact. So each entry gets tagged
  // with an increasing id the first time apply() sees it; on any subsequent
  // arrival, a state.navId already being present is exactly "we came back to
  // an entry we've been on before" — i.e. a real traversal.
  var scrollMemory = {};
  var currentHash = location.hash;
  var navCounter = 0;

  function parse() {
    var raw = (location.hash || "").replace(/^#/, "");
    if (!raw || raw === "/") return { path: "/", anchor: "" };
    var i = raw.indexOf("#");
    return i >= 0
      ? { path: raw.slice(0, i) || "/", anchor: raw.slice(i + 1) }
      : { path: raw, anchor: "" };
  }

  function apply() {
    // remember where the visitor was on the route they're leaving
    scrollMemory[currentHash] = window.scrollY;

    // a traversal (Back/Forward) arrives at an entry already tagged by a
    // previous visit; a fresh link click always starts a new, untagged entry
    var isTraversal = !!(history.state && typeof history.state.navId === "number");
    if (!isTraversal) history.replaceState({ navId: ++navCounter }, "", location.href);

    var r = parse();
    var restoreY = isTraversal ? scrollMemory[location.hash] : undefined;
    var page = byPath[r.path] || byPath["/"];
    var isHome = page === byPath["/"];

    routeEls.forEach(function (el) { el.hidden = el !== page; });

    // header: light-over-video on home, solid on every inner page
    if (header) {
      if (isHome) header.setAttribute("data-over-hero", "");
      else header.removeAttribute("data-over-hero");
      header.classList.toggle("route-inner", !isHome);
      header.classList.remove("is-hidden");
      if (!isHome) header.classList.remove("is-scrolled");
    }

    // active nav item
    navLinks.forEach(function (a) {
      var href = (a.getAttribute("href") || "").replace(/^#/, "");
      var on = href === r.path || (r.path === "/" && (href === "/" || href === ""));
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });

    // Jump to the top now (kills a flash of the old scroll position), then do
    // the in-page anchor scroll AFTER layout + ScrollTrigger.refresh — on a
    // route *change* the freshly un-hidden section isn't measured yet when
    // apply() runs, and ScrollTrigger.refresh() can yank scrollY back.
    window.scrollTo(0, 0);
    var anchorEl = r.anchor
      ? page.querySelector('[id="' + (window.CSS && CSS.escape ? CSS.escape(r.anchor) : r.anchor) + '"]')
      : null;

    // the reveal / GSAP scroll effects were bound once at load, to elements that
    // were display:none then. Re-wire them for the route that's now visible so
    // its entrance animations actually play (bug: "hero went static after nav").
    window.requestAnimationFrame(function () {
      if (!first) {
        if (window.__archReveal) window.__archReveal(page);
        else page.querySelectorAll("[data-reveal]").forEach(function (el) { el.classList.add("is-in"); });
        if (window.__archScrollFx) window.__archScrollFx(page);
      }
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      window.requestAnimationFrame(function () {
        if (isTraversal && typeof restoreY === "number") window.scrollTo(0, restoreY);
        else if (anchorEl) anchorEl.scrollIntoView();
        first = false;
      });
    });

    currentHash = location.hash;
  }

  window.addEventListener("hashchange", apply);
  apply();
})();
