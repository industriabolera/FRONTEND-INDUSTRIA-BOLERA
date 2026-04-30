import { Jimp } from "jimp";
import jsQR from "jsqr";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Uso: node scripts/decode-qr-from-png.mjs /ruta/a/imagen.(png|jpg|jpeg)");
  process.exit(2);
}

const base = await Jimp.read(inputPath);

function tryDecode(img) {
  const { width, height, data } = img.bitmap;
  return jsQR(new Uint8ClampedArray(data), width, height, {
    inversionAttempts: "attemptBoth",
  });
}

function prep(img) {
  return img
    .clone()
    .greyscale()
    .contrast(0.35)
    .normalize();
}

const attempts = [];

// 1) Imagen completa, con pre-procesado
attempts.push(prep(base));

// 2) Recorte a la mitad izquierda (donde está el QR)
attempts.push(
  prep(base).crop({
    x: 0,
    y: 0,
    w: Math.floor(base.bitmap.width * 0.58),
    h: base.bitmap.height,
  })
);

// 3) Recorte “aproximado” al área del QR (para el layout típico de ibisPaint)
{
  const w = base.bitmap.width;
  const h = base.bitmap.height;
  const x = Math.floor(w * 0.08);
  const y = Math.floor(h * 0.18);
  const cw = Math.floor(w * 0.42);
  const ch = Math.floor(h * 0.70);
  attempts.push(prep(base).crop({ x, y, w: cw, h: ch }));
}

// 4) Mismo recorte pero escalado (a veces mejora la lectura)
{
  const last = attempts.at(-1);
  attempts.push(
    last
      .clone()
      .resize({ w: last.bitmap.width * 2, h: last.bitmap.height * 2 })
  );
}

let code = null;
for (const img of attempts) {
  code = tryDecode(img);
  if (code?.data) break;
}

if (!code?.data) {
  console.error("No se pudo decodificar el QR.");
  process.exit(1);
}

process.stdout.write(code.data);
