import { describe, expect, it, vi } from "vitest";
import { MintBackoff, createAppTokenCache } from "../lib/app-token";

const KEY = "reddit_app_token";
const backingOff = (secondsLeft: number) =>
  new Error(`backing off ${secondsLeft}s`);

const memoryStorage = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
};

describe("createAppTokenCache", () => {
  it("mints once and reuses the stored token until it nears expiry", async () => {
    let time = 0;
    const mint = vi
      .fn()
      .mockResolvedValueOnce({ access_token: "first", expires_in: 3600 })
      .mockResolvedValueOnce({ access_token: "second", expires_in: 3600 });
    const cache = createAppTokenCache(mint, memoryStorage(), KEY, backingOff, () => time);

    expect(await cache.get()).toBe("first");
    time = 50 * 60 * 1000;
    expect(await cache.get()).toBe("first");
    // Inside the five minute margin: renewed before Reddit would reject it.
    time = 56 * 60 * 1000;
    expect(await cache.get()).toBe("second");
    expect(mint).toHaveBeenCalledTimes(2);
  });

  it("shares one mint between reads that arrive together", async () => {
    const mint = vi.fn().mockResolvedValue({ access_token: "t", expires_in: 3600 });
    const cache = createAppTokenCache(mint, memoryStorage(), KEY, backingOff);

    const tokens = await Promise.all([cache.get(), cache.get(), cache.get()]);
    expect(tokens).toEqual(["t", "t", "t"]);
    expect(mint).toHaveBeenCalledTimes(1);
  });

  it("survives a reload through storage", async () => {
    const storage = memoryStorage();
    const mint = vi.fn().mockResolvedValue({ access_token: "t", expires_in: 3600 });
    await createAppTokenCache(mint, storage, KEY, backingOff).get();
    await createAppTokenCache(mint, storage, KEY, backingOff).get();
    expect(mint).toHaveBeenCalledTimes(1);
  });

  it("mints a fresh token after invalidate", async () => {
    const mint = vi
      .fn()
      .mockResolvedValueOnce({ access_token: "rejected", expires_in: 3600 })
      .mockResolvedValueOnce({ access_token: "fresh", expires_in: 3600 });
    const cache = createAppTokenCache(mint, memoryStorage(), KEY, backingOff);

    await cache.get();
    cache.invalidate();
    expect(await cache.get()).toBe("fresh");
  });

  it("lets a failed mint be retried rather than caching the failure", async () => {
    const mint = vi
      .fn()
      .mockRejectedValueOnce(new Error("429"))
      .mockResolvedValueOnce({ access_token: "t", expires_in: 3600 });
    const cache = createAppTokenCache(mint, memoryStorage(), KEY, backingOff);

    await expect(cache.get()).rejects.toThrow("429");
    expect(await cache.get()).toBe("t");
  });

  it("treats a response without a token as a failure", async () => {
    const mint = vi.fn().mockResolvedValue({ error: "invalid_client" });
    const cache = createAppTokenCache(mint, memoryStorage(), KEY, backingOff);
    await expect(cache.get()).rejects.toThrow();
  });

  it("stops asking while a rate limit's Retry-After runs", async () => {
    let time = 0;
    const mint = vi
      .fn()
      .mockRejectedValueOnce(new MintBackoff(60))
      .mockResolvedValueOnce({ access_token: "t", expires_in: 3600 });
    const cache = createAppTokenCache(mint, memoryStorage(), KEY, backingOff, () => time);

    await expect(cache.get()).rejects.toThrow("backing off 60s");
    time = 45 * 1000;
    // Fails at once with the time left, without asking again.
    await expect(cache.get()).rejects.toThrow("backing off 15s");
    expect(mint).toHaveBeenCalledTimes(1);

    time = 61 * 1000;
    expect(await cache.get()).toBe("t");
    expect(mint).toHaveBeenCalledTimes(2);
  });

  it("honours a backoff left by another load of the plugin", async () => {
    let time = 0;
    const storage = memoryStorage();
    const first = vi.fn().mockRejectedValue(new MintBackoff(30));
    await expect(
      createAppTokenCache(first, storage, KEY, backingOff, () => time).get()
    ).rejects.toThrow();

    const second = vi.fn();
    time = 10 * 1000;
    await expect(
      createAppTokenCache(second, storage, KEY, backingOff, () => time).get()
    ).rejects.toThrow("backing off 20s");
    expect(second).not.toHaveBeenCalled();
  });
});
