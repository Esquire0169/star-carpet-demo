import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const SHOTS = join(ROOT, "shots");
const SLIDES = join(ROOT, "slides");
const FRAMES = join(ROOT, "frames");
const CLIPS = join(ROOT, "clips");
const OUT = join(ROOT, "out", "star-carpet-demo-presentation.mp4");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const W = 1920;
const H = 1080;
const FPS = 30;

mkdirSync(FRAMES, { recursive: true });
mkdirSync(CLIPS, { recursive: true });
mkdirSync(join(ROOT, "out"), { recursive: true });

function run(cmd, args) {
  const res = spawnSync(cmd, args, { encoding: "utf8" });
  if (res.status !== 0) {
    console.error(res.stderr || res.stdout);
    throw new Error(`${cmd} failed`);
  }
  return res;
}

function chromeShot(url, outPath) {
  run(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--window-size=${W},${H}`,
    `--screenshot=${outPath}`,
    url,
  ]);
}

const master = join(SLIDES, "slides.html");
const masterHtml = readFileSync(master, "utf8");
const styleMatch = masterHtml.match(/<style>([\s\S]*?)<\/style>/);
const style = styleMatch ? styleMatch[1] : "";

const slidesHtml = [
  ["00-title", "s00", 4.2],
  ["01-structure", "s01", 5.5],
  ["02-features", "s02", 5.8],
  ["03-pages", "s03", 4.2],
  ["04-closing", "s04", 4.5],
];

for (const [name, id] of slidesHtml) {
  const slideMatch = masterHtml.match(
    new RegExp(`<section class="slide" id="${id}">([\\s\\S]*?)</section>`),
  );
  if (!slideMatch) throw new Error(`slide ${id} not found`);
  writeFileSync(
    join(SLIDES, `${name}.html`),
    `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><style>${style}
html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#111}
.slide{display:block}
</style></head><body><section class="slide" id="${id}">${slideMatch[1]}</section></body></html>`,
  );
}

console.log("Rendering title slides…");
for (const [name] of slidesHtml) {
  chromeShot(`file://${join(SLIDES, `${name}.html`)}`, join(FRAMES, `${name}.png`));
  console.log(" ", name);
}

const siteScenes = [
  { file: "01-home.png", caption: "Главная — hero и вход в каталог", dur: 4.5 },
  { file: "02-katalog.png", caption: "Каталог — фильтры и сетка товаров", dur: 4.5 },
  { file: "03-product.png", caption: "Карточка товара — покупка и примерка", dur: 4.5 },
  { file: "04-primerka.png", caption: "Сервис примерки ковров", dur: 4.0 },
  { file: "05-dostavka.png", caption: "Доставка и оплата", dur: 4.0 },
  { file: "06-opt.png", caption: "Опт / B2B для партнёров", dur: 4.0 },
  { file: "07-kontakty.png", caption: "Контакты и заявка", dur: 3.8 },
  { file: "08-about.png", caption: "О компании — бренд и доверие", dur: 4.0 },
];

console.log("Compositing site frames with captions…");
for (const scene of siteScenes) {
  const src = join(SHOTS, scene.file);
  if (!existsSync(src)) {
    console.warn("missing", scene.file);
    continue;
  }
  const htmlPath = join(FRAMES, scene.file.replace(".png", ".html"));
  writeFileSync(
    htmlPath,
    `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><style>
html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#1a1714;font-family:Arial,Helvetica,sans-serif}
.wrap{position:relative;width:1920px;height:1080px}
img{width:1920px;height:1080px;object-fit:cover;display:block}
.bar{position:absolute;left:0;right:0;bottom:0;height:140px;
background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.55) 35%,rgba(0,0,0,.72));
display:flex;align-items:flex-end;padding:0 64px 40px;color:#fff;font-size:34px;font-weight:600;letter-spacing:.01em}
</style></head><body><div class="wrap">
<img src="file://${src}" alt=""/>
<div class="bar">${scene.caption}</div>
</div></body></html>`,
  );
  chromeShot(`file://${htmlPath}`, join(FRAMES, scene.file));
  console.log(" ", scene.file);
}

function makeClip(input, output, seconds) {
  const vf = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x1a1714`;

  run("ffmpeg", [
    "-y",
    "-loop",
    "1",
    "-i",
    input,
    "-vf",
    vf,
    "-t",
    String(seconds),
    "-r",
    String(FPS),
    "-pix_fmt",
    "yuv420p",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    output,
  ]);
}

const sequence = [];

console.log("Encoding clips…");
for (const [name, , dur] of slidesHtml) {
  const clip = join(CLIPS, `${name}.mp4`);
  makeClip(join(FRAMES, `${name}.png`), clip, dur);
  sequence.push(clip);
  if (name === "03-pages") {
    for (const scene of siteScenes) {
      const frame = join(FRAMES, scene.file);
      if (!existsSync(frame)) continue;
      const clipPath = join(CLIPS, scene.file.replace(".png", ".mp4"));
      makeClip(frame, clipPath, scene.dur);
      sequence.push(clipPath);
      console.log("  clip", scene.file);
    }
  }
}

const listPath = join(CLIPS, "list.txt");
writeFileSync(listPath, sequence.map((p) => `file '${p}'`).join("\n") + "\n");

console.log("Concatenating…");
run("ffmpeg", [
  "-y",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  listPath,
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  "-crf",
  "18",
  OUT,
]);

console.log("Done:", OUT);
console.log(run("ffprobe", ["-v", "error", "-show_entries", "format=duration,size", "-of", "default=noprint_wrappers=1", OUT]).stdout);
