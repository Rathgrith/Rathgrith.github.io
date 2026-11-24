/* Seeded encounters and upgrades for a single score expedition. */
(function (scope) {
  "use strict";
  var upgrades = {
    damage: { name: "刻印レンズ", color: "#ffad9b" },
    tempo: { name: "早巻きゼンマイ", color: "#f2cd82" },
    magnet: { name: "引力の栞", color: "#83dfe3" },
    salvage: { name: "複写紙", color: "#9bdba5" },
    reactor: { name: "過給炉", color: "#ffa569" },
    guard: { name: "結び直しの符", color: "#c3b8f6" },
  };
  var routes = {
    alice: ["糸巻き工房", "夜半の人形劇場"],
    marisa: ["星霧の森", "彗星観測台"],
    patchouli: ["閉架書庫", "地下星図室"],
  };
  function create(seed) {
    return {
      level: 1, xp: 0, next: 3, kills: 0, wave: 0, nextWave: 2.8,
      offer: null, lastUpgrade: null, guardReady: false, guardBreakAt: -10,
      nextVacuum: 0, vacuumUntil: 0, overdriveUntil: 0, salvageMeter: 0,
      randomState: (seed >>> 0) || 1977,
      mods: { damage: 0, tempo: 0, magnet: 0, salvage: 0, reactor: 0, guard: 0 },
    };
  }
  function random(run) {
    var x = run.randomState;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    run.randomState = x >>> 0;
    return run.randomState / 4294967296;
  }
  function deal(run) {
    if (run.offer || !run.next || run.xp < run.next) return;
    var deck = Object.keys(upgrades).filter(function (id) { return run.mods[id] < 5; });
    if (!deck.length) { run.next = run.xp = 0; return; }
    for (var i = deck.length - 1; i > 0; i--) {
      var j = Math.floor(random(run) * (i + 1));
      var swap = deck[i];
      deck[i] = deck[j];
      deck[j] = swap;
    }
    run.offer = deck.slice(0, 3);
  }
  function addXP(run, amount) {
    if (!run.next) return;
    run.xp += amount;
    deal(run);
  }
  function ignite(s) {
    if (s.run.mods.reactor) s.run.overdriveUntil = s.time + 2 + 0.6 * s.run.mods.reactor;
  }
  function vacuum(s) {
    s.run.vacuumUntil = s.time + 0.9;
    s.run.nextVacuum = s.time + 4;
  }
  function choose(s, id, maxPower) {
    var r = s.run;
    if (!r.offer || !r.offer.includes(id) || s.phase === "over") return false;
    r.mods[id]++;
    r.xp -= r.next;
    r.level++;
    r.next = Math.min(24, 3 + (r.level - 1) * 2);
    r.offer = null;
    r.lastUpgrade = { id: id, tier: r.mods[id], time: s.time };
    if (id === "reactor") {
      s.power = Math.min(maxPower, s.power + 4);
      ignite(s);
    }
    if (id === "magnet" && r.mods.magnet >= 3) vacuum(s);
    if (id === "guard") {
      r.guardReady = true;
      if (s.lives < 5) s.lives++;
      else s.bombs = Math.min(5, s.bombs + 1);
    }
    if (Object.values(r.mods).every(function (stacks) { return stacks === 5; })) r.next = r.xp = 0;
    deal(r);
    return true;
  }
  function description(s, id, maxPower, equipped) {
    var tier = Math.min(5, (equipped ? 0 : 1) + (s.run ? s.run.mods[id] : 0));
    if (id === "damage") return tier >= 3 ? "1.5秒ごとの重撃が周囲にも波及" : "1.5秒ごとに一撃の威力 ×1.65";
    if (id === "tempo") return tier >= 3 ? "1.1秒ごとに命中点を追奏で再攻撃" : "全武器の攻撃間隔を短縮";
    if (id === "magnet") return tier >= 3 ? "4秒ごとに全画面を0.9秒吸引" : "より広く、より速くアイテムを吸引";
    if (id === "salvage") return tier >= 3 ? "欠片4個で火力 +1・最大時は500点" : "欠片に経験値を追加";
    if (id === "guard") {
      var stock = equipped ? "" : s.lives < 5 ? "残機 +1・" : s.bombs < 5 ? "霊撃 +1・" : "";
      if (equipped) return (s.run.guardReady ? "結界あり" : "結界消費済み") + (tier >= 3 ? "・符取得で再装填" : "・再装着で補充");
      return stock + (tier >= 3 ? "結界装填・符取得でも再装填" : "結界装填・被弾を1回防ぐ");
    }
    if (id === "reactor") {
      var gain = equipped ? 0 : Math.min(4, maxPower - s.power);
      return (gain > 0 ? "火力 +" + gain + "・" : "") +
        (tier >= 3 ? "Pと欠片で連射 +35%" : "装着時とP回収時に連射 +35%");
    }
  }
  function stats(s, id, maxPower, equipped) {
    var before = s.run ? s.run.mods[id] : 0, after = Math.min(5, before + 1);
    function change(base, per) {
      return (base + before * per) + (equipped ? "" : " → " + (base + after * per));
    }
    switch (id) {
      case "damage": return "威力 " + change(100, 32) + "%";
      case "tempo": return "連射補正 +" + change(0, 22) + "%";
      case "magnet": return "回収半径 " + change(36, 32) + " px";
      case "salvage": return "欠片経験値 " + change(1, 1) + " XP";
      case "reactor": return "P回収量 " + change(1, 1);
      case "guard": return "ミス後無敵 " + (2.5 + before * 0.35).toFixed(2) +
        (equipped ? "" : " → " + (2.5 + after * 0.35).toFixed(2)) + " 秒";
    }
  }
  function autoChoose(s, maxPower) {
    if (!s.run.offer) return;
    var order = s.lives < 3 ? ["guard", "damage", "reactor"] :
      s.power < 14 ? ["reactor", "magnet", "tempo"] : ["damage", "tempo", "guard"];
    choose(s, order.find(function (id) { return s.run.offer.includes(id); }) || s.run.offer[0], maxPower);
  }
  function sceneIndex(s) {
    // The musical section pauses through intermission and the next countdown.
    return Math.floor(s.rhythm.sectionKey / 2) % 2;
  }
  function escortAttack(s, f, dt, fire) {
    if (!f.salvos || f.y < f.fireLine || f.x < 9 || f.x > 231) return;
    var space = Math.hypot(f.x - s.player.x, f.y - s.player.y);
    if (s.time < s.attackReadyAt || s.spell || s.bullets.length >= 160 ||
        space < 76 || f.y >= 210) {
      f.aim = null;
      f.warning = 0;
      return;
    }
    if (f.aim === null) {
      f.aim = Math.atan2(s.player.y - f.y, s.player.x - f.x);
      f.warning = 0.48;
      return;
    }
    f.warning -= dt;
    if (f.warning > 0) return;
    // Each escort has its own readable silhouette at the end of the aim tell.
    // The wing's two feathers fold back onto parallel paths, leaving a seam.
    if (f.kind === "wing") {
      var layers = s.level >= 6 ? 3 : 2;
      for (var side = -1; side <= 1; side += 2) {
        for (var pair = 0; pair < layers; pair++) {
          var open = .32 + pair * .13, speed = 78 - pair * 8;
          fire(f.x, f.y, f.aim + side * open, speed, "#d6b8ed", "rice",
            {redirect: {at: .61, duration: .36, angle: f.aim, speed: speed + 8}},
            pair ? "smallorb" : "ribbon");
        }
      }
    } else if (f.kind === "keeper") {
      var width = s.level >= 10 ? 3 : 2;
      for (var i = -width; i <= width; i++) {
        if (f.bursts && i === 0) continue;
        var outside = Math.abs(i) / width;
        fire(f.x, f.y, f.aim + i * .19, 97 - 26 * outside, "#efbf86", "scale",
          undefined, i === 0 ? "largeorb" : outside === 1 ? "saber" : "smallorb");
      }
    } else {
      fire(f.x, f.y, f.aim, 110, "#a8e3e0", "rice", undefined, "needle");
      fire(f.x, f.y, f.aim, 74, "#d0e4b5", "pellet", undefined, "smallorb");
    }
    f.firedAt = s.time;
    f.fireAngle = f.aim;
    f.bursts = (f.bursts || 0) + 1;
    f.salvos--;
    f.aim = null;
    f.warning = 0;
    f.fireLine += f.kind === "wing" ? 54 : 72;
  }
  function updateFoes(s, dt, fire) {
    var r = s.run;
    if (s.time >= r.nextWave && s.foes.length === 0 && s.bullets.length < 160 &&
        !s.spell && !s.enemySpell.reload && s.enemySpell.age > 2) {
      r.wave++;
      var count = Math.min(4, 2 + (r.wave % 3));
      var side = r.wave % 2 ? 1 : -1, flank = r.wave % 3;
      var edge = 34 + random(r) * 14;
      for (var i = 0; i < count; i++) {
        var lane = edge + i * 43;
        var x = side > 0 ? lane : 240 - lane;
        var kind = (r.wave + i) % 5 === 0 ? "keeper" : i % 2 ? "wing" : "scout";
        var armor = Math.min(16, s.level - 1);
        var hp = kind === "keeper" ? 30 + armor * 2 : (kind === "wing" ? 15 : 10) + armor;
        var start = flank === 2 && i % 2 ? -side : side;
        var entryX = start > 0 ? -12 - i * 4 : 252 + i * 4;
        var entryY = flank ? 31 + i * 14 : -12 - i * 10;
        s.foes.push({
          x: flank ? entryX : x, y: entryY, lane: x, age: 0,
          entryX: flank ? entryX : null, approach: 1.3 + i * 0.11, radius: kind === "keeper" ? 9 : 7,
          hp: hp, maxHp: hp, kind: kind, offset: i * 0.7,
          fireLine: flank ? entryY + 5 : 29 + 5 * i, salvos: kind !== "scout" || s.level >= 4 ? 2 : 1,
          aim: null, warning: 0,
        });
      }
      r.nextWave = s.time + Math.max(8, 11 - s.level * 0.2) + random(r) * 2;
    }
    s.foes = s.foes.filter(function (f) {
      if (f.hp <= 0) return false;
      f.age += dt;
      var entering = f.entryX != null && f.age < f.approach;
      f.y += (entering ? 11 : f.kind === "keeper" ? 22 : 32) * dt;
      var x = f.lane + Math.sin(f.age * (f.kind === "wing" ? 1.8 : 0.85) + f.offset) *
        (f.kind === "wing" ? 24 : 13);
      var approach = entering ? Math.pow(1 - f.age / f.approach, 2) : 0;
      f.x = x + (entering ? (f.entryX - x) * approach : 0);
      escortAttack(s, f, dt, fire);
      return f.y < 367;
    });
  }
  var api = { create: create, addXP: addXP, choose: choose, autoChoose: autoChoose,
    ignite: ignite, vacuum: vacuum, stats: stats, updateFoes: updateFoes, description: description, upgrades: upgrades, routes: routes, sceneIndex: sceneIndex };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else scope.DanmakuRun = api;
})(typeof window !== "undefined" ? window : globalThis);
