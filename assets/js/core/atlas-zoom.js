/* Pan and zoom the whole projected map, including its markers. */
(function () {
  "use strict";

  var steps = [1, 1.5, 2, 3, 4];
  var mounted = new WeakSet();
  var onResize = new WeakMap();
  var observer = window.ResizeObserver && new ResizeObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.target.isConnected) onResize.get(entry.target)();
      else observer.unobserve(entry.target);
    });
  });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function mount(root) {
    if (mounted.has(root)) return;
    var view = root.querySelector("[data-atlas-viewport]");
    var layer = root.querySelector("[data-atlas-layer]");
    var controls = root.querySelector(".atlas-zoom__controls");
    if (!view || !layer || !controls) return;
    mounted.add(root);

    // MapMyVisitors zooms its SVG on touch, but its raster stays fixed. The
    // surrounding viewport must handle the gesture for both layers together.
    var wrapsProvider = !!layer.querySelector("[data-visitor-map-mount]");

    var zoomIn = controls.querySelector("[data-atlas-zoom-in]");
    var zoomOut = controls.querySelector("[data-atlas-zoom-out]");
    var reset = controls.querySelector("[data-atlas-reset]");
    var output = controls.querySelector("[data-atlas-scale]");
    var scale = 1, x = 0, y = 0;
    var width = 0, height = 0;
    var drag = null, touches = [];
    var touchStart = null, touchMoved = false;
    var pendingFocus = false;
    var suppressClickUntil = 0;

    function render() {
      x = clamp(x, width * (1 - scale), 0);
      y = clamp(y, height * (1 - scale), 0);
      layer.style.transform = "translate(" + x + "px," + y + "px) scale(" + scale + ")";
      root.toggleAttribute("data-atlas-magnified", scale > 1);
      root.style.setProperty("--atlas-zoom-scale", scale);
      zoomIn.disabled = scale === steps[steps.length - 1];
      zoomOut.disabled = reset.disabled = scale === 1;
      var percent = Math.round(scale * 100) + "%";
      if (output.textContent !== percent) output.textContent = percent;
    }

    function resize() {
      var nextWidth = view.clientWidth, nextHeight = view.clientHeight;
      // A closed sheet has no dimensions. Keep its geographic center for reopening.
      if (!nextWidth || !nextHeight) return;
      if (width) x *= nextWidth / width;
      if (height) y *= nextHeight / height;
      width = nextWidth;
      height = nextHeight;
      render();
      if (pendingFocus) {
        pendingFocus = false;
        var focus = focalPoint();
        if (focus.x < 0 || focus.x > width || focus.y < 0 || focus.y > height) {
          magnify(scale, focus, center());
        }
      }
    }

    function local(clientX, clientY) {
      var box = view.getBoundingClientRect();
      return { x: (clientX - box.left) * width / box.width, y: (clientY - box.top) * height / box.height };
    }

    function center() {
      return { x: width / 2, y: height / 2 };
    }

    function magnify(next, from, to) {
      next = clamp(next, 1, steps[steps.length - 1]);
      x = to.x - (from.x - x) * next / scale;
      y = to.y - (from.y - y) * next / scale;
      scale = next;
      render();
    }

    function focalPoint() {
      var focus = layer.querySelector("[data-atlas-focal]");
      if (!focus) return center();
      var box = focus.getBoundingClientRect();
      return local(box.left + box.width / 2, box.top + box.height / 2);
    }

    function step(direction) {
      if (!width || !height) resize();
      if (!width || !height) return;
      var next = direction > 0 ? steps.find(function (v) { return v > scale + .001; })
        : steps.slice().reverse().find(function (v) { return v < scale - .001; });
      magnify(next === undefined ? (direction > 0 ? 4 : 1) : next, focalPoint(), center());
    }

    root.addEventListener("atlas:focal-change", function () {
      // Hidden tabs keep the request until their map has measurable dimensions.
      pendingFocus = scale > 1;
      if (pendingFocus) resize();
    });

    controls.addEventListener("click", function (event) {
      var button = event.target.closest("button");
      if (button === zoomIn) step(1);
      if (button === zoomOut) step(-1);
      if (button === reset) magnify(1, center(), center());
    });

    view.addEventListener("keydown", function (event) {
      if (event.target !== view || event.ctrlKey || event.metaKey || event.altKey) return;
      var increment = event.shiftKey ? 80 : 24;
      switch (event.key) {
        case "+": case "=": step(1); break;
        case "-": case "−": step(-1); break;
        case "0": case "Home": magnify(1, center(), center()); break;
        case "ArrowRight": case "ArrowLeft": case "ArrowUp": case "ArrowDown":
          if (scale === 1 || (event.shiftKey && layer.querySelector("[data-atlas-focal]"))) return;
          if (event.key === "ArrowRight") x -= increment;
          if (event.key === "ArrowLeft") x += increment;
          if (event.key === "ArrowDown") y -= increment;
          if (event.key === "ArrowUp") y += increment;
          render();
          break;
        default: return;
      }
      event.preventDefault();
      event.stopPropagation();
    });

    view.addEventListener("wheel", function (event) {
      if (!event.ctrlKey || !event.deltaY) return;
      event.preventDefault();
      var point = local(event.clientX, event.clientY);
      var unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
      magnify(scale * Math.exp(-event.deltaY * unit / 300), point, point);
    }, { passive: false });

    view.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "touch" || event.button !== 0) return;
      suppressClickUntil = 0;
      if (scale === 1 || drag) return;
      var point = local(event.clientX, event.clientY);
      drag = { id: event.pointerId, start: point, point: point, moved: false };
      // Capture on the pressed element to preserve a click on an individual
      // station when the pointer comes back up without a drag.
      event.target.setPointerCapture(event.pointerId);
      view.focus({ preventScroll: true });
      event.preventDefault();
    });
    view.addEventListener("pointermove", function (event) {
      if (!drag || drag.id !== event.pointerId) return;
      var point = local(event.clientX, event.clientY);
      if (!drag.moved && Math.hypot(point.x - drag.start.x, point.y - drag.start.y) < 5) return;
      drag.moved = true;
      view.setAttribute("data-atlas-dragging", "");
      x += point.x - drag.point.x;
      y += point.y - drag.point.y;
      drag.point = point;
      render();
    });
    function endDrag(event) {
      if (!drag || drag.id !== event.pointerId) return;
      if (drag.moved) suppressClickUntil = performance.now() + 500;
      drag = null;
      view.removeAttribute("data-atlas-dragging");
    }
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (type) {
      view.addEventListener(type, endDrag);
    });

    function fingers(event) {
      return Array.from(event.touches).filter(function (touch) {
        return view.contains(touch.target);
      }).slice(0, 2).map(function (touch) { return local(touch.clientX, touch.clientY); });
    }
    function middle(a, b) {
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    function updateTouches(event) {
      if (wrapsProvider && layer.contains(event.target)) event.stopPropagation();
      var current = fingers(event);
      if (event.type === "touchstart" && !touches.length) {
        suppressClickUntil = 0;
        touchStart = current[0];
        touchMoved = false;
      }
      if (current.length === 2) {
        touchMoved = true;
        if (event.cancelable) event.preventDefault();
        if (event.type === "touchmove" && touches.length === 2) {
          var before = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
          var after = Math.hypot(current[0].x - current[1].x, current[0].y - current[1].y);
          if (before > 0) magnify(scale * after / before, middle(touches[0], touches[1]), middle(current[0], current[1]));
        }
      } else if (event.type === "touchmove" && current.length === 1 && touches.length === 1) {
        var from = touchMoved ? touches[0] : touchStart;
        if (from && (touchMoved || Math.hypot(current[0].x - from.x, current[0].y - from.y) >= 5)) {
          touchMoved = true;
          if (scale > 1) {
            if (event.cancelable) event.preventDefault();
            x += current[0].x - from.x;
            y += current[0].y - from.y;
            render();
          }
        }
      }
      if (!current.length && (touchMoved || event.type === "touchcancel")) {
        suppressClickUntil = performance.now() + 500;
      }
      touches = current;
    }
    ["touchstart", "touchmove", "touchend", "touchcancel"].forEach(function (type) {
      view.addEventListener(type, updateTouches, { capture: wrapsProvider, passive: false });
    });

    function preventGestureClick(event) {
      var afterGesture = event.detail > 0 && performance.now() < suppressClickUntil;
      if (afterGesture || (scale > 1 && event.target.closest("a"))) {
        suppressClickUntil = 0;
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }
    view.addEventListener("click", preventGestureClick, true);
    view.addEventListener("auxclick", preventGestureClick, true);
    view.addEventListener("dragstart", function (event) {
      if (scale > 1) event.preventDefault();
    });

    controls.hidden = false;
    render();
    resize();
    if (observer) {
      onResize.set(view, resize);
      observer.observe(view);
    } else window.addEventListener("resize", resize);
  }

  function init() {
    document.querySelectorAll("[data-atlas-zoom]").forEach(mount);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  document.addEventListener("site:content-updated", init);
})();
