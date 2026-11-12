/**
 * VEGA Forum – Hauseigener lokaler Audio-CAPTCHA Generator
 * Erzeugt ohne externe Dienste ein 16-Bit Mono PCM WAV-Audio.
 * Verwendet akustische Formant- & Konsonanten-Synthese für die 31 erlaubten Zeichen.
 */

const SAMPLE_RATE = 16000;

interface Phoneme {
  duration: number; // in Sekunden
  f1: number;       // Erste Formante (Hz)
  f2: number;       // Zweite Formante (Hz)
  f0: number;       // Grundfrequenz / Pitch (Hz)
  noiseLevel: number; // 0.0 bis 1.0 (Rauschanteil für Zischlaute)
  noiseBand?: number; // Mittenfrequenz des Rauschfilters
}

// Akustische Formantprofile für die Buchstabennamen
const CHAR_AUDIO_PROFILES: Record<string, Phoneme[]> = {
  '2': [ // "Zwei" -> Z (fricative) + W (nasal) + EI (a->i)
    { duration: 0.12, f1: 300, f2: 1800, f0: 130, noiseLevel: 0.7, noiseBand: 4500 },
    { duration: 0.18, f1: 750, f2: 1300, f0: 135, noiseLevel: 0.05 },
    { duration: 0.20, f1: 350, f2: 2200, f0: 120, noiseLevel: 0.02 },
  ],
  '3': [ // "Drei" -> D (plosive) + R + EI
    { duration: 0.08, f1: 250, f2: 1800, f0: 130, noiseLevel: 0.3 },
    { duration: 0.15, f1: 500, f2: 1500, f0: 135, noiseLevel: 0.1 },
    { duration: 0.25, f1: 700, f2: 1400, f0: 120, noiseLevel: 0.02 },
  ],
  '4': [ // "Vier" -> F + I + R
    { duration: 0.12, f1: 250, f2: 2400, f0: 130, noiseLevel: 0.6, noiseBand: 3500 },
    { duration: 0.26, f1: 300, f2: 2300, f0: 135, noiseLevel: 0.02 },
    { duration: 0.12, f1: 500, f2: 1200, f0: 115, noiseLevel: 0.08 },
  ],
  '5': [ // "Fünf" -> F + Ü + N + F
    { duration: 0.10, f1: 250, f2: 2400, f0: 130, noiseLevel: 0.6, noiseBand: 3500 },
    { duration: 0.22, f1: 350, f2: 1700, f0: 135, noiseLevel: 0.02 },
    { duration: 0.14, f1: 250, f2: 1400, f0: 120, noiseLevel: 0.4, noiseBand: 3500 },
  ],
  '6': [ // "Sechs" -> S + E + CH + S
    { duration: 0.12, f1: 300, f2: 2500, f0: 130, noiseLevel: 0.75, noiseBand: 5500 },
    { duration: 0.18, f1: 550, f2: 1900, f0: 135, noiseLevel: 0.02 },
    { duration: 0.18, f1: 300, f2: 2500, f0: 120, noiseLevel: 0.75, noiseBand: 5500 },
  ],
  '7': [ // "Sieben" -> S + IE + B + EN
    { duration: 0.10, f1: 300, f2: 2500, f0: 130, noiseLevel: 0.7, noiseBand: 5500 },
    { duration: 0.22, f1: 300, f2: 2300, f0: 140, noiseLevel: 0.02 },
    { duration: 0.18, f1: 450, f2: 1200, f0: 120, noiseLevel: 0.05 },
  ],
  '8': [ // "Acht" -> A + CH + T
    { duration: 0.20, f1: 800, f2: 1250, f0: 135, noiseLevel: 0.02 },
    { duration: 0.14, f1: 600, f2: 1600, f0: 125, noiseLevel: 0.6, noiseBand: 2800 },
    { duration: 0.08, f1: 200, f2: 2000, f0: 110, noiseLevel: 0.8, noiseBand: 4000 },
  ],
  '9': [ // "Neun" -> N + EU + N
    { duration: 0.10, f1: 250, f2: 1400, f0: 130, noiseLevel: 0.05 },
    { duration: 0.25, f1: 600, f2: 1500, f0: 135, noiseLevel: 0.02 },
    { duration: 0.12, f1: 250, f2: 1400, f0: 115, noiseLevel: 0.05 },
  ],
  'A': [ // "A"
    { duration: 0.35, f1: 800, f2: 1250, f0: 135, noiseLevel: 0.02 },
  ],
  'B': [ // "Be"
    { duration: 0.08, f1: 200, f2: 1200, f0: 125, noiseLevel: 0.2 },
    { duration: 0.32, f1: 450, f2: 2100, f0: 135, noiseLevel: 0.02 },
  ],
  'C': [ // "Tse"
    { duration: 0.12, f1: 300, f2: 2500, f0: 130, noiseLevel: 0.7, noiseBand: 5000 },
    { duration: 0.30, f1: 450, f2: 2100, f0: 135, noiseLevel: 0.02 },
  ],
  'D': [ // "De"
    { duration: 0.08, f1: 250, f2: 1800, f0: 130, noiseLevel: 0.2 },
    { duration: 0.32, f1: 450, f2: 2100, f0: 135, noiseLevel: 0.02 },
  ],
  'E': [ // "E"
    { duration: 0.35, f1: 450, f2: 2100, f0: 135, noiseLevel: 0.02 },
  ],
  'F': [ // "Ef"
    { duration: 0.18, f1: 500, f2: 1900, f0: 135, noiseLevel: 0.02 },
    { duration: 0.22, f1: 250, f2: 2400, f0: 120, noiseLevel: 0.65, noiseBand: 3500 },
  ],
  'G': [ // "Ge"
    { duration: 0.08, f1: 300, f2: 2000, f0: 125, noiseLevel: 0.2 },
    { duration: 0.32, f1: 450, f2: 2100, f0: 135, noiseLevel: 0.02 },
  ],
  'H': [ // "Ha"
    { duration: 0.10, f1: 600, f2: 1200, f0: 130, noiseLevel: 0.4 },
    { duration: 0.32, f1: 800, f2: 1250, f0: 135, noiseLevel: 0.02 },
  ],
  'J': [ // "Jot"
    { duration: 0.14, f1: 300, f2: 2200, f0: 130, noiseLevel: 0.05 },
    { duration: 0.24, f1: 500, f2: 950, f0: 135, noiseLevel: 0.02 },
    { duration: 0.08, f1: 200, f2: 2000, f0: 110, noiseLevel: 0.7, noiseBand: 4000 },
  ],
  'K': [ // "Ka"
    { duration: 0.08, f1: 350, f2: 1800, f0: 130, noiseLevel: 0.5, noiseBand: 2000 },
    { duration: 0.34, f1: 800, f2: 1250, f0: 135, noiseLevel: 0.02 },
  ],
  'M': [ // "Em"
    { duration: 0.18, f1: 500, f2: 1900, f0: 135, noiseLevel: 0.02 },
    { duration: 0.24, f1: 250, f2: 1100, f0: 125, noiseLevel: 0.05 },
  ],
  'N': [ // "En"
    { duration: 0.18, f1: 500, f2: 1900, f0: 135, noiseLevel: 0.02 },
    { duration: 0.24, f1: 250, f2: 1450, f0: 125, noiseLevel: 0.05 },
  ],
  'P': [ // "Pe"
    { duration: 0.06, f1: 200, f2: 1000, f0: 130, noiseLevel: 0.5 },
    { duration: 0.34, f1: 450, f2: 2100, f0: 135, noiseLevel: 0.02 },
  ],
  'Q': [ // "Ku"
    { duration: 0.08, f1: 350, f2: 1800, f0: 130, noiseLevel: 0.5, noiseBand: 2000 },
    { duration: 0.34, f1: 320, f2: 800, f0: 135, noiseLevel: 0.02 },
  ],
  'R': [ // "Er"
    { duration: 0.20, f1: 500, f2: 1900, f0: 135, noiseLevel: 0.02 },
    { duration: 0.22, f1: 480, f2: 1300, f0: 125, noiseLevel: 0.1 },
  ],
  'S': [ // "Es"
    { duration: 0.18, f1: 500, f2: 1900, f0: 135, noiseLevel: 0.02 },
    { duration: 0.24, f1: 300, f2: 2500, f0: 120, noiseLevel: 0.75, noiseBand: 5500 },
  ],
  'T': [ // "Te"
    { duration: 0.06, f1: 200, f2: 2000, f0: 130, noiseLevel: 0.6, noiseBand: 4000 },
    { duration: 0.34, f1: 450, f2: 2100, f0: 135, noiseLevel: 0.02 },
  ],
  'U': [ // "U"
    { duration: 0.38, f1: 320, f2: 800, f0: 135, noiseLevel: 0.02 },
  ],
  'V': [ // "Vau"
    { duration: 0.10, f1: 250, f2: 2400, f0: 130, noiseLevel: 0.6, noiseBand: 3500 },
    { duration: 0.22, f1: 800, f2: 1250, f0: 135, noiseLevel: 0.02 },
    { duration: 0.15, f1: 350, f2: 850, f0: 120, noiseLevel: 0.02 },
  ],
  'W': [ // "We"
    { duration: 0.12, f1: 300, f2: 1000, f0: 130, noiseLevel: 0.05 },
    { duration: 0.32, f1: 450, f2: 2100, f0: 135, noiseLevel: 0.02 },
  ],
  'X': [ // "Iks"
    { duration: 0.16, f1: 320, f2: 2300, f0: 135, noiseLevel: 0.02 },
    { duration: 0.08, f1: 350, f2: 1800, f0: 125, noiseLevel: 0.4 },
    { duration: 0.18, f1: 300, f2: 2500, f0: 120, noiseLevel: 0.75, noiseBand: 5500 },
  ],
  'Y': [ // "Ypsilon"
    { duration: 0.18, f1: 350, f2: 1700, f0: 135, noiseLevel: 0.02 },
    { duration: 0.14, f1: 450, f2: 2100, f0: 130, noiseLevel: 0.05 },
    { duration: 0.18, f1: 500, f2: 950, f0: 120, noiseLevel: 0.02 },
  ],
  'Z': [ // "Tsett"
    { duration: 0.12, f1: 250, f2: 2500, f0: 130, noiseLevel: 0.7, noiseBand: 5000 },
    { duration: 0.20, f1: 500, f2: 1900, f0: 135, noiseLevel: 0.02 },
    { duration: 0.08, f1: 200, f2: 2000, f0: 110, noiseLevel: 0.7, noiseBand: 4000 },
  ],
};

/**
 * Erzeugt einen Ton-Signalton (Chime)
 */
function synthesizeChime(frequency: number, duration: number): Float32Array {
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 6); // Sanfter exponentieller Decay
    out[i] = Math.sin(2 * Math.PI * frequency * t) * env * 0.35;
  }
  return out;
}

/**
 * Synthetisiert ein Phonem anhand seiner Formanten & Rauschanteile
 */
function synthesizePhoneme(p: Phoneme): Float32Array {
  const numSamples = Math.floor(SAMPLE_RATE * p.duration);
  const out = new Float32Array(numSamples);

  let phaseF0 = 0;
  const attackSamples = Math.floor(SAMPLE_RATE * 0.02);
  const decaySamples = Math.floor(SAMPLE_RATE * 0.04);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    // Hüllkurve
    let env = 1.0;
    if (i < attackSamples) env = i / attackSamples;
    else if (i > numSamples - decaySamples) env = (numSamples - i) / decaySamples;

    // Glottaler Stimmband-Impuls (Voicing)
    phaseF0 += (2 * Math.PI * p.f0) / SAMPLE_RATE;
    if (phaseF0 > 2 * Math.PI) phaseF0 -= 2 * Math.PI;

    // Obertöne für Resonanzfilter
    const voiced =
      Math.sin(phaseF0) * 0.4 +
      Math.sin(phaseF0 * 2) * 0.25 +
      Math.sin(phaseF0 * 3) * 0.15;

    // Resonanzfilter für F1 und F2
    const form1 = Math.sin(2 * Math.PI * p.f1 * t) * 0.35;
    const form2 = Math.sin(2 * Math.PI * p.f2 * t) * 0.25;

    // Weißes/Gefiltertes Rauschen für Konsonanten
    const whiteNoise = (Math.random() * 2 - 1) * p.noiseLevel;

    out[i] = (voiced * (form1 + form2) * (1 - p.noiseLevel * 0.6) + whiteNoise * 0.4) * env * 0.55;
  }

  return out;
}

/**
 * Erzeugt eine vollständige Audio-Aufgabe (WAV Buffer)
 */
export function generateCaptchaWav(code: string): Buffer {
  const chunks: Float32Array[] = [];

  // 1. Einleitender Chime (Startsignal)
  chunks.push(synthesizeChime(660, 0.25));
  chunks.push(new Float32Array(Math.floor(SAMPLE_RATE * 0.25))); // 250ms Pause

  // 2. Jeden Buchstaben mit Tonfolge und Sprechlaut abspielen
  for (let i = 0; i < code.length; i++) {
    const char = code[i].toUpperCase();
    const profiles = CHAR_AUDIO_PROFILES[char] || CHAR_AUDIO_PROFILES['A'];

    // Kurzer Positionston (Nummerierungs-Piep)
    chunks.push(synthesizeChime(440 + i * 40, 0.08));
    chunks.push(new Float32Array(Math.floor(SAMPLE_RATE * 0.1))); // 100ms Pause

    // Buchstabenausgabe
    for (const phoneme of profiles) {
      chunks.push(synthesizePhoneme(phoneme));
    }

    // Pause zwischen den Zeichen
    chunks.push(new Float32Array(Math.floor(SAMPLE_RATE * 0.35)));
  }

  // 3. Ausklingender Chime
  chunks.push(synthesizeChime(520, 0.3));

  // Chunks zusammenführen
  let totalSamples = 0;
  for (const c of chunks) totalSamples += c.length;

  const combined = new Float32Array(totalSamples);
  let offset = 0;
  for (const c of chunks) {
    combined.set(c, offset);
    offset += c.length;
  }

  // 4. In 16-Bit Mono PCM WAV verpacken
  const byteRate = SAMPLE_RATE * 2;
  const blockAlign = 2;
  const dataSize = totalSamples * 2;
  const wavBuffer = Buffer.alloc(44 + dataSize);

  // RIFF Chunk Descriptor
  wavBuffer.write('RIFF', 0);
  wavBuffer.writeUInt32LE(36 + dataSize, 4);
  wavBuffer.write('WAVE', 8);

  // fmt Subchunk
  wavBuffer.write('fmt ', 12);
  wavBuffer.writeUInt32LE(16, 16); // Subchunk1Size (16 für PCM)
  wavBuffer.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  wavBuffer.writeUInt16LE(1, 22);  // NumChannels (1 = Mono)
  wavBuffer.writeUInt32LE(SAMPLE_RATE, 24); // SampleRate
  wavBuffer.writeUInt32LE(byteRate, 28);    // ByteRate
  wavBuffer.writeUInt16LE(blockAlign, 32);  // BlockAlign
  wavBuffer.writeUInt16LE(16, 34);          // BitsPerSample (16-bit)

  // data Subchunk
  wavBuffer.write('data', 36);
  wavBuffer.writeUInt32LE(dataSize, 40);

  // PCM Samples mit Dither & Soft-Clipping schreiben
  let writeOffset = 44;
  for (let i = 0; i < totalSamples; i++) {
    // Leises Hintergrundrauschen (Anti-OCR Schutz)
    const noise = (Math.random() - 0.5) * 0.02;
    const sample = Math.max(-1, Math.min(1, combined[i] + noise));
    const intSample = Math.floor(sample < 0 ? sample * 32768 : sample * 32767);
    wavBuffer.writeInt16LE(intSample, writeOffset);
    writeOffset += 2;
  }

  return wavBuffer;
}
