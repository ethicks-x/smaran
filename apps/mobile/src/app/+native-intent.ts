import type { NativeIntent } from "expo-router";

/**
 * Deep links the router must not act on.
 *
 * Signing in happens in a browser, and the Account Portal finishes by sending
 * the phone back to a custom-scheme URL. That URL is a handshake for Clerk —
 * it carries the nonce that the session is redeemed with — but the router sees
 * any incoming link as a request for a page. `smaran://sso-callback` reads as
 * "/sso-callback", which is not a screen, so the reader lands on "Page not
 * found" a moment before the session even exists.
 *
 * Both Clerk's own defaults are matched too (`<bundle id>://callback` on iOS,
 * `clerk://<package>.hosted-callback` on Android), so the guard holds if the
 * redirect URL is ever left to the SDK.
 */
const AuthCallback = /(^|[/.])(sso-callback|hosted-callback|callback)(\/|\?|$)/;

/**
 * Returning `null` drops the link: the browser session has already handed the
 * URL to Clerk by this point, so there is nothing left in it for the router,
 * and staying put lets the auth guard move us on once the session is active.
 */
export const redirectSystemPath: NativeIntent["redirectSystemPath"] = ({
  path,
}) => (AuthCallback.test(path) ? null : path);
