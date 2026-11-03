// Local, encrypted storage. Data never leaves this computer.
// - Passphrase → PBKDF2-SHA256 (310,000 iterations) → AES-GCM 256 key (Web Crypto).
// - The whole dataset is encrypted as one blob in the browser's IndexedDB for this file.
// - Encrypted backup files (.tasbackup) can be saved to and restored from any local folder.

import { AppData } from '../types';

const DB = 'ta-scorecard';
const STORE = 'vault';
const KEY = 'data';
const ITER = 310_000;

export interface VaultRecord {
  v: 1;
  email: string;
  salt: string; // base64
  iv: string; // base64
  ct: string; // base64 ciphertext
  savedAt: string;
}

const b64 = (b: ArrayBuffer | Uint8Array) => {
  const u = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = '';
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
};
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function deriveKey(email: string, passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(`${email.trim().toLowerCase()}\u0000${passphrase}`), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function seal(data: AppData, email: string, key: CryptoKey, salt: Uint8Array): Promise<VaultRecord> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(data)));
  return { v: 1, email, salt: b64(salt), iv: b64(iv), ct: b64(ct), savedAt: new Date().toISOString() };
}

export async function open(rec: VaultRecord, passphrase: string): Promise<{ data: AppData; key: CryptoKey; salt: Uint8Array }> {
  const salt = unb64(rec.salt);
  const key = await deriveKey(rec.email, passphrase, salt);
  let pt: ArrayBuffer;
  try {
    pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(rec.iv) }, key, unb64(rec.ct));
  } catch {
    throw new Error('Incorrect email or passphrase');
  }
  return { data: JSON.parse(new TextDecoder().decode(pt)), key, salt };
}

export function newSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function readVault(): Promise<VaultRecord | null> {
  const db = await idb();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
    t.onsuccess = () => res((t.result as VaultRecord) ?? null);
    t.onerror = () => rej(t.error);
  });
}

export async function writeVault(rec: VaultRecord): Promise<void> {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(rec, KEY);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export async function eraseVault(): Promise<void> {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
