import { PNG } from 'pngjs';
import crypto from 'crypto';
import { GLYPHS, GLYPH_WIDTH, GLYPH_HEIGHT } from './fontGlyphs';

interface RGB {
  r: number;
  g: number;
  b: number;
}

// Hochkontrast-Farbpalette im VEGA CrimeLife Design (Lila, Weiß, Cyan)
const CHAR_PALETTE: RGB[] = [
  { r: 245, g: 245, b: 245 }, // Weiß #F5F5F5
  { r: 233, g: 213, b: 255 }, // Helles Flieder #E9D5FF
  { r: 192, g: 132, b: 252 }, // VEGA Lila #C084FC
  { r: 168, g: 85, b: 247 },  // Kräftiges Violett #A855F7
  { r: 147, g: 197, b: 253 }, // Helles Eisblau #93C5FD
  { r: 216, g: 180, b: 254 }, // Helles Purpur #D8B4FE
];

const BG_COLOR: RGB = { r: 18, g: 18, b: 22 }; // Tiefschwarz-Dunkelgrau #121216

/**
 * Erzeugt serverseitig ein sicheres PNG-Bild für das übergebene CAPTCHA
 */
export function generateCaptchaPng(code: string): Buffer {
  const width = 230;
  const height = 75;
  const png = new PNG({ width, height });

  // 1. Hintergrund füllen mit dezentem Farbverlauf
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      // Sehr dezenter Verlauf nach unten
      const grad = Math.floor((y / height) * 8);
      png.data[idx] = Math.min(255, BG_COLOR.r + grad);
      png.data[idx + 1] = Math.min(255, BG_COLOR.g + Math.floor(grad / 2));
      png.data[idx + 2] = Math.min(255, BG_COLOR.b + grad * 2);
      png.data[idx + 3] = 255;
    }
  }

  // 2. Subtiles Hintergrund-Rauschen (40-60 Punkte)
  const bgDots = crypto.randomInt(40, 60);
  for (let i = 0; i < bgDots; i++) {
    const rx = crypto.randomInt(0, width);
    const ry = crypto.randomInt(0, height);
    const alpha = crypto.randomInt(30, 80);
    setPixelAlpha(png, rx, ry, { r: 139, g: 92, b: 246 }, alpha / 255);
  }

  // 3. Vorherige Störlinie im Hintergrund (weiche Sinus-Kurve)
  drawWavyLine(png, width, height, { r: 80, g: 50, b: 120 }, 0.45);

  // 4. Zeichen rendern (mit Rotation, Jitter & Skalierung)
  const charCount = code.length;
  const availableWidth = width - 40;
  const charSlotWidth = Math.floor(availableWidth / charCount);
  const scale = 3.6; // ~29x43 Pixel pro Zeichen

  for (let i = 0; i < charCount; i++) {
    const char = code[i].toUpperCase();
    const glyph = GLYPHS[char] || GLYPHS['A'];
    const color = CHAR_PALETTE[crypto.randomInt(0, CHAR_PALETTE.length)];

    // Zufällige horizontale Positionierung im Slot
    const slotStartX = 20 + i * charSlotWidth;
    const xJitter = crypto.randomInt(-3, 4);
    const yJitter = crypto.randomInt(-5, 6);
    const centerX = slotStartX + charSlotWidth / 2 + xJitter;
    const centerY = height / 2 + yJitter;

    // Zufällige Drehung (-15° bis +15°)
    const angleDeg = (crypto.randomInt(-14, 15) * Math.PI) / 180;
    const cosA = Math.cos(angleDeg);
    const sinA = Math.sin(angleDeg);

    // Glyph-Raster in Bild übertragen
    for (let gy = 0; gy < GLYPH_HEIGHT; gy++) {
      const rowBits = glyph[gy];
      for (let gx = 0; gx < GLYPH_WIDTH; gx++) {
        const isSet = (rowBits & (1 << (GLYPH_WIDTH - 1 - gx))) !== 0;
        if (!isSet) continue;

        // Ursprungspunkt bezogen auf Glyph-Mitte
        const relX = (gx - GLYPH_WIDTH / 2) * scale;
        const relY = (gy - GLYPH_HEIGHT / 2) * scale;

        // Rotation anwenden
        const rotX = relX * cosA - relY * sinA;
        const rotY = relX * sinA + relY * cosA;

        // Leichte Sinus-Welle im Zeichenverlauf
        const waveY = Math.sin((centerX + rotX) / 12) * 2;

        const targetX = Math.round(centerX + rotX);
        const targetY = Math.round(centerY + rotY + waveY);

        // Dickere Striche zeichnen (3x3 Pinsel) für hervorragende menschliche Lesbarkeit
        for (let dy = -1; dy <= 2; dy++) {
          for (let dx = -1; dx <= 2; dx++) {
            const px = targetX + dx;
            const py = targetY + dy;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              const edge = Math.abs(dx) === 2 || Math.abs(dy) === 2;
              setPixelAlpha(png, px, py, color, edge ? 0.75 : 1.0);
            }
          }
        }
      }
    }
  }

  // 5. Zwei moderate Störlinien im Vordergrund (Sinus-Kurven)
  drawWavyLine(png, width, height, { r: 168, g: 85, b: 247 }, 0.55);
  drawWavyLine(png, width, height, { r: 120, g: 120, b: 140 }, 0.4);

  // 6. Vordergrund-Rauschpunkte (30 Punkte)
  for (let i = 0; i < 30; i++) {
    const rx = crypto.randomInt(0, width);
    const ry = crypto.randomInt(0, height);
    setPixelAlpha(png, rx, ry, { r: 240, g: 240, b: 255 }, 0.6);
  }

  return PNG.sync.write(png);
}

/**
 * Zeichnet einen Pixel mit Alphablending
 */
function setPixelAlpha(png: PNG, x: number, y: number, color: RGB, alpha: number) {
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return;
  const idx = (png.width * y + x) << 2;

  const currentR = png.data[idx];
  const currentG = png.data[idx + 1];
  const currentB = png.data[idx + 2];

  png.data[idx] = Math.round(currentR * (1 - alpha) + color.r * alpha);
  png.data[idx + 1] = Math.round(currentG * (1 - alpha) + color.g * alpha);
  png.data[idx + 2] = Math.round(currentB * (1 - alpha) + color.b * alpha);
  png.data[idx + 3] = 255;
}

/**
 * Zeichnet eine moderate, wellenförmige Störlinie
 */
function drawWavyLine(png: PNG, width: number, height: number, color: RGB, alpha: number) {
  const startY = crypto.randomInt(15, height - 15);
  const endY = crypto.randomInt(15, height - 15);
  const freq = crypto.randomInt(18, 35);
  const amplitude = crypto.randomInt(6, 12);
  const phase = (crypto.randomInt(0, 360) * Math.PI) / 180;

  for (let x = 0; x < width; x++) {
    const progress = x / width;
    const baseY = startY + (endY - startY) * progress;
    const wave = Math.sin(x / freq + phase) * amplitude;
    const y = Math.round(baseY + wave);

    // Strichbreite 2 Pixel
    setPixelAlpha(png, x, y, color, alpha);
    setPixelAlpha(png, x, y + 1, color, alpha * 0.7);
  }
}
