/* Recognizable spell motifs, adapted for the 240×360 score-attack arena. */
(function (scope) {
  "use strict";
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
  // Per-pattern tuning from lower-arena coverage, not nominal projectile counts.
  // Aimed walls, radial rings and lasers put very different pressure on that area.
  var counts = {
    france: 1,
    london: 0.96,
    holland: 1,
    russia: 1,
    shanghai: 1,
    tibet: 1,
    stardust: 1,
    milky: 0.7,
    asteroid: 0.7,
    nondirectional: 1.25,
    master: 1.2,
    finalspark: 1.4,
    agni: 0.8,
    undine: 0.9,
    sylphy: 0.7,
    trilithon: 1,
    flare: 1,
    philosopher: 1,
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
    var id = s.enemySpell.id,
      b = s.boss,
      t = s.enemySpell.age || 0,
      list = [];
    function source(x, y, color, kind, glyph) {
      list.push({ x: x, y: y, color: color, kind: kind, glyph: glyph });
    }
    if (s.enemyId === "alice") {
      var n = id === "france" ? 4 : id === "shanghai" ? 4 : 6;
      for (var i = 0; i < n; i++) {
        var x,
          y,
          a = (i * TAU) / n;
        if (id === "france") {
          x = 36 + i * 56;
          y = 48 + (i % 2) * 20;
        } else if (id === "london") {
          x = 30 + (i % 3) * 90 + Math.sin(t * 0.65 + i) * 10;
          y = 45 + Math.floor(i / 3) * 50;
        } else if (id === "holland") {
          x = 202 - (i % 3) * 20;
          y = 40 + Math.floor(i / 3) * 50 + (i % 3) * 9;
        } else if (id === "russia") {
          x = i < 3 ? 28 : 212;
          y = 40 + (i % 3) * 25;
        } else if (id === "shanghai") {
          x = 36 + i * 56;
          y = 55 + Math.sin(t * 0.5 + i) * 20;
        } else {
          a += t * 0.42;
          x = 120 + Math.cos(a) * 78;
          y = 80 + Math.sin(a) * 45;
        }
        source(x, y, i < n / 2 ? "#93c8fa" : "#f0a2b9", "doll");
      }
    } else if (s.enemyId === "marisa") {
      if (id === "stardust")
        for (var i = 0; i < 5; i++) {
          var a = (i * TAU) / 5 + t * 0.65;
          source(
            120 + Math.cos(a) * 78,
            78 + Math.sin(a) * 42,
            elements[i],
            "familiar"
          );
        }
      else if (id === "milky" || id === "asteroid")
        for (var i = 0; i < 4; i++) {
          var side = i < 2 ? -1 : 1;
          source(
            120 + side * (66 + (i % 2) * 22),
            48 + (i % 2) * 42 + Math.sin(t * 0.5 + i) * 7,
            elements[i],
            "familiar"
          );
        }
      else if (id === "nondirectional")
        for (var i = 0; i < 4; i++) {
          var a = (i * TAU) / 4 + t * 0.32;
          source(
            b.x + Math.cos(a) * 48,
            b.y + Math.sin(a) * 35,
            elements[i],
            "familiar"
          );
        }
      else source(b.x, b.y + 15, "#f6e4a5", "familiar");
    } else if (id === "philosopher")
      for (var i = 0; i < 5; i++) {
        var a = (i * TAU) / 5 + t * 0.22;
        source(
          b.x + Math.cos(a) * 46,
          b.y + Math.sin(a) * 30,
          elements[i],
          "element",
          ["火", "水", "木", "金", "土"][i]
        );
      }
    else if (id === "undine") {
      source(53, 67, "#8cdcf6", "water");
      source(187, 67, "#b4b3f0", "water");
    } else if (id === "agni" || id === "sylphy") {
      source(
        30,
        60,
        id === "agni" ? "#f5a084" : "#b3df97",
        "element",
        id === "agni" ? "火" : "木"
      );
      source(
        210,
        60,
        id === "agni" ? "#ef839c" : "#92dfc5",
        "element",
        id === "agni" ? "火" : "木"
      );
    } else if (id === "trilithon")
      for (var i = 0; i < 3; i++)
        source(40 + i * 80, 50, "#f4d883", "element", "土");
    return list;
  }
  // Motion changes are one-shot, deterministic and independent of frame rate.
  // A cleared parent can never produce invisible delayed children afterwards.
  function advanceBullet(b, dt, spawn) {
    b.age = (b.age || 0) + dt;
    var m = b.motion || {},
      change = m.redirect;
    if (
      change &&
      !b.redirected &&
      (change.y !== undefined ? b.y >= change.y : b.age >= change.at)
    ) {
      var a = change.angle,
        v = change.speed;
      b.vx = Math.cos(a) * v;
      b.vy = Math.sin(a) * v;
      b.curve = 0;
      b.redirected = true;
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
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (m.split && b.age >= m.split.at) {
      var split = m.split,
        base = Math.atan2(b.vy, b.vx);
      for (var i = 0; i < split.count; i++)
        spawn(
          b.x,
          b.y,
          base + (i - (split.count - 1) / 2) * split.spread,
          split.speed,
          split.color || b.color,
          split.shape || b.shape
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
      n = Math.max(
        3,
        Math.round(
          n *
            (s.enemySpell.nonspell ? 1 : counts[id]) *
            (1 + level.cycle * 0.04)
        )
      );
      if (id === "master" && !s.enemySpell.nonspell)
        n = Math.min(14 + Math.floor(level.cycle / 5), n);
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
      if (id === "asteroid" && !s.enemySpell.nonspell)
        n *= 1 - level.cycle * 0.02;
      if (id === "london" && !s.enemySpell.nonspell)
        n *= (1 + level.cycle * 0.015) / (1 + level.cycle * 0.04);
      n = Math.max(
        6,
        Math.round(
          n *
            (s.enemySpell.nonspell ? 1 : counts[id]) *
            (1 + level.cycle * 0.04)
        )
      );
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
    // PCB: splitting scales, clustered doll volleys and linked yellow chains.
    if (id === "france") {
      if (local % 8 === 0)
        sources
          .filter(function (_, i) {
            return i % 2 === (beat / 4) % 2;
          })
          .forEach(function (d) {
            fan(
              d.x,
              d.y,
              Math.atan2(p.y - d.y, p.x - d.x),
              3,
              0.34,
              speed * 0.68,
              "#91cffa",
              "scale",
              {
                split: {
                  at: 0.85,
                  count: 5,
                  spread: 0.18,
                  speed: speed * 0.9,
                  shape: "scale",
                },
              }
            );
          });
    } else if (id === "london") {
      if (whole) {
        var d = sources[beat % 6];
        // Small concentric rice wreaths leave separate moving pockets of fog.
        for (var layer = 0; layer < 2; layer++)
          ring(
            d.x,
            d.y,
            12 + density,
            beat * 0.23,
            speed * (0.62 + layer * 0.16),
            layer ? "#bca8ed" : "#e0d0f3",
            "rice"
          );
      }
    } else if (id === "holland" || id === "russia") {
      if (whole) {
        var d = sources[beat % 6],
          pack = (id === "russia" ? 6 : 8) + Math.floor(level.cycle / 3);
        var base =
          Math.atan2(p.y - d.y, p.x - d.x) +
          (id === "russia"
            ? beat % 2
              ? 0.28
              : -0.28
            : Math.sin(beat * 0.2) * (0.5 + level.cycle * 0.015));
        // Each petal is a tight bundle, not a filled circle. Russia pinches
        // from both sides; Holland sends a procession from the right.
        for (var arm = 0; arm < pack; arm++)
          for (var layer = 0; layer < 3; layer++)
            api.bullet(
              d.x,
              d.y,
              base +
                (arm - (pack - 1) / 2) *
                  0.32 *
                  ((id === "russia" ? 5 : 7) / (pack - 1)) +
                (layer - 1) * 0.043,
              speed * (0.75 + layer * 0.08),
              id === "russia"
                ? beat % 6 < 3
                  ? "#9ccdf9"
                  : "#f1a2b7"
                : "#b4dbee",
              "scale"
            );
        if (id === "russia" && local % 4 === 0) {
          var other = sources[(beat + 3) % 6];
          fan(
            other.x,
            other.y,
            Math.atan2(p.y - other.y, p.x - other.x),
            6,
            0.32,
            speed * 0.72,
            "#ddd9f5",
            "rice"
          );
        }
      }
    } else if (id === "shanghai") {
      if (whole)
        sources
          .filter(function (_, i) {
            return i % 2 === beat % 2;
          })
          .forEach(function (d, i) {
            // An offset ring of scales forms a necklace carried down the screen.
            var direction = Math.atan2(p.y - d.y, p.x - d.x),
              n = 9 + Math.floor(density / 2);
            for (var bead = 0; bead < n; bead++) {
              var a = (bead * TAU) / n + tick * 0.08;
              api.bullet(
                d.x,
                d.y,
                direction + Math.sin(a) * 0.42,
                speed * (0.88 + Math.cos(a) * 0.27),
                "#ffe291",
                "scale"
              );
            }
          });
    } else if (id === "tibet") {
      if (whole)
        sources
          .filter(function (_, i) {
            return i % 2 === beat % 2;
          })
          .forEach(function (d, i) {
            var n = 16 + Math.floor(density / 2),
              a = beat * 0.13 + i * 0.4;
            ring(
              d.x,
              d.y,
              n,
              a,
              speed * 0.66,
              i % 2 ? "#b4e8d0" : "#c8b7f3",
              "scale",
              { turn: beat % 2 ? 0.38 : -0.38, decay: 0.6 }
            );
          });
      // IN: laid stars, side currents, orbiting laser familiars and giant beams.
    } else if (id === "stardust") {
      if (whole)
        sources
          .filter(function (_, i) {
            return i % 2 === beat % 2;
          })
          .forEach(function (d, i) {
            var arms = 8 + Math.floor(level.cycle / 2);
            for (var arm = 0; arm < arms; arm++) {
              var a = (arm * TAU) / arms + beat * 0.21;
              api.bullet(
                d.x,
                d.y,
                a,
                15 * (1 + level.cycle * 0.04),
                d.color,
                arm % 2 ? "smallstar" : "star",
                { release: { at: 0.5, speed: speed * 0.9, angle: a } }
              );
            }
          });
    } else if (id === "milky") {
      if (local % 4 === 0)
        sources
          .filter(function (_, i) {
            return i % 2 === (beat / 2) % 2;
          })
          .forEach(function (d) {
            fan(
              d.x,
              d.y,
              Math.PI / 2 + (d.x < 120 ? -0.18 : 0.18),
              3,
              0.32,
              speed * 0.92,
              d.color,
              "star"
            );
          });
      if (level.cycle >= 2 && local % 8 === 2)
        sources
          .filter(function (_, i) {
            return i % 2 === Math.floor(beat / 4) % 2;
          })
          .forEach(function (d) {
            fan(
              d.x,
              d.y,
              Math.PI / 2 + (d.x < 120 ? -0.18 : 0.18),
              3,
              0.32,
              speed * 0.92,
              d.color,
              "star"
            );
          });
      if (local % 4 === 0)
        ring(b.x, b.y, 18, beat * 0.27, speed * 0.72, "#eab6e4", "bigstar");
    } else if (id === "asteroid") {
      if (whole)
        sources
          .filter(function (_, i) {
            return i !== beat % 4;
          })
          .forEach(function (d, i) {
            // Layered belts cross from the two banks instead of a second Milky ring.
            fan(
              d.x,
              d.y,
              Math.PI / 2 +
                (d.x < 120 ? -0.42 : 0.42) +
                Math.sin(beat * 0.18) * 0.22,
              3,
              0.22,
              speed * (0.78 + (i % 2) * 0.26),
              d.color,
              "star"
            );
          });
      if (local % 4 === 0)
        ring(b.x, b.y, 25, -beat * 0.18, speed * 0.82, "#d6bcf2", "bigstar");
    } else if (id === "nondirectional") {
      if (local % 8 === 0)
        sources.forEach(function (d, i) {
          var outward = Math.atan2(d.y - b.y, d.x - b.x);
          beam(d.x, d.y, outward, 5, quarter * 3, quarter * 6, d.color, 0, {
            kind: "orbit",
            cx: b.x,
            cy: b.y,
            rx: 48,
            ry: 35,
            phase: (i * TAU) / 4 + (s.enemySpell.age || 0) * 0.32,
            rate: 0.32,
          });
        });
      if (whole)
        sources.forEach(function (d) {
          fan(
            d.x,
            d.y,
            Math.atan2(b.y - d.y, b.x - d.x),
            5,
            0.09,
            speed,
            d.color,
            "bigstar"
          );
        });
      if (whole) fan(b.x, b.y, aim, 9, 0.22, speed * 0.92, "#eec5e4", "star");
    } else if (id === "master") {
      if (local % 16 === 0)
        beam(
          b.x,
          b.y,
          s.enemySpell.age < 8 ? Math.PI / 2 : aim,
          14,
          quarter * 4,
          quarter * 5,
          "#ffe7a5",
          0,
          "boss",
          0.13
        );
      if (whole)
        fan(
          b.x,
          b.y,
          Math.PI / 2 + (beat % 2 ? 0.12 : -0.12),
          11,
          0.24,
          speed * 0.64,
          elements[beat % 5],
          "star"
        );
    } else if (id === "finalspark") {
      if (local % 24 === 0) {
        var turn = Math.floor(tick / 24) % 2 ? 1 : -1;
        beam(
          b.x,
          b.y,
          Math.max(0.85, Math.min(2.29, aim - turn * 0.22)),
          18,
          quarter * 5,
          quarter * 8,
          "#d8d9ff",
          turn * 0.18,
          "boss",
          0.18
        );
      }
      if (whole) {
        fan(
          b.x,
          b.y,
          Math.PI / 2 + Math.sin(beat * 0.14) * 0.2,
          13,
          0.24,
          speed * 0.82,
          elements[beat % 5],
          "bigstar"
        );
        if (local % 4 === 2)
          for (var side = -1; side <= 1; side += 2)
            fan(
              b.x + side * 24,
              b.y,
              Math.PI / 2 + side * 0.7,
              4,
              0.16,
              speed,
              "#b9ddfb",
              "smallstar"
            );
      }
      // EoSD: each element has a different motion law, not just a palette.
    } else if (id === "agni") {
      if (whole)
        sources.forEach(function (d, i) {
          var a =
            Math.PI / 2 +
            (i ? -0.38 : 0.38) +
            Math.sin(beat * 0.38 + i * Math.PI) * 0.32;
          fan(d.x, d.y, a, 5, 0.16, speed * 0.84, d.color, "flame", {
            turn: i ? 0.4 : -0.4,
            decay: 0.9,
          });
        });
    } else if (id === "undine") {
      if (local % 12 === 0) {
        var d = sources[Math.floor(beat / 6) % 2];
        beam(
          d.x,
          d.y,
          Math.atan2(p.y - d.y, p.x - d.x),
          4,
          quarter * 4,
          quarter * 3,
          d.color,
          0
        );
      }
      if (whole) {
        var d = sources[beat % 2];
        fan(
          d.x,
          d.y,
          Math.atan2(p.y - d.y, p.x - d.x),
          5,
          0.3,
          speed * 0.7,
          d.color,
          "bubble"
        );
      }
      if (local % 4 === 0)
        ring(b.x, b.y, 16, beat * 0.17, speed * 0.55, "#a3d9ed", "pellet");
    } else if (id === "sylphy") {
      if (whole) {
        var side = beat % 2,
          d = sources[side];
        for (var row = 0; row < 2; row++)
          fan(
            d.x,
            d.y - row * 8,
            Math.PI / 2 + (side ? 0.55 : -0.55),
            9,
            0.115,
            speed * (0.8 + row * 0.1),
            d.color,
            "scale"
          );
      }
    } else if (id === "trilithon") {
      if (whole)
        sources.forEach(function (d, i) {
          var lanes = 5 + Math.ceil(level.cycle * 0.65);
          for (var lane = -(lanes - 1) / 2; lane <= (lanes - 1) / 2; lane++) {
            var a = Math.PI / 2 + lane * 0.07,
              sign = (beat + i) % 2 ? 1 : -1;
            api.bullet(
              d.x + lane * 6,
              d.y,
              a,
              speed * 0.95,
              i % 2 ? "#d8c0f0" : "#f0d68c",
              "amulet",
              {
                redirect: {
                  y: 180 + (beat % 3) * 18,
                  angle: Math.PI / 2 + sign * 0.72,
                  speed: speed * 0.7,
                },
              }
            );
          }
        });
      if (local % 8 === 4)
        fan(b.x, b.y, aim, 7, 0.25, speed, "#f1dbaa", "rice");
    } else if (id === "flare") {
      if (whole)
        for (var layer = 0; layer < 2; layer++) {
          // Fixed counter-curving lattices with stable gaps between their arms.
          ring(
            b.x,
            b.y,
            30,
            beat * 0.045 + layer * 0.07,
            speed * (0.7 + layer * 0.08),
            layer ? "#ffcf96" : "#ed929b",
            "pellet",
            { turn: layer ? 0.18 : -0.18, decay: 0.32 }
          );
        }
    } else if (id === "philosopher") {
      {
        var element = tick % 5,
          d = sources[element],
          a = Math.atan2(p.y - d.y, p.x - d.x);
        if (element === 0)
          for (var layer = 0; layer < 2; layer++)
            ring(
              d.x,
              d.y,
              28,
              beat * 0.37 + layer * 0.13,
              speed * (0.8 + layer * 0.14),
              d.color,
              "flame"
            );
        if (element === 1)
          fan(d.x, d.y, a, 13, 0.18, speed * 1.2, d.color, "bubble");
        if (element === 2)
          for (var j = 0; j < 22; j++)
            api.bullet(
              d.x,
              d.y,
              (j * TAU) / 22,
              speed * 0.6,
              d.color,
              "scale",
              { redirect: { at: 0.95, angle: 2.12, speed: speed * 0.9 } }
            );
        if (element === 3)
          for (var j = 0; j < 19; j++) {
            var a2 = a + (j - 9) * 0.13;
            api.bullet(d.x, d.y, a2, speed * 0.68, d.color, "amulet", {
              redirect: {
                at: 1.15,
                angle: a2 + (j % 2 ? 0.5 : -0.5),
                speed: speed,
              },
            });
          }
        if (element === 4)
          for (var j = 0; j < 24; j++)
            api.bullet(
              d.x,
              d.y,
              (j * TAU) / 24,
              speed * 0.65,
              "#e1d4f7",
              "rice",
              { redirect: { at: 1.15, angle: a, speed: speed * 1.05 } }
            );
      }
    }
  }
  var api = {
    cards: cards,
    nonspells: nonspells,
    emitters: emitters,
    emit: emit,
    advanceBullet: advanceBullet,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else scope.DanmakuPatterns = api;
})(typeof window !== "undefined" ? window : globalThis);
