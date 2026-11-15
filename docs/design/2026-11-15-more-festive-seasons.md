# More festive seasons

- Issue: #66
- Status: **approved** (2026-11-15)
- Date: 2026-11-15
- Extends: [festive decoration](2026-11-14-festive-decoration.md) (#62)

## 1. Goal

More holidays for the title bar decoration, each with an animation, chosen to be known in
the Netherlands: Dutch traditions, holidays of large communities in the Netherlands and a
few days that fit an energy app. Christmas and New Year stay as they are.

## 2. Seasons and dates

All dates are device local time, whole days, both ends inclusive. E = Easter Sunday.

| Season (id)                       | Days                                                                             | Rule / source                                                          |
| --------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Chinese New Year (`lunarnewyear`) | New Year's day + 2                                                               | table                                                                  |
| Warme Truiendag (`sweater`)       | First Friday of February                                                         | rule (assumption: the Klimaatverbond picks a Friday in early February) |
| Valentine's Day (`valentine`)     | 14 February                                                                      | fixed                                                                  |
| Carnival (`carnival`)             | Saturday–Tuesday before Ash Wednesday (E − 50 … E − 47)                          | Easter                                                                 |
| Suikerfeest (`eidfitr`)           | 3 days (one more where sources differ by a day)                                  | table                                                                  |
| Holi Phagwa (`holi`)              | Holika Dahan + the colour day                                                    | table                                                                  |
| Nowruz (`nowruz`)                 | 20–22 March                                                                      | fixed                                                                  |
| Earth Hour (`earthhour`)          | Last Saturday of March                                                           | rule                                                                   |
| Easter (`easter`)                 | Good Friday – Easter Monday (E − 2 … E + 1)                                      | Easter                                                                 |
| Songkran (`songkran`)             | 13–15 April                                                                      | fixed                                                                  |
| Earth Day (`earthday`)            | 22 April                                                                         | fixed                                                                  |
| King's Day (`kingsday`)           | Koningsnacht + Koningsdag: 26–27 April, or 25–26 April when 27 April is a Sunday | rule                                                                   |
| Offerfeest (`eidadha`)            | 4 days                                                                           | table                                                                  |
| Liberation Day (`liberation`)     | 5 May (not 4 May, Remembrance Day)                                               | fixed                                                                  |
| Longest day (`solstice`)          | 21 June                                                                          | fixed                                                                  |
| Keti Koti (`ketikoti`)            | 1 July                                                                           | fixed                                                                  |
| Pride Amsterdam (`pride`)         | Saturday before the first Saturday of August – the Sunday after it               | rule                                                                   |
| Halloween (`halloween`)           | 25–31 October                                                                    | fixed                                                                  |
| Divali (`diwali`)                 | Main day − 2 … main day + 2                                                      | table                                                                  |
| Sint-Maarten (`stmartin`)         | 11 November                                                                      | fixed                                                                  |
| Loy Krathong (`loykrathong`)      | Full-moon day (+ the next day where sources differ)                              | table                                                                  |
| Sinterklaas (`sinterklaas`)       | 1–5 December                                                                     | fixed                                                                  |
| Chanoeka (`hanukkah`)             | First evening … last day (9 calendar days)                                       | table                                                                  |
| Christmas (`christmas`)           | 22–30 December                                                                   | existing                                                               |
| New Year (`newyear`)              | 31 December – 2 January                                                          | existing                                                               |

### 2.1 Tables (2026–2030)

Lunisolar and lunar holidays cannot be computed simply and are announced per year. The
tables use the dates most sources agree on (Hebcal for Chanoeka; Diyanet/Umm al-Qura and the
tabular Islamic calendar for the Eids; several almanacs for the rest). Where sources differ
by a day, the window covers both days.

| Year | Chinese NY | Suikerfeest | Holi           | Offerfeest | Divali (main) | Loy Krathong | Chanoeka       |
| ---- | ---------- | ----------- | -------------- | ---------- | ------------- | ------------ | -------------- |
| 2026 | 17 Feb     | 20–22 Mar   | 3–4 Mar        | 27–30 May  | 8 Nov         | 24–25 Nov    | 4–12 Dec       |
| 2027 | 6 Feb      | 9–12 Mar    | 21–22 Mar      | 16–20 May  | 29 Oct        | 13–14 Nov    | 24 Dec – 1 Jan |
| 2028 | 26 Jan     | 26–29 Feb   | 10–11 Mar      | 5–8 May    | 17 Oct        | 2 Nov        | 12–20 Dec      |
| 2029 | 13 Feb     | 14–17 Feb   | 28 Feb – 1 Mar | 24–27 Apr  | 5 Nov         | 21 Nov       | 1–9 Dec        |
| 2030 | 3 Feb      | 4–7 Feb     | 19–20 Mar      | 13–16 Apr  | 26 Oct        | 10–11 Nov    | 20–28 Dec      |

After 2030 the table seasons are simply not shown. A unit test fails from 1 January 2030
on, as a reminder to add the next years.

### 2.2 Overlaps

Some seasons can fall on the same day (e.g. Chinese New Year and carnival in 2027,
Chanoeka and Christmas, Easter and Earth Hour). Then the decoration **alternates every
hour** between them, so neither disappears: `seasons[hour % seasons.length]`, in the
order of the table above.

`?festive=<id>` shows any season for preview; for Chanoeka `?festive=hanukkah` shows all
eight candles.

## 3. Drawing and animation

Inline SVG plus CSS animations in the existing layer over the title bar (`aria-hidden`;
taps go to the information button, §4). Two zones, as with Christmas:

- **Edge**: a line along the bottom edge (vine, washing line, bunting, water).
- **Figures**: three to six small figures (14–26 px) in the free space next to the title —
  left of the centred iOS title, right of the Material title — clear of the MNEXT logo. Next
  to the centred iOS title at most four are shown, so a long title ("Instellingen") stays
  clear.

| Season                   | Edge                   | Figures                                        | Animation                                                                             |
| ------------------------ | ---------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| Chinese New Year         | —                      | Red lanterns; a small dragon                   | Lanterns sway; the dragon wriggles across the bar                                     |
| Warme Truiendag          | Washing line           | Knitted sweater; thermometer                   | Sweater flutters; thermometer drops                                                   |
| Valentine                | —                      | Hearts                                         | Hearts beat and float up                                                              |
| Carnival                 | Washing line           | Two boerenkielen; two beer glasses             | Smocks flutter; glasses clink, bubbles rise                                           |
| Suikerfeest / Offerfeest | —                      | Crescent moon and stars; lanterns (fanous)     | Stars twinkle; lanterns glow and sway                                                 |
| Holi Phagwa              | —                      | Puffs of coloured powder                       | Puffs burst and fade in turn                                                          |
| Nowruz                   | —                      | Sprouting wheatgrass (sabzeh); goldfish bowl   | Grass grows; the fish swims                                                           |
| Earth Hour               | —                      | Light bulb                                     | The bar dims; the bulb switches off and on                                            |
| Easter                   | —                      | Coloured eggs; Easter hare                     | Eggs wobble in turn; the hare hops across the bar                                     |
| Songkran                 | —                      | Water bowl and drops                           | Water splashes up in arcs                                                             |
| Earth Day                | —                      | Globe; leaves                                  | Globe turns; leaves grow                                                              |
| King's Day               | Orange bunting         | Golden crown                                   | Flags wave; a shine sweeps over the crown                                             |
| Liberation Day           | Red-white-blue bunting | Small liberation flame                         | Flags wave; the flame flickers                                                        |
| Longest day              | —                      | Sun; solar panel                               | The sun rises and its rays turn; a glint runs over the panel                          |
| Keti Koti                | Koto-patterned cloth   | —                                              | Quiet: the cloth moves slowly (a commemoration and celebration; no exuberant effects) |
| Pride                    | Rainbow bunting        | Heart                                          | Flags wave; the heart beats                                                           |
| Halloween                | Green vine with leaves | Jack-o'-lanterns                               | Candle glow flickers; pumpkins sway                                                   |
| Divali                   | —                      | Row of diyas (oil lamps); rangoli              | Flames flicker; the rangoli turns slowly                                              |
| Sint-Maarten             | —                      | Lanterns on sticks                             | Lanterns swing and glow                                                               |
| Loy Krathong             | Water                  | Krathongs (leaf boats with candle)             | Water ripples; boats bob, candles flicker                                             |
| Sinterklaas              | —                      | Wrapped presents, roetveegpiet, mitre, crosier | Presents hop in turn; Piet peeks up and waves; the mitre bobs                         |
| Chanoeka                 | —                      | Menorah                                        | One more candle each evening (shamash + 1…8); flames flicker                          |

**Roetveegpiet**: a cheerful helper with a feathered beret and a collar, normal skin tone
with a few soot smudges on the cheeks.

With `prefers-reduced-motion: reduce` every figure is shown standing still; Earth Hour does
not dim.

## 4. Information on tap

Tapping the decoration opens a small popover under the title bar with the holiday's name
and two or three sentences about it (what is celebrated, by whom, how), in Dutch or
English. It closes on a tap elsewhere or after 10 seconds.

- The decoration layer stays `aria-hidden`; on top of it lies one transparent `<button>`
  over the decoration area with `aria-label` "Over deze feestdag: <name>" ("About this
  holiday: <name>"), so it works with a keyboard and a screen reader.
- The title bar of the main pages has no other controls under the layer (title and logo
  only), so the button blocks nothing.
- Texts: `festive.<id>.name` and `festive.<id>.about` in `nl.json` and `en.json`; factual
  and respectful, especially for religious days, Keti Koti and Liberation Day.
- The popover is an `IonPopover` anchored to the button.

This applies to Christmas and New Year as well.

## 5. Code

- `festive/season.ts`: season ids, the date rules, `easterSunday(year)` (Meeus/Jones/
  Butcher) and the tables; `seasonsAt(date)` returns all active seasons and
  `seasonAt(date)` picks one (§2.2). Pure and tested.
- `festive/scenes/{spring,summer,autumn}.tsx`: the figures per part of the year (the two
  Eids share one scene); `festive/scenes/parts.tsx`: figures zone, bunting, edges.
- `festive/festive.css`: all festive styles, moved out of `theme/layout.css`.

## 6. Testing

- `season.test.ts`: every boundary of every rule-based season; `easterSunday` for
  2024–2030 and 2038; King's Day on a Sunday (2025: 25–26 April); each table year; hourly
  alternation on an overlap; the table covers the next year (fails from 2030).
- `FestiveDecoration.test.tsx`: every season renders; Chanoeka shows the right number of
  candles; nothing animates with reduced motion; tapping opens the information with the
  right name and text.
- `i18n.test.ts` (existing): every season has a name and text in both languages.
- Preview on the dev server for all seasons, iOS and Material, light and dark, with a
  contact sheet of screenshots, before release.

## 7. Out of scope

- Holidays not listed here; decorations outside the title bar; sound.
- Regional dates (e.g. carnival in a different week in some places).

## 8. Filling the year (rounds three to six)

At the user's request the calendar was filled so that nearly every day has its own
decoration. After these additions about 30–40 days a year show only the time of year, and
no gap is longer than six days. All decorations work as in §3–§4 (figures from
`festive/scenes/library.tsx`, scenes in `festive/scenes/more.tsx`, a name and text on tap).

### 8.1 Levels

Every day has at least one season. Only the most specific level is shown; within a level,
overlapping seasons alternate hourly (§2.2).

| Level | Kind               | Seasons                                                                                                                           |
| ----- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Holidays and days  | everything not listed below                                                                                                       |
| 1     | Month-long periods | Ramadan, Advent, Sinterklaastijd, EK/WK football, Bollentijd, Dry January, Movember, school holidays (krokus, mei, zomer, herfst) |
| 2     | Time of year       | winter (21 Dec – 19 Mar), spring (20 Mar – 20 Jun), summer (21 Jun – 22 Sep), autumn (23 Sep – 20 Dec)                            |

### 8.2 Added seasons and their dates

| Season (id)                                          | Days                                                                                |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Dry January / IkPas (`dryjanuary`)                   | 1–31 January (level 1)                                                              |
| Driekoningen (`epiphany`)                            | 6 January                                                                           |
| Nationale Tulpendag (`tulipday`)                     | third Saturday of January                                                           |
| Day of Clean Energy (`cleanenergyday`)               | 26 January (UN)                                                                     |
| Gedichtendag (`poetryday`)                           | last Thursday of January                                                            |
| Tuinvogeltelling (`birdcount`)                       | Friday–Sunday of the last weekend of January                                        |
| Lichtmis / Wetlands Day (`candlemas`, `wetlandsday`) | 2 February                                                                          |
| Krokusvakantie (`springbreak`)                       | table (Rijksoverheid, all regions together; level 1)                                |
| Energy Efficiency Day (`efficiencyday`)              | 5 March                                                                             |
| Women's Day (`womensday`)                            | 8 March                                                                             |
| Boekenweek (`booksweek`)                             | second Wednesday of March + 11 days (CPNB 2026 pattern)                             |
| Pi Day (`piday`)                                     | 14 March                                                                            |
| Opschoondag (`cleanupday`)                           | Saturday between 16 and 22 March                                                    |
| Boomfeestdag (`treeday`)                             | third Wednesday of March                                                            |
| Bollentijd (`bulbtime`)                              | 20 March – 10 May (level 1)                                                         |
| World Water Day (`waterday`)                         | 22 March                                                                            |
| Clocks change (`clockchange`)                        | last Sunday of March and of October                                                 |
| 1 april (`aprilfools`)                               | 1 April; the MNEXT logo stands on its head now and then                             |
| Pesach (`passover`)                                  | table (first evening … day 8)                                                       |
| World Health Day (`healthday`)                       | 7 April                                                                             |
| World Art Day (`artday`)                             | 15 April                                                                            |
| World Book Day (`bookday`)                           | 23 April                                                                            |
| Koningsspelen (`kingsgames`)                         | last Friday before Koningsdag (some schools move it)                                |
| Meivakantie (`maybreak`)                             | table (level 1)                                                                     |
| Sun Day (`sunday`)                                   | 3 May                                                                               |
| Europe Day (`europeday`)                             | 9 May                                                                               |
| Mother's Day (`mothersday`)                          | second Sunday of May                                                                |
| Molendag (`millday`)                                 | second Saturday of May                                                              |
| Nurses Day (`nursesday`)                             | 12 May                                                                              |
| IDAHOT (`idahot`)                                    | 17 May                                                                              |
| Museum Day (`museumday`)                             | 18 May                                                                              |
| Bee Day (`beeday`)                                   | 20 May                                                                              |
| Biodiversity Day (`biodiversityday`)                 | 22 May                                                                              |
| Towel Day (`towelday`)                               | 25 May                                                                              |
| Ascension (`ascension`)                              | E + 39                                                                              |
| Pentecost (`pentecost`)                              | E + 49 … E + 50                                                                     |
| Vesak (`vesak`)                                      | table (Theravada/Thai dates)                                                        |
| Children's Day (`childrensday`)                      | 1 June                                                                              |
| Bicycle Day (`bikeday`)                              | 3 June                                                                              |
| Environment Day (`environmentday`)                   | 5 June                                                                              |
| Oceans Day (`oceansday`)                             | 8 June                                                                              |
| Vlaggetjesdag (`flagday`)                            | second Saturday of June                                                             |
| Global Wind Day (`windday`)                          | 15 June                                                                             |
| Picnic Day (`picnicday`)                             | 18 June                                                                             |
| Refugee Day (`refugeeday`)                           | 20 June                                                                             |
| Father's Day (`fathersday`)                          | third Sunday of June                                                                |
| EK/WK football (`football`)                          | table: 2026 men's World Cup, 2027 women's World Cup, 2028 men's Euro (level 1)      |
| Zomervakantie (`summerbreak`)                        | table (level 1)                                                                     |
| Emoji Day (`emojiday`)                               | 17 July                                                                             |
| Nijmeegse Vierdaagse (`fourdays`)                    | third Tuesday of July + 3 days                                                      |
| Friendship Day (`friendshipday`)                     | 30 July                                                                             |
| Perseids (`perseids`)                                | 12–13 August                                                                        |
| Start of the school year (`schoolstart`)             | first Monday of September                                                           |
| World EV Day (`evday`)                               | 9 September                                                                         |
| Open Monumentendag (`monumentday`)                   | second Saturday of September + Sunday                                               |
| Day of the Programmer (`programmersday`)             | 256th day of the year                                                               |
| Rosj Hasjana (`roshhashanah`)                        | table (first evening … second day)                                                  |
| Prinsjesdag (`prinsjesdag`)                          | third Tuesday of September                                                          |
| Vredesweek (`peaceweek`)                             | Saturday on or after 15 September + 8 days (PAX 2026: 19–27 Sep)                    |
| Mid-Autumn Festival (`midautumn`)                    | table                                                                               |
| Burendag (`neighboursday`)                           | fourth Saturday of September                                                        |
| Languages Day (`languagesday`)                       | 26 September                                                                        |
| Tourism Day (`tourismday`)                           | 27 September                                                                        |
| Heart Day (`heartday`)                               | 29 September                                                                        |
| Older Persons Day (`eldersday`)                      | 1 October                                                                           |
| Kinderboekenweek (`childrensbookweek`)               | first Wednesday of October + 11 days                                                |
| Dierendag (`animalday`)                              | 4 October                                                                           |
| Teachers' Day (`teachersday`)                        | 5 October                                                                           |
| Hydrogen Day (`hydrogenday`)                         | 8 October                                                                           |
| Dag van de Duurzaamheid (`sustainabilityday`)        | 10 October                                                                          |
| Herfstvakantie (`autumnbreak`)                       | table (level 1)                                                                     |
| World Food Day (`foodday`)                           | 16 October                                                                          |
| Nacht van de Nacht (`nightofthenight`)               | last Saturday of October; the bar goes dark                                         |
| Movember (`movember`)                                | 1–30 November (level 1)                                                             |
| Natuurwerkdag (`natureday`)                          | first Saturday of November                                                          |
| GLOW Eindhoven (`glow`)                              | Saturday on or after 7 November + 7 days                                            |
| Dag van de Mantelzorg (`carersday`)                  | 10 November                                                                         |
| Elfde van de elfde (`elevenelven`)                   | 11 November (alternates with Sint-Maarten)                                          |
| Intocht Sinterklaas (`arrival`)                      | Saturday between 12 and 18 November (fits 2021–2025)                                |
| Sinterklaastijd (`sinttime`)                         | day after the arrival … 5 December (level 1)                                        |
| Advent (`advent`)                                    | fourth Sunday before Christmas … 21 December (level 1); one more candle each Sunday |
| Vrijwilligersdag (`volunteersday`)                   | 7 December                                                                          |
| Paarse Vrijdag (`purplefriday`)                      | second Friday of December                                                           |
| Kortste dag (`shortestday`)                          | 21 December                                                                         |

Not added: Nationale Pannenkoekdag (no fixed rule: 8 March 2024, 4 April 2025). The
women's Euro 2029 and the 2030 World Cup are added to the football table once their dates
are published.

### 8.3 Table data

| Year | Ramadan         | Pesach         | Vesak          | Rosj Hasjana | Midherfst |
| ---- | --------------- | -------------- | -------------- | ------------ | --------- |
| 2026 | 18 Feb – 19 Mar | 1–9 Apr        | 31 May – 1 Jun | 11–13 Sep    | 25 Sep    |
| 2027 | 8 Feb – 8 Mar   | 21–29 Apr      | 20 May         | 1–3 Oct      | 15 Sep    |
| 2028 | 27 Jan – 25 Feb | 10–18 Apr      | 8 May          | 20–22 Sep    | 3 Oct     |
| 2029 | 15 Jan – 13 Feb | 30 Mar – 7 Apr | 27 May         | 9–11 Sep     | 22 Sep    |
| 2030 | 5 Jan – 3 Feb   | 17–25 Apr      | 16–17 May      | 27–29 Sep    | 12 Sep    |

School holidays: from the first region's start to the last region's end, per
Rijksoverheid (2026–2027 to 2029–2030).
