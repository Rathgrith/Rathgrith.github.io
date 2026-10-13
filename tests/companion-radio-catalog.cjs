/* Validate the real shipped catalog, recording lengths, cue bounds and lyrics. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createHash } = require("node:crypto");
const root = path.resolve(__dirname, "..");
const folder = path.join(root, "assets/music/radio");
const source = fs.readFileSync(
  path.join(root, "assets/js/data/companion-radio.js"),
  "utf8"
);
function catalog(audioBase) {
  const context = {
    window: {},
    URL,
    location: { href: "https://example.org/" },
    document: { currentScript: { dataset: { audioBase } } },
  };
  vm.runInNewContext(source, context);
  return context.window.CompanionRadioTracks;
}
// The shipped files use MPEG-1 Layer III. Count their actual frame samples;
// this also catches truncated uploads without relying on optional ID3 tags.
function duration(bytes) {
  let offset = 0,
    seconds = 0,
    frames = 0;
  if (bytes.toString("ascii", 0, 3) === "ID3")
    offset =
      10 +
      ((bytes[6] & 127) << 21) +
      ((bytes[7] & 127) << 14) +
      ((bytes[8] & 127) << 7) +
      (bytes[9] & 127);
  const rates = [44100, 48000, 32000];
  const bitrates = [
    0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320,
  ];
  while (offset + 4 <= bytes.length) {
    if (bytes.toString("ascii", offset, offset + 3) === "TAG") break;
    const h = bytes.readUInt32BE(offset);
    assert.equal((h >>> 21) & 2047, 2047, `invalid MP3 sync at ${offset}`);
    assert.equal((h >>> 19) & 3, 3, "MPEG-1 recording");
    assert.equal((h >>> 17) & 3, 1, "Layer III recording");
    const bitrate = bitrates[(h >>> 12) & 15],
      rate = rates[(h >>> 10) & 3];
    assert(bitrate && rate, "valid MP3 frame rate");
    const length = Math.floor((144000 * bitrate) / rate) + ((h >>> 9) & 1);
    assert(offset + length <= bytes.length, "complete final MP3 frame");
    seconds += 1152 / rate;
    offset += length;
    frames++;
  }
  assert(frames > 1000, "full recording, not an empty/header-only file");
  return seconds;
}
const expected = [
  "madara-ni-margaret",
  "fall-in-the-dark",
  "instant-blue",
  "opposite-world",
  "miscalc",
  "flan-song",
  "eastern-dream",
  "moriya-sealed-gods",
];
const tracks = catalog();
assert.deepEqual(
  Array.from(tracks, (t) => t.slug),
  expected
);
assert.equal(new Set(tracks.map((t) => t.id)).size, 8);
assert.equal(new Set(tracks.map((t) => t.videoId)).size, 8);
const files = [];
for (const track of tracks) {
  assert.equal(track.id, "radio-" + track.slug);
  assert.equal(track.kind, "SONG");
  assert(/^[\w-]{11}$/.test(track.videoId));
  assert.equal(track.url, "https://www.youtube.com/watch?v=" + track.videoId);
  assert.equal(
    track.src,
    "https://example.org/assets/music/radio/" + track.slug + ".mp3"
  );
  const file = track.slug + ".mp3",
    bytes = fs.readFileSync(path.join(folder, file));
  files.push(file);
  const actual = duration(bytes);
  assert(
    Math.abs(actual - track.duration) < 0.08,
    `${track.slug}: duration agrees with MP3 frames`
  );
  assert.equal(track.cueMethod, "energy-transition-v1");
  assert(track.cueStarts.length >= 1 && track.cueStarts.length <= 3);
  for (let i = 0; i < track.cueStarts.length; i++) {
    const cue = track.cueStarts[i];
    assert(
      Number.isFinite(cue) &&
        cue >= 12 &&
        cue <= Math.min(actual * 0.8, actual - 24),
      `${track.slug}: cue avoids intro/fade and leaves usable music`
    );
    assert(
      track.cueStarts.slice(0, i).every((prior) => Math.abs(prior - cue) >= 24),
      `${track.slug}: cues represent separate passages`
    );
  }
  if (track.instrumental) {
    assert.equal(
      track.lyrics,
      "",
      "instrumentals do not fetch nonexistent lyrics"
    );
    assert.equal(new URL(track.sourceUrl).protocol, "https:");
    assert(track.videoCredit.includes("fan upload"));
  } else {
    assert.equal(track.lyrics, track.src.replace(/\.mp3$/, ".lrc"));
    const lrc = track.slug + ".lrc";
    files.push(lrc);
    const lyrics = fs.readFileSync(path.join(folder, lrc), "utf8");
    const stamps = Array.from(
      lyrics.matchAll(/\[(\d+):([\d.]+)\]/g),
      (match) => +match[1] * 60 + +match[2]
    );
    assert(
      stamps.length > 5 && Math.max(...stamps) <= actual + 2,
      "recording-matched timed lyrics"
    );
  }
  console.log(
    `${track.slug}: ${actual.toFixed(3)} s, cues ${track.cueStarts.join(", ")}`
  );
}
assert.equal(tracks.filter((t) => t.instrumental).length, 2);
assert.deepEqual(
  fs
    .readdirSync(folder)
    .filter((f) => /\.(mp3|lrc)$/.test(f))
    .sort(),
  files.sort(),
  "removed songs leave no orphan website audio or lyrics"
);
for (const [file, hash] of Object.entries({
  "eastern-dream.mp3":
    "cb2b2f9eacd5082ade5d71f02b806e9ed41636607592d1a5d0da98b85f930748",
  "moriya-sealed-gods.mp3":
    "28ba3e09b9db3edb7611ae8dd186344d76e8c6978a983a64e85b66832003dde4",
}))
  assert.equal(
    createHash("sha256")
      .update(fs.readFileSync(path.join(folder, file)))
      .digest("hex"),
    hash,
    `${file}: verified supplied recording, not a similarly named alternate`
  );
for (const track of catalog("/preview/audio/")) {
  assert(track.src.startsWith("https://example.org/preview/audio/"));
  if (track.instrumental) assert.equal(track.lyrics, "");
  else assert(track.lyrics.startsWith("https://example.org/preview/audio/"));
}
console.log(
  "PASS: eight complete local recordings, distinct PVs, bounded entry cues and six matching LRCs."
);
