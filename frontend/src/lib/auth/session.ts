export const AUTH_COOKIE_NAME = "rtt_auth";

type AuthPayload = {
  authenticated: true;
  issuedAt: number;
  expiresAt?: number;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export async function createAuthToken(): Promise<string> {
  const now = Date.now();
  const payload: AuthPayload = {
    authenticated: true,
    issuedAt: now,
  };
  const encodedPayload = bytesToBase64Url(
    textEncoder.encode(JSON.stringify(payload)),
  );
  const signature = await createSignature(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export async function verifyAuthToken(token: string | undefined): Promise<boolean> {
  if (!token) {
    return false;
  }

  const [encodedPayload, signature, extra] = token.split(".");

  if (!encodedPayload || !signature || extra !== undefined) {
    return false;
  }

  try {
    const expectedSignature = await createSignature(encodedPayload);

    if (!safeEqualBase64Url(signature, expectedSignature)) {
      return false;
    }

    const payload = JSON.parse(
      textDecoder.decode(base64UrlToBytes(encodedPayload)),
    ) as Partial<AuthPayload>;

    return (
      payload.authenticated === true &&
      typeof payload.issuedAt === "number" &&
      payload.issuedAt <= Date.now() &&
      (typeof payload.expiresAt !== "number" || payload.expiresAt > Date.now())
    );
  } catch {
    return false;
  }
}

async function createSignature(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(payload),
  );

  return bytesToBase64Url(new Uint8Array(signature));
}

function getAuthSecret(): string {
  const secret = process.env.RTT_AUTH_SECRET;

  if (!secret) {
    throw new Error("RTT_AUTH_SECRET is required.");
  }

  return secret;
}

function safeEqualBase64Url(a: string, b: string): boolean {
  const aBytes = base64UrlToBytes(a);
  const bBytes = base64UrlToBytes(b);

  if (aBytes.length !== bBytes.length) {
    return false;
  }

  let difference = 0;

  aBytes.forEach((byte, index) => {
    difference |= byte ^ bBytes[index];
  });

  return difference === 0;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddedBase64 = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const binary = atob(paddedBase64);

  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
