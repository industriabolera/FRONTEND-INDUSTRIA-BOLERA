import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";

const payload = process.argv.slice(2).join(" ").trim() || "ILB - Paleta de colores";

// Paleta extraída de `Test/ .jpg` (incluye todos los hex visibles).
const PALETTE = [
  "#FFFFFF",
  "#E1E1E1",
  "#C6C6C6",
  "#ABABAB",
  "#808080",
  "#525252",
  "#262626",
  "#000000",
  "#FFCCCC",
  "#FF9999",
  "#FF6666",
  "#FF3333",
  "#FF0000",
  "#CC0000",
  "#990000",
  "#660000",
  "#FFCCED",
  "#FF99D6",
  "#FF66BA",
  "#FF3399",
  "#FF0074",
  "#CC0066",
  "#99003D",
  "#66003D",
  "#FFCCEC",
  "#FF99DD",
  "#FF66D4",
  "#FF33CF",
  "#FF00CF",
  "#CC00AF",
  "#99008B",
  "#660061",
  "#FFCCFF",
  "#F799FF",
  "#F066FF",
  "#E533FF",
  "#D900FF",
  "#A900CC",
  "#7B0099",
  "#520066",
  "#E6CCFF",
  "#D299FF",
  "#C366FF",
  "#B933FF",
  "#AE00FF",
  "#8600CC",
  "#5D0099",
  "#390066",
  "#DBCCFF",
  "#BC99FF",
  "#A166FF",
  "#8C33FF",
  "#7C00FF",
  "#5900CC",
  "#3B0099",
  "#230066",
  "#E0CCFF",
  "#B299FF",
  "#9266FF",
  "#6533FF",
  "#3100FF",
  "#1E00CC",
  "#0E0099",
  "#020066",
  "#CCCCFF",
  "#9999FF",
  "#6666FF",
  "#3333FF",
  "#0000FF",
  "#0000CC",
  "#000099",
  "#000066",
  "#CCEEFF",
  "#99DBFF",
  "#66C1FF",
  "#33A3FF",
  "#0080FF",
  "#0070CC",
  "#005B99",
  "#004266",
  "#CCF8FF",
  "#99ECFF",
  "#66DBFF",
  "#33C5FF",
  "#00AAFF",
  "#0092CC",
  "#007599",
  "#005366",
  "#CCFCFF",
  "#99D0FF",
  "#66D4FF",
  "#33CFFF",
  "#00CCFF",
  "#00AACC",
  "#008899",
  "#006166",
  "#CCFFFC",
  "#99FFFC",
  "#66FFFF",
  "#33FAFF",
  "#00EDFF",
  "#00C7CC",
  "#009999",
  "#006663",
  "#CCFFFA",
  "#99FFF7",
  "#66FFF0",
  "#33FFE6",
  "#00FFDA",
  "#00CCAA",
  "#00997C",
  "#006652",
  "#CCFFE9",
  "#99FFD5",
  "#66FFC4",
  "#33FFB5",
  "#00FFAA",
  "#00CC82",
  "#00995E",
  "#00663C",
  "#CCFFE2",
  "#99FFC2",
  "#66FFA4",
  "#33FF88",
  "#00FF67",
  "#00CC52",
  "#00993E",
  "#006629",
  "#CCFFCC",
  "#99FF99",
  "#66FF66",
  "#33FF33",
  "#00FF00",
  "#00CC00",
  "#009900",
  "#006600",
  "#E9FFCC",
  "#D7FF99",
  "#C7FF66",
  "#B9FF33",
  "#AFFF00",
  "#96CC00",
  "#789900",
  "#526600",
  "#F8FFCC",
  "#F5FF99",
  "#F8FF66",
  "#FFFF33",
  "#FFF800",
  "#CCC200",
  "#998E00",
  "#665C00",
  "#FFFCCC",
  "#FFF799",
  "#FFF066",
  "#FFE633",
  "#FFDA00",
  "#CCAA00",
  "#997C00",
  "#665200",
  "#FFE4CC",
  "#FFCC99",
  "#FFB666",
  "#FFA233",
  "#FF9100",
  "#CC6F00",
  "#995000",
  "#663300",
  "#FFE2CC",
  "#FFC299",
  "#FFA466",
  "#FF8533",
  "#FF6700",
  "#CC5200",
  "#993E00",
  "#662900",
  "#FFD9CC",
  "#FFAF99",
  "#FF8366",
  "#FF6533",
  "#FF2400",
  "#CC1800",
  "#990E00",
  "#660500"
];

const moduleSize = 10; // px
const marginModules = 4; // quiet zone

function escAttr(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

const qr = QRCode.create(payload, { errorCorrectionLevel: "H" });
const size = qr.modules.size;
const data = qr.modules.data;

const side = (size + marginModules * 2) * moduleSize;
let svg = "";

svg += `<?xml version="1.0" encoding="UTF-8"?>\n`;
svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}" viewBox="0 0 ${side} ${side}" shape-rendering="crispEdges">\n`;
svg += `  <rect width="100%" height="100%" fill="#FFFFFF"/>\n`;
svg += `  <title>${escAttr(payload)}</title>\n`;

let paletteIndex = 0;
for (let r = 0; r < size; r++) {
  for (let c = 0; c < size; c++) {
    const on = data[r * size + c];
    if (!on) continue;
    const x = (c + marginModules) * moduleSize;
    const y = (r + marginModules) * moduleSize;
    const fill = PALETTE[paletteIndex % PALETTE.length];
    paletteIndex++;
    svg += `  <rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="${fill}"/>\n`;
  }
}

svg += `</svg>\n`;

const outPath = path.resolve(process.cwd(), "../Test/palette-qr.svg");
await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, svg, "utf8");

console.log(`OK: ${outPath}`);
