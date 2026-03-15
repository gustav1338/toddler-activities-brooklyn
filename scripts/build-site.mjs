import fs from 'fs';
import path from 'path';

const repoName = 'toddler-activities-brooklyn';
const pagesBase = `/${repoName}`;
const originLabel = 'Central Ave & Menahan St, Brooklyn';

function saturdayFor(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (6 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function fmtDate(date) {
  return date.toISOString().slice(0, 10);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function layout({ title, body, canonicalPath }) {
  const canonical = `https://gustav1338.github.io${pagesBase}${canonicalPath}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="Weekend toddler + parent picks near Brooklyn, sorted by transit time.">
  <link rel="canonical" href="${canonical}">
  <style>
    :root { color-scheme: light; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; background: #faf8f4; color: #1f2937; }
    main { max-width: 760px; margin: 0 auto; padding: 32px 20px 64px; }
    h1, h2 { line-height: 1.1; }
    .lede { font-size: 1.05rem; color: #374151; }
    .card { background: white; border-radius: 18px; padding: 20px; margin: 16px 0; box-shadow: 0 1px 2px rgba(0,0,0,.06); }
    .meta { color: #6b7280; font-size: .95rem; }
    ul { padding-left: 1.2rem; }
    a { color: #0f766e; }
    .pill { display: inline-block; background: #ecfeff; color: #155e75; border-radius: 999px; padding: 4px 10px; font-size: .85rem; margin-right: 8px; }
    footer { color: #6b7280; font-size: .9rem; margin-top: 28px; }
  </style>
</head>
<body>
  <main>${body}</main>
</body>
</html>`;
}

export function buildIssue(targetDateString) {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const docsDir = path.join(root, 'docs');
  const activities = readJson(path.join(root, 'data', 'activities.json')).sort((a, b) => a.transitMinutes - b.transitMinutes);
  const saturday = targetDateString ? new Date(`${targetDateString}T12:00:00-04:00`) : saturdayFor();
  const issueDate = fmtDate(saturday);
  const issueSlug = `toddler-activities-${issueDate}`;
  const issueDir = path.join(docsDir, issueSlug);
  ensureDir(issueDir);

  const cards = activities.map((item, index) => `
    <section class="card">
      <div class="pill">#${index + 1}</div><div class="pill">${item.transitMinutes} min transit</div>
      <h2>${escapeHtml(item.name)}</h2>
      <p class="meta">${escapeHtml(item.area)} · ${escapeHtml(item.ageFit)}</p>
      <p>${escapeHtml(item.summary)}</p>
      <p><strong>Good plan:</strong> ${escapeHtml(item.plan)}</p>
      <ul>${item.tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('')}</ul>
      <p><a href="${item.sourceUrl}">Official site</a></p>
    </section>`).join('\n');

  const body = `
    <a href="${pagesBase}/">← All issues</a>
    <h1>Weekend toddler activities · ${issueDate}</h1>
    <p class="lede">Five practical toddler + parent picks, sorted by estimated weekend public-transit time from <strong>${originLabel}</strong>.</p>
    <p class="meta">Method: curated recurring spots, ranked by practical daytime transit time estimate. Use this as a short list, not a law of physics.</p>
    ${cards}
    <footer>Published for the weekend anchored to Saturday ${issueDate}.</footer>
  `;

  fs.writeFileSync(path.join(issueDir, 'index.html'), layout({ title: `Toddler activities ${issueDate}`, body, canonicalPath: `/${issueSlug}/` }));

  const entries = fs.readdirSync(docsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('toddler-activities-'))
    .map((d) => d.name)
    .sort()
    .reverse();

  const indexBody = `
    <h1>Brooklyn toddler activities</h1>
    <p class="lede">Weekly weekend picks for toddler + parent outings, sorted by estimated transit time from <strong>${originLabel}</strong>.</p>
    <div class="card">
      <h2>Issues</h2>
      <ul>${entries.map((slug) => `<li><a href="${pagesBase}/${slug}/">${slug.replace('toddler-activities-', '')}</a></li>`).join('')}</ul>
    </div>
  `;

  fs.writeFileSync(path.join(docsDir, 'index.html'), layout({ title: 'Brooklyn toddler activities', body: indexBody, canonicalPath: '/' }));

  return {
    issueDate,
    issueSlug,
    relativeUrl: `${pagesBase}/${issueSlug}/`,
    publicUrl: `https://gustav1338.github.io${pagesBase}/${issueSlug}/`
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argDate = process.argv.includes('--date') ? process.argv[process.argv.indexOf('--date') + 1] : undefined;
  console.log(JSON.stringify(buildIssue(argDate), null, 2));
}
