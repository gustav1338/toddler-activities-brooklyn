import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const repoName = 'toddler-activities-brooklyn';
const pagesBase = `/${repoName}`;
const siteOrigin = `https://gustav1338.github.io${pagesBase}`;
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

function weekNumber(date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = Math.floor((date - start) / 86400000);
  return Math.floor((diff + start.getUTCDay()) / 7);
}

function socialMeta({ title, description, canonical, image }) {
  return `
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${image}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${image}">`;
}

function layout({ title, body, canonicalPath, description, imagePath }) {
  const canonical = `${siteOrigin}${canonicalPath}`;
  const image = imagePath ? `${siteOrigin}${imagePath}` : undefined;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">${image ? socialMeta({ title, description, canonical, image }) : ''}
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
    .hero { width: 100%; border-radius: 20px; margin: 12px 0 18px; display: block; }
  </style>
</head>
<body>
  <main>${body}</main>
</body>
</html>`;
}

async function downloadTo(url, dest) {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
}

async function generateSocialImage(issueDir, issueSlug, issueDate, activities) {
  const picks = activities.filter((a) => a.imageUrl).slice(0, 3);
  if (!picks.length) return null;

  const assetsDir = path.join(issueDir, 'social-assets');
  ensureDir(assetsDir);

  const localImages = [];
  for (let i = 0; i < picks.length; i++) {
    const ext = path.extname(new URL(picks[i].imageUrl).pathname) || '.jpg';
    const file = path.join(assetsDir, `source-${i}${ext}`);
    if (!fs.existsSync(file)) await downloadTo(picks[i].imageUrl, file);
    localImages.push(file);
  }

  const outPath = path.join(issueDir, 'social.jpg');
  const variant = weekNumber(new Date(`${issueDate}T12:00:00Z`)) % 2 === 0 ? 'hero' : 'montage';

  if (variant === 'hero' || localImages.length === 1) {
    execFileSync('ffmpeg', [
      '-y', '-i', localImages[0],
      '-vf', 'scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630',
      '-frames:v', '1', outPath
    ], { stdio: 'ignore' });
  } else {
    const inputs = localImages.flatMap((img) => ['-i', img]);
    const filter = [
      '[0:v]scale=400:630:force_original_aspect_ratio=increase,crop=400:630[left]',
      '[1:v]scale=400:630:force_original_aspect_ratio=increase,crop=400:630[mid]',
      `[2:v]scale=400:630:force_original_aspect_ratio=increase,crop=400:630[right]`,
      '[left][mid][right]hstack=inputs=3[out]'
    ].join(';');
    execFileSync('ffmpeg', [
      '-y', ...inputs,
      '-filter_complex', filter,
      '-map', '[out]',
      '-frames:v', '1', outPath
    ], { stdio: 'ignore' });
  }

  return `/${issueSlug}/social.jpg`;
}

export async function buildIssue(targetDateString) {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const docsDir = path.join(root, 'docs');
  const saturday = targetDateString ? new Date(`${targetDateString}T12:00:00-04:00`) : saturdayFor();
  const issueDate = fmtDate(saturday);
  const issueSlug = `toddler-activities-${issueDate}`;
  const issueDir = path.join(docsDir, issueSlug);
  ensureDir(issueDir);

  const activities = readJson(path.join(root, 'data', 'activities.json')).sort((a, b) => a.transitMinutes - b.transitMinutes);
  const socialImagePath = await generateSocialImage(issueDir, issueSlug, issueDate, activities);
  const description = `Weekend toddler + parent picks for ${issueDate}, sorted by transit time from ${originLabel}.`;

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
    ${socialImagePath ? `<img class="hero" src="${socialImagePath}" alt="Preview collage for the week's top toddler activities">` : ''}
    <p class="meta">Method: curated recurring spots, ranked by practical daytime transit time estimate. Use this as a short list, not a law of physics.</p>
    ${cards}
    <footer>Published for the weekend anchored to Saturday ${issueDate}.</footer>
  `;

  fs.writeFileSync(path.join(issueDir, 'index.html'), layout({ title: `Toddler activities ${issueDate}`, body, canonicalPath: `/${issueSlug}/`, description, imagePath: socialImagePath }));

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

  fs.writeFileSync(path.join(docsDir, 'index.html'), layout({ title: 'Brooklyn toddler activities', body: indexBody, canonicalPath: '/', description: 'Weekly weekend toddler + parent activity picks in Brooklyn, sorted by transit time.' }));

  return {
    issueDate,
    issueSlug,
    relativeUrl: `${pagesBase}/${issueSlug}/`,
    publicUrl: `${siteOrigin}/${issueSlug}/`,
    socialImageUrl: socialImagePath ? `${siteOrigin}${socialImagePath}` : null
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argDate = process.argv.includes('--date') ? process.argv[process.argv.indexOf('--date') + 1] : undefined;
  buildIssue(argDate).then((result) => console.log(JSON.stringify(result, null, 2)));
}
