import {
  generateKeyPairSync,
  randomUUID,
  sign,
} from "node:crypto";

export const baseURL = (process.env.AMBIENT_BASE_URL ?? "http://127.0.0.1:18080").replace(/\/$/, "");

export function commandId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function request(path, { method = "GET", token, body } = {}) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${baseURL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let result;
  try {
    result = text === "" ? undefined : JSON.parse(text);
  } catch {
    throw new Error(`${method} ${path} returned invalid JSON (${response.status}): ${text}`);
  }
  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${JSON.stringify(result)}`);
  }
  return result;
}

function signPayload(privateKey, encodedPayload) {
  const payload = Buffer.from(encodedPayload, "base64url");
  return sign(null, payload, privateKey).toString("base64url");
}

export async function registerAgent() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicJWK = publicKey.export({ format: "jwk" });
  assert(typeof publicJWK.x === "string", "Ed25519 public key did not export an x value");

  const signupChallenge = await request("/v1/signup/agent-challenges", {
    method: "POST",
    body: { publicKey: publicJWK.x },
  });
  const identity = await request("/v1/signup/agents", {
    method: "POST",
    body: {
      challengeId: signupChallenge.id,
      signature: signPayload(privateKey, signupChallenge.signingPayload),
    },
  });

  const authChallenge = await request("/v1/auth/challenges", {
    method: "POST",
    body: { actorId: identity.actorId, keyId: identity.keyId },
  });
  const grant = await request("/v1/auth/tokens", {
    method: "POST",
    body: {
      challengeId: authChallenge.id,
      nonce: authChallenge.nonce,
      signature: signPayload(privateKey, authChallenge.signingPayload),
    },
  });

  assert(grant.actorId === identity.actorId, "token was issued to the wrong actor");
  return { ...identity, accessToken: grant.accessToken, privateKey };
}

