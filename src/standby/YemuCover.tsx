// 《叶幕降临》视频封面，整张就是开场前那面翻牌墙：同一个翻牌模块（FlapModule：中缝、挂耳、机壳）、同一对颜色（主题绿 / 翻牌白），
//   满屏空白的绿牌打底。所有格一样大，「叶幕降临」每个字由 2×2 四块白牌拼成
//   （每块只印这个字的四分之一，格缝和中缝从字上穿过去，像真翻牌大屏），左上一块「⌈」、右下一块「⌋」当书名号的角，
//   下面一排绿牌写「2026纳西妲生日会」、一排白牌写「直播预热动画」；一阵微风斜着扫过空白牌（看得出是翻牌机）。
//   横版一排四块；竖版两排两块，「2026」和「纳西妲生日会」分两排。字都是方圆体（模块里自带）。
// 出图：npx remotion still src/index.ts Cover-16x9 out/cover.png（每个比例一个合成，见 COVERS）
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {FlapModule} from '../flap/FlapModule';
import type {FlapFace} from '../flap/FlapModule';
import {FR, HOUSING, WHITE, face, icon, r01} from '../preshow/engine';
import {V} from '../theme';

type Item = {r: number; c: number; span?: number; faces: FlapFace[]; gust?: {at: number; amp: number; dur: number}};
export type CoverLayout = {W: number; H: number; T: number; portrait: boolean};

const BLANK = face(' ', 'g');
const line = (r: number, c0: number, s: string, st: 'g' | 'w'): Item[] => [...s].map((ch, i) => ({r, c: c0 + i, faces: [face(ch, st)]}));
/** 一个标题字：左上角在 (r, c)，2×2 四块白牌各印四分之一 */
const big = (r: number, c: number, ch: string, T: number): Item[] => {
  const p = T / (T - FR * 2);
  return [0, 1].flatMap((i) => [0, 1].map((j) => ({r: r + i, c: c + j, faces: [{k: 'part', ch, n: 2, i, j, p, bg: WHITE, ink: V.g} as FlapFace]})));
};

/** 版面按格排（格坐标，可以是负的），最后整块按像素居中 */
const plan = ({T, portrait}: CoverLayout): Item[] => {
  const T4 = '叶幕降临';
  const out: Item[] = [];
  if (!portrait) {
    [...T4].forEach((ch, k) => out.push(...big(0, k * 2, ch, T)));
    out.push({r: -1, c: -1, faces: [icon('lceil', WHITE, V.g)]}, {r: 2, c: 8, faces: [icon('lceil', WHITE, V.g, 180)]});
    out.push(...line(3, -1, '2026纳西妲生日会', 'g'), ...line(4, 1, '直播预热动画', 'w'));
  } else {
    [...T4].forEach((ch, k) => out.push(...big(Math.floor(k / 2) * 2, (k % 2) * 2, ch, T)));
    out.push({r: -1, c: -1, faces: [icon('lceil', WHITE, V.g)]}, {r: 4, c: 4, faces: [icon('lceil', WHITE, V.g, 180)]});
    out.push(...line(5, 0, '2026', 'g'), ...line(6, -1, '纳西妲生日会', 'g'), ...line(7, -1, '直播预热动画', 'w'));
  }
  return out;
};

export const YemuCover: React.FC<CoverLayout> = (L) => {
  const {W, H, T} = L;
  const items = plan(L);
  // 内容外框（格）：大牌占 span×span
  const r0 = Math.min(...items.map((i) => i.r)), r1 = Math.max(...items.map((i) => i.r + (i.span ?? 1)));
  const c0 = Math.min(...items.map((i) => i.c)), c1 = Math.max(...items.map((i) => i.c + (i.span ?? 1)));
  const X0 = W / 2 - (c0 + c1) / 2 * T, Y0 = H / 2 - (r0 + r1) / 2 * T;
  // 被内容占掉的格不铺空白牌
  const taken = new Set<string>();
  items.forEach((i) => { for (let a = 0; a < (i.span ?? 1); a++) for (let b = 0; b < (i.span ?? 1); b++) taken.add(`${i.r + a},${i.c + b}`); });
  const bg: Item[] = [];
  const ca = Math.floor(-X0 / T) - 1, cb = Math.ceil((W - X0) / T), ra = Math.floor(-Y0 / T) - 1, rb = Math.ceil((H - Y0) / T);
  for (let r = ra; r <= rb; r++) for (let c = ca; c <= cb; c++) if (!taken.has(`${r},${c}`)) bg.push({r, c, faces: [BLANK]});
  // 一阵微风（只有一块牌翻到一半会显得怪，整片微微起伏更自然）：一条斜着的风带从左下往右上扫过，
  //   带里的空白牌被掀起来几度到二十度，风头前面的刚开始起、正中间最高、后面的在落回去（和片子里的风同一个掀法），字牌不动
  bg.forEach((b, k) => {
    const u = (X0 + (b.c + .5) * T) / W, v = (Y0 + (b.r + .5) * T) / H;
    const d = u * .9 - v * .55 - .18;                                     // 到风带中线的距离（往右为正 = 风还没到）
    const amp = 15 * Math.exp(-((d / .24) ** 2)) * (.5 + .5 * r01(k * 7.3 + 1))      // 风带：宽一些、从中间往两边慢慢弱
      + (r01(k * 5.7 + 2) > .8 ? 3 + 4 * r01(k * 9.1) : 0);                            // 风带外零星几块也轻轻扑一下
    if (amp < 2.5) return;
    const e = Math.min(.8, Math.max(.06, .3 - d * 1.6 + (r01(k * 3.1) - .5) * .08));   // 掀的进度：0.28 左右最高
    b.gust = {at: -Math.round(e * 30), amp, dur: 30};
  });
  return (
    <AbsoluteFill style={{background: HOUSING}}>
      {[...bg, ...items].map((it, j) => {
        const n = it.span ?? 1, size = n * (T - FR * 2);           // 模块总宽 = 翻片 + 两边机壳，大牌机壳按比例加厚，正好占 n 格
        return (
          <div key={j} style={{position: 'absolute', left: X0 + it.c * T, top: Y0 + it.r * T, width: n * T, height: n * T, padding: 0}}>
            <FlapModule f={0} w={size} h={size} faces={it.faces} flips={[]} gusts={it.gust ? [it.gust] : []}
              liftLight={.2} frame={FR * n} radius={8 * n} lift={false} housing={HOUSING} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** 各比例：画面大小、一格多大（所有格一样大） */
export const COVERS: Record<string, CoverLayout> = {
  'Cover-16x9': {W: 1920, H: 1080, T: 160, portrait: false},
  'Cover-16x10': {W: 1920, H: 1200, T: 160, portrait: false},
  'Cover-4x3': {W: 1440, H: 1080, T: 128, portrait: false},
  'Cover-3x4': {W: 1080, H: 1440, T: 145, portrait: true},
  'Cover-9x16': {W: 1080, H: 1920, T: 145, portrait: true},
};
