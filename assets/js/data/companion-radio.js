/* Official creator uploads; source checks and credits: assets/music/companion/RADIO.md.
 * These original editorial introductions are not lyrics or artist endorsements.
 */
(function (root) {
  "use strict";

  var videos = [
    {
      id: "AhA--es6CLg",
      listen: { name: "公式配信", url: "https://touhoulostword.com/2021/12/17/207956/" },
      duration: 249,
      captions: "auto-ja",
      title: "斑にマーガレット",
      artist: "東方LostWord feat. konoco × 森羅万象",
      kind: "MV",
      theme: "人形裁判 ～ 人の形弄びし少女",
      intro: "まずはkonocoと森羅万象で『斑にマーガレット』。紅茶を片手に、どうぞ。",
      url: "https://www.youtube.com/watch?v=AhA--es6CLg"
    },
    {
      id: "A9mdo3IaSts",
      listen: { name: "NetEase", url: "https://music.163.com/song?id=22820952" },
      duration: 392,
      captions: "none",
      title: "月齢11.3のキャンドルマジック",
      artist: "ShibayanRecords / 3L",
      kind: "MV",
      theme: "ラクトガール ～ 少女密室",
      intro: "灯りを少し落として、ShibayanRecordsの『月齢11.3のキャンドルマジック』をどうぞ。",
      url: "https://www.youtube.com/watch?v=A9mdo3IaSts"
    },
    {
      id: "ZDH_k45t9FY",
      listen: { name: "Apple Music", url: "https://music.apple.com/jp/song/1711532093" },
      duration: 288,
      captions: "none",
      title: "ブロッケンのまるい虹",
      artist: "Halozy / 夕月椿",
      kind: "MV",
      theme: "恋色マスタースパーク",
      intro: "続いてHalozy、夕月椿の歌声で『ブロッケンのまるい虹』をお届けします。",
      url: "https://www.youtube.com/watch?v=ZDH_k45t9FY"
    },
    {
      id: "0WHPeP4-SXM",
      listen: { name: "NetEase", url: "https://music.163.com/song?id=26107975" },
      duration: 561,
      captions: "none",
      title: "Fall in the Dark",
      artist: "ShibayanRecords / yana",
      kind: "MV",
      theme: "ほおずきみたいに紅い魂",
      intro: "ShibayanRecordsの『Fall in the Dark』。yanaの歌声とともに、少し長めの夜の一曲を。",
      url: "https://www.youtube.com/watch?v=0WHPeP4-SXM"
    },
    {
      id: "i41KoE0iMYU",
      listen: { name: "NetEase", url: "https://music.163.com/song?id=22645196" },
      duration: 232,
      captions: "none",
      title: "Bad Apple!! feat.nomico",
      artist: "Alstroemeria Records",
      kind: "MV",
      theme: "Bad Apple!!",
      intro: "続いてはおなじみの旋律、Alstroemeria Recordsの『Bad Apple!!』です。",
      url: "https://www.youtube.com/watch?v=i41KoE0iMYU"
    },
    {
      id: "RtTYQuO1j6w",
      listen: { name: "NetEase", url: "https://music.163.com/song?id=1384484611" },
      duration: 275,
      captions: "manual-translations",
      title: "Necromantic",
      artist: "暁Records / Stack",
      kind: "MV",
      theme: "デザイアドライブ",
      intro: "次は暁Records、Stackの歌声で『Necromantic』をお届けします。",
      url: "https://www.youtube.com/watch?v=RtTYQuO1j6w"
    },
    {
      id: "sxsxtfBBed8",
      listen: { name: "NetEase", url: "https://music.163.com/song?id=1453431134" },
      duration: 328,
      captions: "manual-translations",
      title: "インスタントブルー",
      artist: "森羅万象 / あよ",
      kind: "MV",
      theme: "53ミニッツの青い海",
      intro: "森羅万象の『インスタントブルー』。あよの歌声で、夜の窓辺に一曲。",
      url: "https://www.youtube.com/watch?v=sxsxtfBBed8"
    },
    {
      id: "1_OhQpWwKhY",
      listen: { name: "NetEase", url: "https://music.163.com/song?id=869438" },
      duration: 282,
      captions: "none",
      title: "Opposite World",
      artist: "幽閉サテライト / senya",
      kind: "MV",
      theme: "亡き王女の為のセプテット",
      intro: "続いて幽閉サテライトの『Opposite World』。senyaの歌声でお届けします。",
      url: "https://www.youtube.com/watch?v=1_OhQpWwKhY"
    },
    {
      id: "JaNFhtDhEfE",
      listen: { name: "NetEase", url: "https://music.163.com/song?id=479764517" },
      duration: 267,
      captions: "none",
      title: "miscalc",
      artist: "minimum electric design",
      kind: "MV",
      theme: "童祭 ～ Innocent Treasures",
      intro: "次はminimum electric design。アルバム『PARTICLE』から、『miscalc』をどうぞ。",
      url: "https://www.youtube.com/watch?v=JaNFhtDhEfE"
    },
    {
      id: "Ji5YExbaf1Y",
      listen: { name: "NetEase", url: "https://music.163.com/song?id=22808881" },
      duration: 276,
      captions: "auto-other",
      title: "物凄い狂っとるフランちゃんが物凄いうた",
      artist: "Halozy / ななひら",
      kind: "MV",
      theme: "魔法少女達の百年祭",
      intro: "ここでにぎやかな一曲。Halozyとななひらの『物凄い狂っとるフランちゃんが物凄いうた』。",
      url: "https://www.youtube.com/watch?v=Ji5YExbaf1Y"
    }
  ];
  videos.forEach(function (track) { track.videoId = track.id; });
  // One catalog and one stable selection for both listening modes. A missing
  // source stays explicit instead of silently replacing the selected music.
  root.CompanionRadioTracks = root.CompanionRadioAudioTracks.concat(videos);
})(window);
