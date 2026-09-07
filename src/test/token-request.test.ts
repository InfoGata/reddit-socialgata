import { describe, expect, it } from "vitest";
import {
  REDDIT_TOKEN_URL,
  TOKEN_SERVER,
  tokenRequestFor,
} from "../lib/token-request";

const DEFAULT_ID = "5eb28aNZjc1A6ngOjxldwA";

const exchange = () => {
  const p = new URLSearchParams();
  p.append("grant_type", "authorization_code");
  p.append("code", "abc123");
  return p;
};

const own = { clientId: "myid", clientSecret: "mysecret" };

describe("tokenRequestFor", () => {
  it("sends the built-in app's exchange to the worker, carrying no secret", () => {
    const req = tokenRequestFor(exchange(), undefined, DEFAULT_ID);

    // ?basic is what tells the worker to build an Authorization header rather
    // than put credentials in the body; Reddit only accepts the former.
    expect(req.url).toBe(`${TOKEN_SERVER}?basic`);
    expect(req.headers.Authorization).toBeUndefined();
    expect(new URLSearchParams(req.body).get("client_id")).toBe(DEFAULT_ID);
    // The secret for this client is the worker's to hold; we don't have it and
    // must never appear to.
    expect(req.body).not.toContain("client_secret");
  });

  it("sends a reader's own exchange straight to Reddit with Basic auth", () => {
    const req = tokenRequestFor(exchange(), own, DEFAULT_ID);

    expect(req.url).toBe(REDDIT_TOKEN_URL);
    expect(req.headers.Authorization).toBe(`Basic ${btoa("myid:mysecret")}`);
    expect(new URLSearchParams(req.body).get("client_id")).toBe("myid");
  });

  it("never sends a reader's secret to the worker", () => {
    // The failure this whole split exists to prevent. A reader who supplied
    // their own app has a secret we hold; it goes to Reddit or nowhere.
    const req = tokenRequestFor(exchange(), own, DEFAULT_ID);

    expect(req.url).not.toContain("workers.dev");
    expect(req.body).not.toContain("mysecret");
  });

  it("preserves the grant it was given", () => {
    const refresh = new URLSearchParams();
    refresh.append("grant_type", "refresh_token");
    refresh.append("refresh_token", "r1");

    const body = new URLSearchParams(tokenRequestFor(refresh, undefined, DEFAULT_ID).body);

    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("r1");
  });

  it("sets a content type the worker will accept", () => {
    // The worker compares this by equality and answers 415 otherwise, which a
    // URLSearchParams body would trigger by appending a charset.
    const req = tokenRequestFor(exchange(), undefined, DEFAULT_ID);

    expect(req.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
  });

  it("doesn't mutate the params it was handed", () => {
    const params = exchange();
    tokenRequestFor(params, undefined, DEFAULT_ID);

    // A retry that reused these would otherwise send client_id twice.
    expect(params.has("client_id")).toBe(false);
  });
});
