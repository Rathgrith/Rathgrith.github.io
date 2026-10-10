/* Recognizable spell motifs, adapted for the 240×360 score-attack arena. */
(function (scope) {
  "use strict";
  var spellPatterns = {
    alice:
      typeof module !== "undefined" && module.exports
        ? require("./danmaku-patterns-alice.js")
        : scope.DanmakuAlicePatterns,
    marisa:
      typeof module !== "undefined" && module.exports
        ? require("./danmaku-patterns-marisa.js")
        : scope.DanmakuMarisaPatterns,
    patchouli:
      typeof module !== "undefined" && module.exports
        ? require("./danmaku-patterns-patchouli.js")
        : scope.DanmakuPatchouliPatterns,
  };
  var TAU = Math.PI * 2;
  var cards = {
    alice: [
      { id: "france", name: "蒼符「博愛の仏蘭西人形」" },
      { id: "london", name: "闇符「霧の倫敦人形」" },
      { id: "holland", name: "紅符「紅毛の和蘭人形」" },
      { id: "russia", name: "白符「白亜の露西亜人形」" },
      { id: "shanghai", name: "咒詛「魔彩光の上海人形」" },
      { id: "tibet", name: "廻符「輪廻の西蔵人形」" },
    ],
    marisa: [
      { id: "stardust", name: "魔符「スターダストレヴァリエ」" },
      { id: "milky", name: "魔符「ミルキーウェイ」" },
      { id: "asteroid", name: "魔空「アステロイドベルト」" },
      { id: "nondirectional", name: "恋符「ノンディレクショナルレーザー」" },
      { id: "master", name: "恋符「マスタースパーク」" },
      { id: "finalspark", name: "魔砲「ファイナルスパーク」" },
    ],
    patchouli: [
      { id: "agni", name: "火符「アグニシャイン」" },
      { id: "undine", name: "水符「プリンセスウンディネ」" },
      { id: "trilithon", name: "土符「レイジィトリリトン」" },
      { id: "sylphy", name: "木符「シルフィホルン」" },
      { id: "flare", name: "日符「ロイヤルフレア」" },
      { id: "philosopher", name: "火水木金土符「賢者の石」" },
    ],
  };
  var elements = ["#f5a084", "#8cdcf6", "#b3df97", "#f4d883", "#c5a5f1"];
  var nonspells = {
    france: "糸繰りの行進",
    london: "薄霧の輪舞",
    holland: "風車の小径",
    russia: "白磁の列",
    shanghai: "光糸の交差",
    tibet: "巡る人形",
    stardust: "星屑の挨拶",
    asteroid: "小惑星の輪",
    milky: "流星の交差",
    nondirectional: "光線の試射",
    master: "星の連射",
    finalspark: "彗星の余韻",
    agni: "火花の連なり",
    undine: "水面の波紋",
    sylphy: "木の葉の流れ",
    trilithon: "石柱の回廊",
    flare: "陽光の環",
    philosopher: "五色の調律",
  };
  function difficulty(s) {
    var stage = Math.max(
      0,
      cards[s.enemyId].findIndex(function (card) {
        return card.id === s.enemySpell.id;
      })
    );
    var cycle = Math.min(6, s.rhythm.cycle || 0),
      energy = s.rhythm.energy;
    var extra = Math.floor(cycle / 2);
    if (["agni", "undine", "asteroid"].indexOf(s.enemySpell.id) >= 0)
      extra = Math.min(1, extra);
    return {
      stage: stage,
      cycle: cycle,
      speed:
        [58, 64, 72, 80, 87, 96][stage] *
        (1 + cycle * 0.04) *
        (0.97 + energy * 0.06),
      density: stage + 1 + extra,
      warning: [1.3, 1.24, 1.18, 1.12, 1.06, 1][stage] / (1 + cycle * 0.025),
    };
  }
  function interludeEmitters(s) {
    var boss = s.boss,
      list = [],
      id = s.enemySpell.id,
      t = s.rhythm.trackTime;
    if (s.enemyId === "alice") {
      var count =
        id === "france" || id === "shanghai" || id === "tibet"
          ? 4
          : id === "holland"
            ? 5
            : 6;
      for (var i = 0; i < count; i++) {
        var side = i % 2 ? 1 : -1,
          row = Math.floor(i / 2);
        var x = 120 + side * (42 + row * 26),
          y = 44 + row * 23 + Math.sin(t * 0.8 + i) * 5;
        if (id === "holland") {
          x = 32 + i * 44;
          y = 48 + (i % 2) * 17;
        }
        if (id === "russia" || id === "tibet") {
          var angle = (i * TAU) / count + t * (id === "tibet" ? 0.7 : 0.3);
          x = boss.x + Math.cos(angle) * 64;
          y = 70 + Math.sin(angle) * 35;
        }
        list.push({
          x: x,
          y: y,
          color: i % 2 ? "#eea2be" : "#96dff3",
          kind: "doll",
        });
      }
    } else if (id === "philosopher") {
      for (var e = 0; e < 5; e++) {
        var a = (e * TAU) / 5 + t * 0.24;
        list.push({
          x: boss.x + Math.cos(a) * 42,
          y: boss.y + Math.sin(a) * 27,
          color: elements[e],
          kind: "element",
          glyph: ["火", "水", "木", "金", "土"][e],
        });
      }
    } else if (id === "undine") {
      list = [
        { x: 48, y: 65, color: "#8cdcf6", kind: "water" },
        { x: 192, y: 65, color: "#b4b3f0", kind: "water" },
      ];
    } else if (
      ["asteroid", "milky", "nondirectional", "master", "finalspark"].indexOf(
        id
      ) >= 0
    ) {
      list = [
        {
          x: boss.x,
          y: boss.y + 10,
          color:
            id === "milky"
              ? "#ee8eae"
              : id === "asteroid"
                ? "#c39ce8"
                : "#a0ebc5",
          kind: "familiar",
        },
      ];
    } else if (id === "agni" || id === "trilithon") {
      for (var column = 0; column < 3; column++)
        list.push({
          x: 34 + column * 86,
          y: 48 + (column % 2) * 12,
          color: id === "agni" ? "#f3a282" : "#dbbf87",
          kind: "element",
          glyph: id === "agni" ? "火" : "土",
        });
    } else if (id === "sylphy") {
      list = [
        { x: 18, y: 65, color: "#a6dfaf", kind: "element", glyph: "木" },
        { x: 222, y: 85, color: "#9acecb", kind: "element", glyph: "木" },
      ];
    }
    return list;
  }
  // Each card owns its formation; firing coordinates and visible familiars share
  // this function so a volley always begins at the sprite that produced it.
  function emitters(s) {
    if (s.enemySpell.nonspell) return interludeEmitters(s);
    return spellPatterns[s.enemyId].emitters(s);
  }
  function bossPosition(s) {
    var pattern = spellPatterns[s.enemyId];
    return !s.enemySpell.nonspell && pattern.bossPosition
      ? pattern.bossPosition(s)
      : null;
  }
  // Motion changes are one-shot, deterministic and independent of frame rate.
  // A cleared parent can never produce invisible delayed children afterwards.
  function advanceBullet(b, dt, spawn, target) {
    b.age = (b.age || 0) + dt;
    if (Math.hypot(b.vx, b.vy) > 0.001) b.heading = Math.atan2(b.vy, b.vx);
    var m = b.motion || {},
      change = m.redirect,
      ramp = m.decelerate;
    if (ramp && !b.rampComplete && b.age >= ramp.from) {
      if (b.rampStartSpeed === undefined)
        b.rampStartSpeed = Math.hypot(b.vx, b.vy);
      var progress = Math.min(
          1,
          (b.age - ramp.from) / Math.max(0.001, ramp.to - ramp.from)
        ),
        heading = Math.atan2(b.vy, b.vx),
        speed = b.rampStartSpeed + (ramp.speed - b.rampStartSpeed) * progress;
      b.vx = Math.cos(heading) * speed;
      b.vy = Math.sin(heading) * speed;
      b.rampComplete = progress >= 1;
    }
    if (
      change &&
      !b.redirected &&
      (change.y !== undefined ? b.y >= change.y : b.age >= change.at)
    ) {
      var a = change.angle,
        v = change.speed;
      // A formation can expand first, then aim as one body. Share this small
      // latch across its bullets: sample once at the turn, never home each grain.
      if (change.aim && target) {
        if (change.aim.angle === undefined)
          change.aim.angle = Math.atan2(
            target.y - change.aim.y,
            target.x - change.aim.x
          );
        a = change.aim.angle;
      }
      if (change.duration) {
        b.redirectStart = change.y !== undefined ? b.age : change.at;
        b.redirectHeading = b.heading || 0;
        b.redirectSpeed = Math.hypot(b.vx, b.vy);
        b.redirectTarget = a;
      } else {
        b.vx = Math.cos(a) * v;
        b.vy = Math.sin(a) * v;
      }
      b.curve = 0;
      b.redirected = true;
    }
    if (b.redirected && change.duration && !b.redirectComplete) {
      var progress = Math.min(1, (b.age - b.redirectStart) / change.duration),
        ease = progress * progress * (3 - 2 * progress),
        delta = b.redirectTarget - b.redirectHeading,
        arc = Math.atan2(Math.sin(delta), Math.cos(delta)),
        a = b.redirectHeading + arc * ease,
        v = b.redirectSpeed + (change.speed - b.redirectSpeed) * ease;
      b.vx = Math.cos(a) * v;
      b.vy = Math.sin(a) * v;
      b.redirectComplete = progress >= 1;
    }
    if (m.release && !b.released && b.age >= m.release.at) {
      var a =
        m.release.angle === undefined
          ? Math.atan2(b.vy, b.vx)
          : m.release.angle;
      b.vx = Math.cos(a) * m.release.speed;
      b.vy = Math.sin(a) * m.release.speed;
      b.released = true;
    }
    if (b.curve) {
      var a = b.curve * dt,
        vx = b.vx;
      b.vx = vx * Math.cos(a) - b.vy * Math.sin(a);
      b.vy = vx * Math.sin(a) + b.vy * Math.cos(a);
      if (b.curveDecay) b.curve *= Math.exp(-b.curveDecay * dt);
    }
    if (Math.hypot(b.vx, b.vy) > 0.001) b.heading = Math.atan2(b.vy, b.vx);
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (m.split && b.age >= m.split.at) {
      var split = m.split,
        base = Math.atan2(b.vy, b.vx) + (split.angleOffset || 0);
      for (var i = 0; i < split.count; i++)
        spawn(
          b.x,
          b.y,
          base + (i - (split.count - 1) / 2) * split.spread,
          split.speed,
          split.color || b.color,
          split.shape || b.shape,
          split.motion
        );
      return false;
    }
    return true;
  }
  function emit(s, tick, api) {
    var b = s.boss,
      p = s.player,
      id = s.enemySpell.id;
    var local = tick % 128,
      beat = Math.floor(local / 2),
      whole = local % 2 === 0;
    var level = difficulty(s),
      speed = level.speed,
      density = level.density;
    var aim = Math.atan2(p.y - b.y, p.x - b.x),
      sources = emitters(s);
    var quarter = s.rhythm.beatDuration;
    function beam(
      x,
      y,
      angle,
      width,
      warning,
      duration,
      color,
      sweep,
      anchor,
      spread
    ) {
      api.laser(
        x,
        y,
        angle,
        width,
        warning * level.warning,
        duration,
        color,
        sweep,
        anchor,
        spread
      );
    }
    function fan(x, y, a, n, spread, v, color, shape, curve) {
      var original = n;
      n = Math.max(3, Math.round(n * (1 + level.cycle * 0.04)));
      spread *= (original - 1) / (n - 1);
      for (var j = 0; j < n; j++)
        api.bullet(
          x,
          y,
          a + (j - (n - 1) / 2) * spread,
          v,
          color,
          shape,
          curve
        );
    }
    function ring(x, y, n, a, v, color, shape, curve, gap) {
      n = Math.max(6, Math.round(n * (1 + level.cycle * 0.04)));
      for (var j = 0; j < n; j++) {
        var angle = a + (j * TAU) / n;
        if (
          gap !== undefined &&
          Math.abs(Math.atan2(Math.sin(angle - gap), Math.cos(angle - gap))) <
            0.15
        )
          continue;
        api.bullet(x, y, angle, v, color, shape, curve);
      }
    }
    if (s.enemySpell.nonspell) {
      speed *= 0.84;
      var n = 4 + Math.floor(density / 3),
        d,
        side;
      if (id === "france" && local % 4 === 0) {
        sources
          .filter(function (_, i) {
            return i % 2 === (beat / 2) % 2;
          })
          .forEach(function (d) {
            fan(
              d.x,
              d.y,
              Math.atan2(p.y - d.y, p.x - d.x),
              n,
              0.22,
              speed,
              d.color,
              "kunai"
            );
          });
      } else if (id === "london" && local % 4 === 0) {
        d = sources[(beat / 2) % sources.length];
        ring(
          d.x,
          d.y,
          12 + Math.floor(density / 2),
          beat * 0.2,
          speed * 0.8,
          d.color,
          "butterfly",
          { turn: 0.3, decay: 1 }
        );
      } else if (id === "holland" && whole) {
        d = sources[beat % 5];
        for (var petal = 0; petal < 3; petal++)
          fan(
            d.x,
            d.y,
            (petal * TAU) / 3 + beat * 0.25,
            3,
            0.1,
            speed,
            d.color,
            "scale"
          );
      } else if (id === "russia" && local % 4 === 0) {
        for (var column = 0; column < 6; column++)
          if (column !== Math.floor(beat / 2) % 6)
            fan(
              24 + column * 38,
              58,
              Math.PI / 2 + (column % 2 ? 0.1 : -0.1),
              3,
              0.055,
              speed,
              "#dceaf6",
              "rice"
            );
      } else if (id === "shanghai") {
        d = sources[Math.floor(beat / 4) % sources.length];
        if (local % 8 === 0)
          beam(
            d.x,
            d.y,
            Math.atan2(p.y - d.y, p.x - d.x),
            3,
            quarter * 4,
            quarter * 2,
            d.color,
            0
          );
        if (local % 4 === 2)
          fan(b.x, b.y, aim, n, 0.24, speed, "#e6b1d7", "amulet");
      } else if (id === "tibet" && whole) {
        d = sources[beat % sources.length];
        fan(
          d.x,
          d.y,
          Math.PI / 2 + Math.sin(beat * 0.3) * 0.5,
          n + 1,
          0.17,
          speed,
          d.color,
          "butterfly",
          { turn: beat % 2 ? 0.4 : -0.4, decay: 1.2 }
        );
      } else if (id === "stardust" && local % 4 === 0) {
        for (side = -1; side <= 1; side++)
          fan(
            b.x,
            b.y,
            Math.PI / 2 + side * 0.7 + Math.sin(beat * 0.2) * 0.2,
            3,
            0.13,
            speed,
            side ? "#e7bbf0" : "#f8d892",
            "smallstar"
          );
      } else if (id === "asteroid" && local % 4 === 0) {
        ring(
          b.x + (beat % 4 ? -22 : 22),
          b.y,
          12 + Math.floor(density / 2),
          beat * 0.17,
          speed * (beat % 4 ? 0.78 : 1),
          "#c7b5ed",
          beat % 4 ? "bigstar" : "smallstar"
        );
      } else if (id === "milky") {
        if (local % 4 === 0)
          for (side = -1; side <= 1; side += 2)
            fan(
              b.x + side * 42,
              b.y,
              Math.PI / 2 - side * 0.5,
              n,
              0.13,
              speed,
              side < 0 ? "#ecb2d4" : "#addbf3",
              "smallstar"
            );
        if (local % 8 === 3)
          fan(b.x, b.y, aim, 3, 0.3, speed * 1.18, "#f5d48c", "star");
      } else if (id === "nondirectional") {
        if (local % 16 === 0)
          for (side = -1; side <= 1; side += 2)
            beam(
              b.x,
              b.y,
              aim + side * 0.34,
              3,
              quarter * 4,
              quarter * 2,
              "#b9e6e7",
              0,
              "boss"
            );
        if (local % 8 === 4)
          ring(
            b.x,
            b.y,
            16 + Math.floor(density / 2),
            beat * 0.2,
            speed,
            "#e9b9df",
            "smallstar"
          );
      } else if (id === "master") {
        if (local % 4 === 0)
          fan(b.x, b.y, aim, n, 0.18, speed * 1.15, "#f1d195", "bigstar");
        if (local % 4 === 2)
          for (side = -1; side <= 1; side += 2)
            fan(
              b.x + side * 28,
              b.y,
              Math.PI / 2 + side * 0.4,
              3,
              0.16,
              speed,
              "#b9d7f6",
              "smallstar"
            );
      } else if (id === "finalspark" && whole) {
        for (side = -1; side <= 1; side += 2)
          fan(
            b.x + side * 24,
            b.y,
            Math.PI / 2 + side * 0.6,
            n,
            0.12,
            speed,
            side < 0 ? "#f0afc0" : "#b2c5f4",
            "star",
            { turn: -side * 0.5, decay: 1.4 }
          );
      } else if (id === "agni" && local % 4 === 0) {
        d = sources[(beat / 2) % 3];
        fan(
          d.x,
          d.y,
          Math.atan2(p.y - d.y, p.x - d.x),
          n + 2,
          0.18,
          speed,
          "#efa18a",
          "flame"
        );
      } else if (id === "undine") {
        if (local % 4 === 0) {
          d = sources[(beat / 2) % 2];
          ring(
            d.x,
            d.y,
            12 + Math.floor(density / 2),
            beat * 0.17,
            speed * 0.82,
            d.color,
            "bubble"
          );
        }
        if (local % 8 === 2)
          fan(b.x, b.y, aim, 3, 0.25, speed, "#c6eafa", "rice");
      } else if (id === "sylphy" && whole) {
        side = beat % 2;
        d = sources[side];
        fan(
          d.x,
          d.y,
          Math.PI / 2 + (side ? 0.65 : -0.65),
          n,
          0.16,
          speed,
          d.color,
          "scale",
          { turn: side ? -0.28 : 0.28, decay: 0.8 }
        );
      } else if (id === "trilithon" && local % 4 === 0) {
        for (var column = 0; column < 5; column++)
          if (column !== (beat / 2) % 5)
            for (var row = 0; row < 2; row++)
              api.bullet(
                24 + column * 48,
                48 - row * 12,
                Math.PI / 2,
                speed * (column % 2 ? 0.8 : 1),
                "#d9c595",
                "amulet"
              );
      } else if (id === "flare" && local % 4 === 0) {
        ring(
          b.x,
          b.y,
          20 + Math.floor(density / 2),
          beat * 0.12,
          speed,
          "#f1b794",
          "flame",
          0,
          Math.PI / 2 + Math.sin(beat * 0.2) * 0.7
        );
      } else if (id === "philosopher" && local % 4 === 0) {
        var element = (beat / 2) % 5;
        d = sources[element];
        fan(
          d.x,
          d.y,
          Math.atan2(p.y - d.y, p.x - d.x) + (element - 2) * 0.1,
          n + 1,
          0.19,
          speed * (0.8 + element * 0.06),
          d.color,
          ["flame", "bubble", "scale", "amulet", "rice"][element]
        );
      }
      return;
    }
    // Start each declaration at the beginning of its own choreography, even
    // when a musical phrase begins between beats in the source recording.
    if (s.enemySpell.firstPatternTick === undefined)
      s.enemySpell.firstPatternTick = tick;
    spellPatterns[s.enemyId].emit(
      s,
      tick - s.enemySpell.firstPatternTick,
      api,
      level
    );
  }
  var api = {
    cards: cards,
    nonspells: nonspells,
    emitters: emitters,
    bossPosition: bossPosition,
    emit: emit,
    advanceBullet: advanceBullet,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else scope.DanmakuPatterns = api;
})(typeof window !== "undefined" ? window : globalThis);
