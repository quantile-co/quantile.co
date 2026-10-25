import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as fontkit from "fontkit";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fontUrl = new URL(
  import.meta.resolve("@fontsource/prompt/files/prompt-latin-800-italic.woff"),
);
const openedFont = fontkit.openSync(fileURLToPath(fontUrl));
if (!("layout" in openedFont)) {
  throw new Error("Brand assets require a single font, not a font collection.");
}
const font: fontkit.Font = openedFont;
const generatedComment = "Generated brand asset. Do not edit.";
const zinc50 = "#fafafa";
const zinc950 = "#09090b";

const format = (value: number) => Number(value.toFixed(4));

function textMarkup(text: string) {
  const run = font.layout(text);
  let x = 0;
  let y = 0;
  const paths = run.glyphs.map((glyph, index) => {
    const position = run.positions[index];
    const glyphX = x + position.xOffset;
    const glyphY = y + position.yOffset;
    x += position.xAdvance;
    y += position.yAdvance;
    return `<path d="${glyph.path.toSVG()}" transform="translate(${format(glyphX)} ${format(glyphY)})"/>`;
  });

  return { bbox: run.bbox, paths: paths.join("") };
}

function positionedText(
  text: string,
  {
    pointSize,
    centerX,
    centerY,
  }: { pointSize: number; centerX: number; centerY: number },
  className: string,
) {
  const { bbox, paths } = textMarkup(text);
  const scale = pointSize / font.unitsPerEm;
  const sourceCenterX = (bbox.minX + bbox.maxX) / 2;
  const sourceCenterY = (bbox.minY + bbox.maxY) / 2;
  const translateX = centerX - sourceCenterX * scale;
  const translateY = centerY + sourceCenterY * scale;

  return `<g class="${className}" transform="translate(${format(translateX)} ${format(translateY)}) scale(${format(scale)} ${format(-scale)})">${paths}</g>`;
}

function documentSvg({
  width,
  height,
  body,
}: {
  width: number;
  height: number;
  body: string;
}) {
  return `<!-- ${generatedComment} -->
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <title>Quantile</title>
${body}
</svg>
`;
}

function iconSvg({
  size,
  pointSize,
  radius,
  centerX,
  centerY,
  background = zinc950,
  foreground = zinc50,
}: {
  size: number;
  pointSize: number;
  radius: number;
  centerX: number;
  centerY: number;
  background?: string;
  foreground?: string;
}) {
  const backgroundFill = ` fill="${background}"`;
  const foregroundFill = ` fill="${foreground}"`;
  const mark = positionedText(
    ":q",
    { pointSize, centerX, centerY },
    "foreground",
  );

  return documentSvg({
    width: size,
    height: size,
    body: `  <rect${backgroundFill} width="${size}" height="${size}" rx="${radius}"/>\n  <g${foregroundFill}>${mark}</g>`,
  });
}

function wordmarkSvg(foreground: string = zinc950) {
  const mark = positionedText(
    ":quantile",
    { pointSize: 120, centerX: 263.5, centerY: 99.5 },
    "wordmark",
  );
  return documentSvg({
    width: 531,
    height: 183,
    body: `  <g fill="${foreground}">${mark}</g>`,
  });
}

function bannerSvg({
  centerX,
  centerY,
  height,
  pointSize,
  width,
}: {
  centerX?: number;
  centerY?: number;
  height: number;
  pointSize: number;
  width: number;
}) {
  const mark = positionedText(
    ":quantile",
    {
      pointSize,
      centerX: centerX ?? width / 2,
      centerY: centerY ?? height / 2,
    },
    "wordmark",
  );
  return documentSvg({
    width,
    height,
    body: `  <rect width="${width}" height="${height}" fill="${zinc950}"/>\n  <g fill="${zinc50}">${mark}</g>`,
  });
}

function socialSvg() {
  return bannerSvg({
    centerX: 598.5,
    centerY: 323.5,
    height: 630,
    pointSize: 120,
    width: 1200,
  });
}

function brandSocialSvg() {
  const mark = positionedText(
    ":quantile",
    { pointSize: 120, centerX: 598.5, centerY: 247 },
    "wordmark",
  );
  const label = positionedText(
    "Brand assets",
    { pointSize: 55, centerX: 600, centerY: 422 },
    "label",
  );
  return documentSvg({
    width: 1200,
    height: 630,
    body: `  <rect width="1200" height="630" fill="${zinc950}"/>\n  <g fill="${zinc50}">${mark}${label}</g>`,
  });
}

async function png(svg: string, width: number, height: number) {
  return sharp(Buffer.from(svg)).resize(width, height).png().toBuffer();
}

async function pngAtWidth(svg: string, width: number) {
  return sharp(Buffer.from(svg)).resize({ width }).png().toBuffer();
}

async function buildAssets() {
  // Display icons and favicons use separate optical compositions so the mark
  // remains balanced and legible at each target size.
  const appIcon = iconSvg({
    size: 64,
    pointSize: 48,
    radius: 14,
    centerX: 30.5,
    centerY: 34,
  });
  const appleIcon = iconSvg({
    size: 180,
    pointSize: 108,
    radius: 11,
    centerX: 87.5,
    centerY: 99.5,
  });
  const faviconSpecs = [
    {
      size: 16,
      pointSize: 12,
      radius: 4,
      centerX: 7.5,
      centerY: 8,
    },
    {
      size: 32,
      pointSize: 24,
      radius: 7,
      centerX: 15,
      centerY: 16.5,
    },
    {
      size: 48,
      pointSize: 36,
      radius: 10,
      centerX: 22.5,
      centerY: 25,
    },
  ];
  const logoSpec = {
    size: 1024,
    pointSize: 768,
    radius: 0,
    centerX: 488,
    centerY: 544,
  };
  const darkLogo = iconSvg(logoSpec);
  const lightLogo = iconSvg({
    ...logoSpec,
    background: zinc50,
    foreground: zinc950,
  });
  const lightWordmark = wordmarkSvg();
  const darkWordmark = wordmarkSvg(zinc50);
  const social = socialSvg();
  const xHeader = bannerSvg({ height: 500, pointSize: 150, width: 1500 });
  const faviconPngs = await Promise.all(
    faviconSpecs.map((spec) => png(iconSvg(spec), spec.size, spec.size)),
  );
  const openGraph = await png(social, 1200, 630);
  const brandOpenGraph = await png(brandSocialSvg(), 1200, 630);

  return new Map([
    ["app/favicon.ico", await pngToIco(faviconPngs)],
    ["app/icon.svg", Buffer.from(appIcon)],
    ["app/apple-icon.png", await png(appleIcon, 180, 180)],
    ["app/opengraph-image.png", openGraph],
    ["app/opengraph-image.alt.txt", Buffer.from("Quantile wordmark\n")],
    ["app/twitter-image.png", openGraph],
    ["app/twitter-image.alt.txt", Buffer.from("Quantile wordmark\n")],
    ["app/brand/opengraph-image.png", brandOpenGraph],
    [
      "app/brand/opengraph-image.alt.txt",
      Buffer.from("Quantile wordmark above Brand assets\n"),
    ],
    ["app/brand/twitter-image.png", brandOpenGraph],
    [
      "app/brand/twitter-image.alt.txt",
      Buffer.from("Quantile wordmark above Brand assets\n"),
    ],
    ["public/images/brand/wordmark-dark.svg", Buffer.from(darkWordmark)],
    ["public/images/brand/wordmark-light.svg", Buffer.from(lightWordmark)],
    [
      "public/images/brand/wordmark-dark-1600.png",
      await pngAtWidth(darkWordmark, 1600),
    ],
    [
      "public/images/brand/wordmark-light-1600.png",
      await pngAtWidth(lightWordmark, 1600),
    ],
    ["public/images/brand/logo-dark.svg", Buffer.from(darkLogo)],
    ["public/images/brand/logo-dark-1024.png", await png(darkLogo, 1024, 1024)],
    ["public/images/brand/logo-light.svg", Buffer.from(lightLogo)],
    [
      "public/images/brand/logo-light-1024.png",
      await png(lightLogo, 1024, 1024),
    ],
    [
      "public/images/brand/x-header-1500x500.png",
      await png(xHeader, 1500, 500),
    ],
    ["public/images/brand/social-preview-1200x630.png", openGraph],
  ]);
}

async function checkAssets(assets: Map<string, Buffer>, outputRoot: string) {
  const stale = [];
  for (const [path, expected] of assets) {
    try {
      const actual = await readFile(join(outputRoot, path));
      if (!actual.equals(expected)) stale.push(path);
    } catch {
      stale.push(path);
    }
  }

  if (stale.length > 0) {
    console.error(
      `Brand assets are stale:\n${stale.map((path) => `- ${path}`).join("\n")}`,
    );
    console.error("Regenerate the brand assets.");
    return 1;
  }

  console.log(`Checked ${assets.size} generated brand assets.`);
  return 0;
}

async function writeAssets(assets: Map<string, Buffer>, outputRoot: string) {
  for (const [path, contents] of assets) {
    const output = join(outputRoot, path);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, contents);
  }
  console.log(`Generated ${assets.size} brand assets.`);
}

export async function checkBrandAssets(outputRoot: string = root) {
  return checkAssets(await buildAssets(), outputRoot);
}

export async function generateBrandAssets(outputRoot: string = root) {
  await writeAssets(await buildAssets(), outputRoot);
}
