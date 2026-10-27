// 开场前·第八段（428~527 秒 = 2:52 → 1:13）：乘客名单。
//   所有参与这场生日会的人都是这趟车的乘客。每个人只出现一次（按 ID 去重）。
//   每个组 / 单品的人连在一起一次放完、主创排在前面。一排排轮流换新（比整页整页地翻灵动）：
//   第 2~8 排从上往下一排排换（换到最底下再从顶上开始），每排左右两栏，7 格以内的名字放左栏或右栏，8 格以上占一整排；
//   名字是白牌绿字，只有字下面是白牌。每个单品第一排的左栏是一枚墨绿小标签写单品名，第一个名字（短的话）就跟在右栏，标签出来时荡开一小圈。
//   第 1 排墨绿表头：「乘客名单」，右边「登车 00001」，来一个人加一。先慢（制作组每排停约 6 秒）后快，快多少按排数自动算，正好在 1:21 放完。
//   最后：名单收掉，正中「以及屏幕前的你」；「来自××的旅行者」先一句句铺满空白的地方、很快从慢到快，再满屏到处随机刷新（偶尔是提瓦特的地名）；
//   登车计数器越涨越快、每一位都在飞转，一直转到下一段「最后召集」把墙收掉，不停在某个数上（免得让人以为是真实人数）。
//   名单数据在 src/data/crew.json（仓库里是示例假名单，格式见 README）：按出场先后排好，每个组 / 单品的人连在一起、主创在前。
import {Ctx, face, jit, r01, sec, wave} from './engine';
import crew from '../data/crew.json';

type Crew = {label: string; name: string; staff: boolean};
const CREW = crew as Crew[];
const START = 429.2, END = 518.6, NEXT = 527.3;             // 名单段（秒）：3:00 列车开走以后，到 1:21；NEXT 是第九段收墙的时刻
const ROWS_N = 7, SLOW = 6, MIN = 1.6, RAMP = 30;           // 一屏 7 排（第 2~8 排）；制作组每排在墙上停 6 秒；最快不低于 1.6 秒；之后 30 排里加速完
const PLACES = ['北京', '天津', '上海', '重庆', '河北', '山西', '辽宁', '吉林', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南',
  '广东', '广西', '海南', '四川', '贵州', '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆', '香港', '澳门', '台湾', '海外'];
const TEYVAT = ['蒙德', '璃月', '稻妻', '须弥', '枫丹', '纳塔'];

export const seg8 = ({sc, rf}: Ctx) => {
  const pad5 = (n: number) => String(n).padStart(5, '0');

  // 分组：数据已经按先后排好；这里按标签出现的先后分组
  const order = [...new Set(CREW.map((x) => x.label))];

  // 每组排成几排：每排 [左栏, 右栏] 或 [整排]；每个单品第一排的左栏是小标签
  type Slot = {label?: string; who?: Crew};
  type Row = {left?: Slot; right?: Slot; full?: Crew; staff: boolean};
  const rows: Row[] = [];
  order.forEach((label) => {
    const who = CREW.filter((x) => x.label === label), staff = who[0].staff;
    let cur: Row | null = {left: {label}, staff};
    rows.push(cur);
    who.forEach((x) => {
      if ([...x.name].length > 7) { rows.push({full: x, staff}); cur = null; return; }
      if (cur && !cur.right) { cur.right = {who: x}; cur = null; return; }
      cur = {left: {who: x}, staff}; rows.push(cur);
    });
  });
  // 时刻：一排一排往下换，每排隔 dwell/7 秒（所以每排在墙上停 dwell 秒）；右栏比左栏晚小半拍。
  // 制作组 dwell = 6 秒；之后从 6 秒加速到 d1，d1 按排数二分出来，让最后一排正好在 END 前停够 d1
  const K0 = rows.findIndex((r) => !r.staff);
  const dwellAt = (k: number, d1: number) => (k < K0 ? SLOW : SLOW * (d1 / SLOW) ** Math.min(1, (k - K0) / RAMP));
  const t0 = START + 2.2;
  const lastAt = (d1: number) => { let t = t0; for (let k = 0; k < rows.length - 1; k++) t += dwellAt(k, d1) / ROWS_N; return t; };
  let lo = MIN, hi = SLOW;
  for (let it = 0; it < 40; it++) { const m = (lo + hi) / 2; if (lastAt(m) + m > END) hi = m; else lo = m; }

  // 表头：一整条墨绿；「乘客名单」，右边「登车 00000」
  for (let r = 1; r <= 8; r++) sc.fill(r, 0, 16, 'g', sec(428.2) + r * 2, .8);
  sc.fill(1, 0, 16, 'k', sec(START), .5);
  sc.text(1, 1, '乘客名单', 'k', sec(START) + 6, {roll: 1});
  sc.text(1, 8, '登车', 'k', sec(START) + 10, {roll: 1});
  sc.text(1, 11, pad5(0), 'k', sec(START) + 14, {stagger: 1.2});

  let t = t0, count = 0;
  rows.forEach((row, k) => {
    const step = dwellAt(k, lo) / ROWS_N, r = 2 + (k % ROWS_N), tt = sec(t);
    const crisp = step < .5, o = crisp ? {roll: 0, stagger: .35} : {roll: 1, stagger: 1.1}, st = crisp ? .35 : 1.1;
    const put = (c0: number, end: number, at: number, slot?: Slot, full?: Crew) => {
      const text = full ? full.name : slot?.label ?? slot?.who?.name;
      if (!text) { sc.fill(r, c0, end, 'g', at, st); return; }
      const n = [...text].length;
      sc.text(r, c0, text, slot?.label ? 'k' : 'w', at, o);
      if (c0 + n <= end) sc.fill(r, c0 + n, end, 'g', at + n * st, st);
      if (slot?.label) rf.add(c0 + n / 2, r + .5, at + 6, .55, 5, 20, .6, 40);          // 新单品的标签出来，荡开一小圈
      else sc.text(1, 11, pad5(++count), 'k', at + 2, {stagger: 1});
    };
    if (row.full) put(1, 15, tt, undefined, row.full);
    else { put(1, 8, tt, row.left); put(9, 15, tt + sec(.45 * step), row.right); }
    t += step;
  });

  // ── 最后：以及屏幕前的你 + 一圈来自××的旅行者 + 停不下来的登车计数器 ──
  const end = sec(END);
  wave(sc, end, () => face(' ', 'g'), {speed: 1.6, rows: [2, 8]});
  sc.center(5, '以及屏幕前的你', 'w', end + sec(.6), {roll: 2, stagger: 3});
  rf.add(8.5, 5.5, end + sec(1.3), 1.5, 16, 42);
  sc.text(1, 11, pad5(CREW.length + 1), 'k', end + sec(1.2), {stagger: 2});      // 屏幕前的你也登车了
  // 第 q 次翻到哪：地名可以重复，大多是地球上的，偶尔是提瓦特
  const placeOf = (q: number) => (r01(q * 3.17) < .12 ? TEYVAT[Math.floor(r01(q * 5.3) * TEYVAT.length)] : PLACES[Math.floor(r01(q * 7.9) * PLACES.length)]);
  // 「来自××的旅行者」：先盖空白的地方，很快从慢到快，然后满屏到处随机刷新，要有「刷拉刷拉」的冲击感：
  //   铺满：一句一句翻出来，每句挑盖住空白格最多的位置，间隔从 0.32 秒很快缩到 0.07 秒，两秒多铺满第 2~8 排；
  //   刷新：铺满以后每秒十几句，在随便哪个位置整句刷一遍，可以伸出墙边、盖住前面的半句。正中「以及屏幕前的你」那几格不盖；在第九段收墙之前停
  const CENTER = (r: number, c: number) => r === 5 && c >= 5 && c <= 11;
  const covered = new Set<number>();
  const blanks = (r: number, c0: number) => { let n = 0; for (let i = 0; i < 8; i++) { const c = c0 + i; if (c >= 0 && c <= 16 && !CENTER(r, c) && !covered.has(r * 17 + c)) n++; } return n; };
  const say = (r: number, c0: number, t: number, q: number) => {
    [...`来自${placeOf(q)}的旅行者`].forEach((ch, i) => { const c = c0 + i; if (c >= 0 && c <= 16 && !CENTER(r, c)) { sc.set(r, c, Math.round(t + i * .6), face(ch, 'g'), false, true); covered.add(r * 17 + c); } });
  };
  let tt = end + sec(1.2), q = 0, gap = .32;
  // 铺满：每句挑盖住空白格最多的位置（一样多的随机挑）
  while (covered.size < 7 * 17 - 7 && tt < sec(NEXT) - 12) {
    let best = -1, br = 2, bc = 0;
    for (let r = 2; r <= 8; r++) for (let c0 = -2; c0 <= 11; c0++) { const sc0 = blanks(r, c0) + r01(q * 9.7 + r * 3.1 + c0 * .73) * .9; if (sc0 > best) { best = sc0; br = r; bc = c0; } }
    if (best < 1) break;
    say(br, bc, tt, q++);
    tt += sec(gap); gap = Math.max(.07, gap * .78);
  }
  // 刷新：满屏随机位置，越刷越快
  const t1 = tt, t2 = sec(NEXT) - 12;
  while (tt < t2) {
    const u = (tt - t1) / (t2 - t1);
    say(2 + Math.floor(r01(q * 2.71 + 1) * 7), -3 + Math.floor(r01(q * 3.93 + 2) * 16), tt, q++);
    tt += sec(.075 - .03 * u);
  }
  // 计数器：从「屏幕前的你」那一位起越涨越快，几秒内到上万，最后每一位都在飞转；转到第九段把表头收掉为止
  const c0 = end + sec(2.2), c1 = sec(NEXT);
  let shown = pad5(CREW.length + 1);
  for (let f = c0; f < c1; f += 6) {
    const u = (f - c0) / (c1 - c0), v = Math.round((CREW.length + 1) * 220 ** (u ** 1.5) + jit(f, 3) * u);
    const s5 = pad5(Math.min(99999, v));
    [...s5].forEach((ch, i) => { if (ch !== shown[i]) sc.set(1, 11 + i, f + i, face(ch, 'k'), false, true); });
    shown = s5;
  }
  return {rows: rows.length, d1: lo, total: CREW.length};
};
