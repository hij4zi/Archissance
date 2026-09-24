/* =============================================================
   ARCHISSANCE — main.js
   Minimal, transform/opacity-only motion. Everything degrades:
   no JS -> full static content. Reduced-motion -> no animation.
   ============================================================= */
(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");
  document.documentElement.classList.add("js");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = typeof window.gsap !== "undefined";
  var isSpa = !!document.getElementById("app");

  /* ---------- scroll position restore-on-back (real multi-page site only) ----------
     The header Back button (and any native back navigation) already calls a
     real history.back(), and when the previous page qualifies for the
     browser's back-forward cache that alone restores scroll perfectly — the
     whole page, JS state included, comes back frozen exactly as it was. When
     a page doesn't qualify for bfcache (this varies by browser/device — some
     mobile browsers are stricter about it, autoplaying <video> among the
     things that can disqualify a page) the browser instead does a full
     reload and tries to re-scroll to the old position itself afterward — but
     that attempt races the page's own layout settling (a webfont swap in
     particular changes document height), so it can land short or overshoot,
     leaving the visitor to scroll back to find their place by hand. This is
     a resilient manual fallback: continuously record scroll position per
     page in sessionStorage, and on load, re-apply it — once immediately, and
     again after the page's layout has actually settled (window "load" and
     the webfont swap) so a late reflow can't undo it. history.scrollRestoration
     is forced to "manual" in the inline head script (before first paint) so
     the browser's own, earlier and less reliable, attempt doesn't fight this.
     Skipped entirely inside the self-contained bundle's SPA — its hash router
     (build/router.js) already owns scroll memory for its virtual routes,
     keyed by hash rather than pathname; running this too would conflict with it. */
  if (!isSpa) {
    try {
      var scrollKey = "archissance:scroll:" + location.pathname;
      var restoreScroll = function () {
        // a URL fragment (e.g. projects.html#commercial, used by the "What we
        // do" links) means the visitor wants that specific section — never
        // let a remembered scroll position for the bare path override it.
        if (location.hash) return;
        var saved = sessionStorage.getItem(scrollKey);
        if (saved === null) return;
        var y = parseInt(saved, 10);
        if (isNaN(y) || y < 0) return;
        try { window.scrollTo({ top: y, left: 0, behavior: "instant" }); }
        catch (e2) { window.scrollTo(0, y); }
      };
      restoreScroll();
      window.addEventListener("load", restoreScroll);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(restoreScroll);

      var saveTicking = false;
      var saveScroll = function () {
        saveTicking = false;
        try { sessionStorage.setItem(scrollKey, String(window.scrollY)); } catch (e3) {}
      };
      window.addEventListener("scroll", function () {
        if (saveTicking) return;
        saveTicking = true;
        requestAnimationFrame(saveScroll);
      }, { passive: true });
      window.addEventListener("pagehide", saveScroll);
    } catch (scrollErr) { /* sessionStorage can throw in some private-browsing modes — never let this break the page */ }
  }

  /* ---------- project-page videos: muted loop, autoplay while in view ----------
     They carry the autoplay attr and play regardless of prefers-reduced-motion
     (owner's call — muted decorative loops). The observer just pauses the ones
     that are off-screen. Only fall back to <controls> if there's no observer. */
  var videos = document.querySelectorAll("[data-video] video");
  if (videos.length) {
    if (!("IntersectionObserver" in window)) {
      videos.forEach(function (v) { v.setAttribute("controls", ""); });
    } else {
      /* Watchdog: a <video> stuck at readyState 0 with no error event is the
         signature of a host that ignores HTTP Range. If one's been in view for
         2.5s and still hasn't buffered anything playable, re-fetch it as a Blob
         so playback runs from memory. If the Blob source then fails to decode
         (some Safari builds reject blob: video), revert to the original file. */
      var vRetryStalled = function (v) {
        if (v.readyState >= 3 || v.dataset.blobRetried) return;
        var source = v.querySelector("source");
        var url = source ? source.getAttribute("src") : v.currentSrc;
        // a data: URI clip (the self-contained bundle) is already "from memory";
        // if it hasn't decoded it never will (WebKit) — no point re-fetching.
        if (!url || url.indexOf("data:") === 0 || !window.fetch) return;
        v.dataset.blobRetried = "1";
        fetch(url, { credentials: "same-origin" })
          .then(function (res) { if (!res.ok) throw new Error("bad response"); return res.blob(); })
          .then(function (blob) {
            var wasPlaying = !v.paused;
            v.addEventListener("error", function () {
              if ((v.currentSrc || "").indexOf("blob:") === 0) { v.src = url; v.load(); }
            }, { once: true });
            v.src = URL.createObjectURL(blob);
            v.load();
            if (wasPlaying) {
              var pr = v.play();
              if (pr && pr.catch) pr.catch(function () { v.setAttribute("controls", ""); });
            }
          })
          .catch(function () { v.setAttribute("controls", ""); });
      };
      var tryPlay = function (v) {
        try { v.muted = true; var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {}
      };
      var vio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var v = e.target;
          if (e.isIntersecting) {
            tryPlay(v);
            setTimeout(function () { vRetryStalled(v); }, 2500);
          } else {
            v.pause();
          }
        });
      }, { threshold: 0.25 });
      videos.forEach(function (v) { v.muted = true; vio.observe(v); });

      /* Nudge any on-screen-but-paused clip — covers autoplay-blocker extensions
         and energy-saver modes that reject the first .play(). Retries on a short
         timer for a few seconds, on tab focus, and on the first interaction. */
      var nudgeVids = function () {
        videos.forEach(function (v) {
          if (!v.paused) return;
          var r = v.getBoundingClientRect();
          if (r.bottom > 0 && r.top < (window.innerHeight || 0)) tryPlay(v);
        });
      };
      var nTries = 0;
      var nudgeTimer = setInterval(function () {
        nTries++; nudgeVids();
        if (nTries > 10) clearInterval(nudgeTimer);
      }, 500);
      document.addEventListener("visibilitychange", function () { if (!document.hidden) nudgeVids(); });
      ["pointerdown", "scroll", "touchstart", "keydown"].forEach(function (ev) {
        window.addEventListener(ev, nudgeVids, { passive: true, once: true });
      });
    }
  }

  /* ---------- homepage hero: ONE clip, autoplay + loop ----------
     The <video> carries autoplay/loop/muted/playsinline. The site owner wants
     it playing on page open regardless of prefers-reduced-motion (it's a muted,
     decorative background), so we DON'T pause it there — we only skip the extra
     drift animation (.hero-reel plays that via a media query in CSS).

     We also nudge .play() hard, because a bare `autoplay` attribute is the part
     that's flaky in the wild: an "autoplay blocker" extension, Windows/Chrome
     "energy saver", or a data: URI source (the self-contained bundle) can all
     leave it on frame 0. So: retry .play() on every load event, on a short
     timer for the first few seconds, when the tab becomes visible, and on the
     first user interaction. If it still hasn't buffered, re-issue .load().
     Wrapped so a hiccup here can never break navigation. */
  try {
    var heroReel = document.querySelector(".hero-reel-video");
    if (heroReel) {
      var reelTries = 0;
      var kickReel = function () {
        if (!heroReel.paused && heroReel.currentTime > 0) return;
        try {
          if (heroReel.readyState < 2 && heroReel.networkState === 3 && reelTries < 2) heroReel.load();
          var pr = heroReel.play();
          if (pr && pr.catch) pr.catch(function () {});
        } catch (e) {}
      };
      ["loadedmetadata", "loadeddata", "canplay", "canplaythrough", "stalled", "suspend"].forEach(function (ev) {
        heroReel.addEventListener(ev, kickReel);
      });
      document.addEventListener("visibilitychange", function () { if (!document.hidden) kickReel(); });
      ["pointerdown", "scroll", "touchstart", "keydown", "mousemove"].forEach(function (ev) {
        window.addEventListener(ev, kickReel, { passive: true, once: true });
      });
      var reelPoll = setInterval(function () {
        reelTries++;
        kickReel();
        if ((!heroReel.paused && heroReel.currentTime > 0) || reelTries > 12) clearInterval(reelPoll);
      }, 400);
      kickReel();
    }
  } catch (heroErr) { /* the hero is an enhancement — never let it break the page */ }

  /* ---------- current year ---------- */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- header back button ----------
     If the visitor arrived from another page on this site, go back in history
     (real history.back(), so the browser restores scroll position too);
     otherwise fall through to the anchor's href (which points to the site root).

     The self-contained bundle (build/standalone.mjs) is a hash-routed SPA —
     document.referrer there reflects only how the whole bundle document was
     first loaded (e.g. from claude.ai), never how the visitor moved between
     its internal routes, since a hash change isn't a real navigation. Gating
     on document.referrer in that context is always false, so Back silently
     fell through to its href (the site root) no matter how many in-app pages
     the visitor had actually clicked through — this is the bug: Back always
     landing on Home instead of the actual previous page. Detect the SPA via
     its #app route wrapper (only standalone.mjs's bundle has one) and gate on
     whether we've observed an internal hashchange instead. */
  var backBtn = document.querySelector("[data-back]");
  if (backBtn) {
    var spaNavigated = false;
    if (isSpa) window.addEventListener("hashchange", function () { spaNavigated = true; });
    backBtn.addEventListener("click", function (e) {
      var canGoBack = isSpa
        ? spaNavigated
        : document.referrer && document.referrer.indexOf(window.location.origin) === 0 && window.history.length > 1;
      if (canGoBack) {
        e.preventDefault();
        window.history.back();
      }
    });
  }

  /* ---------- mobile nav ---------- */
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".nav");
  // while the full-screen menu is open it's the only thing on screen, but an
  // autoplaying hero video underneath still keeps decoding + compositing every
  // frame — pure waste that competes with the menu's own slide animation for
  // GPU time and is a real source of jank on mid-range phones. Pause it while
  // covered, resume where it left off on close.
  var heroVideo = document.querySelector(".hero-reel-video");
  // Closing has the same containing-block hazard as opening, just in reverse:
  // the instant .nav-open drops, .site-header's own transform transitions back
  // in over 0.5s, which re-establishes it as the containing block for the fixed
  // .nav mid-close and freezes the menu (links and all) until that unrelated
  // transition lands. .nav-closing keeps main.css's override in force for the
  // ~0.55s the close slide actually takes, so .nav can finish sliding out
  // against the true viewport before .site-header's transform resumes.
  var navCloseTimer = null;
  function setNavOpen(open) {
    if (navCloseTimer) { clearTimeout(navCloseTimer); navCloseTimer = null; }
    document.body.classList.toggle("nav-open", open);
    if (open) {
      document.body.classList.remove("nav-closing");
    } else {
      document.body.classList.add("nav-closing");
      navCloseTimer = setTimeout(function () {
        document.body.classList.remove("nav-closing");
        navCloseTimer = null;
      }, 600);
    }
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
    if (heroVideo) {
      if (open) heroVideo.pause();
      else heroVideo.play().catch(function () {});
    }
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setNavOpen(!document.body.classList.contains("nav-open"));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") setNavOpen(false);
    });
  }

  /* ---------- header scroll state ----------
     Over the video hero the header stays light until you've scrolled past it,
     then it condenses into a frosted bar. Elsewhere it condenses at 40px.
     It also hides on downward scroll once you're well past the fold. */
  var overHero = header && header.hasAttribute("data-over-hero");
  var heroSection = document.querySelector("[data-hero-reel]");
  if (header) {
    var lastY = 0, ticking = false;
    var onScroll = function () {
      var sy = window.pageYOffset;
      var condenseAt = 40;
      if (overHero && heroSection) condenseAt = Math.max(120, heroSection.offsetHeight - 90);
      header.classList.toggle("is-scrolled", sy > condenseAt);
      if (sy > condenseAt + 260 && sy > lastY && !document.body.classList.contains("nav-open")) {
        header.classList.add("is-hidden");
      } else {
        header.classList.remove("is-hidden");
      }
      lastY = sy;
      ticking = false;
    };
    window.addEventListener("scroll", function () {
      if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
    }, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("load", onScroll);
    onScroll();
  }

  /* ---------- generic reveal (IntersectionObserver, CSS-driven) ----------
     visible() guards every "force reveal" so the bundle's off-screen route
     content isn't pre-revealed (which would kill its entrance on navigation).
     initReveal() is exposed so the router can (re-)wire a freshly shown route.

     [data-force-motion] (currently just "Selected work" / Projects-index rows)
     opts an element out of the reduced-motion short-circuit below, the same
     way the hero video already ignores prefers-reduced-motion — the site
     owner's call that this particular entrance is decorative enough, and
     wanted enough, to keep. Everything else still respects reduced-motion
     normally: reveal instantly, no animation. */
  var visible = function (el) { return el.offsetParent !== null || getComputedStyle(el).position === "fixed"; };
  var revio = ("IntersectionObserver" in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { entry.target.classList.add("is-in"); revio.unobserve(entry.target); }
    });
  }, { rootMargin: "0px 0px 12% 0px", threshold: 0.05 }) : null;
  function initReveal(scope) {
    scope = scope || document;
    var els = Array.prototype.slice.call(scope.querySelectorAll("[data-reveal]:not(.is-in)"));
    var vh = window.innerHeight;
    els.forEach(function (el) {
      var forceMotion = el.hasAttribute("data-force-motion");
      if (!revio || (reduce && !forceMotion)) { el.classList.add("is-in"); return; }
      if (visible(el) && el.getBoundingClientRect().top < vh * 1.1) el.classList.add("is-in");
      else revio.observe(el);
    });
  }
  initReveal(document);
  window.__archReveal = initReveal;

  // Failsafe: a few seconds after load, reveal anything still hidden — but only
  // if it's actually on the page (skip display:none route content in the bundle).
  window.addEventListener("load", function () {
    setTimeout(function () {
      document.querySelectorAll("[data-reveal]:not(.is-in)").forEach(function (el) {
        if (visible(el)) el.classList.add("is-in");
      });
      // the seam wordmark animates via GSAP; make sure it's never left hidden
      document.querySelectorAll(".hero-seam-word > span").forEach(function (s) {
        if (parseFloat(getComputedStyle(s).opacity) < 0.99) { s.style.opacity = 1; s.style.transform = "none"; }
      });
    }, 2600);
  });

  /* ---------- GSAP scroll effects: hero line reveal, image wipe, axon draw ----------
     Wrapped in a re-runnable function and exposed as window.__archScrollFx so the
     self-contained bundle's hash router can re-init it after a client-side route
     change (the effects are otherwise bound once, to elements that were
     display:none at load, so they never fire). scope defaults to the document. */
  var fxTriggers = [];
  function initScrollFx(scope) {
    scope = scope || document;

    if (reduce || !hasGSAP) {
      scope.querySelectorAll(".hero .line-mask > span, .hero-seam-word > span")
        .forEach(function (s) { s.style.transform = "none"; s.style.opacity = 1; });
      scope.querySelectorAll(".reveal-cover").forEach(function (c) { c.style.display = "none"; });
      scope.querySelectorAll(".axon [data-draw]").forEach(function (p) {
        p.style.strokeDashoffset = 0; p.style.strokeDasharray = "none";
      });
      return;
    }

    // tear down anything we made last time (so re-navigating a route re-plays it)
    fxTriggers.forEach(function (st) { try { st.kill(true); } catch (e) {} });
    fxTriggers = [];
    if (window.ScrollTrigger) window.gsap.registerPlugin(window.ScrollTrigger);

    var lines = scope.querySelectorAll(".hero .line-mask > span");
    if (lines.length) {
      window.gsap.fromTo(lines, { yPercent: 115 },
        { yPercent: 0, duration: 1.0, ease: "power3.out", stagger: 0.08, delay: 0.12, overwrite: true });
    }
    var seamWord = scope.querySelector(".hero-seam-word > span");
    if (seamWord) {
      window.gsap.fromTo(seamWord, { yPercent: 36, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 1.2, ease: "power3.out", delay: 0.15, overwrite: true });
    }
    var axon = scope.querySelector(".hero-axon");
    if (axon) window.gsap.fromTo(axon, { opacity: 0, x: 40 },
      { opacity: 0.16, x: 0, duration: 1.4, ease: "power2.out", delay: 0.35, overwrite: true });

    if (!window.ScrollTrigger) return;

    scope.querySelectorAll(".reveal-cover").forEach(function (cover) {
      var fig = cover.parentElement;
      var img = fig.querySelector("img");
      window.gsap.set(cover, { scaleX: 1 });
      if (img) window.gsap.set(img, { scale: 1 });
      var play = function () {
        var tl = window.gsap.timeline();
        tl.to(cover, { scaleX: 0, duration: 0.9, ease: "power3.inOut", transformOrigin: "left" });
        if (img) tl.from(img, { scale: 1.12, duration: 1.2, ease: "power2.out" }, 0);
      };
      var rect = fig.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight * 0.9) {
        play();                                    // already on screen — reveal it now
      } else if (window.ScrollTrigger) {
        fxTriggers.push(window.ScrollTrigger.create({ trigger: fig, start: "top 82%", once: true, onEnter: play }));
      } else {
        play();
      }
    });

    scope.querySelectorAll(".axon").forEach(function (svg) {
      var paths = svg.querySelectorAll("[data-draw]");
      paths.forEach(function (p) {
        try {
          var len = p.getTotalLength() || 1200;
          p.style.strokeDasharray = len;
          p.style.strokeDashoffset = len;
        } catch (e) {}
      });
      var tw = window.gsap.to(paths, {
        strokeDashoffset: 0, duration: 1.6, ease: "power2.out", stagger: 0.12,
        scrollTrigger: { trigger: svg, start: "top 82%" }
      });
      if (tw.scrollTrigger) fxTriggers.push(tw.scrollTrigger);
    });

    // failsafe: never leave a drawing half-done
    setTimeout(function () {
      scope.querySelectorAll(".axon [data-draw]").forEach(function (p) {
        if (parseFloat(p.style.strokeDashoffset) > 1) window.gsap.to(p, { strokeDashoffset: 0, duration: 0.5 });
      });
    }, 3000);

    window.ScrollTrigger.refresh();
  }

  initScrollFx(document);
  window.__archScrollFx = initScrollFx;
})();
