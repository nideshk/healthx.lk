import crypto from "crypto";

const SECRET = process.env.JWT_SALT_KEY;

if (!SECRET) {
  throw new Error("SECRET_KEY is missing");
}

if (SECRET.length !== 64) {
  throw new Error(
    `Invalid SECRET_KEY length: ${SECRET.length}. Must be 64 hex characters (32 bytes).`
  );
}

const KEY = Buffer.from(SECRET, "hex"); // 🔑 32 bytes

export const encrypt = (text: string) => {
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    KEY,
    iv
  );

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
};

export const decrypt = (text: string) => {
  const [ivHex, encrypted] = text.split(":");

  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    KEY,
    Buffer.from(ivHex, "hex")
  );

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};
