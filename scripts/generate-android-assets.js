import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, pixelFn) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  function crc32(buf) {
    let table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const combined = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(combined), 0);
    return Buffer.concat([len, combined, crc]);
  }

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function renderAirconIcon(x, y, w, h, mode) {
  // mode: 'square', 'round', 'foreground', 'splash'
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background Theme: Aircon Ocean Blue (#0369a1)
  const bgR = 3, bgG = 105, bgB = 161;

  if (mode === 'round') {
    const maxR = w * 0.47;
    if (dist > maxR + 1) return [0, 0, 0, 0];
    if (dist > maxR) {
      const alpha = Math.max(0, Math.min(255, Math.round((maxR + 1 - dist) * 255)));
      return [bgR, bgG, bgB, alpha];
    }
  } else if (mode === 'square') {
    const r = w * 0.22;
    const qx = Math.max(0, Math.abs(dx) - (w / 2 - r));
    const qy = Math.max(0, Math.abs(dy) - (h / 2 - r));
    const cornerDist = Math.sqrt(qx * qx + qy * qy);
    if (cornerDist > r + 1) return [0, 0, 0, 0];
    if (cornerDist > r) {
      const alpha = Math.max(0, Math.min(255, Math.round((r + 1 - cornerDist) * 255)));
      return [bgR, bgG, bgB, alpha];
    }
  } else if (mode === 'foreground') {
    // Transparent background
  } else if (mode === 'splash') {
    // Solid background for splash
  }

  // Draw snowflake / HVAC cooling crystal icon
  const scale = (mode === 'foreground') ? (w * 0.26) : (Math.min(w, h) * 0.30);
  const nx = dx / scale;
  const ny = dy / scale;
  const ndist = Math.sqrt(nx * nx + ny * ny);

  let isForeground = false;

  // Center hub circle
  if (ndist <= 0.24) {
    isForeground = true;
  }

  // 6 radial snowflake arms
  const angle = Math.atan2(ny, nx);
  for (let i = 0; i < 6; i++) {
    const armAngle = (i * Math.PI) / 3;
    let diff = Math.abs(angle - armAngle);
    while (diff > Math.PI) diff -= Math.PI * 2;
    diff = Math.abs(diff);

    // Spine
    if (ndist <= 0.95 && ndist >= 0.12) {
      const armDist = ndist * Math.sin(diff) * scale;
      if (armDist <= Math.max(1.5, w * 0.022)) {
        isForeground = true;
      }
    }

    // Branch chevrons
    for (const bPos of [0.46, 0.74]) {
      const bDist = ndist - bPos;
      if (Math.abs(bDist) <= 0.26 && ndist >= 0.22 && ndist <= 0.92) {
        const perp = ndist * Math.sin(diff);
        const along = ndist * Math.cos(diff);
        const branchOffset = Math.abs(perp) - Math.abs(along - bPos) * 0.85;
        if (Math.abs(branchOffset) * scale <= Math.max(1.2, w * 0.016) && along >= bPos && along <= bPos + 0.24) {
          isForeground = true;
        }
      }
    }
  }

  if (isForeground) {
    return [255, 255, 255, 255];
  }

  if (mode === 'foreground') {
    return [0, 0, 0, 0];
  }

  return [bgR, bgG, bgB, 255];
}

export function generateAllAndroidAssets(baseDir = process.cwd()) {
  const resDir = path.join(baseDir, 'android', 'app', 'src', 'main', 'res');
  if (!fs.existsSync(resDir)) {
    console.warn('⚠️ Android res directory not found at:', resDir);
    return;
  }

  console.log('--- Generating Clean, Valid Android Launcher & Splash Assets ---');

  const densities = [
    { dir: 'mipmap-mdpi', iconSize: 48, fgSize: 108 },
    { dir: 'mipmap-hdpi', iconSize: 72, fgSize: 162 },
    { dir: 'mipmap-xhdpi', iconSize: 96, fgSize: 216 },
    { dir: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324 },
    { dir: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432 }
  ];

  // 1. Generate Mipmap Icons
  for (const d of densities) {
    const targetDir = path.join(resDir, d.dir);
    fs.mkdirSync(targetDir, { recursive: true });

    // ic_launcher.png
    const squarePng = createPng(d.iconSize, d.iconSize, (x, y, w, h) => renderAirconIcon(x, y, w, h, 'square'));
    fs.writeFileSync(path.join(targetDir, 'ic_launcher.png'), squarePng);

    // ic_launcher_round.png
    const roundPng = createPng(d.iconSize, d.iconSize, (x, y, w, h) => renderAirconIcon(x, y, w, h, 'round'));
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_round.png'), roundPng);

    // ic_launcher_foreground.png
    const fgPng = createPng(d.fgSize, d.fgSize, (x, y, w, h) => renderAirconIcon(x, y, w, h, 'foreground'));
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_foreground.png'), fgPng);
  }
  console.log('✓ Regenerated pristine launcher icons for all densities (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)');

  // 2. Generate Splash Screens
  const splashConfigs = [
    { dir: 'drawable', w: 480, h: 800 },
    { dir: 'drawable-land-mdpi', w: 480, h: 320 },
    { dir: 'drawable-land-hdpi', w: 800, h: 480 },
    { dir: 'drawable-land-xhdpi', w: 1280, h: 720 },
    { dir: 'drawable-land-xxhdpi', w: 1600, h: 960 },
    { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280 },
    { dir: 'drawable-port-mdpi', w: 320, h: 480 },
    { dir: 'drawable-port-hdpi', w: 480, h: 800 },
    { dir: 'drawable-port-xhdpi', w: 720, h: 1280 },
    { dir: 'drawable-port-xxhdpi', w: 960, h: 1600 },
    { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920 }
  ];

  for (const s of splashConfigs) {
    const targetDir = path.join(resDir, s.dir);
    fs.mkdirSync(targetDir, { recursive: true });
    const splashPng = createPng(s.w, s.h, (x, y, w, h) => renderAirconIcon(x, y, w, h, 'splash'));
    fs.writeFileSync(path.join(targetDir, 'splash.png'), splashPng);
  }
  console.log('✓ Regenerated clean splash screen PNG assets for all orientations & densities');

  // 3. Ensure XML Resource Definitions
  const anyDpiDir = path.join(resDir, 'mipmap-anydpi-v26');
  fs.mkdirSync(anyDpiDir, { recursive: true });

  const adaptiveIconXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
`;
  fs.writeFileSync(path.join(anyDpiDir, 'ic_launcher.xml'), adaptiveIconXml, 'utf8');
  fs.writeFileSync(path.join(anyDpiDir, 'ic_launcher_round.xml'), adaptiveIconXml, 'utf8');

  // Drawable vector resources
  const drawableDir = path.join(resDir, 'drawable');
  fs.mkdirSync(drawableDir, { recursive: true });

  const bgVectorXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#0369a1"
        android:pathData="M0,0h108v108h-108z" />
</vector>
`;
  fs.writeFileSync(path.join(drawableDir, 'ic_launcher_background.xml'), bgVectorXml, 'utf8');

  const fgVectorXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M54,50 A4,4 0 1,0 54,58 A4,4 0 1,0 54,50 Z" />
    <path
        android:strokeColor="#FFFFFF"
        android:strokeWidth="3"
        android:strokeLineCap="round"
        android:pathData="M54,26 L54,82 M46,36 L54,42 L62,36 M46,72 L54,66 L62,72" />
    <path
        android:strokeColor="#FFFFFF"
        android:strokeWidth="3"
        android:strokeLineCap="round"
        android:pathData="M29.75,40 L78.25,68 M34,51 L43.6,50 L47.6,41 M60.4,67 L64.4,58 L74,57" />
    <path
        android:strokeColor="#FFFFFF"
        android:strokeWidth="3"
        android:strokeLineCap="round"
        android:pathData="M29.75,68 L78.25,40 M34,57 L43.6,58 L47.6,67 M60.4,41 L64.4,50 L74,51" />
</vector>
`;
  fs.writeFileSync(path.join(drawableDir, 'ic_launcher_foreground.xml'), fgVectorXml, 'utf8');

  // Also update drawable-v24 if present
  const drawableV24Dir = path.join(resDir, 'drawable-v24');
  if (fs.existsSync(drawableV24Dir)) {
    fs.writeFileSync(path.join(drawableV24Dir, 'ic_launcher_foreground.xml'), fgVectorXml, 'utf8');
  }

  // Values background color
  const valuesDir = path.join(resDir, 'values');
  fs.mkdirSync(valuesDir, { recursive: true });
  const valuesBgColor = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0369a1</color>
</resources>
`;
  fs.writeFileSync(path.join(valuesDir, 'ic_launcher_background.xml'), valuesBgColor, 'utf8');

  console.log('✓ Verified and updated XML adaptive icon references in mipmap-anydpi-v26 and drawable');
}

// Direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAllAndroidAssets();
}
