/**
 * Application-layer protection for sensitive IndexedDB fields.
 * Never store passwords, auth tokens, secrets, or card PAN/CVV.
 *
 * Uses Web Crypto AES-GCM when available; falls back to opaque base64
 * envelope (still marks data as app-managed — not a substitute for device encryption).
 */

const ENC_PREFIX = 'cp1:';

function toB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function deriveKey(passphrase: string): Promise<CryptoKey | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  const enc = new TextEncoder();
  const material = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('CafePilotsOfflineSalt.v1'),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Device-scoped passphrase — never a user password or API token. */
export function getDeviceEncryptionMaterial(deviceSalt: string): string {
  return `cafepilots-offline:${deviceSalt}`;
}

export async function encryptSensitiveJson(
  value: unknown,
  passphrase: string
): Promise<string> {
  const plain = JSON.stringify(value);
  const key = await deriveKey(passphrase);
  if (!key) {
    return `${ENC_PREFIX}b64:${btoa(unescape(encodeURIComponent(plain)))}`;
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain)
  );
  return `${ENC_PREFIX}gcm:${toB64(iv.buffer)}:${toB64(cipher)}`;
}

export async function decryptSensitiveJson<T = unknown>(
  envelope: string,
  passphrase: string
): Promise<T | null> {
  if (!envelope.startsWith(ENC_PREFIX)) {
    try {
      return JSON.parse(envelope) as T;
    } catch {
      return null;
    }
  }
  const body = envelope.slice(ENC_PREFIX.length);
  if (body.startsWith('b64:')) {
    try {
      return JSON.parse(decodeURIComponent(escape(atob(body.slice(4))))) as T;
    } catch {
      return null;
    }
  }
  if (!body.startsWith('gcm:')) return null;
  const parts = body.split(':');
  if (parts.length < 3) return null;
  const key = await deriveKey(passphrase);
  if (!key) return null;
  try {
    const iv = fromB64(parts[1]!);
    const data = fromB64(parts.slice(2).join(':'));
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch {
    return null;
  }
}

/** Reject accidental persistence of secrets. */
export function assertNoSecrets(obj: Record<string, unknown>): void {
  const banned = ['password', 'token', 'secret', 'api_key', 'card_number', 'cvv', 'pan'];
  const walk = (v: unknown, path: string) => {
    if (!v || typeof v !== 'object') return;
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      const p = `${path}.${k}`.toLowerCase();
      if (banned.some((b) => p.includes(b) && typeof val === 'string' && val.length > 0)) {
        throw new Error(`Refusing to persist sensitive field: ${path}.${k}`);
      }
      walk(val, `${path}.${k}`);
    }
  };
  walk(obj, 'root');
}
