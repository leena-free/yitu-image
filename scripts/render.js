#!/usr/bin/env node
/**
 * render.js — SVG 直接出图（本地浏览器渲染，零依赖、零联网）
 *
 * 用法:
 *   node scripts/render.js -i board.svg                       # 输出 board.png（2 倍图）
 *   node scripts/render.js -i board.svg -s 3                  # 3 倍图
 *   node scripts/render.js -i board.svg -o out/cover.png      # 指定输出
 *
 * 依赖: 本机已安装 Chrome 或 Edge（Windows/macOS 自带或常见），Node.js 18+
 * 不依赖 npm 包，不访问网络。
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function arg(name, def) {
  const i = process.argv.indexOf('-' + name);
  const j = process.argv.indexOf('--' + name);
  const k = i > -1 ? i : j;
  return k > -1 && process.argv[k + 1] ? process.argv[k + 1] : def;
}

const input = arg('i', arg('input', ''));
const scale = arg('s', arg('scale', '2'));
if (!input) {
  console.log('用法: node scripts/render.js -i board.svg [-o out.png] [-s 2]');
  process.exit(1);
}
const svg = path.resolve(input);
if (!fs.existsSync(svg)) {
  console.error('✗ 找不到文件: ' + svg);
  process.exit(1);
}
const out = path.resolve(arg('o', arg('output', svg.replace(/\.svg$/i, '') + '.png')));
fs.mkdirSync(path.dirname(out), { recursive: true });

function svgSize(file) {
  const t = fs.readFileSync(file, 'utf8').slice(0, 2000);
  const w = (t.match(/width="(\d+(?:\.\d+)?)/) || [])[1];
  const h = (t.match(/height="(\d+(?:\.\d+)?)/) || [])[1];
  return { w: Math.round(w ? +w : 1600), h: Math.round(h ? +h : 1200) };
}

function findBrowser() {
  const cands = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  return cands.find((p) => fs.existsSync(p)) || null;
}

const exe = findBrowser();
if (!exe) {
  console.error('✗ 没找到 Chrome / Edge');
  console.error('  Windows 一般自带 Edge，如果装在别处，请把路径加到脚本的 cands 列表里');
  process.exit(1);
}

const { w, h } = svgSize(svg);
const url = 'file:///' + svg.replace(/\\/g, '/');
const tmp = out.replace(/\.png$/i, '') + '.tmp.png';
const cmd = `"${exe}" --headless --disable-gpu --no-sandbox --hide-scrollbars --force-device-scale-factor=${scale} --window-size=${w},${h} --screenshot="${tmp}" "${url}"`;
const r = spawnSync(cmd, { shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

if (!fs.existsSync(tmp)) {
  console.error('✗ 渲染失败');
  console.error(((r.stdout || '') + (r.stderr || '')).split('\n').slice(-6).join('\n'));
  process.exit(1);
}
fs.renameSync(tmp, out);

const kb = (fs.statSync(out).size / 1024).toFixed(0);
console.log('✓ ' + out + '  (' + kb + ' KB)');
console.log('  ' + w + '×' + h + ' @' + scale + 'x  →  ' + (w * scale) + '×' + (h * scale) + ' px');
console.log('  本地渲染，未联网、未上传任何内容');