// Ranks what the community asks for, for the gallery's « Community » page: open issues labelled
// module (a question), rule (an expert rule of thumb) or offer (a market offer), by their 👍.
// Runs at build time on GitHub Pages (GITHUB_TOKEN, GITHUB_REPOSITORY); without them, or when the
// API does not answer, it writes an empty list marked unavailable, so the gallery always builds.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const out = resolve(dirname(fileURLToPath(import.meta.url)), "../gallery/public/community.json");
const repo = process.env.GITHUB_REPOSITORY ?? "bazousdotcom/ui";
const token = process.env.GITHUB_TOKEN;
const KINDS = ["module", "rule", "offer"];

async function issues(label) {
  const list = [];
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues?state=open&labels=${label}&per_page=100&page=${page}`, {
      headers: { accept: "application/vnd.github+json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
    const batch = await res.json();
    list.push(...batch.filter((i) => !i.pull_request));
    if (batch.length < 100) break;
  }
  return list.map((i) => ({ number: i.number, title: i.title, url: i.html_url, votes: i.reactions?.["+1"] ?? 0,
                            comments: i.comments, opened: i.created_at.slice(0, 10) }))
    .sort((a, b) => b.votes - a.votes || a.number - b.number);
}

let data;
try {
  const entries = await Promise.all(KINDS.map(async (k) => [k, await issues(k)]));
  data = { repo, generated: new Date().toISOString().slice(0, 10), available: true, ...Object.fromEntries(entries) };
} catch (err) {
  console.warn(`community.json: ${err.message}; an empty list is written`);
  data = { repo, generated: new Date().toISOString().slice(0, 10), available: false, module: [], rule: [], offer: [] };
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
console.log(`community.json: ${data.module.length} question(s), ${data.rule.length} rule(s), ${data.offer.length} offer(s)`);
