/**
 * Reddit media: shared url helpers, plus turning `media_metadata` into real
 * `<img>` tags inside a comment or selftext body.
 */

/**
 * A single uploaded image. `p` are downscaled previews, `s` the full size.
 *
 * Three shapes show up in practice:
 * - `e: "Image"` — `s.u` is the original, `p` runs 108px to ~1080px.
 * - `e: "AnimatedImage"` — `s` carries `gif` and a much smaller `mp4` transcode
 *   instead of `u`, and `p` is only a 108/216px *still* frame.
 * - Giphy embeds — always `status: "invalid"` with no other keys at all, so the
 *   record key (`giphy|<id>`) is the only thing to work with.
 */
export interface MediaMetadataEntry {
  status: string;
  /** "Image" | "AnimatedImage" */
  e?: string;
  /** Mime type, e.g. "image/jpeg" */
  m?: string;
  /** Reddit's own id for the entry; equals the record key in every case seen. */
  id?: string;
  p?: { u: string; x: number; y: number }[];
  s?: { u?: string; gif?: string; mp4?: string; x: number; y: number };
}

/**
 * Decodes HTML entities in URLs (e.g., &amp; -> &)
 * Reddit API sometimes returns URLs with HTML-encoded ampersands which break image loading
 */
export const decodeHtmlEntities = (
  url: string | undefined
): string | undefined => {
  if (!url) return url;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = url;
  return textarea.value;
};

/**
 * Checks if a string is a valid URL
 */
export const isValidUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://");
};

/**
 * Widest image we ask Reddit for. `post.thumbnail` is a ~140px crop that looks
 * bad blown up, and the multi-megapixel source is wasteful for a feed.
 */
export const MAX_THUMBNAIL_WIDTH = 640;

/**
 * Inline body images get more room than a feed thumbnail: they render in a
 * ~900px column, so a 640px source is visibly soft.
 */
const MAX_INLINE_WIDTH = 960;

export const IMAGE_URL_REGEX = /\.(png|jpe?g|gif|webp|avif|bmp)(\?|$)/i;

/** Largest preview no wider than the cap, or undefined if they're all bigger. */
export const largestUnder = <T>(
  items: T[] | undefined,
  width: (item: T) => number,
  cap: number = MAX_THUMBNAIL_WIDTH
): T | undefined =>
  items?.filter((i) => width(i) <= cap).sort((a, b) => width(b) - width(a))[0];

/** One embeddable image resolved from a `media_metadata` entry. */
interface EmbeddedMedia {
  /** What the host shows inline. */
  src: string;
  /** Full resolution, shown when the reader expands. */
  full?: string;
  /** Tried when `src` fails to load. */
  fallback?: string;
  /** Looping mp4 transcode of an animated gif, when Reddit made one. */
  mp4?: string;
  width?: number;
  height?: number;
  kind: "image" | "gif";
}

const GIPHY_PREFIX = "giphy|";

/** Giphy ids are alphanumeric; nothing else may reach a url template. */
const GIPHY_ID = /^[A-Za-z0-9]+$/;

/**
 * Giphy embeds arrive as `status: "invalid"` with no urls and no dimensions, so
 * the record key is all there is. Reddit's own frontend derives the asset url
 * from that id, and so do we.
 *
 * The animated webp is the same animation as `giphy.gif` at roughly a fifth of
 * the bytes (595KB vs 3.5MB for a typical reaction gif), which matters when a
 * single joke thread carries two dozen of them. The gif stays as the fallback
 * for anything that can't decode animated webp.
 */
const giphyMedia = (key: string): EmbeddedMedia | undefined => {
  const id = key.slice(GIPHY_PREFIX.length);
  if (!GIPHY_ID.test(id)) return undefined;
  const base = `https://i.giphy.com/media/${id}`;
  return {
    src: `${base}/giphy.webp`,
    fallback: `${base}/giphy.gif`,
    kind: "gif",
  };
};

const mediaFromEntry = (
  key: string,
  entry: MediaMetadataEntry | undefined
): EmbeddedMedia | undefined => {
  // Checked before `status`, because giphy entries are always "invalid".
  if (key.startsWith(GIPHY_PREFIX)) return giphyMedia(key);
  if (!entry || entry.status !== "valid") return undefined;

  if (entry.e === "AnimatedImage") {
    // `p` for an animated image is a 108/216px still frame, which would look
    // broken inline, so the gif itself is the only sensible inline source.
    const gif = decodeHtmlEntities(entry.s?.gif);
    if (!isValidUrl(gif)) return undefined;
    return {
      src: gif as string,
      mp4: decodeHtmlEntities(entry.s?.mp4),
      width: entry.s?.x,
      height: entry.s?.y,
      kind: "gif",
    };
  }

  const preview = largestUnder(entry.p, (p) => p.x, MAX_INLINE_WIDTH);
  const src = decodeHtmlEntities(preview?.u ?? entry.s?.u);
  if (!isValidUrl(src)) return undefined;
  const full = decodeHtmlEntities(entry.s?.u);
  return {
    src: src as string,
    full: full !== src ? full : undefined,
    width: preview?.x ?? entry.s?.x,
    height: preview?.y ?? entry.s?.y,
    kind: "image",
  };
};

/**
 * The substring of an anchor's href that identifies this entry. Reddit puts the
 * media id in the url for everything it hosts (`preview.redd.it/<id>.jpeg`,
 * `i.redd.it/<id>.gif`) and the giphy id in the giphy link.
 */
const mediaToken = (key: string, entry?: MediaMetadataEntry): string =>
  key.startsWith(GIPHY_PREFIX) ? key.slice(GIPHY_PREFIX.length) : entry?.id ?? key;

const findAnchor = (
  anchors: Element[],
  used: Set<Element>,
  token: string
): Element | undefined =>
  // Short tokens could match some unrelated url by accident. Real reddit and
  // giphy ids are 10+ characters, so nothing legitimate is lost.
  token.length < 6
    ? undefined
    : anchors.find(
        (a) => !used.has(a) && (a.getAttribute("href") || "").includes(token)
      );

const buildImg = (doc: Document, media: EmbeddedMedia, link?: string) => {
  const img = doc.createElement("img");
  img.setAttribute("src", media.src);
  img.setAttribute("alt", media.kind === "gif" ? "gif" : "image");
  // Namespaced hints for the host. How big to draw it, when to load it and what
  // a click does are the host's call, not the plugin's.
  img.setAttribute("data-sg-media", media.kind);
  if (media.full) img.setAttribute("data-sg-full", media.full);
  if (media.fallback) img.setAttribute("data-sg-fallback", media.fallback);
  if (media.mp4) img.setAttribute("data-sg-mp4", media.mp4);
  if (link) img.setAttribute("data-sg-link", link);
  // Reserves the box so a thread doesn't jump as images load.
  if (media.width) img.setAttribute("width", String(media.width));
  if (media.height) img.setAttribute("height", String(media.height));
  return img;
};

/**
 * `media_metadata` describes a body's uploaded media; the body itself only
 * references it — as a bare link for anything Reddit hosts, or as
 * `![gif](giphy|<id>)` markdown for a giphy pick. Rewrites those references
 * into real `<img>` tags so the host renders them inline, in place, with the
 * surrounding prose untouched.
 *
 * Returns `html` unchanged when there's nothing to embed, which is the common
 * case — roughly three quarters of comments in a media-heavy thread.
 */
export const embedMedia = (
  html: string | undefined,
  markdown: string | undefined,
  metadata: Record<string, MediaMetadataEntry> | undefined
): string | undefined => {
  const keys = metadata ? Object.keys(metadata) : [];
  if (!html || keys.length === 0) return html;

  // A DOMParser document has no browsing context: nothing is fetched and no
  // script runs. Serializing back out through innerHTML also escapes attribute
  // values for us, so a url can never break out into markup.
  const doc = new DOMParser().parseFromString(html, "text/html");
  const anchors = Array.from(doc.querySelectorAll("a[href]"));
  const used = new Set<Element>();
  let changed = false;

  for (const key of keys) {
    const entry = metadata?.[key];
    const media = mediaFromEntry(key, entry);
    if (!media) continue;

    const anchor = findAnchor(anchors, used, mediaToken(key, entry));
    if (anchor) {
      used.add(anchor);
      // Replacing just the anchor keeps any prose sharing its paragraph.
      anchor.replaceWith(
        buildImg(doc, media, anchor.getAttribute("href") ?? undefined)
      );
      changed = true;
    } else if (markdown?.includes(`](${key})`)) {
      // The `![img](<mediaId>)` form renders no anchor at all, so position is
      // unrecoverable — appending beats dropping the image entirely. Gated on
      // the markdown because a removed comment can keep stale `media_metadata`,
      // and an image appended to "[removed]" would be a fabrication.
      const p = doc.createElement("p");
      p.appendChild(buildImg(doc, media));
      (doc.querySelector("div.md") ?? doc.body).appendChild(p);
      changed = true;
    }
  }

  return changed ? doc.body.innerHTML : html;
};
