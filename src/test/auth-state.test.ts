import { beforeEach, describe, expect, it } from "vitest";
import { consumeAuthState, issueAuthState } from "../lib/auth-state";

const KEY = "reddit_auth_state";

// Enough of Storage for these two functions.
const makeStorage = (): Storage => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage;
};

let storage: Storage;
beforeEach(() => {
  storage = makeStorage();
});

describe("auth state", () => {
  it("accepts the callback belonging to the flow it started", () => {
    const state = issueAuthState(storage, KEY);

    expect(consumeAuthState(storage, KEY, state)).toBe(true);
  });

  it("rejects a callback carrying a different state", () => {
    issueAuthState(storage, KEY);

    // A callback someone else crafted. Accepting it signs the reader in to
    // whichever account it carried.
    expect(consumeAuthState(storage, KEY, "not-the-one")).toBe(false);
  });

  it("rejects a callback carrying no state at all", () => {
    issueAuthState(storage, KEY);

    expect(consumeAuthState(storage, KEY, null)).toBe(false);
  });

  it("rejects any callback when no flow is in progress", () => {
    expect(consumeAuthState(storage, KEY, "anything")).toBe(false);
    expect(consumeAuthState(storage, KEY, null)).toBe(false);
  });

  it("rejects a replay of a genuine callback", () => {
    const state = issueAuthState(storage, KEY);

    expect(consumeAuthState(storage, KEY, state)).toBe(true);
    // The whole point of consuming it: a real callback captured and sent again
    // is no better than a forged one.
    expect(consumeAuthState(storage, KEY, state)).toBe(false);
  });

  it("consumes the state even when it rejects", () => {
    const state = issueAuthState(storage, KEY);
    consumeAuthState(storage, KEY, "wrong");

    // A failed attempt must not leave the real state sitting there for a
    // second guess.
    expect(consumeAuthState(storage, KEY, state)).toBe(false);
  });

  it("issues a different state each time", () => {
    const first = issueAuthState(storage, KEY);
    const second = issueAuthState(storage, KEY);

    expect(first).not.toBe(second);
  });
});
