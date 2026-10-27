// 开场前·音效用的事件表：把整场 10 分钟的剧本 + 风交给和画面同一套物理（build），逐格找出每一下"拍"的时刻和轻重，
// 写成 out/sound/events.json，交给 audio/make_sfx.py 去配声音。画面改了以后重跑这一步（再跑 make_sfx.py）：
//   npm run events
//   （= 用 esbuild 打成 out/sfx_events.cjs 再用 node 跑；package.json 是 "type": "module"，所以要打成 .cjs 才按 CommonJS 跑）
// 事件种类：0 翻下来拍在下面那摞片上（主声）；1 拍完弹起来又碰一下（轻）；2 被风吹过头、靠到上面那摞片上；
//          3 下片被风掀起来、落回去拍在后面那摞片上；4 卡住的那格顶了一下没翻过去、落回卡扣
// 另外写进去：air 风有多大、rain 雨有多大（都是每 2 帧一个）、rainTimes 闪电和伞的时刻、fade 最后渐黑的时刻
// v = 拍下去那一刻的角速度（度/帧），越大越响；last = 这一格这一串翻里的最后一下（字落定）
import fs from 'fs';
import path from 'path';
import {COLS, ROWS, build, sec} from './engine';
import {FADE, PRESHOW_LEN, master} from './Preshow';
import {RAIN_PEAK, RAIN_TIMES, rate} from './seg2';

const OUT = path.join(process.cwd(), 'out/sound/events.json');
const m = master();
const t0 = Date.now();
const tiles = build(m.sc, PRESHOW_LEN, m.wind);
const ev: [number, number, number, number, number, number][] = [];   // [秒, 行, 列, 种类, v, last]
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
  tile.gusts.forEach((g) => ev.push([(g.at + .72 * (g.dur ?? 26)) / 60, r, c, 4, +(g.amp * .25).toFixed(2), 0]));
});
ev.sort((a, b) => a[0] - b[0]);
// 风有多大（画空气声用）：每 2 帧，左右两半墙上的风各取平均（只算往外推的那一半）
const air: [number, number][] = [];
for (let f = 0; f < PRESHOW_LEN; f += 2) {
  let L = 0, R = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const v = Math.max(0, m.wind(c + .5, r + .5, f));
    if (c < 8) L += v; else if (c > 8) R += v; else { L += v / 2; R += v / 2; }
  }
  air.push([+(L / (ROWS * 8.5)).toFixed(3), +(R / (ROWS * 8.5)).toFixed(3)]);
}
fs.mkdirSync(path.dirname(OUT), {recursive: true});
// 雨有多大（画雨声用，和画面同一条雨量曲线，1 = 最大）；闪电、伞的时刻；最后渐黑的时刻
const rain: number[] = [];
for (let f = 0; f < PRESHOW_LEN; f += 2) rain.push(+(rate(f / 60) / RAIN_PEAK).toFixed(3));
fs.writeFileSync(OUT, JSON.stringify({len: PRESHOW_LEN / 60, fps: 60, cols: COLS, rows: ROWS, events: ev, air, rain, rainTimes: RAIN_TIMES, fade: FADE}));
const n = [0, 1, 2, 3, 4].map((k) => ev.filter((e) => e[3] === k).length);
console.log(`事件 ${ev.length}（主声 ${n[0]} / 回弹 ${n[1]} / 吹过头 ${n[2]} / 风掀 ${n[3]} / 卡住 ${n[4]}），用时 ${((Date.now() - t0) / 1000).toFixed(0)} 秒，第 ${sec(0)} 帧起 → ${OUT}`);
