const W = 12;
const H = 16;

export async function fingerprint(src) {
  const img = await loadImage(src);
  if (!img) return null;
  return fingerprintFromCanvas(img, img.naturalWidth, img.naturalHeight);
}

export function fingerprintFromCanvas(source, sw, sh) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return new Float32Array(W * H * 3);
  ctx.drawImage(source, 0, 0, sw, sh, 0, 0, W, H);
  const data = ctx.getImageData(0, 0, W, H).data;
  const out = new Float32Array(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    out[i * 3] = data[i * 4] / 255;
    out[i * 3 + 1] = data[i * 4 + 1] / 255;
    out[i * 3 + 2] = data[i * 4 + 2] / 255;
  }
  return out;
}

export function distance(a, b) {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum / n);
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
