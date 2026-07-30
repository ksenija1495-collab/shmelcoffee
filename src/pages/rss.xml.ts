import { getCollection } from 'astro:content';
import { SITE_URL } from '../lib/seo';

export async function GET() {
  const posts = (await getCollection('blog')).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );

  const items = posts.map((post) => {
    const link = `${SITE_URL}/blog/${post.id}/`;
    const pub = post.data.updatedDate || post.data.date;
    return `
    <item>
      <title><![CDATA[${post.data.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description><![CDATA[${post.data.description}]]></description>
      <pubDate>${pub.toUTCString()}</pubDate>
    </item>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Блог Shmelco Coffee Guide</title>
    <link>${SITE_URL}/blog</link>
    <description>Статьи о specialty кофе: сорта, заваривание, дегустация, обжарка</description>
    <language>ru</language>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(xml.trim(), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
