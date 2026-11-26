/**
 * Don't Lose Your Way, with Carlos Cabrales — chapter data.
 *
 * Single source of truth for the Podcast page's Night Road chapter list.
 * The date table also lives in the show's RELEASE-PLAN.md
 * (~/workspace/content/cc3po/dontloseyourway-podcast/RELEASE-PLAN.md);
 * the two records must never drift — when a release date is set, set it
 * in both places in the same motion.
 *
 * Staging rule (per the release plan): a staged chapter shows its marker,
 * title, and status on the page — NO player, NO audio URL, nothing public
 * until its release date opens it. `audioUrl` stays null while staged.
 *
 * Descriptions are drawn verbatim from the chapter map in CONCEPT-BRIEF-V2
 * (Carlos's own brief) — no new copy.
 */
export const chapters = [
  {
    number: 1,
    numberWord: 'One',
    title: 'The Letter',
    slug: 'the-letter',
    status: 'staged',
    releaseDate: '2026-12-07',
    audioUrl: null,
    duration: '11:13',
    description:
      'November 2024: the letter he wrote and hoped no one would ever have to read; believing he was a burden; still here.',
  },
  {
    number: 2,
    numberWord: 'Two',
    title: 'The Quiet Spiral',
    slug: 'the-quiet-spiral',
    status: 'staged',
    releaseDate: '2026-12-14',
    audioUrl: null,
    duration: '10:28',
    description:
      'The slow slide: quiet house, loud head, handling it himself because asking felt impossible.',
  },
  {
    number: 3,
    numberWord: 'Three',
    title: 'The Bureaucratic Wall',
    slug: 'the-bureaucratic-wall',
    status: 'staged',
    releaseDate: '2026-12-21',
    audioUrl: null,
    duration: '10:31',
    description:
      'Systems, paperwork, case plans — needing help and meeting process instead.',
  },
  {
    number: 4,
    numberWord: 'Four',
    title: 'The Breaking Point',
    slug: 'the-breaking-point',
    status: 'staged',
    releaseDate: '2026-12-28',
    audioUrl: null,
    duration: '10:28',
    description:
      'The night everything broke; the ward; the moment the story could have ended.',
  },
  {
    number: 5,
    numberWord: 'Five',
    title: 'The Aftermath',
    slug: 'the-aftermath',
    status: 'staged',
    releaseDate: '2027-01-04',
    audioUrl: null,
    duration: '10:21',
    description:
      'After the headlines: no charges, no parade, just the quiet work of still being here.',
  },
  {
    number: 6,
    numberWord: 'Six',
    title: 'Breaking the Cycle',
    slug: 'breaking-the-cycle',
    status: 'staged',
    releaseDate: '2027-01-11',
    audioUrl: null,
    duration: '10:45',
    description:
      'Men start talking; peace as a practice; what he is building now and why.',
  },
];

/** Status line shown beside a staged chapter's marker. Plain and honest:
 *  the chapter exists, it is staged, and it opens on its release date.
 *  Release dates: Mondays from December 7, 2026, 06:00 PT (set by Carlos
 *  2026-11-26; same table in RELEASE-PLAN.md). */
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "Opens Mon, Dec 7" — the Night Road Radio readout's status line for a
 *  staged chapter (the radio pass, 2026-11-26). Same date table, same
 *  formatting as the status line below; the two must never drift. */
export function opensTextFor(chapter) {
  if (!chapter.releaseDate) return 'Opens on its release date';
  const [y, m, d] = chapter.releaseDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `Opens ${WEEKDAYS[dt.getUTCDay()]}, ${MONTHS[m - 1]} ${d}`;
}
export function statusTextFor(chapter) {
  if (!chapter.releaseDate) return 'Staged — opens on its release date';
  const opens = opensTextFor(chapter);
  return `Staged — ${opens.charAt(0).toLowerCase()}${opens.slice(1)}`;
}
