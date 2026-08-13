import { describe, expect, it } from "vitest";
import { MediaMetadataEntry, embedMedia } from "../media";

/**
 * Fixtures mirror the shapes measured on a real thread
 * (r/nbacirclejerk/comments/1vmn4ay): a Reddit-hosted image referenced as a
 * bare preview link, a Reddit-hosted gif, and a giphy pick that arrives with
 * `status: "invalid"` and no urls at all.
 */

/** Signed preview urls only work with their query string byte-for-byte intact. */
const SIGNED =
  "https://preview.redd.it/fz9n29scvzih1.jpeg?width=960&format=pjpg&auto=webp&s=abc123def456";
const SIGNED_FULL =
  "https://preview.redd.it/fz9n29scvzih1.jpeg?width=1170&format=pjpg&auto=webp&s=fullsig789";

const imageEntry: MediaMetadataEntry = {
  status: "valid",
  e: "Image",
  m: "image/jpeg",
  id: "fz9n29scvzih1",
  p: [108, 216, 320, 640, 960].map((x) => ({
    u:
      x === 960
        ? SIGNED
        : `https://preview.redd.it/fz9n29scvzih1.jpeg?width=${x}&crop=smart&auto=webp&s=s${x}`,
    x,
    y: x * 2,
  })),
  s: { u: SIGNED_FULL, x: 1170, y: 1471 },
};

const gifEntry: MediaMetadataEntry = {
  status: "valid",
  e: "AnimatedImage",
  m: "image/gif",
  id: "7g8gd4ylwzih1",
  // Only a small still frame — must never be used as the inline source.
  p: [
    { u: "https://preview.redd.it/7g8gd4ylwzih1.gif?width=108&s=x", x: 108, y: 108 },
    { u: "https://preview.redd.it/7g8gd4ylwzih1.gif?width=216&s=y", x: 216, y: 216 },
  ],
  s: {
    gif: "https://i.redd.it/7g8gd4ylwzih1.gif",
    mp4: "https://preview.redd.it/7g8gd4ylwzih1.gif?format=mp4&s=mp4sig",
    x: 220,
    y: 220,
  },
};

const anchor = (href: string) => `<div class="md"><p><a href="${href}">${href}</a></p>\n</div>`;

const parse = (html: string | undefined) =>
  new DOMParser().parseFromString(html ?? "", "text/html");

const img = (html: string | undefined) => parse(html).querySelector("img");

describe("embedMedia", () => {
  it("leaves a body with no media_metadata exactly as it was", () => {
    const html = "<div class=\"md\"><p>just words</p></div>";
    // Identity, not just equality: proves the no-media fast path never parses.
    expect(embedMedia(html, "just words", undefined)).toBe(html);
    expect(embedMedia(html, "just words", {})).toBe(html);
  });

  it("replaces a reddit image link with the 960px preview", () => {
    const result = embedMedia(anchor(SIGNED_FULL), SIGNED_FULL, {
      fz9n29scvzih1: imageEntry,
    });
    const el = img(result)!;
    expect(el.getAttribute("src")).toBe(SIGNED);
    expect(el.getAttribute("data-sg-media")).toBe("image");
    expect(el.getAttribute("data-sg-full")).toBe(SIGNED_FULL);
    expect(el.getAttribute("width")).toBe("960");
    expect(el.getAttribute("height")).toBe("1920");
    expect(parse(result).querySelector("a")).toBeNull();
  });

  it("keeps the signed query string byte-for-byte", () => {
    const result = embedMedia(anchor(SIGNED_FULL), SIGNED_FULL, {
      fz9n29scvzih1: imageEntry,
    });
    // A mangled signature is a 403 from reddit, so this is the load-bearing one.
    expect(img(result)!.getAttribute("src")).toBe(SIGNED);
    expect(img(result)!.getAttribute("data-sg-full")).toBe(SIGNED_FULL);
  });

  it("uses the gif itself for an animated image, never the still preview", () => {
    const href = "https://i.redd.it/7g8gd4ylwzih1.gif";
    const result = embedMedia(anchor(href), href, { "7g8gd4ylwzih1": gifEntry });
    const el = img(result)!;
    expect(el.getAttribute("src")).toBe(href);
    expect(el.getAttribute("data-sg-media")).toBe("gif");
    expect(el.getAttribute("data-sg-mp4")).toBe(gifEntry.s!.mp4);
    expect(el.getAttribute("src")).not.toContain("width=108");
    expect(el.getAttribute("src")).not.toContain("width=216");
  });

  it("derives a giphy embed from the key, preferring webp over the gif", () => {
    const href = "https://giphy.com/gifs/3o7aTrs458Hl05XONy";
    const result = embedMedia(anchor(href), "![gif](giphy|3o7aTrs458Hl05XONy)", {
      "giphy|3o7aTrs458Hl05XONy": { status: "invalid" },
    });
    const el = img(result)!;
    // The gif rendition is ~6x the bytes of the webp for the same animation.
    expect(el.getAttribute("src")).toBe(
      "https://i.giphy.com/media/3o7aTrs458Hl05XONy/giphy.webp"
    );
    expect(el.getAttribute("data-sg-fallback")).toBe(
      "https://i.giphy.com/media/3o7aTrs458Hl05XONy/giphy.gif"
    );
    // The host falls back to this when neither rendition loads.
    expect(el.getAttribute("data-sg-link")).toBe(href);
  });

  it("refuses to build a url from a giphy id that isn't alphanumeric", () => {
    const href = "https://giphy.com/gifs/abc";
    const html = anchor(href);
    expect(
      embedMedia(html, "![gif](giphy|../../evil)", {
        "giphy|../../evil": { status: "invalid" },
      })
    ).toBe(html);
  });

  it("preserves prose sharing the paragraph with the media", () => {
    const html = `<div class="md"><p>lol this is exactly it <a href="${SIGNED_FULL}">${SIGNED_FULL}</a></p>\n</div>`;
    const doc = parse(embedMedia(html, `lol this is exactly it ${SIGNED_FULL}`, {
      fz9n29scvzih1: imageEntry,
    }));
    const p = doc.querySelector("p")!;
    expect(p.textContent).toContain("lol this is exactly it");
    expect(p.querySelector("img")).not.toBeNull();
  });

  it("embeds two entries into their own anchors", () => {
    const html =
      `<div class="md"><p><a href="${SIGNED_FULL}">a</a></p>` +
      `<p><a href="https://i.redd.it/7g8gd4ylwzih1.gif">b</a></p></div>`;
    const doc = parse(
      embedMedia(html, `${SIGNED_FULL}\n\nhttps://i.redd.it/7g8gd4ylwzih1.gif`, {
        fz9n29scvzih1: imageEntry,
        "7g8gd4ylwzih1": gifEntry,
      })
    );
    const srcs = Array.from(doc.querySelectorAll("img")).map((i) =>
      i.getAttribute("src")
    );
    expect(srcs).toEqual([SIGNED, "https://i.redd.it/7g8gd4ylwzih1.gif"]);
  });

  it("ignores an entry that isn't valid", () => {
    const html = anchor(SIGNED_FULL);
    expect(
      embedMedia(html, SIGNED_FULL, {
        fz9n29scvzih1: { status: "failed", e: "Image" },
      })
    ).toBe(html);
  });

  it("does not append stale media to a removed comment", () => {
    // A removed comment keeps its media_metadata but loses the body reference.
    const html = "<div class=\"md\"><p>[removed]</p></div>";
    expect(embedMedia(html, "[removed]", { fz9n29scvzih1: imageEntry })).toBe(html);
  });

  it("appends the ![img](id) markdown form, which renders no anchor", () => {
    const html = "<div class=\"md\"><p>look</p></div>";
    const doc = parse(
      embedMedia(html, "look\n\n![img](fz9n29scvzih1)", { fz9n29scvzih1: imageEntry })
    );
    expect(doc.querySelector("div.md > p:last-child img")?.getAttribute("src")).toBe(
      SIGNED
    );
  });

  it("cannot be broken out of by a url containing markup", () => {
    const evil = 'https://preview.redd.it/x.jpeg?s="><script>alert(1)</script>';
    const result = embedMedia(anchor("https://preview.redd.it/evilmedia123.jpeg"), "x", {
      evilmedia123: {
        status: "valid",
        e: "Image",
        id: "evilmedia123",
        s: { u: evil, x: 10, y: 10 },
      },
    });
    // Attribute serialization escapes `"` and `&` but not `<`, so the angle
    // brackets survive as literal text *inside* the attribute. What matters is
    // that they can't escape it: re-parsing yields the same attribute value and
    // no element ever comes into being.
    const doc = parse(result);
    expect(doc.querySelector("script")).toBeNull();
    expect(doc.querySelectorAll("img")).toHaveLength(1);
    expect(doc.querySelector("img")!.getAttribute("src")).toBe(evil);
  });
});
