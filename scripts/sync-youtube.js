/**
 * sync-youtube.js
 *
 * Kya karta hai:
 * 1. YouTube RSS feed se latest videos fetch karta hai
 * 2. content/videos/index.json mein naye videos add karta hai (duplicates skip)
 * 3. content/updates/index.json mein automatic update post banata hai
 *
 * Run: node scripts/sync-youtube.js
 * GitHub Actions mein automatically chalta hai
 */

import fetch from 'node-fetch';
import { XMLParser } from 'fast-xml-parser';
import fs from 'fs';
import path from 'path';

// ─── CONFIG ──────────────────────────────────────────────
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || 'UCxxxxxxxxxxxxxxxxxxxxxxxx';
// ^ GitHub Secret mein daalo (setup instructions neeche hain)

const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

const VIDEOS_JSON  = path.resolve('content/videos/index.json');
const UPDATES_JSON = path.resolve('content/updates/index.json');

// Default category mapping (title keywords se auto-detect)
const CATEGORY_MAP = [
  { keywords: ['tutorial', 'how to', 'kaise', 'step by step', 'export', 'import'], category: 'tutorials' },
  { keywords: ['tips', 'tricks', 'tip', 'trick'], category: 'tips' },
  { keywords: ['gameplay', 'skywars', 'pvp battle', 'collab', 'survival'], category: 'gaming' },
];
const DEFAULT_CATEGORY = 'minecraft';

// ─── HELPERS ─────────────────────────────────────────────
function detectCategory(title = '') {
  const lower = title.toLowerCase();
  for (const rule of CATEGORY_MAP) {
    if (rule.keywords.some(k => lower.includes(k))) return rule.category;
  }
  return DEFAULT_CATEGORY;
}

function slugify(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

function extractTags(title = '') {
  const tags = ['minecraft'];
  const lower = title.toLowerCase();
  if (lower.includes('mcpe') || lower.includes('pocket edition')) tags.push('MCPE');
  if (lower.includes('bedrock')) tags.push('bedrock');
  if (lower.includes('tutorial')) tags.push('tutorial');
  if (lower.includes('pvp')) tags.push('pvp');
  if (lower.includes('texture') || lower.includes('pack')) tags.push('texture pack');
  if (lower.includes('skywars')) tags.push('skywars');
  if (lower.includes('client')) tags.push('client');
  if (lower.includes('farm')) tags.push('farming');
  if (lower.includes('hindi') || lower.includes('हिंदी')) tags.push('hindi');
  return [...new Set(tags)];
}

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}

function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ Written: ${file}`);
}

// ─── MAIN ────────────────────────────────────────────────
async function main() {
  console.log(`\n🎬 Fetching YouTube RSS for channel: ${CHANNEL_ID}`);

  let rssText;
  try {
    const res = await fetch(RSS_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; The-Antigle-Sync/1.0)' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    rssText = await res.text();
  } catch (err) {
    console.error('❌ Failed to fetch RSS:', err.message);
    process.exit(1);
  }

  // Parse XML
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const parsed = parser.parse(rssText);
  const entries = parsed?.feed?.entry;

  if (!entries || entries.length === 0) {
    console.log('⚠️  No videos found in RSS feed.');
    return;
  }

  const rssVideos = (Array.isArray(entries) ? entries : [entries]).map(entry => {
    const videoId = entry['yt:videoId'];
    const title   = entry['title'] || '';
    const date    = entry['published']?.split('T')[0] || new Date().toISOString().split('T')[0];
    const desc    = entry['media:group']?.['media:description'] || '';

    return {
      id:          slugify(title) || videoId,
      title:       title,
      description: desc.slice(0, 250).replace(/\n/g, ' '),
      category:    detectCategory(title),
      thumbnail:   `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      youtube:     `https://www.youtube.com/watch?v=${videoId}`,
      date:        date,
      tags:        extractTags(title),
    };
  });

  // ── Update videos/index.json ──
  const existingVideos = readJSON(VIDEOS_JSON);
  const existingIds = new Set(existingVideos.map(v => v.id));
  const existingYtUrls = new Set(existingVideos.map(v => v.youtube));

  const newVideos = rssVideos.filter(v =>
    !existingIds.has(v.id) && !existingYtUrls.has(v.youtube)
  );

  if (newVideos.length === 0) {
    console.log('✅ No new videos to add. Everything is up to date!');
    return;
  }

  console.log(`\n🆕 Found ${newVideos.length} new video(s):`);
  newVideos.forEach(v => console.log(`   • ${v.title}`));

  // Prepend new videos (newest first)
  const updatedVideos = [...newVideos, ...existingVideos];
  writeJSON(VIDEOS_JSON, updatedVideos);

  // ── Auto-create Update post ──
  const existingUpdates = readJSON(UPDATES_JSON);
  const today = new Date().toISOString().split('T')[0];

  const videoListHtml = newVideos.map(v =>
    `<li><a href="${v.youtube}" target="_blank" rel="noopener"><strong>${v.title}</strong></a></li>`
  ).join('\n');

  const updatePost = {
    id:     `auto-update-${today}`,
    title:  newVideos.length === 1
              ? `New Video: ${newVideos[0].title}`
              : `${newVideos.length} Naye Videos Aaye!`,
    date:   today,
    summary: newVideos.length === 1
              ? `Ek nayi video upload hui hai — "${newVideos[0].title}". Abhi dekho!`
              : `${newVideos.length} nayi videos upload hui hain. Check karo!`,
    content: `<p>Nayi video${newVideos.length > 1 ? 'en' : ''} available ${newVideos.length > 1 ? 'hain' : 'hai'}! 🎮</p>
<ul>
${videoListHtml}
</ul>
<p>Videos section mein jaake dekho, ya directly YouTube pe jaao! 👇</p>`,
    featured_image: newVideos[0].thumbnail,
  };

  // Avoid duplicate update for same day
  const filtered = existingUpdates.filter(u => u.id !== updatePost.id);
  writeJSON(UPDATES_JSON, [updatePost, ...filtered]);

  console.log(`\n🎉 Done! Added ${newVideos.length} video(s) and created 1 update post.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
