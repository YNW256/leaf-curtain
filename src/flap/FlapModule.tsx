// 一个翻牌模块（真实翻牌机的一格），用 CSS 透视做出实物感（不是 3D 引擎）。
// 结构：深色机壳 → 窗里两片：上片（下一张的上半）、下片（落定那张的下半）；中轴两头有挂耳。
// 翻一次 = 上片被卡扣放开，绕中轴往观众这边、往下掉（重力：越掉越快），
//   ① 0°→90°：看到它的正面（当前这张的上半），越翻越背光、越暗；自由边离观众越来越近，透视上变宽；
//   ② 90° 时侧对观众，只剩一条亮的厚度边；
//   ③ 90°→180°：看到它的背面（下一张的下半），刚翻过来时朝上、迎光、偏亮，落下时恢复；
//   ④ 拍到下面的挡位上回弹两三下停住。翻的时候在下片上投一道影子。翻之前卡扣松开，上片先往前轻轻一顶。
// 快速滚过几张时，几片会同时在空中（先翻的在前面）——这是真翻牌机最"机械"的样子。
import React from 'react';
import {FY, V} from '../theme';

export type FlapFace =
  | {k: 'char'; ch: string; bg?: string; ink?: string; pos?: 'sup' | 'sub'}   // pos：上标 / 下标（小字靠左上 / 左下）
  | {k: 'icon'; icon: 'leaf' | 'sleaf' | 'plane' | 'dot' | 'drop' | 'train' | 'arrow' | 'flag' | 'int' | 'sum' | 'pi' | 'inf' | 'lceil' | 'rceil' | 'bar' | 'vbar'; rot?: number; bg?: string; ink?: string}   // 印着一个小图形（rot：转多少度）
  // 跨 n×n 格的一个大字（真翻牌大屏的标题字就是这样拼的），这一格只印第 i 行、第 j 列那一块；p = 相邻两格的间距 ÷ 翻片宽（格与格之间有机壳）
  | {k: 'part'; ch: string; n: number; i: number; j: number; p: number; bg?: string; ink?: string}
  | {k: 'none'};
// rev：倒着翻——下片绕中轴往上撩、翻到上面去（真翻牌机做不到，所以一看就是"倒带"）
// from：从这个角度接着翻（被风吹到一半、整片翻过去的那种），没有卡扣松开那一顶
// curve：逐帧给好的角度（物理算出来的，含回弹），有它就不用上面那些公式；走完就算落定
export type Flip = {at: number; dur?: number; rev?: boolean; from?: number; curve?: number[]};
/** 风：翻片被掀起 amp 度又落回去（不换面）。上片往观众这边掀、下片往上撩一点、晚两帧 */
export type Gust = {at: number; amp: number; dur?: number};

const PRE = 4, BOUNCE = 12;

/** 第 i 次翻在第 f 帧的角度（度）：-1 = 还没开始；0 立着，180 落下；回弹时略小于 180 */
const angle = (f: number, fl: Flip) => {
  const d = fl.dur ?? 12, e = f - fl.at;
  if (e < -PRE) return -1;
  if (fl.curve) return e < 0 ? -1 : e < fl.curve.length ? fl.curve[Math.floor(e)] : 180;
  if (fl.rev) {                                                         // 倒着翻：像被往上抛，起手快、越往上越慢
    if (e < 0) return -1;
    if (e < d) { const t = e / d, a0 = fl.from ?? 0; return a0 + (180 - a0) * (1 - (1 - t) * (1 - t)); }
  } else if (fl.from !== undefined) {
    if (e < 0) return -1;
    if (e < d) { const t = e / d; return fl.from + (180 - fl.from) * (.35 * t + .65 * t * t); }
  } else {
    if (e < 0) return -Math.sin((e + PRE) / PRE * Math.PI) * 3;        // 卡扣松开前往前一顶（负角 = 朝观众）
    if (e < d) { const t = e / d; return 180 * (.12 * t + .88 * t * t); } // 重力：越掉越快
  }
  const u = (e - d) / BOUNCE;
  if (u < 1) return 180 - 16 * Math.exp(-u * 3.2) * Math.abs(Math.sin(u * Math.PI * 2.4));
  return 180;
};
/** 风掀起的角度：很快掀起来，靠重力落回去，碰到卡扣再小弹一下 */
const gustAngle = (f: number, g: Gust, delay = 0) => {
  const d = g.dur ?? 26, e = (f - g.at - delay) / d;
  if (e <= 0 || e >= 1) return 0;
  if (e < .28) return g.amp * Math.sin(e / .28 * Math.PI / 2);
  if (e < .72) { const u = (e - .28) / .44; return g.amp * (1 - u * u); }
  return g.amp * .14 * Math.sin((e - .72) / .28 * Math.PI);
};
/** 回弹也结束了，才算落定（回弹里角度会碰到 180，不能拿角度判断） */
const done = (f: number, fl: Flip) => f - fl.at >= (fl.curve ? fl.curve.length : (fl.dur ?? 12) + BOUNCE);

const bgOf = (face: FlapFace) => (face.k === 'char' || face.k === 'icon' || face.k === 'part' ? face.bg ?? V.g : '#222');

/** 翻片上印的小图形（100×100 的框，朝右 / 朝上为 0°） */
/** 活动吉祥物「妲猫猫」贴纸里的那片叶子（原 SVG 的一条路径）：转正成叶尖朝上、放进 100×100 的框 */
const SLEAF = 'M1327.935,1073.293C1315.023,1058.51 1309.027,1031.152 1308.334,994.153C1327.926,873.77 1464.658,872.319 1496.678,840.72C1496.678,840.72 1511.031,888.627 1510.869,913.267C1510.201,1015.027 1445.346,1083.676 1348.556,1084.345C1348.556,1084.345 1339.713,1082.012 1366.969,1045.687C1381.077,1026.885 1417.091,997.322 1447.189,926.431C1401.289,958.52 1359.672,1002.357 1327.935,1073.293Z';
const Icon: React.FC<{name: 'leaf' | 'sleaf' | 'plane' | 'dot' | 'drop' | 'train' | 'arrow' | 'flag' | 'int' | 'sum' | 'pi' | 'inf' | 'lceil' | 'rceil' | 'bar' | 'vbar'; rot: number; size: number; ink: string; bg: string}> = ({name, rot, size, ink, bg}) => (
  <svg width={size} height={size} viewBox="-50 -50 100 100" style={{transform: `rotate(${rot}deg)`, overflow: 'visible'}}>
    {name === 'leaf' && (
      <>
        <path d="M 0 -44 C 27 -26 29 14 0 38 C -29 14 -27 -26 0 -44 Z" fill={ink} />
        <path d="M 0 -30 L 0 47" stroke={bg} strokeWidth={5} strokeLinecap="round" />
        <path d="M 0 38 L 0 47" stroke={ink} strokeWidth={5} strokeLinecap="round" />
      </>
    )}
    {name === 'sleaf' && <path d={SLEAF} fill={ink} transform="scale(0.313) translate(-5.29 6.09) rotate(-34) translate(-1409.6 -962.53)" />}
    {name === 'plane' && (
      <>
        <path d="M 46 0 L -40 -32 L -20 0 L -40 32 Z" fill={ink} />
        <path d="M 46 0 L -20 0 L -40 32 Z" fill={bg} fillOpacity={.28} />
      </>
    )}
    {name === 'dot' && <circle r={14} fill={ink} />}
    {name === 'flag' && <><path d="M -16 -36 L 24 -22 L -16 -8 Z" fill={ink} /><path d="M -16 -36 L -16 36 M -30 38 L -2 38" stroke={ink} strokeWidth={9} strokeLinecap="round" fill="none" /></>}
    {/* 数学符号：方圆体里没有，照它粗圆的笔画画（笔画 9、圆头圆角） */}
    {name === 'int' && <path d="M 20 -40 C 12 -50 -2 -46 -2 -30 L 2 30 C 2 46 -12 50 -20 40" stroke={ink} strokeWidth={9} strokeLinecap="round" fill="none" />}
    {name === 'sum' && <path d="M 24 -34 L -20 -34 L 6 0 L -20 34 L 24 34" stroke={ink} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
    {name === 'pi' && <path d="M -28 -18 C -20 -24 -10 -20 0 -20 L 28 -20 M -12 -19 L -16 30 M 12 -19 C 10 6 12 24 24 28" stroke={ink} strokeWidth={9} strokeLinecap="round" fill="none" />}
    {name === 'inf' && <path d="M 0 0 C -10 -18 -36 -18 -36 0 C -36 18 -10 18 0 0 C 10 -18 36 -18 36 0 C 36 18 10 18 0 0 Z" stroke={ink} strokeWidth={9} fill="none" />}
    {name === 'lceil' && <path d="M 14 -38 L -8 -38 L -8 38" stroke={ink} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
    {name === 'rceil' && <path d="M -14 -38 L 8 -38 L 8 38" stroke={ink} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
    {name === 'bar' && <path d="M -80 0 L 80 0" stroke={ink} strokeWidth={9} />}
    {name === 'vbar' && <path d="M 0 -80 L 0 80" stroke={ink} strokeWidth={9} />}
    {name === 'arrow' && <path d="M 30 0 L -18 -26 C -24 -29 -29 -25 -26 -19 L -14 0 L -26 19 C -29 25 -24 29 -18 26 Z" fill={ink} />}
    {name === 'drop' && <path d="M 0 -38 C 14 -16 26 0 26 16 C 26 32 14 42 0 42 C -14 42 -26 32 -26 16 C -26 0 -14 -16 0 -38 Z" fill={ink} />}
    {name === 'train' && (
      <>
        <path d="M -48 -26 L 4 -26 C 30 -26 48 -8 48 12 L 48 26 L -48 26 Z" fill={ink} />
        <path d="M 8 -16 C 24 -16 36 -6 39 6 L 8 6 Z" fill={bg} />
        <path d="M -40 -16 L -22 -16 L -22 2 L -40 2 Z M -14 -16 L 2 -16 L 2 2 L -14 2 Z" fill={bg} />
      </>
    )}
  </svg>
);

const Half: React.FC<{face: FlapFace; top: boolean; w: number; h: number; radius: number}> = ({face, top, w, h, radius}) => {
  const half = h / 2;
  const round = top ? `${radius}px ${radius}px 0 0` : `0 0 ${radius}px ${radius}px`;
  if (face.k === 'none') return null;
  const ink = face.ink ?? V.cream;
  const body = (
    <>
      <div style={{position: 'absolute', inset: 0, background: top ? `linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,0) 70%)` : `linear-gradient(0deg, rgba(0,0,0,.08), rgba(0,0,0,0) 70%)`}} />
      <div style={{position: 'absolute', left: 0, top: top ? 0 : -half, width: w, height: h, display: 'flex', ...FY(700), lineHeight: 1, color: ink,
        ...(face.k === 'char' && face.pos ? {alignItems: face.pos === 'sup' ? 'flex-start' : 'flex-end', justifyContent: 'flex-start', padding: `${h * .1}px ${w * .1}px`, boxSizing: 'border-box', fontSize: h * .38}
          : {alignItems: 'center', justifyContent: 'center', fontSize: h * .6})}}>
        {face.k === 'part' ? (() => {
            const big = ((face.n - 1) * face.p + 1) * w;   // 整个大字那一块（从第一格翻片左边到最后一格翻片右边）
            return <div style={{position: 'absolute', left: -face.j * face.p * w, top: -face.i * face.p * h, width: big, height: big, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: big * .70}}>{face.ch}</div>;
          })()
          : face.k === 'char' ? (face.ch === ' ' ? '' : face.ch)
          : <Icon name={face.icon} rot={face.rot ?? 0} size={h * .66} ink={ink} bg={bgOf(face)} />}
      </div>
    </>
  );
  return (
    <div style={{position: 'absolute', inset: 0, borderRadius: round, overflow: 'hidden', background: bgOf(face)}}>
      {body}
      {/* 靠中轴那条边：一点点暗（翻片在轴上有个折角） */}
      <div style={{position: 'absolute', left: 0, right: 0, [top ? 'bottom' : 'top']: 0, height: Math.max(2, h * .012), background: 'rgba(20,30,5,.25)'}} />
    </div>
  );
};

/**
 * 一格翻牌。faces[0] 是一开始显示的；flips[i] 把 faces[i] 翻到 faces[i+1]。
 * w/h：翻片可见区域（两片合起来）；frame：机壳边宽；persp：透视距离（越小越夸张）。
 */
// lift：机壳下面的投影（单独一格时要；拼成墙时不要，免得一格格叠出脏影子）
// windL：逐帧算好的下片被风吹起的角度（上片有卡扣扣着，风吹不动），和 gusts 叠加；behind：下片后面挂着的那一片（默认是空白）；
// liftLight：下片被吹起、朝上迎光时亮多少（只想要白、主题绿、墨绿三色时调小，免得亮成一片浅绿）
export const FlapModule: React.FC<{f: number; w: number; h: number; faces: FlapFace[]; flips: Flip[]; gusts?: Gust[]; windL?: number[]; behind?: FlapFace; liftLight?: number; frame?: number; persp?: number; radius?: number; housing?: string; lift?: boolean}> = ({
  f, w, h, faces, flips, gusts = [], windL, behind, liftLight = .5, frame = 14, persp = 4.2, radius = 14, housing = '#2f4708', lift = true,
}) => {
  const half = h / 2, gap = Math.max(2, h * .008);
  const ang = flips.map((fl) => angle(f, fl));
  // 上片、下片按翻的先后逐次推进：正翻——松开时上片换成下一张、落定时下片换；倒翻反过来
  // 翻走（背面是空的）的那一片没有东西回弹，翻到底就算落定
  let upperFace = faces[0], lowerFace = faces[0];
  flips.forEach((fl, i) => {
    const nx = faces[Math.min(faces.length - 1, i + 1)];
    const landed = nx.k === 'none' ? f - fl.at >= (fl.dur ?? 12) : done(f, fl);
    if (fl.rev) { if (ang[i] > 0) lowerFace = nx; if (landed) upperFace = nx; }
    else { if (ang[i] > 0) upperFace = nx; if (landed) lowerFace = nx; }
  });
  // 正在翻走（背面是空的）的那一片过了水平：下片跟着淡掉
  const goneIdx = flips.findIndex((fl, i) => faces[i + 1]?.k === 'none' && ang[i] > 90 && ang[i] < 180 && !(f - fl.at >= (fl.dur ?? 12)));
  const clearing = goneIdx >= 0 ? 1 - (ang[goneIdx] - 90) / 90 : 1;
  // 前后顺序：过了水平、落到下面的片在后面，按先后叠（后落的盖在先落的上面）；还在上半区的片在前面，先翻的（伸得更出来）在最前
  const live = flips.map((_, i) => i).filter((i) => ang[i] !== -1 && !done(f, flips[i]));
  const fwd = live.filter((i) => !flips[i].rev), rev = live.filter((i) => flips[i].rev);
  const flying = [...fwd.filter((i) => ang[i] > 90).sort((a, b) => a - b), ...fwd.filter((i) => ang[i] <= 90).sort((a, b) => b - a)];
  // 下片上的影子：最前面那片过了水平以后最浓
  const lead = fwd.length ? Math.max(...fwd.map((i) => (ang[i] > 0 && ang[i] < 180 ? ang[i] : 0)).filter((x) => x < 175), 0) : 0;
  const shadow = lead > 40 && lead < 180 ? Math.sin((lead - 40) / 140 * Math.PI) * .45 : 0;
  // 风：正在翻的时候不吹（翻片自己在动）
  const gu = live.length ? 0 : gusts.reduce((a, g) => a + gustAngle(f, g), 0);
  const gl = live.length ? 0 : gusts.reduce((a, g) => a + gustAngle(f, g, 2), 0) * .4 + (windL?.[f] ?? 0);
  return (
    <div style={{position: 'relative', width: w + frame * 2, height: h + frame * 2}}>
      {/* 机壳 */}
      <div style={{position: 'absolute', inset: 0, borderRadius: radius + frame * .6, border: `${frame}px solid ${housing}`, boxSizing: 'border-box', boxShadow: lift ? 'inset 0 2px 0 rgba(255,255,255,.08), 0 10px 24px rgba(40,60,10,.25)' : 'inset 0 2px 0 rgba(255,255,255,.08)'}} />
      <div style={{position: 'absolute', left: frame, top: frame, width: w, height: h, borderRadius: radius}}>
        {/* 窗是空的（翻片翻走以后透出后面的下一屏），只在中轴有一道暗缝 */}
        {(upperFace.k !== 'none' || lowerFace.k !== 'none') && <div style={{position: 'absolute', left: 0, top: half - gap * 1.5, width: w, height: gap * 3, background: '#16210a'}} />}
        {/* 上片、下片（静止） */}
        {gu > .3 && (
          // 上片被掀起来时，后面露出的是鼓上的下一片（这里拿同一面压暗来画）
          <div style={{position: 'absolute', left: 0, top: 0, width: w, height: half - gap / 2, filter: 'brightness(.72)'}}><Half face={upperFace} top w={w} h={h} radius={radius} /></div>
        )}
        <div style={{position: 'absolute', left: 0, top: 0, width: w, height: h, perspective: h * persp}}>
          <div style={{position: 'absolute', left: 0, top: 0, width: w, height: half - gap / 2, transformOrigin: `50% ${half}px`, transform: gu > .3 ? `rotateX(${-gu}deg)` : undefined}}>
            <Half face={upperFace} top w={w} h={h} radius={radius} />
            {gu > .3 && <div style={{position: 'absolute', inset: 0, borderRadius: `${radius}px ${radius}px 0 0`, background: `rgba(16,24,4,${Math.sin(gu * Math.PI / 180) * .55})`}} />}
          </div>
        </div>
        <div style={{position: 'absolute', left: 0, top: half + gap / 2, width: w, height: half - gap / 2}}>
          {gl > .3 && lowerFace.k !== 'none' && (
            // 下片被吹起来时，后面露出挂着的下一片（背光，越吹得高、被前面这片挡住的光越多）
            <div style={{position: 'absolute', inset: 0, borderRadius: `0 0 ${radius}px ${radius}px`, overflow: 'hidden', background: bgOf(lowerFace), opacity: clearing}}>
              {behind && <Half face={behind} top={false} w={w} h={h} radius={radius} />}
              <div style={{position: 'absolute', inset: 0, borderRadius: `0 0 ${radius}px ${radius}px`, background: `linear-gradient(180deg, rgba(16,24,4,${.5 + .2 * Math.sin(gl * Math.PI / 180)}), rgba(16,24,4,.32))`}} />
            </div>
          )}
          <div style={{position: 'absolute', inset: 0, opacity: clearing, perspective: h * persp}}>
            <div style={{position: 'absolute', inset: 0, transformOrigin: '50% 0', transform: gl > .3 ? `rotateX(${gl}deg)` : undefined}}>
              <Half face={lowerFace} top={false} w={w} h={h} radius={radius} />
              {gl > .3 && <div style={{position: 'absolute', inset: 0, borderRadius: `0 0 ${radius}px ${radius}px`, background: `rgba(255,255,240,${Math.sin(gl * Math.PI / 180) * liftLight})`}} />}
            </div>
          </div>
          <div style={{position: 'absolute', inset: 0, borderRadius: `0 0 ${radius}px ${radius}px`, background: `linear-gradient(180deg, rgba(16,24,4,${shadow}) 0%, rgba(16,24,4,${shadow * .4}) 45%, rgba(16,24,4,0) 85%)`}} />
        </div>
        {/* 在空中的片 */}
        <div style={{position: 'absolute', left: 0, top: 0, width: w, height: h, perspective: h * persp, perspectiveOrigin: '50% 50%'}}>
          {flying.map((i) => {
            const a = ang[i];
            const front = faces[i], back = faces[Math.min(faces.length - 1, i + 1)];
            const rad = Math.max(0, a) * Math.PI / 180;
            const dark = a < 90 ? Math.sin(rad) * .55 : 0;                         // 正面：背光变暗
            const lit = a > 90 ? Math.sin(rad) * .28 : 0;                           // 背面：朝上迎光变亮
            return (
              <div key={i} style={{position: 'absolute', left: 0, top: 0, width: w, height: half - gap / 2, transformOrigin: `50% ${half}px`,
                transform: `rotateX(${-a}deg)`, transformStyle: 'preserve-3d'}}>
                {/* 正面 */}
                <div style={{position: 'absolute', inset: 0, backfaceVisibility: 'hidden'}}>
                  <Half face={front} top w={w} h={h} radius={radius} />
                  {dark > 0 && <div style={{position: 'absolute', inset: 0, borderRadius: `${radius}px ${radius}px 0 0`, background: `rgba(16,24,4,${dark})`}} />}
                </div>
                {/* 背面（下一张的下半）：同一块板子的另一面——绕自己的中线转半圈；整片翻到 180° 时正好立着、落在下片的位置 */}
                <div style={{position: 'absolute', inset: 0, transform: 'rotateX(180deg)', backfaceVisibility: 'hidden'}}>
                  <Half face={back} top={false} w={w} h={h} radius={radius} />
                  {lit > 0 && <div style={{position: 'absolute', inset: 0, borderRadius: `0 0 ${radius}px ${radius}px`, background: `rgba(255,255,240,${lit})`}} />}
                </div>
                {/* 厚度：自由边上一条，侧对时最显眼 */}
                <div style={{position: 'absolute', left: 0, top: 0, width: w, height: 4, background: 'rgba(255,255,235,.85)', transformOrigin: '50% 0', transform: 'rotateX(-90deg)', borderRadius: 2}} />
              </div>
            );
          })}
          {[...rev.filter((i) => ang[i] > 90).sort((a, b) => a - b), ...rev.filter((i) => ang[i] <= 90).sort((a, b) => b - a)].map((i) => {
            const a = ang[i];
            const front = faces[i], back = faces[Math.min(faces.length - 1, i + 1)];
            const rad = Math.max(0, a) * Math.PI / 180;
            const lit = a < 90 ? Math.sin(rad) * .25 : 0;                          // 往上撩时正面朝上、迎光
            const dark = a > 90 ? Math.sin(rad) * .5 : 0;                          // 过了水平，背面朝下、背光
            return (
              <div key={`r${i}`} style={{position: 'absolute', left: 0, top: half + gap / 2, width: w, height: half - gap / 2, transformOrigin: `50% ${-gap / 2}px`,
                transform: `rotateX(${a}deg)`, transformStyle: 'preserve-3d'}}>
                <div style={{position: 'absolute', inset: 0, backfaceVisibility: 'hidden'}}>
                  <Half face={front} top={false} w={w} h={h} radius={radius} />
                  {lit > 0 && <div style={{position: 'absolute', inset: 0, borderRadius: `0 0 ${radius}px ${radius}px`, background: `rgba(255,255,240,${lit})`}} />}
                </div>
                <div style={{position: 'absolute', inset: 0, transform: 'rotateX(180deg)', backfaceVisibility: 'hidden'}}>
                  <Half face={back} top w={w} h={h} radius={radius} />
                  {dark > 0 && <div style={{position: 'absolute', inset: 0, borderRadius: `${radius}px ${radius}px 0 0`, background: `rgba(16,24,4,${dark})`}} />}
                </div>
              </div>
            );
          })}
        </div>
        {/* 中轴挂耳 */}
        {[-1, 1].map((s) => (
          <div key={s} style={{position: 'absolute', top: half - h * .03, [s < 0 ? 'left' : 'right']: -frame * .55, width: frame * .9, height: h * .06, borderRadius: 3, background: '#5d7d1c', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25)'}} />
        ))}
      </div>
    </div>
  );
};
