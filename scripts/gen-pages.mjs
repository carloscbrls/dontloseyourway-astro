#!/usr/bin/env node
/**
 * Phase 1 page generator — renders the faithful prose pages from the verbatim
 * source inventory (~/workspace/research_notes/dontloseyourway-20261125/source-content/).
 *
 * Rules enforced here:
 *  - Copy is carried word-for-word. Extractor annotation lines ([Image:…],
 *    [Footer:…], [Capture note:…], [Link:…]) are not site copy and are dropped,
 *    except the Talkspace link annotation, which becomes the real link the
 *    original page carries (href: talkspace.com — the Impact affiliate URL
 *    lives only in the Bolt source; flagged in the build report).
 *  - ONE deliberate standardization, directed in the migration brief and
 *    flagged for Carlos's ratification: Crisis Text Line keyword HOME -> TALK
 *    (the Village standard wording, per Quill's site guidance, Nov 22 2026).
 *    Every other word is untouched.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SRC = '/home/hatch/workspace/research_notes/dontloseyourway-20261125/source-content';

const PAGES = [
  { file: '02-about.md', out: 'src/pages/about.astro', title: "About — Don't Lose Your Way", desc: 'In November 2024, I wrote a letter I never wanted anyone to read. I believed I was a burden. I was wrong. I\u2019m still here.' },
  { file: '03-journal.md', out: 'src/pages/journal.astro', title: "Journal — Don't Lose Your Way", desc: 'Reflections for the nights you feel alone.' },
  { file: '06-resources.md', out: 'src/pages/resources.astro', title: "Resources — Don't Lose Your Way", desc: 'If you need immediate help: call or text 988 — available 24/7, free, confidential. Grounding tools, journaling prompts, and professional support.' },
  { file: '07-partners.md', out: 'src/pages/partners.astro', title: "Partners — Don't Lose Your Way", desc: "Don't Lose Your Way welcomes partnerships with organizations, foundations, and collaborators who believe in the power of emotional storytelling." },
  { file: '08-disclaimer.md', out: 'src/pages/disclaimer.astro', title: "Disclaimer — Don't Lose Your Way", desc: 'This website is not a mental health service, crisis intervention platform, or substitute for professional medical care.' },
  { file: '09-legal-terms.md', out: 'src/pages/legal/terms.astro', title: "Terms of Service — Don't Lose Your Way", desc: "Terms of Service for Don't Lose Your Way, operated by CC3PO LLC." },
  { file: '10-legal-privacy.md', out: 'src/pages/legal/privacy.astro', title: "Privacy Policy — Don't Lose Your Way", desc: "How Don't Lose Your Way handles information — minimal by design. Operated by CC3PO LLC." },
  { file: '11-legal-ai-disclosure.md', out: 'src/pages/legal/ai-disclosure.astro', title: "AI Disclosure Notice — Don't Lose Your Way", desc: 'How Don\u2019t Lose Your Way uses artificial intelligence, disclosed under California law (AB 853, AB 2013, AB 316).' },
  { file: '12-legal-crisis-protocol.md', out: 'src/pages/legal/crisis-protocol.astro', title: "Crisis Response Protocol — Don't Lose Your Way", desc: "How Don't Lose Your Way handles situations where a user may indicate risk of self-harm or suicide — honestly, including what it cannot do." },
  { file: '13-legal-community-moderation.md', out: 'src/pages/legal/community-moderation.astro', title: "Community Moderation Policy — Don't Lose Your Way", desc: 'How Don\u2019t Lose Your Way moderates anonymous community submissions to maintain a safe, supportive environment.' },
];

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function inline(s) {
  // **bold** is the only inline markdown in the inventory.
  return esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function mdToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let list = null;
  const closeList = () => { if (list) { out.push('</ul>'); list = null; } };
  let firstHeadingDone = false;

  for (let raw of lines) {
    let line = raw.trimEnd();
    const t = line.trim();
    if (!t) { closeList(); continue; }
    // First line of every inventory file is "# Title — URL" (extractor header).
    if (t.startsWith('# ')) { closeList(); continue; }
    // Extractor annotations are not site copy.
    if (t.startsWith('[') && t.endsWith(']')) {
      if (t.includes('Explore Talkspace')) {
        closeList();
        out.push('<p><a href="https://www.talkspace.com" target="_blank" rel="noopener noreferrer">Explore Talkspace \u2192</a></p>');
      }
      continue;
    }
    // Deliberate standardization (flagged): HOME -> TALK.
    line = line.replace(/HOME to 741741/g, 'TALK to 741741');
    const tt = line.trim();
    if (tt.startsWith('### ')) { closeList(); out.push(`<h3>${inline(tt.slice(4))}</h3>`); continue; }
    if (tt.startsWith('## ')) {
      closeList();
      const tag = firstHeadingDone ? 'h2' : 'h1';
      firstHeadingDone = true;
      out.push(`<${tag}>${inline(tt.slice(3))}</${tag}>`);
      continue;
    }
    if (tt.startsWith('- ')) {
      if (!list) { out.push('<ul>'); list = true; }
      out.push(`<li>${inline(tt.slice(2))}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(tt)}</p>`);
  }
  closeList();
  return out.join('\n      ');
}

/**
 * Elevation pass (2026-11-25): presentational pull-quote for the About page.
 * The quote is assembled from the page's own generated paragraphs — the words
 * are extracted from the verbatim output, never retyped — so the quote is
 * byte-identical to copy already on the page. Presentation only; no new words.
 */
function withPullquote(html, page) {
  if (page.file !== '02-about.md') return html;
  const m = html.match(/<p>(I believed I was a burden\.)<\/p>(\s*)<p>(I was wrong\.)<\/p>(\s*)<p>(I'm still here\.)<\/p>/);
  if (!m) {
    console.warn('pullquote: About anchor lines not found — skipping (copy may have changed)');
    return html;
  }
  const quote = `<blockquote class="pullquote"><p>${m[1]} ${m[3]} ${m[5]}</p></blockquote>`;
  return html.replace(m[0], `${m[0]}\n      ${quote}`);
}

/**
 * Resources + About quotes pass (2026-11-25, Carlos's direction): ADD-ONLY
 * functional blocks appended to three generated pages. His copy is untouched
 * and stays in place; everything below is Village functional/peer copy,
 * listed in full in qa/BUILD-REPORT.md for his review.
 *
 * About quotes come from scripts/about-quotes.json — each one asserted
 * byte-for-byte against the book exports on Drive ("Shattered and
 * Reforged", front matter + Chapter One) before being written there.
 * Safe messaging: nothing from the letter's contents is ever quoted.
 */
const ABOUT_QUOTES = JSON.parse(readFileSync(new URL('./about-quotes.json', import.meta.url), 'utf8')).quotes;

function pullquoteHtml(q) {
  const text = q.lines ? q.lines.join('<br />') : q.text;
  return `<blockquote class="pullquote"><p>${text}</p></blockquote>\n      <p class="quote-source">${q.caption}</p>`;
}

function withAboutQuotes(html, page) {
  if (page.file !== '02-about.md') return html;
  const byId = Object.fromEntries(ABOUT_QUOTES.map((q) => [q.id, q]));
  const anchors = [
    ['<p>If you are here at 2AM questioning your worth, you are not the only one.</p>', 'dedication'],
    ['<p>If you are in immediate distress, call or text 988 (U.S.) or your local emergency services.</p>', 'crash'],
  ];
  for (const [anchor, id] of anchors) {
    if (!html.includes(anchor)) {
      console.warn(`about-quotes: anchor for "${id}" not found — skipping`);
      continue;
    }
    html = html.replace(anchor, `${anchor}\n      ${pullquoteHtml(byId[id])}`);
  }
  const closing = ['voice', 'chorus', 'still-here'].map((id) => pullquoteHtml(byId[id])).join('\n      ');
  html += `\n      <h2>From the book, from the songs</h2>\n      ${closing}`;
  return html;
}

const RESOURCES_DIRECTORY = `<h2>Pages from this space</h2>
      <p>Short pages made here, by a peer — not professionals. Start where you are.</p>
      <ul>
      <li><a href="/resources/tonight/">For tonight</a> — if tonight is the hard one: what to do in the next hour, and who to call.</li>
      <li><a href="/resources/how-to-tell-someone/">How to tell someone</a> — a first sentence for the conversation you keep rehearsing.</li>
      <li><a href="/resources/when-the-rent-is-due/">When the rent is due</a> — first steps when housing and bills start to spiral.</li>
      </ul>
      <h2>More places that can help</h2>
      <p>Real organizations, checked against their own sites. If a number ever doesn't answer, call or text 988.</p>
      <h3>Talk to a person</h3>
      <ul>
      <li><strong><a href="https://www.mentalhealthsf.org/peer-run-warm-line/" target="_blank" rel="noopener noreferrer">California Peer-Run Warm Line</a></strong> — free, non-crisis emotional support from peer counselors with lived experience, for anyone in California. Call or text 1-855-600-WARM (9276). Check the site for current hours.</li>
      <li><strong><a href="https://www.nami.org/support-education/nami-helpline/" target="_blank" rel="noopener noreferrer">NAMI HelpLine</a></strong> — information, referrals, and support for people and families living with mental health conditions. Call 1-800-950-6264 or text NAMI to 62640, Monday–Friday, 10 a.m.–10 p.m. ET. Not a crisis line.</li>
      <li><strong><a href="https://www.samhsa.gov/find-help/helplines/national-helpline" target="_blank" rel="noopener noreferrer">SAMHSA National Helpline</a></strong> — free, confidential treatment referrals for mental health and substance use, in English and Spanish, any time. Call 1-800-662-HELP (4357).</li>
      <li><strong><a href="https://namisanjoaquin.org/contact/" target="_blank" rel="noopener noreferrer">NAMI San Joaquin County</a></strong> — the local NAMI affiliate in Stockton: peer and family support groups, and people nearby who understand. Call 209-269-2148 (not a crisis line).</li>
      </ul>
      <h3>If home isn't safe</h3>
      <ul>
      <li><strong><a href="https://www.thehotline.org/" target="_blank" rel="noopener noreferrer">National Domestic Violence Hotline</a></strong> — call 1-800-799-7233 or text START to 88788.</li>
      <li><strong><a href="https://rainn.org/" target="_blank" rel="noopener noreferrer">RAINN</a></strong> — support after sexual assault: call 1-800-656-4673.</li>
      <li><strong><a href="https://www.childhelphotline.org/" target="_blank" rel="noopener noreferrer">Childhelp National Child Abuse Hotline</a></strong> — call or text 1-800-422-4453.</li>
      </ul>
      <h3>Grief</h3>
      <ul>
      <li><strong><a href="https://www.dougy.org/" target="_blank" rel="noopener noreferrer">Dougy Center</a></strong> — grief support for children, teens, and families.</li>
      <li><strong><a href="https://whatsyourgrief.com/" target="_blank" rel="noopener noreferrer">What's Your Grief</a></strong> — plain-language articles and community for people grieving any kind of loss.</li>
      </ul>
      <h3>Veterans, LGBTQ+ youth, and trans peers</h3>
      <ul>
      <li><strong><a href="https://www.veteranscrisisline.net/" target="_blank" rel="noopener noreferrer">Veterans Crisis Line</a></strong> — call 988 and press 1, or text 838255.</li>
      <li><strong><a href="https://www.thetrevorproject.org/get-help/" target="_blank" rel="noopener noreferrer">The Trevor Project</a></strong> — for LGBTQ+ young people: call 1-866-488-7386 or text START to 678-678.</li>
      <li><strong><a href="https://translifeline.org/" target="_blank" rel="noopener noreferrer">Trans Lifeline</a></strong> — peer support run by and for trans people: call 1-877-565-8860.</li>
      </ul>
      <h3>En español</h3>
      <ul>
      <li><strong><a href="https://988lifeline.org/es/" target="_blank" rel="noopener noreferrer">988 en español</a></strong> — llama al 988 y marca 2, envía AYUDA por texto al 988, o usa el chat en línea.</li>
      <li><strong><a href="https://www.crisistextline.org/es" target="_blank" rel="noopener noreferrer">Crisis Text Line en español</a></strong> — envía AYUDA al 741741, o escribe por WhatsApp al 442-AYUDAME.</li>
      </ul>
      <h3>Rent, food, and bills</h3>
      <ul>
      <li><strong>211</strong> — free, confidential referrals for housing, food, utilities, and local help. Dial 2-1-1 from any phone. In San Joaquin County: <a href="https://211sj.org/" target="_blank" rel="noopener noreferrer">211 San Joaquin</a> — or call 1-800-436-9997, or text your ZIP code to 898211.</li>
      <li><strong><a href="https://www.localfoodbank.org/" target="_blank" rel="noopener noreferrer">Second Harvest of the Greater Valley</a></strong> — the food bank serving San Joaquin and Stanislaus counties. Call 209-239-2091.</li>
      <li><strong><a href="https://www.hud.gov/counseling" target="_blank" rel="noopener noreferrer">HUD housing counselors</a></strong> — free advice on rent, arrears, and housing options from HUD-approved counselors. Call 1-800-569-4287.</li>
      </ul>`;

function withResourcesDirectory(html, page) {
  if (page.file !== '06-resources.md') return html;
  return `${html}\n      ${RESOURCES_DIRECTORY}`;
}

const PARTNERS_WORK_WITH_US = `<h2>Ways to Work With Us</h2>
      <p>However you found this page — an organization, a clinic, a foundation, a business, or one person who wants to help — here is what working with this project can look like.</p>
      <h3>Who should reach out</h3>
      <ul>
      <li>Mental-health and peer-support organizations — warm lines, crisis services, community clinics</li>
      <li>Licensed clinicians — including therapists willing to lend their perspective to the podcast's conversations</li>
      <li>Foundations and funders — grants and sponsorships that keep this space free for the people who need it</li>
      <li>Businesses and sponsors — local and national, standing behind mental-health storytelling</li>
      <li>Educators, creators, and community leaders — collaborators who reach people this page cannot reach alone</li>
      </ul>
      <h3>What partnership can look like</h3>
      <ul>
      <li><strong>Resource sharing</strong> — your services listed on our Resources page; this space shared with the people you serve.</li>
      <li><strong>Co-promotion</strong> — campaigns, events, and awareness moments built together, in both directions.</li>
      <li><strong>Funding the build</strong> — sponsorships and grants that pay for production, accessibility, and outreach. Grant funding for this project can be received through a 501(c)(3) fiscal sponsor, so foundations can support the work even though the project itself is independent.</li>
      <li><strong>Voices</strong> — clinicians joining the podcast, and community voices — always anonymous, always with consent — joining the story.</li>
      </ul>
      <h3>Start the conversation</h3>
      <p>Call the project line: <a href="tel:+12097011137">(209) 701-1137</a>. Leave a message with your name, your organization, and what you have in mind — partnership messages are answered by a person.</p>
      <p>If you are looking for help for yourself right now, this page is not the door — please call or text 988, or start on the <a href="/resources/">Resources page</a>.</p>`;

function withPartnersWorkWithUs(html, page) {
  if (page.file !== '07-partners.md') return html;
  return `${html}\n      ${PARTNERS_WORK_WITH_US}`;
}

for (const p of PAGES) {
  const md = readFileSync(`${SRC}/${p.file}`, 'utf8');
  const html = withPartnersWorkWithUs(withResourcesDirectory(withAboutQuotes(withPullquote(mdToHtml(md), p), p), p), p);
  const astro = `---
// GENERATED by scripts/gen-pages.mjs from the verbatim source inventory
// (${p.file}). Do not hand-edit copy here — edit the generator or the source.
import Layout from '../${p.out.includes('/legal/') ? '../' : ''}layouts/Layout.astro';
---

<Layout title=${JSON.stringify(p.title)} description=${JSON.stringify(p.desc)}>
  <section class="section">
    <div class="container prose">
      ${html}
    </div>
  </section>
</Layout>
`;
  mkdirSync(dirname(p.out), { recursive: true });
  writeFileSync(p.out, astro);
  console.log('generated', p.out);
}
