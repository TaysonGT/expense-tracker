/**
 * OAuth token verification for Google and Facebook.
 *
 * The client performs the OAuth dance with the provider and sends us the
 * resulting token(s). We verify them server-side against the provider's own
 * endpoints (no client secret needed for these verification calls) and return
 * a normalized profile. Uses global fetch (Node 18+).
 */

export type OAuthProvider = "google" | "facebook";

export interface OAuthProfile {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * Verify a Google ID token (JWT) via Google's tokeninfo endpoint. Also checks
 * the audience matches our configured client id when GOOGLE_CLIENT_ID is set.
 */
async function verifyGoogle(idToken: string): Promise<OAuthProfile> {
  const resp = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );
  if (!resp.ok) {
    throw new Error("Invalid Google token");
  }
  const data = (await resp.json()) as {
    sub?: string;
    email?: string;
    email_verified?: string | boolean;
    name?: string;
    picture?: string;
    aud?: string;
  };

  if (!data.sub || !data.email) {
    throw new Error("Google token missing required fields");
  }

  const expectedAud = process.env.GOOGLE_CLIENT_ID;
  if (expectedAud && data.aud && data.aud !== expectedAud) {
    throw new Error("Google token audience mismatch");
  }

  return {
    provider: "google",
    providerId: data.sub,
    email: data.email,
    name: data.name || data.email.split("@")[0],
    avatarUrl: data.picture ?? null,
  };
}

/**
 * Verify a Facebook access token via the Graph API, requesting the fields we
 * need. Facebook access tokens are opaque, so we exchange for the profile.
 */
async function verifyFacebook(accessToken: string): Promise<OAuthProfile> {
  const fields = "id,name,email,picture.type(large)";
  const resp = await fetch(
    `https://graph.facebook.com/me?fields=${fields}&access_token=${encodeURIComponent(accessToken)}`
  );
  if (!resp.ok) {
    throw new Error("Invalid Facebook token");
  }
  const data = (await resp.json()) as {
    id?: string;
    name?: string;
    email?: string;
    picture?: { data?: { url?: string } };
  };

  if (!data.id) {
    throw new Error("Facebook token missing id");
  }
  // Facebook may not return an email (user can decline). Synthesize a stable
  // placeholder so our unique-email constraint still holds per provider id.
  const email = data.email || `${data.id}@facebook.local`;

  return {
    provider: "facebook",
    providerId: data.id,
    email,
    name: data.name || `fb-${data.id}`,
    avatarUrl: data.picture?.data?.url ?? null,
  };
}

/**
 * Verify an OAuth credential for the given provider and return a normalized
 * profile. `token` is a Google ID token or a Facebook access token.
 */
export async function verifyOAuthToken(
  provider: OAuthProvider,
  token: string
): Promise<OAuthProfile> {
  if (provider === "google") return verifyGoogle(token);
  if (provider === "facebook") return verifyFacebook(token);
  throw new Error(`Unsupported provider: ${provider}`);
}
