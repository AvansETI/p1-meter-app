/**
 * Every version with its date and a one-sentence summary, newest first: shown under About in
 * the app's language and written to CHANGELOG.md by `pnpm changelog`
 * (docs/design/2026-11-15-release-notes.md). Add the new version at the top in the release
 * commit, then run `pnpm changelog`.
 */
export interface Release {
  version: string;
  /** Release date (YYYY-MM-DD), Dutch time. */
  date: string;
  en: string;
  nl: string;
}

export const RELEASES: Release[] = [
  {
    version: '0.15.1',
    date: '2026-11-16',
    en: 'Every chart shows a hairline that follows your finger or mouse.',
    nl: 'Alle grafieken tonen een haarlijn die je vinger of muis volgt.',
  },
  {
    version: '0.15.0',
    date: '2026-11-15',
    en: 'Release notes under About (with About as its own menu item on desktop), and feed-in is called "Teruglevering" in Dutch.',
    nl: 'Release notes onder Over (op desktop een eigen menu-item), en terug leveren heet nu "Teruglevering".',
  },
  {
    version: '0.14.2',
    date: '2026-11-15',
    en: 'Gas use during gaps in the readings is estimated from the meter readings and marked as estimated.',
    nl: 'Het gasverbruik tijdens gaten in de metingen wordt geschat uit de meterstanden en als geschat gemarkeerd.',
  },
  {
    version: '0.14.1',
    date: '2026-11-15',
    en: 'The splash screen says "Updating…" as soon as an update is found and stays two seconds after it.',
    nl: 'Het opstartscherm toont "Bijwerken…" zodra een update gevonden is en blijft daarna twee seconden staan.',
  },
  {
    version: '0.14.0',
    date: '2026-11-15',
    en: 'Fuller festive decorations, with a piet throwing pepernoten and a livelier Movember, and a live indicator that beats like a heart.',
    nl: 'Vollere feestdecoraties, met een pietje dat pepernoten strooit en een levendiger Movember, en een live-lampje dat klopt als een hart.',
  },
  {
    version: '0.13.1',
    date: '2026-11-15',
    en: 'An open app notices a new version within seconds, and the splash screen no longer starts twice during an update.',
    nl: 'Een geopende app ziet een nieuwe versie binnen seconden, en het opstartscherm start bij een update niet meer twee keer.',
  },
  {
    version: '0.13.0',
    date: '2026-11-15',
    en: 'Gas analysis settings are shared between all devices of a household.',
    nl: 'De instellingen van de gasanalyse zijn gedeeld tussen alle apparaten van een huishouden.',
  },
  {
    version: '0.12.0',
    date: '2026-11-15',
    en: 'Gas analysis with degree days, a settlement forecast and comparison with other households and CBS figures.',
    nl: 'Gasanalyse met graaddagen, een prognose voor de eindafrekening en vergelijking met andere huishoudens en CBS-cijfers.',
  },
  {
    version: '0.11.0',
    date: '2026-11-15',
    en: 'Festive decorations all year round, with information about each holiday on tap.',
    nl: 'Het hele jaar feestdecoraties, met uitleg over de feestdag als je erop tikt.',
  },
  {
    version: '0.10.0',
    date: '2026-11-14',
    en: 'Christmas and New Year decorations, usage statistics and automatic updates.',
    nl: 'Kerst- en nieuwjaarsdecoratie, gebruiksstatistieken en automatische updates.',
  },
  {
    version: '0.9.0',
    date: '2026-11-12',
    en: 'A language setting (Dutch or English), and the licenses open inside the app.',
    nl: 'Een taalinstelling (Nederlands of Engels), en de licenties openen binnen de app.',
  },
  {
    version: '0.8.1',
    date: '2026-11-10',
    en: 'Tariff changes show at once.',
    nl: 'Wijzigingen in de tarieven zijn direct zichtbaar.',
  },
  {
    version: '0.8.0',
    date: '2026-11-10',
    en: 'A loading indicator, names for tariff periods and a switch for the comparison contract.',
    nl: 'Een laadindicator, namen voor tariefperiodes en een schakelaar voor het vergelijkingscontract.',
  },
  {
    version: '0.7.0',
    date: '2026-11-09',
    en: "Costs in the app: today's costs on Live, and costs with forecasts in History.",
    nl: 'Kosten in de app: de kosten van vandaag op Live, en kosten met prognoses in Historie.',
  },
  {
    version: '0.6.1',
    date: '2026-11-09',
    en: 'Clearer meter information in Settings.',
    nl: 'Duidelijkere meterinformatie bij Instellingen.',
  },
  {
    version: '0.6.0',
    date: '2026-11-09',
    en: 'Daily costs per tariff contract, and the MNEXT logo in the title bar.',
    nl: 'Dagelijkse kosten per tariefcontract, en het MNEXT-logo in de titelbalk.',
  },
  {
    version: '0.5.1',
    date: '2026-11-09',
    en: 'Prices are fetched more reliably when the price database is briefly unavailable.',
    nl: 'Prijzen worden betrouwbaarder opgehaald als de prijsdatabase even niet bereikbaar is.',
  },
  {
    version: '0.5.0',
    date: '2026-11-09',
    en: 'Tariffs per household under Settings, with versions and daily backups.',
    nl: 'Tarieven per huishouden bij Instellingen, met versies en dagelijkse back-ups.',
  },
  {
    version: '0.4.0',
    date: '2026-11-09',
    en: 'Day-ahead electricity and gas prices are fetched and stored, as groundwork for costs.',
    nl: 'Dagprijzen voor stroom en gas worden opgehaald en bewaard, als basis voor de kosten.',
  },
  {
    version: '0.3.0',
    date: '2026-11-09',
    en: 'History per day, week, month and year, with electricity, gas and a comparison with the previous period.',
    nl: 'Historie per dag, week, maand en jaar, met stroom, gas en een vergelijking met de vorige periode.',
  },
  {
    version: '0.2.3',
    date: '2026-11-09',
    en: 'Charts on iOS appear at once, without an intro animation.',
    nl: 'Grafieken op iOS verschijnen direct, zonder intro-animatie.',
  },
  {
    version: '0.2.2',
    date: '2026-11-09',
    en: 'A gas chart per hour on the Live page, and a fix for charts on iOS.',
    nl: 'Een gasgrafiek per uur op de Live-pagina, en een oplossing voor grafieken op iOS.',
  },
  {
    version: '0.2.1',
    date: '2026-11-09',
    en: 'Fixes from the first production deploy.',
    nl: 'Oplossingen na de eerste uitrol naar productie.',
  },
  {
    version: '0.2.0',
    date: '2026-11-09',
    en: 'Automatic deployment to production at p1-meter.sendlab.nl.',
    nl: 'Automatische uitrol naar productie op p1-meter.sendlab.nl.',
  },
  {
    version: '0.1.0',
    date: '2026-11-09',
    en: 'First release: an installable app with EMON ID entry and a live dashboard for electricity and gas.',
    nl: 'Eerste versie: een installeerbare app met invoer van het EMON ID en een live dashboard voor stroom en gas.',
  },
];

const RELEASES_URL = 'https://github.com/AvansETI/p1-meter-app/releases';

/** CHANGELOG.md (Keep a Changelog, newest first), as `pnpm changelog` writes it. */
export function renderChangelog(releases: Release[]): string {
  const entries = releases.map((r) => `## [${r.version}] - ${r.date}\n\n${r.en}\n`);
  const links = releases.map((r) => `[${r.version}]: ${RELEASES_URL}/tag/v${r.version}`);
  return [
    '# Changelog',
    '',
    'All versions, newest first, with a one-sentence summary. The full notes are on the',
    `[GitHub releases](${RELEASES_URL}) page. Generated from \`apps/web/src/releases/releases.ts\``,
    'by `pnpm changelog`; do not edit by hand.',
    '',
    ...entries,
    ...links,
    '',
  ].join('\n');
}
