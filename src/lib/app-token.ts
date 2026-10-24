/**
 * Reddit's userless ("app-only") token, used for every read made without a
 * login.
 *
 * Reddit stopped serving its anonymous `.json` endpoints: www, api and oauth
 * all answer 403 "blocked by network security" without a token, even to a tab
 * carrying a reddit.com session. A `client_credentials` token on
 * oauth.reddit.com still reads all public listings, and needs no cookies.
 *
 * Cached in storage because the token worker rate-limits this grant per
 * caller, and a token is good for a day; minting one per page load would be
 * wasteful and could trip that limit for readers sharing an IP.
 */

export interface AppTokenResponse {
  access_token?: string;
  expires_in?: number;
}

/**
 * Thrown by a mint that was refused for asking too often. The cache holds off
 * for this long, so retries in the meantime fail at once instead of asking
 * again and keeping the limit's window full.
 */
export class MintBackoff extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super(`Retry after ${retryAfterSeconds}s`);
  }
}

interface StoredAppToken {
  token: string;
  expiresAt: number;
}

/** Renew this long before Reddit's stated expiry, so no read races it. */
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;
/** When Reddit leaves out `expires_in`; app tokens have lasted an hour or more. */
const DEFAULT_LIFETIME_S = 60 * 60;

export interface AppTokenCache {
  /** A usable token, minting one if there is none or it is about to expire. */
  get: () => Promise<string>;
  /** Forget the current token, after Reddit rejected it. */
  invalidate: () => void;
}

export const createAppTokenCache = (
  mint: () => Promise<AppTokenResponse>,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  storageKey: string,
  /** The error to fail with while backing off, given the seconds left. */
  backingOff: (secondsLeft: number) => Error,
  now: () => number = Date.now
): AppTokenCache => {
  // Kept in storage rather than memory so a reload, or another frame of the
  // plugin, honours it too.
  const backoffKey = `${storageKey}_backoff_until`;
  const read = (): StoredAppToken | undefined => {
    try {
      const parsed = JSON.parse(storage.getItem(storageKey) ?? "null");
      if (
        typeof parsed?.token === "string" &&
        typeof parsed?.expiresAt === "number"
      ) {
        return parsed;
      }
    } catch {
      // A corrupt entry is just a missing one.
    }
    return undefined;
  };

  // One mint shared by every read that arrives while it's in flight; a feed
  // load fires several requests at once.
  let pending: Promise<string> | undefined;

  const get = async (): Promise<string> => {
    const stored = read();
    if (stored && stored.expiresAt - EXPIRY_MARGIN_MS > now()) {
      return stored.token;
    }
    const backoffUntil = Number(storage.getItem(backoffKey));
    if (backoffUntil > now()) {
      throw backingOff(Math.ceil((backoffUntil - now()) / 1000));
    }
    pending ??= (async () => {
      try {
        let response: AppTokenResponse;
        try {
          response = await mint();
        } catch (error) {
          if (!(error instanceof MintBackoff)) throw error;
          storage.setItem(
            backoffKey,
            String(now() + error.retryAfterSeconds * 1000)
          );
          throw backingOff(error.retryAfterSeconds);
        }
        if (!response.access_token) {
          throw new Error("Reddit did not issue an app token.");
        }
        const lifetime = response.expires_in ?? DEFAULT_LIFETIME_S;
        storage.setItem(
          storageKey,
          JSON.stringify({
            token: response.access_token,
            expiresAt: now() + lifetime * 1000,
          } satisfies StoredAppToken)
        );
        return response.access_token;
      } finally {
        pending = undefined;
      }
    })();
    return pending;
  };

  const invalidate = () => {
    storage.removeItem(storageKey);
  };

  return { get, invalidate };
};
