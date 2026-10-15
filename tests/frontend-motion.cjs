/* Finite decorative motion must never own visibility or navigation timing. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = fs.readFileSync(
  path.join(__dirname, "../assets/js/core/classic-motion.js"), "utf8"
);

function harness({ reduced = false, observerSupport = true, loading = false } = {}) {
  const handlers = new Map(), frames = new Map(), observers = [], animations = [];
  let frameId = 0;
  const preference = {
    matches: reduced,
    addEventListener(name, callback) { this.change = callback; },
  };
  const body = { classList: { contains: () => loading } };
  let article;
  const document = {
    readyState: "complete", body,
    querySelector(selector) {
      assert.equal(selector, "#main > article");
      return article;
    },
    addEventListener(name, callback) {
      if (!handlers.has(name)) handlers.set(name, []);
      handlers.get(name).push(callback);
    },
  };
  class Observer {
    constructor(callback) {
      this.callback = callback;
      this.targets = new Set();
      this.disconnected = false;
      observers.push(this);
    }
    observe(element) { this.targets.add(element); }
    unobserve(element) { this.targets.delete(element); }
    disconnect() { this.targets.clear(); this.disconnected = true; }
    enter(element) { this.callback([{ target: element, isIntersecting: true }]); }
  }
  const window = {
    innerHeight: 800,
    matchMedia: () => preference,
    addEventListener: document.addEventListener,
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
  };
  if (observerSupport) window.IntersectionObserver = Observer;
  const context = vm.createContext({ window, document, IntersectionObserver: Observer });
  const api = {
    observers, animations, frames, preference,
    card(top, hidden = false, className = "") {
      const element = {
        top, hidden, style: {},
        classList: { contains: name => name === className },
        getBoundingClientRect() { return { top: this.top, bottom: this.top + 100 }; },
        closest() { return this; },
        animate(keyframes, options) {
          let finish;
          const animation = {
            element, keyframes, options, cancelled: false,
            finished: new Promise(resolve => { finish = resolve; }),
            cancel() { this.cancelled = true; finish(); },
            finish,
          };
          animations.push(animation);
          return animation;
        },
      };
      return element;
    },
    mount(cards) {
      article = {
        contains: element => cards.includes(element),
        querySelectorAll: () => cards,
      };
    },
    boot() { vm.runInContext(source, context); },
    flush() {
      const queued = [...frames.values()];
      frames.clear();
      queued.forEach(callback => callback());
    },
    dispatch(name, extra = {}) {
      for (const callback of handlers.get(name) || []) callback(extra);
    },
    motion(reduce) { preference.matches = reduce; preference.change(); },
  };
  return api;
}

const h = harness();
const visible = h.card(100), below = h.card(1200), hidden = h.card(200, true);
const persistent = h.card(150);
h.mount([visible, below, hidden]);
h.boot();
h.flush();
assert.equal(h.animations.length, 1);
assert.equal(h.animations[0].element, visible);
assert(h.observers[0].targets.has(below));
assert(!h.observers[0].targets.has(hidden));
assert.equal(hidden.hidden, true);
assert.deepEqual(visible.style, {}, "Progressive animation must not write visibility styles");
h.dispatch("focusin", { target: persistent });
assert(!h.animations[0].cancelled, "Persistent rail content cannot cancel article motion");
h.observers[0].enter(below);
h.observers[0].enter(below);
assert.equal(h.animations.length, 2, "A scrolled card enters only once");
assert(!h.observers[0].targets.has(below));
h.animations.forEach(animation => {
  assert(animation.options.duration + animation.options.delay <= 400);
  assert.equal(animation.options.fill, "none", "Completion retains no presentation state");
});

hidden.hidden = false;
h.dispatch("site:publications-filtered", { detail: { revealed: [hidden] } });
assert.equal(h.animations.at(-1).element, hidden);
assert.equal(h.animations.length, 3, "Filter feedback applies only to newly exposed items");
h.dispatch("focusin", { target: hidden });
assert(h.animations.at(-1).cancelled, "Focused controls stop moving immediately");
h.motion(true);
assert(h.animations.every(animation => animation.cancelled));
assert(h.observers[0].disconnected);
h.dispatch("site:publications-filtered", { detail: { revealed: [hidden] } });
assert.equal(h.animations.length, 3, "Reduced motion suppresses filter decoration");
h.motion(false);
h.flush();
assert.equal(h.animations.length, 3, "Changing preference must not replay visible cards");

const previousObserver = h.observers.at(-1);
previousObserver.enter(below);
const playingBeforeSwap = h.animations.at(-1);
h.dispatch("site:before-content-replace");
assert(playingBeforeSwap.cancelled);
assert(previousObserver.disconnected);
const nextVisible = h.card(30), nextBelow = h.card(1500);
h.mount([nextVisible, nextBelow]);
h.dispatch("site:content-updated");
h.flush();
const beforeStale = h.animations.length;
previousObserver.enter(below);
assert.equal(h.animations.length, beforeStale, "A stale observer cannot animate replaced content");
assert(h.observers.at(-1).targets.has(nextBelow));
assert(!h.animations.some(a => a.element === nextVisible), "The existing page fade owns soft-navigation entry");
h.observers.at(-1).enter(nextBelow);
assert.equal(h.animations.at(-1).element, nextBelow);
h.dispatch("site:content-updated");
h.dispatch("site:content-updated");
assert.equal(h.frames.size, 1, "Repeated navigation replaces pending setup");
h.dispatch("site:before-content-replace");
assert.equal(h.frames.size, 0, "Cleanup cancels setup before a replacement");

const home = harness({ loading: true });
const homeCard = home.card(100);
home.mount([homeCard]); home.boot(); home.flush();
assert.equal(home.animations.length, 0, "The homepage loader owns its first entrance");
const reduced = harness({ reduced: true });
reduced.mount([reduced.card(100)]); reduced.boot(); reduced.flush();
assert.equal(reduced.observers.length, 0);
assert.equal(reduced.animations.length, 0);
const fallback = harness({ observerSupport: false });
const fallbackCard = fallback.card(100), offscreen = fallback.card(1800);
fallbackCard.animate = undefined;
fallback.mount([fallbackCard, offscreen]); fallback.boot(); fallback.flush();
assert.equal(fallback.animations.length, 0);
assert(!fallbackCard.hidden && !offscreen.hidden, "Unsupported animation/observer APIs leave everything readable");

const previews = harness();
const misc = previews.card(100, false, "misc-showcase");
previews.mount([misc]); previews.boot(); previews.flush();
assert(previews.animations[0].keyframes.every(frame => !("transform" in frame)),
  "A fixed hover preview must retain its viewport containing block");
previews.dispatch("beforeprint");
assert(previews.animations.every(animation => animation.cancelled));
assert(previews.observers[0].disconnected);
previews.dispatch("afterprint"); previews.flush();
assert.equal(previews.animations.length, 1, "Returning from print does not replay visible content");

console.log("PASS: finite entries, bounded stagger, one-time scroll reveals, filter feedback, focused controls, preference changes, soft-navigation cleanup, stale callbacks, loader ownership, fixed preview geometry, print cleanup and API fallback");
