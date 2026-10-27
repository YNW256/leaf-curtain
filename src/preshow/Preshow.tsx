// 《叶幕降临》（直播开场前的翻牌墙动画，约 10 分钟）总装：所有段写进同一份剧本、同一个风场，是一条连续的时间线——
// 后一段接着前一段最后的样子往下演，下片的摆也是连着的。每段各有一个合成（P-Preshow-1、-2……）方便分段看，
// 渲某一段时只从它开头前 10 秒开始算下片的摆（之前的摆早就停了）。
import React from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {FlapModule} from '../flap/FlapModule';
import {makeWind} from '../flap/windSim';
import {COLS, Ctx, FR, HOUSING, RingField, Script, T, Tile, X0, build, face, sec} from './engine';
import {FULL, clock, hideClock} from './common';
import {seg1} from './seg1';
import {seg2} from './seg2';
import {seg3} from './seg3';
import {seg4} from './seg4';
import {seg5} from './seg5';
import {seg6} from './seg6';
import {seg7} from './seg7';
import {seg8} from './seg8';
import {seg9} from './seg9';
import {seg10} from './seg10';
import {glitches} from './glitch';
import FB_CHARS from '../data/fallback_chars.json';

/** 方圆体缺的字（名单里的生僻字、日文假名等）用后备字体补：登记成同名的 FangYuan、只管这几个字（unicode-range），
 *  方圆体有的字照常用方圆体。字表和字库由 scripts/make_fallback_font.py 生成（字表为空就不载入），名单改了重跑 */
let fbLoaded = false;
const loadFallback = () => {
  if (fbLoaded || typeof document === 'undefined' || !(FB_CHARS as string[]).length) return;
  fbLoaded = true;
  const h = delayRender('方圆体缺字后备');
  const range = (FB_CHARS as string[]).map((ch) => 'U+' + ch.codePointAt(0)!.toString(16)).join(',');
  const f = new FontFace('FangYuan', `url(${staticFile('fonts/FangYuanFallback.ttf')})`, {weight: '100 900', unicodeRange: range});
  (document.fonts as unknown as {add: (f: FontFace) => void}).add(f);
  f.load().then(() => continueRender(h)).catch((e) => { console.error('后备字体载入失败', e); continueRender(h); });
};

/** 每一段：[编号, 从第几秒, 到第几秒] */
export const SEGS: [number, number, number][] = [[1, 0, 90], [2, 90, 150], [3, 150, 188], [4, 188, 238], [5, 238, 300], [6, 300, 368], [7, 368, 428], [8, 428, 516], [9, 516, 548], [10, 548, 605.5]];
export const PRESHOW_LEN = sec(SEGS[SEGS.length - 1][2]);
/** 最后渐黑（秒）：墙翻回待机的同时整个画面渐黑，最后留约 0.7 秒纯黑，接直播开场曲开头的黑屏。音效那边也按这个时刻收 */
export const FADE: [number, number] = [603.6, 604.8];

let MASTER: {sc: Script; wind: (x: number, y: number, t: number) => number} | null = null;
export const master = () => {
  if (MASTER) return MASTER;
  const ctx: Ctx = {sc: new Script(face(' ', 'k')), rf: new RingField(), rounds: [], puffs: [], extra: []};
  seg1(ctx); seg2(ctx); seg3(ctx); seg4(ctx);
  const snake = seg5(ctx);
  seg6(ctx); seg7(ctx); seg8(ctx); seg9(ctx); seg10(ctx);
  glitches(ctx);                                                  // 全场的风吹翻：等所有段都排好了再挑格子（要避开有安排的翻）
  // 走秒：整分前后收起来（FULL），蛇吃掉时钟到 5:00 报时完也不走
  const spans: [number, number][] = [];
  let from = 12;
  for (const [a, b] of [...FULL, [snake.clockStop, 307] as [number, number]].sort((x, y) => x[0] - y[0])) {
    if (a > from) spans.push([from, a]);
    from = Math.max(from, b);
  }
  spans.push([from, 599]);
  clock(ctx.sc, spans);
  FULL.forEach(([a]) => hideClock(ctx.sc, sec(a) + 20));
  const base = makeWind(ctx.rounds, ctx.puffs, PRESHOW_LEN);
  MASTER = {sc: ctx.sc, wind: (x, y, t) => base(x, y, t) + ctx.rf.eval(x, y, t) + ctx.extra.reduce((s, f) => s + f(x, y, t), 0)};
  return MASTER;
};

const Wall: React.FC<{from: number; to: number}> = ({from, to}) => {
  loadFallback();
  const f = from + useCurrentFrame();
  const tiles: Tile[] = React.useMemo(() => { const m = master(); return build(m.sc, to, m.wind, Math.max(0, from - sec(10))); }, [from, to]);
  return (
    <AbsoluteFill style={{background: HOUSING}}>
      {tiles.map((t, j) => (
        <div key={j} style={{position: 'absolute', left: X0 + (j % COLS) * T, top: Math.floor(j / COLS) * T}}>
          <FlapModule f={f} w={T - FR * 2} h={T - FR * 2} faces={t.faces} flips={t.flips} gusts={t.gusts} windL={t.windL} behind={t.behind} liftLight={.2} frame={FR} radius={8} lift={false} housing={HOUSING} />
        </div>
      ))}
      {f >= sec(FADE[0]) && <AbsoluteFill style={{background: '#000', opacity: (u => u * u * (3 - 2 * u))(Math.min(1, (f - sec(FADE[0])) / (sec(FADE[1]) - sec(FADE[0]))))}} />}
    </AbsoluteFill>
  );
};

/** 第 n 段 */
export const PreshowSeg: React.FC<{n: number}> = ({n}) => {
  const [, a, b] = SEGS.find((s) => s[0] === n)!;
  return <Wall from={sec(a)} to={sec(b)} />;
};
/** 整场 */
export const PreshowAll: React.FC = () => <Wall from={0} to={PRESHOW_LEN} />;
