/**
 * The OAuth `state` parameter's lifecycle.
 *
 * State exists so a callback can be shown to belong to a flow this plugin
 * started. Without it — or with a constant, which is the same thing — a
 * callback crafted by someone else is indistinguishable from a real one, and
 * the reader silently ends up signed in to whichever account it carried.
 *
 * Kept apart from the login flow so the one property that matters can be
 * asserted: a state is good for exactly one callback.
 */
export const issueAuthState = (storage: Storage, key: string): string => {
  const state = crypto.randomUUID();
  storage.setItem(key, state);
  return state;
};

/**
 * True only for the callback belonging to the flow this issued a state for.
 *
 * Consumes the stored state whichever way it answers, so replaying even a
 * genuine callback fails the second time.
 */
export const consumeAuthState = (
  storage: Storage,
  key: string,
  received: string | null
): boolean => {
  const expected = storage.getItem(key);
  storage.removeItem(key);
  return !!expected && !!received && expected === received;
};
