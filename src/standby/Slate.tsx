// 应急垫片（直播中途出状况时切过去，陪大家等一会儿）。
// 画面：开场前那面翻牌墙（同一套剧本、风和物理，见 src/preshow/engine.ts），不提时间、不提节目，开播前、片中、片尾哪里切过来都能用：
//   顶上白条「本次列车 临时停车」/ 中间白条「画面调整中」+ 三个点一个个亮（像在加载）/ 下面「马上就回来」/ 底下广播条每 7 秒换一句。
//   一阵风吹过时「回来」的「来」那片特别轻，被吹上去露出后面的「喵」；中间一道白光扫过。
// 60 秒一圈、首尾无缝：剧本从第 0 秒开始翻出字，循环段取第 10~70 秒（第 70 秒的样子和第 10 秒一样：字都在、点在同一拍、广播是第一句、风停了）。
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FlapModule} from '../flap/FlapModule';
import {P, makeWind} from '../flap/windSim';
import type {Puff, Round} from '../flap/windSim';
import {COLS, FR, HOUSING, Script, T, Tile, WHITE, X0, build, cellOf, face, icon, same, sec, wave} from '../preshow/engine';
import {V} from '../theme';

export const SLATE_FRAMES = 3600;                 // 一圈 60 秒
export const SLATE_FROM = sec(10);                // 循环段从剧本的第 10 秒开始
const END = SLATE_FROM + SLATE_FRAMES;
/** 广播条的话（单数字数，17 格的墙上才放得正）；第一句在第 3 秒翻出来、第 66 秒再翻回来接上下一圈，循环段里每句约 8.5 秒 */
export const SLATE_LINES = ['请不要走开', '乘务员正在检修', '弹幕聊聊 你最期待哪个节目', '请勿在车厢内种蘑菇', '趁现在 去倒杯水吧', '纳西妲也在等你', '列车马上就重新出发'];
const DOT = icon('dot', WHITE, V.g);

let MASTER: {sc: Script; wind: (x: number, y: number, t: number) => number} | null = null;
const master = () => {
  if (MASTER) return MASTER;
  const sc = new Script(face(' ', 'g'));
  const rounds: Round[] = [], puffs: Puff[] = [];
  // 翻出字（只在剧本开头，循环段里看不到）
  sc.fill(0, 0, 16, 'w', sec(.3), .8); sc.center(0, '本次列车 临时停车', 'w', sec(.8), {roll: 1});
  sc.fill(3, 3, 13, 'w', sec(1.0), 1); sc.center(3, '画面调整中', 'w', sec(1.6), {roll: 2, stagger: 3});
  sc.center(5, '马上就回来', 'g', sec(2.2), {roll: 2, stagger: 3});
  sc.fill(8, 0, 16, 'w', sec(2.4), .8);
  // 广播条：第一句第 3 秒翻出，之后第 14.5、23、31.5……57 秒各换一句，第 66 秒回到第一句
  const line = (msg: string, t: number) => { sc.fill(8, 1, 15, 'w', t, .8); sc.center(8, msg, 'w', t + 3, {roll: 1}); };
  SLATE_LINES.forEach((m, i) => line(m, sec(i ? 6 + i * 8.5 : 3)));
  line(SLATE_LINES[0], sec(66));
  // 三个点：每 3 秒一拍，一个个亮、再一起灭（3 秒整除 60 秒，两头同一拍；第 10、70 秒在灭了 1 秒多以后的空档里）
  for (let t = sec(4.4); t < END + sec(3); t += sec(3)) {
    [11, 12, 13].forEach((c, k) => sc.set(3, c, t + sec(k * .45), DOT, true, true));
    [11, 12, 13].forEach((c, k) => sc.set(3, c, t + sec(1.5) + k * 3, face(' ', 'w'), true, true));
  }
  // 第 24 秒一阵风：「来」那片特别轻，被吹上去露出后面的「喵」，风过去自己落回来
  sc.light.set(cellOf(5, 10), {k: 2.6, from: sec(23), to: sec(31), behind: face('喵', 'w')});
  rounds.push({a: sec(23.5), b: sec(30), U: .5, lag: 2.8});
  puffs.push(P(-3, 3, sec(24), .6, 2.8, 1.8, 110), P(10.2, 5.5, sec(25.2), 1.8, 1.2, .8, 18, {front: .35, sp: .8}));
  // 第 44 秒一道白光从左往右扫过中间几排（翻白再翻回原样）
  wave(sc, sec(44), same(sc, sec(43.9)), {dir: [1, .35], speed: 2.4, rows: [2, 6], hold: 7, skip: (r, c) => r === 3 && c >= 11});
  const base = makeWind(rounds, puffs, END + sec(1));
  MASTER = {sc, wind: base};
  return MASTER;
};

export const Slate: React.FC = () => {
  const f = SLATE_FROM + useCurrentFrame();
  const tiles: Tile[] = React.useMemo(() => { const m = master(); return build(m.sc, END + 1, m.wind, 0); }, []);
  return (
    <AbsoluteFill style={{background: HOUSING}}>
      {tiles.map((t, j) => (
        <div key={j} style={{position: 'absolute', left: X0 + (j % COLS) * T, top: Math.floor(j / COLS) * T}}>
          <FlapModule f={f} w={T - FR * 2} h={T - FR * 2} faces={t.faces} flips={t.flips} gusts={t.gusts} windL={t.windL} behind={t.behind} liftLight={.2} frame={FR} radius={8} lift={false} housing={HOUSING} />
        </div>
      ))}
    </AbsoluteFill>
  );
};

/** 音效用：整段剧本（0 ~ 第 70 秒多一点）的墙，给事件表脚本 */
export const slateMaster = master;
export const SLATE_END = END;
