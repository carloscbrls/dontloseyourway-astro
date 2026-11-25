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

for (const p of PAGES) {
  const md = readFileSync(`${SRC}/${p.file}`, 'utf8');
  const html = mdToHtml(md);
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
