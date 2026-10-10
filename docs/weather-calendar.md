# Weather calendar

The weather detail panel shows three parallel readings for the **visitor browser's local civil date**. Calendar time comes from the current device clock, independently of a weather observation's timestamp, station location, API availability, or cached forecast. The header shows the visitor's local `HH:mm` clock. All three calendar fields change at local midnight; the clock continues updating on the same day. Daylight-saving changes do not alter the table lookup, which uses civil year/month/day fields rather than elapsed local milliseconds.

Load `assets/js/data/kyureki-years.js` before `assets/js/components/weather-calendar.js`. The latter exposes `window.SiteWeatherCalendar.format(date = new Date())` (also available through CommonJS for tests):

```js
{
  timeZone: "Europe/London",
  isoDate: "2026-10-10",
  gregorian: { year: 2026, month: 10, day: 10, weekday: "土", text: "2026年10月10日（土）" },
  kyureki: {
    supported: true, year: 2026, month: 8, day: 30,
    isLeapMonth: false, monthName: "葉月", shortText: "八月三十日",
    text: "2026年 八月三十日（葉月）"
  },
  gensokyo: {
    supported: true, seasonNumber: 141, seasonText: "第百四十一季",
    attributes: "日と夏と火の年", text: "第百四十一季 · 日と夏と火の年"
  }
}
```

The widget presents all three dates on one line as `2026.10.10`, `八月三十日`, and `第141季`. Full values, the weekday, and season-year attributes remain in each reading’s accessible label and hover title. Full date fields remain available in the API; `kyureki.shortText` omits its duplicate year and poetic month name while preserving leap-month markers.

Invalid instants throw `RangeError`. Outside the supplied lunisolar table, `kyureki.supported` is false and its text is `換算範囲外`; Gregorian dates and valid season-year conversion remain available. A missing data script has the same graceful fallback. No network fetch or `Intl` calendar support is needed at runtime. `Intl` is used only to name the browser time zone; if it is unavailable, `timeZone` is `"local"` and native local `Date` fields still provide the same behavior.

## Japanese lunisolar dates

The local table is derived from [zizicici/kyureki-json](https://github.com/zizicici/kyureki-json), pinned at commit [`04593115cd021e09d37116fab97e0a322a85b839`](https://github.com/zizicici/kyureki-json/tree/04593115cd021e09d37116fab97e0a322a85b839). Its MIT license and attribution are retained in the data file. The upstream zero-based leap-month index and chronological 29/30-day month lengths are preserved; the one unpadded civil date is normalized. Supported days are **1931-02-17 through 2100-02-08 inclusive**.

The table follows Japanese lunisolar month boundaries rather than substituting the Chinese calendar. The selected lookup key is the visitor's displayed local Gregorian date, not the current date in Tokyo. These can differ near midnight: [NAOJ's 2027 new-moon table](https://eco.mtk.nao.ac.jp/koyomi/yoko/2027/rekiyou273.html) places the February new moon at **February 7, 00:56 JST**. Consequently Japanese old New Year falls on February 7, one civil day later than in China. This date is a regression fixture.

Modern “old calendar” dates are conventional continuations of pre-1873 calendars, not an official Japanese civil calendar. The supplied table uses the **leap-eleventh-month proposal for 2033**. [NAOJ explains the 2033 problem and competing proposals](https://www.nao.ac.jp/news/blog/2023/20230829-koyomi.html); this is a documented data convention, not an official ruling. These technical notes stay in repository documentation rather than cluttering the interface.

## Gensokyo year convention

The UI shows the season number; its full year attributes remain available in the accessible label and hover title. Internally it uses `local Gregorian year − 1885`, the common chronology correspondence: 1885 → 第零季 and 2005 → 第百二十季. The ordinal year increments at the civil new year **as an explicit implementation convention**. The original works do not specify an unambiguous conversion boundary for a live real-world clock. In particular, the theory that a season changes on 卯月の一日 does not justify hardcoding Gregorian April 1 as a canon rule.

The year attributes follow three simultaneous cycles, indexed by the season number:

- 三精: 日 → 月 → 星
- 四季: 春 → 夏 → 秋 → 冬
- 五行: 土 → 火 → 水 → 木 → 金

This gives **日と春と土の年** in season 120 (2005) and **日と夏と火の年** in season 141 (2026).

The source for the attribute cycles is ZUN's *六十年ぶりに紫に香る花*, published in *東方紫香花 ～ Seasonal Dream Vision*. A [Japanese transcription and community translation](https://touhou.fandom.com/wiki/A_Beautiful_Flower_Blooming_Violet_Every_Sixty_Years) preserve the original order and the flower incident's Sun/Spring/Earth anchor. The Japanese text is used because that page's English rendering incorrectly calls 土 “wood” in one sentence. The [Touhou Wiki chronology](https://en.touhouwiki.net/index.php?mobileaction=toggle_view_desktop&title=Gensokyo_Timeline) summarizes the 1885/season-zero correspondence and labels its spring new-year interpretation as conjecture.

ZUN's *香霖堂*, **うるおいの月** (serialized chapter 24; chapter numbering differs among collections), describes the distinct 妖怪太陰暦 as having a month as its minimum unit and a sixty-year cycle. It does not supply a complete daily or intercalation algorithm. [Japanese text and translation](https://touhou.fandom.com/wiki/Curiosities_of_Lotus_Asia%3A_Chapter_24) are available. Therefore the panel does **not** append ordinary old-calendar month/day values to the season year and call that an exact canonical youkai date. The Japanese old calendar and the season-year approximation remain separate fields, with accessible labels for each calendar.

## Verification

Run `node tests/weather-calendar.cjs`. It checks all 169 encoded year boundaries, local midnight and year rollover in Los Angeles, London and Tokyo, London DST, the current October 2026 month boundary, 2025 and 2033 leap months, the Japanese/Chinese 2027 divergence, range endpoints, season-year anchors, browser exports without `Intl`, and a missing-table fallback.

Run `node tests/weather-browser.cjs` against the local preview (set `PREVIEW_URL` and `PLAYWRIGHT_MODULE` if needed). It uses deterministic weather fixtures to check the forecast graph, station coordinates, failure recovery, local clocks and accessible date labels, plus the single-line date layout at widths from 320 to 1440px.
