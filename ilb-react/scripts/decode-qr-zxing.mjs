import { Jimp } from "jimp";
import zxing from "@zxing/library";

const {
  BinaryBitmap,
  HybridBinarizer,
  QRCodeReader,
  RGBLuminanceSource,
  DecodeHintType,
  BarcodeFormat,
} = zxing;

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Uso: node scripts/decode-qr-zxing.mjs /ruta/a/imagen.(png|jpg|jpeg)");
  process.exit(2);
}

const base = await Jimp.read(inputPath);

function toBitmap(img) {
  const { width, height, data } = img.bitmap; // RGBA
  const rgb = new Uint8ClampedArray(width * height * 3);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
    rgb[j] = data[i];
    rgb[j + 1] = data[i + 1];
    rgb[j + 2] = data[i + 2];
  }
  const source = new RGBLuminanceSource(rgb, width, height);
  return new BinaryBitmap(new HybridBinarizer(source));
}

function prep(img) {
  // Convertimos a B/N fuerte para que se detecten mejor los finder patterns.
  return img
    .clone()
    .greyscale()
    .contrast(0.5)
    .normalize()
    .resize({ w: img.bitmap.width * 3, h: img.bitmap.height * 3 })
    .threshold({ max: 160 });
}

const reader = new QRCodeReader();
const hints = new Map([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]],
  [DecodeHintType.TRY_HARDER, true],
]);

const w = base.bitmap.width;
const h = base.bitmap.height;
const attempts = [];

// A) imagen completa
attempts.push(prep(base));
// B) mitad izquierda
attempts.push(prep(base.clone().crop({ x: 0, y: 0, w: Math.floor(w * 0.60), h })));
// C) recorte aproximado del QR (layout ibisPaint)
{
  const x = Math.floor(w * 0.08);
  const y = Math.floor(h * 0.19);
  const cw = Math.floor(w * 0.42);
  const ch = Math.floor(h * 0.70);
  attempts.push(prep(base.clone().crop({ x, y, w: cw, h: ch })));
}

let result = null;
for (const img of attempts) {
  try {
    result = reader.decode(toBitmap(img), hints);
    break;
  } catch {
    // seguimos intentando
  }
}

if (!result) {
  console.error("No se pudo decodificar el QR con ZXing.");
  process.exit(1);
}

const raw = result.getRawBytes?.() || null;
const text = result.getText?.() || "";

if (raw && raw.length) {
  // Imprimimos JSON para preservar bytes binarios.
  process.stdout.write(
    JSON.stringify(
      {
        text,
        rawBytesBase64: Buffer.from(raw).toString("base64"),
        rawBytesLength: raw.length,
      },
      null,
      2
    )
  );
} else {
  process.stdout.write(JSON.stringify({ text }, null, 2));
}
