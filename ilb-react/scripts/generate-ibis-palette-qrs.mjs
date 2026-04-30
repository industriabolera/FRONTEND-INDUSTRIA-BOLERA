import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";

const hexListPath = process.argv[2] || path.resolve(process.cwd(), "../Test/ibis-palette.hex.txt");
const paletteBaseName = process.argv[3] || "ILB";

const TRAILER = 0xfffffebc; // observado en QR de ibisPaint exportado
const FIXED = {
  magic: Buffer.from("IPCP", "ascii"),
  version: Buffer.from([0x00, 0x02]),
  h1: Buffer.from([0x22, 0xe0]),
  h2: Buffer.from([0x03, 0x00]),
  nameOffsetLE: Buffer.from([0x16, 0x00]), // 22
  reserved: Buffer.alloc(4, 0),
};

function u16be(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(n >>> 0);
  return b;
}
function u32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0);
  return b;
}

function hexToRgbaU32(hex) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) throw new Error(`Hex inválido: ${hex}`);
  const rgb = parseInt(m[1], 16) >>> 0;
  // RRGGBBAA con AA=FF
  return ((rgb << 8) | 0xff) >>> 0;
}

function padTo4(bufs) {
  const len = bufs.reduce((acc, b) => acc + b.length, 0);
  const pad = (4 - (len % 4)) % 4;
  if (pad) bufs.push(Buffer.alloc(pad, 0));
}

function buildIbisPayload({ name, colors, totalSlots }) {
  const nameBytes = Buffer.from(name, "utf8");
  const parts = [];

  parts.push(FIXED.magic, FIXED.version, FIXED.h1, FIXED.h2, FIXED.nameOffsetLE);

  // unk12 (4 bytes) se escribe al final (depende del largo total)
  const unk12 = Buffer.alloc(4, 0);
  parts.push(unk12);

  // unk16: 4 bytes cero
  parts.push(FIXED.reserved);

  // nameLen + name
  parts.push(u16be(nameBytes.length), nameBytes);

  // padding a múltiplo de 4 antes del count
  padTo4(parts);

  parts.push(u32be(totalSlots));

  // slots: 1 byte flag + 4 bytes color (RRGGBBAA)
  for (let i = 0; i < totalSlots; i++) {
    if (i < colors.length) {
      parts.push(Buffer.from([0x01]), u32be(hexToRgbaU32(colors[i])));
    } else {
      parts.push(Buffer.from([0x00]), Buffer.alloc(4, 0));
    }
  }

  parts.push(u32be(TRAILER));

  const payload = Buffer.concat(parts);

  // regla observada: unk12 (u32BE) = payloadLength - 20
  unk12.writeUInt32BE(payload.length - 20);

  return payload;
}

const hexText = await fs.readFile(hexListPath, "utf8");
const all = hexText
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean);

const chunkSize = 64;
const chunks = [];
for (let i = 0; i < all.length; i += chunkSize) chunks.push(all.slice(i, i + chunkSize));

const outDir = path.resolve(process.cwd(), "../Test");
await fs.mkdir(outDir, { recursive: true });

for (let i = 0; i < chunks.length; i++) {
  const name = `${paletteBaseName} ${i + 1}/${chunks.length}`;
  const payload = buildIbisPayload({ name, colors: chunks[i], totalSlots: 64 });

  const outPng = path.join(outDir, `ibis-palette-${i + 1}.png`);
  const outTxt = path.join(outDir, `ibis-palette-${i + 1}.payload.base64.txt`);

  await fs.writeFile(outTxt, payload.toString("base64"), "utf8");

  await QRCode.toFile(
    outPng,
    [{ data: payload, mode: "byte" }],
    {
      errorCorrectionLevel: "M",
      margin: 2,
      scale: 10,
      type: "png",
    }
  );

  console.log(`OK: ${outPng}`);
}
