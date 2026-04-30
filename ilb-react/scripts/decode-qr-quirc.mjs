import { Jimp } from "jimp";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const quirc = require("quirc");

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Uso: node scripts/decode-qr-quirc.mjs /ruta/a/imagen.(png|jpg|jpeg)");
  process.exit(2);
}

const img = await Jimp.read(inputPath);
const { width, height, data } = img.bitmap; // RGBA

// quirc espera una imagen en escala de grises (1 byte por pixel).
const gray = Buffer.alloc(width * height);
for (let i = 0, p = 0; i < data.length; i += 4, p++) {
  // luminancia rápida
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  gray[p] = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
}

const quircEntry = require.resolve("quirc");
// quircEntry suele ser .../node_modules/quirc/dist/cjs/index.js
const wasmPath = path.resolve(path.dirname(quircEntry), "../libquirc.wasm");
const wasm = await fs.readFile(wasmPath);
const { instance } = await WebAssembly.instantiate(wasm, {});

const decoder = new quirc.Quirc(instance);
const output = decoder.decode(gray, width, height);
const codes = Array.from(output || []);

if (!codes?.length) {
  console.error("No se encontró ningún QR.");
  process.exit(1);
}

// Usamos el primero.
const first = codes[0];
// Estructura esperada: entry.data.{text, payload(ArrayBuffer)}
const payloadText = first?.data?.text ?? "";
const payload = first?.data?.payload ?? null;

// `payload` puede venir como string o Uint8Array según implementación.
const text = payloadText;
const rawBytes =
  payload instanceof ArrayBuffer
    ? Buffer.from(new Uint8Array(payload))
    : Buffer.from(payloadText, "utf8");

process.stdout.write(
  JSON.stringify(
    {
      text,
      rawBytesBase64: rawBytes ? rawBytes.toString("base64") : null,
      rawBytesLength: rawBytes ? rawBytes.length : 0,
      codeCount: codes.length,
    },
    null,
    2
  )
);
