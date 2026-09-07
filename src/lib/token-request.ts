export type OwnCredentials = { clientId: string; clientSecret: string };

export const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
export const TOKEN_SERVER =
  "https://cloudflare-worker-token-service.audio-pwa.workers.dev/token";

/**
 * Where a token exchange goes, and what it carries.
 *
 * Two clients, two places the secret lives. A reader's own app has its secret
 * here, so that exchange goes straight to Reddit with the Basic header built
 * locally — Reddit's token endpoint is CORS-enabled, so a browser can do it
 * unaided. The built-in app's secret exists only inside the token worker, so
 * that exchange is posted there with `?basic` and no credentials of any kind;
 * the worker looks the secret up by client id and adds the header itself.
 *
 * Kept apart from the request so the branch can be asserted on. The failure
 * that matters isn't a wrong url, it's a reader's client secret being sent
 * somewhere it was never meant to go.
 */
export const tokenRequestFor = (
  params: URLSearchParams,
  own: OwnCredentials | undefined,
  defaultClientId: string
): { url: string; headers: Record<string, string>; body: string } => {
  const body = new URLSearchParams(params);
  body.append("client_id", own?.clientId ?? defaultClientId);

  const headers: Record<string, string> = {
    // Set explicitly rather than inferred from a URLSearchParams body, which
    // would append "; charset=UTF-8". The worker compares content-type by
    // equality and answers 415 to anything else.
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (own) {
    headers.Authorization = `Basic ${btoa(`${own.clientId}:${own.clientSecret}`)}`;
  }

  return {
    url: own ? REDDIT_TOKEN_URL : `${TOKEN_SERVER}?basic`,
    headers,
    body: body.toString(),
  };
};
