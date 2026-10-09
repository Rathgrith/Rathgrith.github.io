/* Japanese kana → mora/viseme plan, aligned to the actual displayed text. */
(function (root) {
  "use strict";
  var vowels = {
    a: "あかがさざただなはばぱまやらわぁゃゎ",
    i: "いきぎしじちぢにひびぴみりゐぃ",
    u: "うくぐすずつづぬふぶぷむゆるゔぅゅ",
    e: "えけげせぜてでねへべぺめれゑぇ",
    o: "おこごそぞとどのほぼぽもよろをぉょ",
  };
  function morae(reading) {
    var units = [];
    Array.from(reading.normalize("NFKC")).forEach(function (letter) {
      var code = letter.charCodeAt(0);
      if (code >= 0x30a1 && code <= 0x30f6) letter = String.fromCharCode(code - 0x60);
      if (letter === "ー") {
        units.push(units[units.length - 1] || "rest");
        return;
      }
      var sound = letter === "ん" ? "n" : letter === "っ" ? "cl" : "rest";
      Object.keys(vowels).some(function (vowel) {
        if (vowels[vowel].includes(letter)) { sound = vowel; return true; }
        return false;
      });
      if (/[ぁぃぅぇぉゃゅょゎ]/.test(letter) && units.length) units[units.length - 1] = sound;
      else units.push(sound);
    });
    return units;
  }
  function plan(text) {
    var tokens = (root.CompanionReadings || {})[text] || Array.from(text).map(function (char) { return [char, char]; });
    var chars = Array.from(text), units = chars.map(function () { return []; }), offset = 0;
    tokens.forEach(function (token) {
      var length = Array.from(token[0]).length, phones = morae(token[1]);
      phones.forEach(function (phone, i) {
        var index = offset + Math.min(length - 1, Math.floor(i * length / phones.length));
        if (units[index]) units[index].push(phone);
      });
      offset += length;
    });
    return {
      chars: chars,
      units: units,
      duration: function (index, speed) {
        return /[。、！？!?…]/.test(chars[index]) ? speed * 4
          : units[index].length * Math.max(32, speed * 1.55);
      },
    };
  }
  var api = { plan: plan, morae: morae };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CompanionSpeech = api;
})(typeof window === "undefined" ? globalThis : window);
