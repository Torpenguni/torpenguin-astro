// Build-time fetch of the TorPenguin YouTube channel feed, with Shorts removed.
// Source: the channel RSS feed (no API key). Shorts are detected by the
// /shorts/{id} redirect behaviour: a Short returns 200, a long video 3xx.
// Result is memoised so multiple pages in one build share a single fetch, and
// every network path degrades to [] so a flaky build never fails.

const CHANNEL_ID = 'UCIKlfqLMGweE09ypj58pyYQ'; // youtube.com/torpenguin
const CHANNEL_URL = 'https://www.youtube.com/torpenguin';

export interface Video {
  id: string;
  title: string;
  published: string;
  thumbnail: string;
  url: string;
}

export const youtubeChannelUrl = CHANNEL_URL;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

async function isShort(id: string): Promise<boolean> {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${id}`, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });
    // 200 = stayed on /shorts (it is a Short). 3xx = redirected to /watch (long).
    return res.status === 200;
  } catch {
    return false; // on error, treat as long so we never silently drop real videos
  }
}

async function fetchLongVideos(): Promise<Video[]> {
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return [];
    const xml = await res.text();

    const entries = xml.split('<entry>').slice(1);
    const items: Video[] = entries
      .map((e) => {
        const id = e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
        const title = e.match(/<title>([^<]+)<\/title>/)?.[1];
        const published = e.match(/<published>([^<]+)<\/published>/)?.[1] ?? '';
        if (!id || !title) return null;
        return {
          id,
          title: decodeEntities(title),
          published,
          thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${id}`,
        } satisfies Video;
      })
      .filter((v): v is Video => v !== null);

    const shortFlags = await Promise.all(items.map((v) => isShort(v.id)));
    return items.filter((_, i) => !shortFlags[i]);
  } catch {
    return [];
  }
}

let cache: Promise<Video[]> | null = null;

/** Long-form videos from the channel (Shorts removed). Memoised per build. */
export function getLongVideos(): Promise<Video[]> {
  return (cache ??= fetchLongVideos());
}
