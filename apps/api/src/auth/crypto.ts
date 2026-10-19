import {
  createHash,
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
export const token = () => randomBytes(32).toString("base64url");
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const hmac = (secret: string, value: string) =>
  createHmac("sha256", secret).update(value).digest("hex");
const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$32768$8$1$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (
    parts.length !== 6 ||
    parts.slice(0, 4).join("$") !== "scrypt$32768$8$1" ||
    !/^[a-f0-9]{32}$/.test(parts[4]!) ||
    !/^[a-f0-9]{128}$/.test(parts[5]!)
  )
    return false;
  return timingSafeEqual(
    await derive(password, parts[4]!),
    Buffer.from(parts[5]!, "hex"),
  );
}
