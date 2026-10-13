/* Owner-supplied local recordings with optional matching YouTube videos.
 * Provenance, video credits and heuristic cue analysis: assets/music/radio/README.md.
 * Introductions are original editorial writing, not song lyrics.
 */
(function (root) {
  "use strict";
  var script = document.currentScript;
  var base = new URL(
    (script && script.dataset.audioBase) || "/assets/music/radio/",
    location.href
  );
  var tracks = [
    {
      id: "radio-madara-ni-margaret",
      slug: "madara-ni-margaret",
      title: "斑にマーガレット",
      artist: "東方LostWord feat. konoco × 森羅万象",
      videoId: "AhA--es6CLg",
      intro: "konocoと森羅万象で『斑にマーガレット』をお届けします。",
      duration: 241.92,
      cueStarts: [189.5, 125.75, 51.75],
      cueMethod: "energy-transition-v1",
    },
    {
      id: "radio-fall-in-the-dark",
      slug: "fall-in-the-dark",
      title: "Fall in the Dark",
      artist: "ShibayanRecords / yana",
      videoId: "0WHPeP4-SXM",
      intro:
        "続いてShibayanRecordsの『Fall in the Dark』。長い夜のお供にどうぞ。",
      duration: 562.991,
      cueStarts: [370.75, 111.5, 291.5],
      cueMethod: "energy-transition-v1",
    },
    {
      id: "radio-instant-blue",
      slug: "instant-blue",
      title: "インスタントブルー",
      artist: "森羅万象 / あよ",
      videoId: "sxsxtfBBed8",
      intro: "森羅万象、あよの歌声で『インスタントブルー』。",
      duration: 307.722,
      cueStarts: [89.75, 197.75, 60.0],
      cueMethod: "energy-transition-v1",
    },
    {
      id: "radio-opposite-world",
      slug: "opposite-world",
      title: "Opposite World",
      artist: "幽閉サテライト / senya",
      videoId: "1_OhQpWwKhY",
      intro: "次は幽閉サテライトで『Opposite World』です。",
      duration: 282.331,
      cueStarts: [152.25, 35.0, 127.0],
      cueMethod: "energy-transition-v1",
    },
    {
      id: "radio-miscalc",
      slug: "miscalc",
      title: "miscalc",
      artist: "minimum electric design / mineko",
      videoId: "JaNFhtDhEfE",
      intro: "minimum electric designの『miscalc』をお届けします。",
      duration: 267.05,
      cueStarts: [85.25, 49.25, 205.0],
      cueMethod: "energy-transition-v1",
    },
    {
      id: "radio-flan-song",
      slug: "flan-song",
      title: "物凄い狂っとるフランちゃんが物凄いうた",
      artist: "Halozy / ななひら",
      videoId: "Ji5YExbaf1Y",
      intro: "ここで少しにぎやかに。Halozyとななひらの一曲です。",
      duration: 275.592,
      cueStarts: [50.25, 218.0, 102.25],
      cueMethod: "energy-transition-v1",
    },
    {
      id: "radio-eastern-dream",
      slug: "eastern-dream",
      title: "紅楼 ～ Eastern Dream",
      artist: "Demetori",
      videoId: "t3sm6RcBpXU",
      instrumental: true,
      sourceUrl: "https://demetori.xii.jp/products.html",
      videoCredit: "belaired · fan upload",
      intro:
        "Demetoriの『紅楼 ～ Eastern Dream』。ギターが紡ぐ長い夢をどうぞ。",
      duration: 655.256,
      cueStarts: [283.25, 413.75, 471.5],
      cueMethod: "energy-transition-v1",
    },
    {
      id: "radio-moriya-sealed-gods",
      slug: "moriya-sealed-gods",
      title: "Moriya set 00 ReEdit ～ 封印されし神々",
      artist: "凛 / クロネコラウンジ",
      videoId: "2ADDKbXrDBo",
      instrumental: true,
      sourceUrl: "https://booth.pm/en/items/1671071",
      videoCredit: "Tortol Senpai · fan upload",
      intro:
        "凛の『Moriya set 00 ReEdit ～ 封印されし神々』。守矢の山へ、ひと息の旅です。",
      duration: 84.793,
      cueStarts: [21.0],
      cueMethod: "energy-transition-v1",
    },
  ];
  tracks.forEach(function (track) {
    track.kind = "SONG";
    track.src = new URL(track.slug + ".mp3", base).href;
    track.lyrics = track.instrumental
      ? ""
      : new URL(track.slug + ".lrc", base).href;
    track.url = "https://www.youtube.com/watch?v=" + track.videoId;
  });
  root.CompanionRadioTracks = tracks;
})(window);
