// 开场前·第四段（182~238.5 秒 = 6:58 → 6:01）：记忆翻牌小游戏，约 50 秒，节奏大约两秒一步。
//   开场：白光收掉大 7 → 标题「翻 牌 小 游 戏」→ 规则「找出一样的两张」+ 彩蛋「猫和喵也算一对」→「START」闪三下 → 白光一扫，开局。
//   发牌：24 张牌（12 对）一张张发下来，背面是白牌、印一片绿叶子（吉祥物「妲猫猫」贴纸里那片）。
//   三种样子分得开：背面 = 白牌绿叶；选中、正在比对 = 墨绿牌白字（翻之前先跳一下）；配上了 = 沉成主题绿底白字。
//   配上了：两张先闪一下白再沉成绿，像被风轻轻托起来一下，再以它俩为中心荡开一圈涟漪、周围的牌依次微微掀起，底下计分翻一下；
//   连着配上，底条报「连对 ×2」「连对 ×3」……配错了：两张抖一下，再翻回背面。
//   玩家按真正的记性玩：没见过的随便翻，见过的记得住——开头会错几次，后面越来越顺。
//   通关：「全部配对啦」，所有牌从中间往外翻回白牌、一圈大涟漪、从正中往四面飞出一圈叶子，底条报「用了17步」；然后收掉，给 6:00 的日历腾地方。
import {FlapFace} from '../flap/FlapModule';
import {V} from '../theme';
import {COLS, Ctx, WHITE, cellOf, face, icon, jit, r01, sec, wave} from './engine';
import {band} from './common';

const ROWS_C = [1, 3, 5, 7], COLS_C = [3, 5, 7, 9, 11, 13];
const SYMS = ['叶', '花', '书', '月', '糖', '梦', '灯', '星', '心', '风', '雨'];
const BACK: FlapFace = icon('leaf', WHITE, V.g, -30);
const G = face(' ', 'g');

export const seg4 = ({sc, rf}: Ctx) => {
  // 12 对牌洗好，摆成 4 排 6 列
  const deck: string[] = [...SYMS.flatMap((s) => [s, s]), '猫', '喵'];
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(r01(i * 7.7 + 3) * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  const pos = deck.map((_, i) => [ROWS_C[Math.floor(i / 6)], COLS_C[i % 6]] as [number, number]);
  const pairOf = (s: string) => (s === '猫' ? '喵' : s === '喵' ? '猫' : s);
  const hop = (i: number, at: number, amp = 8, dur = 10) => { const cell = cellOf(pos[i][0], pos[i][1]); sc.gusts.set(cell, [...(sc.gusts.get(cell) ?? []), {at, amp, dur}]); };

  // ── 开场：标题、规则、彩蛋、START ──
  wave(sc, sec(182.0), () => G, {speed: 1.8, rows: [0, 8]});              // 白光从正中收掉 777 和底条（顶上走秒 182.9 秒回来）
  sc.center(2, '翻 牌 小 游 戏', 'w', sec(182.9), {roll: 2, stagger: 3});
  band(sc, '准备好了吗', sec(183.3));
  sc.center(4, '找出一样的两张', 'g', sec(183.8), {roll: 1, stagger: 2});
  sc.center(5, '猫和喵也算一对', 'g', sec(184.6), {roll: 1, stagger: 2});
  [185.3, 185.9, 186.5].forEach((s, k) => {                               // START 闪三下
    sc.center(7, 'START', 'w', sec(s), {stagger: 1.5});
    if (k < 2) sc.center(7, 'START', 'g', sec(s + .32), {stagger: 1.5});
  });
  wave(sc, sec(187.1), () => G, {rows: [1, 7], speed: 1.3, hold: 6});     // 白光一扫，开局
  rf.add(8.5, 4.5, sec(187.2), 1.1, 14, 38);

  // ── 发牌 ──
  pos.forEach(([r, c], i) => { const t = sec(188.0) + i * 4; sc.set(r, c, t, BACK, false, true); rf.add(c + .5, r + .5, t + 6, .3, 2.5, 12, .5, 30); });
  let matched = 0;
  const score = (at: number) => sc.center(8, `已配对 ${String(matched).padStart(2, '0')}/12`, 'w', at, {roll: 1});
  band(sc, '已配对 00/12', sec(188.1));

  // ── 玩家按记性玩：大约两秒一步 ──
  const seen = new Map<number, string>(), done = new Set<number>();
  let t = sec(190.1), n = 0, streak = 0, slip1 = false, slip2 = false;
  const pick = (i: number, at: number) => { hop(i, at - 10); sc.set(pos[i][0], pos[i][1], at, face(deck[i], 'k'), true, true); };   // 选中：先跳一下，再翻成墨绿牌
  while (done.size < 24 && n < 40) {
    n++;
    const open = [...Array(24).keys()].filter((i) => !done.has(i));
    const known = open.find((i) => seen.has(i) && open.some((j) => j !== i && seen.has(j) && seen.get(j) === pairOf(deck[i])));
    let a: number, b: number;
    if (known !== undefined) { a = known; b = open.find((j) => j !== a && seen.has(j) && seen.get(j) === pairOf(deck[a]))!; }
    else {
      const unseen = open.filter((i) => !seen.has(i));
      a = unseen[Math.floor(r01(n * 5.3 + 31) * unseen.length)];          // 这一组随机数：加上后半段故意错的两次，20 步翻完
      const mate = open.find((j) => j !== a && seen.has(j) && seen.get(j) === pairOf(deck[a]));
      if (mate !== undefined) b = mate;
      else { const rest = unseen.filter((i) => i !== a); b = rest[Math.floor(r01(n * 9.1 + 32) * rest.length)]; }
    }
    // 后半段错两次（不然一路连对太顺）——连对三次以后手太快，第二张翻错；剩最后三对时把两张的位置记反（有「风」「雨」就是它俩）
    const slip = !slip1 && streak >= 3, swap = !slip2 && matched >= 9;
    if ((slip || swap) && pairOf(deck[a]) === deck[b]) {
      const wrong = open.filter((j) => j !== a && j !== b && seen.has(j) && pairOf(deck[j]) !== deck[a]);
      const near = (j: number) => Math.hypot(pos[j][0] - pos[b][0], pos[j][1] - pos[b][1]);
      if (wrong.length) {
        b = (swap && wrong.find((j) => (deck[a] === '风' && deck[j] === '雨') || (deck[a] === '雨' && deck[j] === '风'))) || wrong.sort((x, y) => near(x) - near(y))[0];
        if (slip) slip1 = true; else slip2 = true;
      }
    }
    seen.set(a, deck[a]); seen.set(b, deck[b]);
    pick(a, t); pick(b, t + sec(.6));
    if (pairOf(deck[a]) === deck[b]) {
      done.add(a); done.add(b); matched++; streak++;
      [a, b].forEach((i, k) => {
        const [r, c] = pos[i], at = t + sec(1.25) + k * 3;
        sc.set(r, c, at, face(deck[i], 'w'), true, true); sc.set(r, c, at + 9, face(deck[i], 'g'), true, true);   // 闪一下白，沉成绿
        hop(i, at - 4, 16, 20);                                             // 配上了：两张像被风轻轻托起来
        rf.add(c + .5, r + .5, at + 2, .9, 6, 22, .6, 50);                  // 再以它俩为中心荡开一圈，周围的牌依次微微掀起，越远越弱
      });
      if (streak >= 2) { band(sc, `连对 ×${streak}`, t + sec(1.35)); score(t + sec(2.35)); }
      else score(t + sec(1.4));
      t += sec(2.1);
    } else {
      streak = 0;
      [a, b].forEach((i) => hop(i, t + sec(1.25), 10, 12));                // 不对：抖一下
      [a, b].forEach((i, k) => sc.set(pos[i][0], pos[i][1], t + sec(1.7) + k * 4, BACK, true, true));
      t += sec(2.3);
    }
  }

  // ── 通关 ──
  const end = t;
  band(sc, '全部配对啦', end + sec(.1));
  pos.forEach(([r, c], i) => sc.set(r, c, end + Math.hypot(c - 8, (r - 4) * 1.3) * 3, face(deck[i], 'w'), true, true));
  rf.add(8.5, 4.5, end + 4, 1.5, 16, 42);
  const cards = new Set(pos.map(([r, c]) => cellOf(r, c)));
  for (let k = 0; k < 16; k++) {                                            // 从正中往四面飞出一圈叶子（只走空格）
    const ang = (k / 16) * Math.PI * 2 + jit(k * 3, .12);
    for (let d = 1.4, m = 0; d < 11; d += 1, m++) {
      const r = Math.floor(4.5 + Math.sin(ang) * d / 1.1), c = Math.floor(8.5 + Math.cos(ang) * d);
      if (r < 1 || r > 7 || c < 0 || c >= COLS) break;
      if (cards.has(cellOf(r, c))) continue;
      const at = end + sec(.3) + m * 4 + jit(k * 11 + m, 1.5);
      sc.set(r, c, at, icon('leaf', WHITE, V.g, (ang * 180) / Math.PI), true, true); sc.set(r, c, at + 8, G, true, true);
    }
  }
  band(sc, `用了${n}步`, end + sec(2.0));
  wave(sc, Math.max(end + sec(4.2), sec(238.4)), () => G, {speed: 1.6});   // 收掉，给 6:00 的日历腾地方
  return {gameEnd: end, moves: n};
};
