// 应急垫片的音效事件表：和开场前一样（src/preshow/sfx_events.ts），把垫片的剧本 + 风交给同一套物理，逐格找出每一下"拍"，
// 写成 out/slate/events.json，交给 audio/make_slate_sound.py（借 make_sfx.py 的 B 版：真翻牌 + 加厚 + 车站混响）。
//   npm run slate-events
import fs from 'fs';
import path from 'path';
import {COLS, ROWS, build} from '../preshow/engine';
import {SLATE_END, slateMaster} from './Slate';

const OUT = path.join(process.cwd(), 'out/slate/events.json');
const m = slateMaster();
const tiles = build(m.sc, SLATE_END + 1, m.wind);
const ev: [number, number, number, number, number, number][] = [];   // [秒, 行, 列, 种类, v, last]，种类同开场前
const hitsOf = (curve: number[]) => {
  const out: [number, number][] = [];
  for (let i = 2; i < curve.length - 1; i++) {
    if (curve[i] > 150 && curve[i] > curve[i - 1] && curve[i] >= curve[i + 1]) {
      const v = Math.max(curve[i] - curve[i - 1], curve[i - 1] - curve[i - 2]);
      if (v > .4) out.push([i, v]);
    }
  }
  return out;
};
tiles.forEach((tile, cell) => {
  const r = Math.floor(cell / COLS), c = cell % COLS;
  const spans: [number, number][] = [];
  tile.flips.forEach((fl, i) => {
    const curve = fl.curve ?? [];
    spans.push([fl.at - 2, fl.at + curve.length + 2]);
    const next = tile.flips[i + 1];
    const last = !next || next.at - fl.at > 24 ? 1 : 0;
    hitsOf(curve).forEach(([k, v], j) => ev.push([(fl.at + k) / 60, r, c, fl.rev ? 2 : j === 0 ? 0 : 1, +v.toFixed(2), j === 0 ? last : 0]));
  });
  const w = tile.windL;
  for (let f = 2; f < w.length; f++) {
    if (w[f] < .3 && w[f - 1] >= .3 && !spans.some(([a, b]) => f >= a && f <= b)) ev.push([f / 60, r, c, 3, +(w[f - 1] - w[f]).toFixed(2), 0]);
  }
});
ev.sort((a, b) => a[0] - b[0]);
// 风有多大（空气声用）：每 2 帧，左右两半墙各取平均
const air: [number, number][] = [];
const len = SLATE_END + 120;                     // 多留 2 秒给最后几下的混响尾巴
for (let f = 0; f < len; f += 2) {
  let L = 0, R = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const v = Math.max(0, m.wind(c + .5, r + .5, f));
    if (c < 8) L += v; else if (c > 8) R += v; else { L += v / 2; R += v / 2; }
  }
  air.push([+(L / (ROWS * 8.5)).toFixed(3), +(R / (ROWS * 8.5)).toFixed(3)]);
}
fs.mkdirSync(path.dirname(OUT), {recursive: true});
fs.writeFileSync(OUT, JSON.stringify({len: len / 60, fps: 60, cols: COLS, rows: ROWS, events: ev, air, fade: [len / 60, len / 60 + 1]}));
console.log(`事件 ${ev.length} → ${OUT}`);
