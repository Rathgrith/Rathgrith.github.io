/* Receding-horizon steering using only hazards already visible on the field. */
(function (scope) {
  "use strict";
  var cell = 40,
    columns = 6,
    rows = 9;
  var interval = 0.08,
    bulletLegs = [2, 3, 4, 6],
    beamLegs = [2, 3, 4, 6, 8, 7];
  var directions = [{ x: 0, y: 0, focus: true }];
  for (var speed = 0; speed < 2; speed++) {
    for (var angle = 0; angle < 8; angle++) {
      directions.push({
        x: Math.cos((angle * Math.PI) / 4),
        y: Math.sin((angle * Math.PI) / 4),
        focus: speed === 0,
      });
    }
  }
  function clamp(x, lo, hi) {
    return Math.max(lo, Math.min(hi, x));
  }

  // Index swept projectiles by time and location. Each route segment only
  // queries its midpoint cell; inflate insertion bounds by half a pilot step.
  function forecast(o, steps) {
    var frames = Array.from({ length: steps }, function () {
      return { cells: [], beams: [] };
    });
    function track(b) {
      var x = b.x,
        y = b.y,
        vx = b.vx || 0,
        vy = b.vy || 0;
      var script = b.inscribing && b.motion && b.motion.inscription;
      var wait = script ? Math.max(0, script.launch - (b.age || 0)) : 0;
      if (wait >= steps * interval) return;
      if (script) {
        x = script.lockX; y = script.lockY;
        vx = script.vx; vy = script.vy;
      }
      var radius = (b.radius || 2.5) + o.player.radius;
      var pad = radius + 12 + (o.speed * interval) / 2;
      var reach =
        (o.speed + Math.sqrt(vx * vx + vy * vy)) * steps * interval + pad;
      if (Math.abs(x - o.player.x) > reach || Math.abs(y - o.player.y) > reach)
        return;
      var turn = b.curve || 0;
      for (var i = Math.floor(wait / interval); i < steps; i++) {
        var from = Math.max(0, wait / interval - i);
        var dx = vx * interval * (1 - from),
          dy = vy * interval * (1 - from);
        if (turn) {
          var a = turn * interval,
            c = Math.cos(a),
            s = Math.sin(a);
          var nx = vx * c - vy * s,
            ny = vx * s + vy * c;
          dx = ((vx + nx) * interval) / 2;
          dy = ((vy + ny) * interval) / 2;
          vx = nx;
          vy = ny;
          if (b.curveDecay) turn *= Math.exp(-b.curveDecay * interval);
        }
        var margin = pad + (i + 1) * interval * o.speed;
        if (
          Math.abs(x + dx / 2 - o.player.x) <= margin + Math.abs(dx) / 2 &&
          Math.abs(y + dy / 2 - o.player.y) <= margin + Math.abs(dy) / 2
        ) {
          var entry = { x: x, y: y, dx: dx, dy: dy, radius: radius, from: from };
          var cells = frames[i].cells;
          var left = Math.max(
            0,
            Math.floor((Math.min(x, x + dx) - pad) / cell)
          );
          var right = Math.min(
            columns - 1,
            Math.floor((Math.max(x, x + dx) + pad) / cell)
          );
          var top = Math.max(0, Math.floor((Math.min(y, y + dy) - pad) / cell));
          var bottom = Math.min(
            rows - 1,
            Math.floor((Math.max(y, y + dy) + pad) / cell)
          );
          for (var cy = top; cy <= bottom; cy++) {
            for (var cx = left; cx <= right; cx++) {
              var index = cy * columns + cx;
              (cells[index] || (cells[index] = [])).push(entry);
            }
          }
        }
        x += dx;
        y += dy;
      }
    }
    o.bullets.forEach(track);
    o.foes.forEach(track);

    function pose(beam, time) {
      var p = o.laserPose(beam, time);
      return { x: p.x, y: p.y, cos: Math.cos(p.angle), sin: Math.sin(p.angle) };
    }
    o.lasers.forEach(function (beam) {
      for (var i = 0; i < steps; i++) {
        var time = i * interval;
        var start = Math.max(time, beam.warning - beam.age);
        var end = Math.min(
          time + interval,
          beam.warning + beam.duration - beam.age
        );
        if (end <= start) continue;
        frames[i].beams.push({
          a: pose(beam, start),
          b: pose(beam, end),
          from: (start - time) / interval,
          to: (end - time) / interval,
          width: beam.width / 2 + o.player.radius,
          spread: beam.spread || 0,
          length: beam.length || 460,
        });
      }
    });
    return frames;
  }

  function beamGap(beam, x, y, dx, dy) {
    var ax = x + dx * beam.from - beam.a.x,
      ay = y + dy * beam.from - beam.a.y;
    var bx = x + dx * beam.to - beam.b.x,
      by = y + dy * beam.to - beam.b.y;
    var d0 = ax * beam.a.cos + ay * beam.a.sin,
      d1 = bx * beam.b.cos + by * beam.b.sin;
    if (Math.max(d0, d1) < 0 || Math.min(d0, d1) > beam.length) return Infinity;
    var s0 = ay * beam.a.cos - ax * beam.a.sin,
      s1 = by * beam.b.cos - bx * beam.b.sin;
    var side = s0 * s1 <= 0 ? 0 : Math.min(Math.abs(s0), Math.abs(s1));
    return side - beam.width - Math.max(d0, d1) * beam.spread;
  }

  function extend(o, frames, node, action, start, end) {
    var speed = action.focus ? o.slowSpeed : o.speed;
    var sx = action.x * speed * interval,
      sy = action.y * speed * interval;
    var x = node.x,
      y = node.y,
      cost = node.cost,
      impact = node.impact;
    for (var i = start; i < end; i++) {
      var nx = clamp(x + sx, 9, 231),
        ny = clamp(y + sy, o.top, 348);
      var dx = nx - x,
        dy = ny - y;
      var time = i * interval;
      if (time + interval > o.player.invulnerable) {
        var frame = frames[i];
        var index =
          Math.floor((y + ny) / (2 * cell)) * columns +
          Math.floor((x + nx) / (2 * cell));
        var nearby = frame.cells[index],
          gap = Infinity;
        if (nearby) {
          for (var j = 0; j < nearby.length; j++) {
            var b = nearby[j],
              rx = b.x - x - dx * b.from,
              ry = b.y - y - dy * b.from,
              vx = b.dx - dx * (1 - b.from),
              vy = b.dy - dy * (1 - b.from);
            var relative = vx * vx + vy * vy;
            var t = relative ? clamp(-(rx * vx + ry * vy) / relative, 0, 1) : 0;
            var ex = rx + vx * t,
              ey = ry + vy * t,
              distance2 = ex * ex + ey * ey;
            if (distance2 < (b.radius + 12) * (b.radius + 12))
              gap = Math.min(gap, Math.sqrt(distance2) - b.radius);
          }
        }
        for (var l = 0; l < frame.beams.length; l++)
          gap = Math.min(gap, beamGap(frame.beams[l], x, y, dx, dy));
        // A fatal path must lose to a narrow safe passage. Discount far-out
        // forecasts, which become less reliable as new volleys appear.
        var discount = 1 / (1 + time * 3);
        if (gap < 0.35) {
          impact = Math.min(impact, time);
          cost += (3000 + Math.min(24, 0.35 - gap) * 140) * discount * discount;
        } else if (gap < 11) {
          var tight = (11 - gap) / 11;
          cost += 18 * tight * tight * discount;
        }
      }
      x = nx;
      y = ny;
    }
    var edge = Math.min(x - 9, 231 - x, 348 - y);
    var gx = x - o.goal.x,
      gy = y - o.goal.y;
    cost += Math.sqrt(gx * gx + gy * gy) * 0.047;
    cost += Math.max(0, 24 - edge) * 0.23 + Math.max(0, 118 - y) * 0.07;
    if (o.preferFocus && !action.focus) cost += 0.6;
    if (action !== node.action) cost += 0.22;
    return {
      x: x,
      y: y,
      cost: cost,
      impact: impact,
      first: node.first || action,
      action: action,
    };
  }

  function steer(o) {
    var legs = o.lasers.length ? beamLegs : bulletLegs;
    var frames = forecast(
      o,
      legs.reduce(function (sum, n) {
        return sum + n;
      }, 0)
    );
    var routes = [
      {
        x: o.player.x,
        y: o.player.y,
        cost: 0,
        impact: Infinity,
        action: o.previous,
      },
    ];
    var start = 0,
      choices;
    for (var k = 0; k < legs.length; k++) {
      var end = start + legs[k];
      choices = [];
      for (var n = 0; n < routes.length; n++) {
        for (var a = 0; a < directions.length; a++) {
          choices.push(extend(o, frames, routes[n], directions[a], start, end));
        }
      }
      choices.sort(function (a, b) {
        return a.cost - b.cost;
      });
      if (k === legs.length - 1) break;
      // Keep spatially distinct exits, so a cheap first step toward a closed
      // corridor cannot discard every path that starts by stepping sideways.
      routes = [];
      for (var c = 0; c < choices.length && routes.length < 6; c++) {
        var next = choices[c];
        if (
          routes.every(function (r) {
            return (r.x - next.x) ** 2 + (r.y - next.y) ** 2 > 45;
          })
        )
          routes.push(next);
      }
      start = end;
    }
    var best = choices[0];
    // An uninterrupted retreat can be necessary against a wide sweep. Keep
    // those paths even if the first few steps lead away from a useful target.
    if (o.lasers.length) {
      directions.forEach(function (action) {
        var direct = {
          x: o.player.x,
          y: o.player.y,
          cost: 0,
          impact: Infinity,
          action: o.previous,
        };
        var at = 0;
        for (var k = 0; k < legs.length; k++) {
          direct = extend(o, frames, direct, action, at, at + legs[k]);
          at += legs[k];
        }
        if (direct.cost < best.cost) best = direct;
      });
    }
    return {
      x: best.first.x,
      y: best.first.y,
      focus: best.first.focus,
      impact: best.impact,
      nextAction: best.first,
    };
  }

  if (typeof module !== "undefined" && module.exports)
    module.exports = { steer: steer };
  else scope.DanmakuPilot = { steer: steer };
})(typeof window !== "undefined" ? window : globalThis);
