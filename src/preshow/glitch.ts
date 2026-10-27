// 开场前全场的"风吹翻"：风越大，被吹翻的格子越多（微风一格，大风两三格，最后开演那阵最大的风四格）。
//   每一格是物理算出来的：风吹到它那一列它才翻（所以不会一起出现），翻过头贴在上面、露出背面的小字或一片叶子，
//   再在随机的时刻恢复原来的重量、风托不住了自己落回来（所以也不会一起消失）。
//   挑格子的规矩：那几秒里这一格自己不能有安排好的翻；整分报时的全屏时段不吹；相邻的不挑；1:00 风吹出的 1 那几格不挑；已经有"设计好的吹翻"（第一段的「喵」）的那阵风不再加；
//   最后那阵风只吹空白格，不挡最后的字。
import {V} from '../theme';
import {FlapFace} from '../flap/FlapModule';
import {Ctx, WHITE, bigOn, blowOver, cellOf, face, icon, r01, sec} from './engine';
import {FULL} from './common';

const BACKS: FlapFace[] = [face('喵', 'w'), face('嘿', 'w'), icon('leaf', WHITE, V.g, -30), face('呀', 'w'), face('风', 'w'), face('哇', 'w'), face('叶', 'w'), face('嗨', 'w')];

export const glitches = ({sc, rounds, puffs}: Ctx) => {
  const designed = [...sc.light.values()];
  // 每阵风各用自己的种子（按它开始的时刻）：前面的段改了，后面段的吹翻格子不跟着变——各段才能分开重渲、接缝对得上
  for (const rd of [...rounds]) {
    let seed = Math.round(rd.a / 7) * 13 + 1;
    let n = rd.U >= .9 ? 4 : rd.U >= .7 ? 3 : rd.U >= .5 ? 2 : rd.U >= .3 ? 1 : 0;
    if (designed.some((l) => l.to > rd.a && l.from < rd.b)) n = 0;
    const picked: [number, number][] = [];
    for (let i = 0, tries = 0; i < n && tries < 600; tries++) {
      seed++;
      const r = 1 + Math.floor(r01(seed * 3.7 + 1) * 7), c = 1 + Math.floor(r01(seed * 5.1 + 2) * 15), cell = cellOf(r, c);
      if (sc.light.has(cell) || picked.some(([pr, pc]) => Math.abs(pr - r) + Math.abs(pc - c) < 3)) continue;
      if (bigOn('1', r, c, 0, 5)) continue;                                   // 1:00 风吹出来的 1：轻格子的背面字一翘就露出来，这些格不挑
      const w0 = rd.a + c * rd.lag + 50, w1 = rd.b + c * rd.lag - 60;          // 这一列吹到风的那几秒
      if (w1 - w0 < 60) continue;
      const tUp = Math.round(w0 + (w1 - w0) * (.08 + .7 * (i + r01(seed * 9.1)) / n));
      const tDown = Math.round(Math.min(w1 + 20, tUp + sec(1.4 + r01(seed * 4.3) * 2.6)));
      if ((sc.ch.get(cell) ?? []).some(([t]) => t > tUp - 40 && t < tDown + 90)) continue;
      if (FULL.some(([a, b]) => tDown + 90 > sec(a) && tUp < sec(b))) continue;   // 整分报时的全屏时段不吹（别和报时挤在一起）
      const f = sc.faceAt(cell, tUp);
      if (rd.U >= .9 && f.k === 'char' && f.ch !== ' ') continue;
      blowOver(sc, puffs, r, c, tUp, tDown, BACKS[Math.floor(r01(seed * 2.3 + i) * BACKS.length)]);
      picked.push([r, c]); i++;
    }
  }
};
