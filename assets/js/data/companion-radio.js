/* Owner-supplied local recordings with matching official YouTube uploads.
 * Library provenance and recording differences: assets/music/radio/README.md.
 * Introductions are original editorial writing, not song lyrics.
 */
(function (root) {
  "use strict";
  var script = document.currentScript;
  var base = new URL(script && script.dataset.audioBase || "/assets/music/radio/", location.href);
  var tracks = [
  {
    "id": "radio-madara-ni-margaret",
    "slug": "madara-ni-margaret",
    "title": "斑にマーガレット",
    "artist": "東方LostWord feat. konoco × 森羅万象",
    "videoId": "AhA--es6CLg",
    "intro": "今夜の一曲目は、konocoと森羅万象で『斑にマーガレット』。"
  },
  {
    "id": "radio-candle-magic",
    "slug": "candle-magic",
    "title": "月齢11.3のキャンドルマジック",
    "artist": "ShibayanRecords / 3L",
    "videoId": "A9mdo3IaSts",
    "intro": "少し灯りを落として、3Lの歌声で『月齢11.3のキャンドルマジック』をどうぞ。"
  },
  {
    "id": "radio-liminality",
    "slug": "liminality",
    "title": "Liminality",
    "artist": "FELT / Vivienne",
    "videoId": "_uCAljvjSTo",
    "intro": "ここからはFELT。Vivienneの歌声で、『Liminality』をお届けします。"
  },
  {
    "id": "radio-fall-in-the-dark",
    "slug": "fall-in-the-dark",
    "title": "Fall in the Dark",
    "artist": "ShibayanRecords / yana",
    "videoId": "0WHPeP4-SXM",
    "intro": "続いてShibayanRecordsの『Fall in the Dark』。長い夜のお供にどうぞ。"
  },
  {
    "id": "radio-instant-blue",
    "slug": "instant-blue",
    "title": "インスタントブルー",
    "artist": "森羅万象 / あよ",
    "videoId": "sxsxtfBBed8",
    "intro": "森羅万象、あよの歌声で『インスタントブルー』。"
  },
  {
    "id": "radio-opposite-world",
    "slug": "opposite-world",
    "title": "Opposite World",
    "artist": "幽閉サテライト / senya",
    "videoId": "1_OhQpWwKhY",
    "intro": "次は幽閉サテライトで『Opposite World』です。"
  },
  {
    "id": "radio-miscalc",
    "slug": "miscalc",
    "title": "miscalc",
    "artist": "minimum electric design / mineko",
    "videoId": "JaNFhtDhEfE",
    "intro": "minimum electric designの『miscalc』をお届けします。"
  },
  {
    "id": "radio-flan-song",
    "slug": "flan-song",
    "title": "物凄い狂っとるフランちゃんが物凄いうた",
    "artist": "Halozy / ななひら",
    "videoId": "Ji5YExbaf1Y",
    "intro": "ここで少しにぎやかに。Halozyとななひらの一曲です。"
  },
  {
    "id": "radio-goodbye",
    "slug": "goodbye",
    "title": "Goodbye",
    "artist": "FELT / Vivienne",
    "videoId": "Eo1VH5AaiY4",
    "intro": "FELTの『Goodbye』。Vivienneの歌声を、ゆっくりお楽しみください。"
  },
  {
    "id": "radio-yearning",
    "slug": "yearning",
    "title": "Yearning",
    "artist": "FELT / Vivienne",
    "videoId": "4nClCNqMpzA",
    "intro": "続いてFELTで『Yearning』です。"
  },
  {
    "id": "radio-cant-look-away",
    "slug": "cant-look-away",
    "title": "Can't look away",
    "artist": "FELT / Vivienne",
    "videoId": "xodQ-iwwv_E",
    "intro": "FELTの『Can’t look away』。このままもう一曲、お付き合いください。"
  },
  {
    "id": "radio-nemuranai-yoru",
    "slug": "nemuranai-yoru",
    "title": "眠らない夜に見る夢",
    "artist": "minimum electric design / mineko",
    "videoId": "8A8uQamWmZQ",
    "intro": "次はminimum electric designで『眠らない夜に見る夢』。"
  },
  {
    "id": "radio-aquaterrarium",
    "slug": "aquaterrarium",
    "title": "アクアテラリウム feat.あよ",
    "artist": "森羅万象 / あよ",
    "videoId": "SNdkkArFFs0",
    "intro": "森羅万象の『アクアテラリウム』、今回はあよの歌声でどうぞ。"
  }
];
  tracks.forEach(function (track) {
    track.kind = "SONG";
    track.src = new URL(track.slug + ".mp3", base).href;
    track.lyrics = new URL(track.slug + ".lrc", base).href;
    track.url = "https://www.youtube.com/watch?v=" + track.videoId;
  });
  root.CompanionRadioTracks = tracks;
})(window);
