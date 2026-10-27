// 开场前动画里好几段都用的东西：倒计时、出发大屏（车次表、表头、广播）。
import {COLS, Script, cellOf, face, sec} from './engine';

export const T0 = 600;                                    // 开头离开演还有 600 秒

/** 时刻表 = 直播的节目单。「旅叶知微」既是生日会的名字也是主线的名字，大多数观众还不知道有主线，
 *  表里写成节目名会让人一头雾水；每行都写「北京正点」，又会让人以为北京是每个节目自己的属性。所以按主线的城市分章：
 *    序号（不要列头）/ 车次：只在每章开头写「北京号」，夙愿是「须弥号」/ 节目：主线写「主线·城市」，主线和叶间来信以外都加书名号 /
 *    状态：夙愿「检票」，其余「正点」，只是装饰。
 *  大合唱也写「须弥号」：回到须弥，和开头的夙愿一首一尾。顺序就是直播的片序 */
export const CHAPTERS: {train: string; progs: string[]}[] = [
  {train: '须弥号', progs: ['《夙愿》']},
  {train: '北京号', progs: ['主线·北京', '《双份月亮》', '《十里花入梦》', '叶间来信', '《MineDa》']},
  {train: '重庆号', progs: ['主线·重庆', '《纳西妲最可爱》', '叶间来信', '《虚空终端》']},
  {train: '上海号', progs: ['主线·上海', '《蜜糖的曲调》', '《花与书》', '叶间来信', '《花神音游祭》']},
  {train: '成都号', progs: ['主线·成都', '《一千年以后》', '叶间来信', '《我不曾忘记》']},
  {train: '黄山号', progs: ['主线·黄山', '叶间来信', '《人是猫》', '《森林之梦》']},
  {train: '须弥号', progs: ['《大合唱》']},
];
/** 一行：序号、车次（每章第一行才有）、节目、状态 */
export const TRAINS = CHAPTERS.flatMap((ch, k) => ch.progs.map((name, i) => ({train: i === 0 ? ch.train : '', name, status: k === 0 ? '检票' : '正点'})));
/** 翻页按章：一页从一个「××号」开始，一页最多 6 行（须弥 + 北京、重庆、上海、成都、黄山 + 回须弥的大合唱） */
export const PAGES: number[][] = (() => {
  const out: number[][] = []; let n = 0;
  CHAPTERS.forEach((ch) => {
    const rows = ch.progs.map((_, i) => n + i); n += ch.progs.length;
    const cur = out[out.length - 1];
    if (cur && cur.length + rows.length <= 6 && (cur.length === 1 || rows.length === 1)) cur.push(...rows); else out.push(rows);
  });
  return out;
})();
const pad = (s: string, n: number) => (s + ' '.repeat(n)).slice(0, n);
/** 出发大屏底下广播条轮流说的话（第一段从 10:00 到 9:00 一句一次，不重复）。字数都是单数，在 17 格的墙上才放得正 */
export const TICKER = ['欢迎乘坐「旅叶知微」号', '本次列车 开往地球', '第四届纳西妲生日会', '弹幕说说 你从哪来', '请勿在车厢内种蘑菇', '带好车票 准备出发', '想对纳西妲说点什么'];
/** 9:00 报时以后、下雨之前的四句：第二句是无厘头小句子，最后一句给下一段的雨和伞埋个伏笔 */
export const TICKER2 = ['欢迎回到候车厅', '请勿投喂乘务员', '列车已经进站啦', '前方有雨 记得带伞'];

/** 时刻表的一页：第 2~7 排，每排 序号（第 1~2 列墨绿）车次（第 3~5 列白，只在每章开头）节目（第 6~13 列绿）状态（第 14~15 列白）。
 *  delay：某几格晚翻（卡住那一格） */
export const page = (sc: Script, p: number, t: number, delay?: Map<number, number>) => {
  for (let i = 0; i < 6; i++) {
    const r = 2 + i, n = PAGES[p][i], tt = t + i * 4;
    if (n === undefined) { sc.fill(r, 1, 15, 'g', tt); continue; }
    const tr = TRAINS[n];
    sc.text(r, 1, String(n + 1).padStart(2, '0'), 'k', tt, {roll: 1});
    if (tr.train) sc.text(r, 3, tr.train, 'w', tt + 4, {roll: 1}); else sc.fill(r, 3, 5, 'g', tt + 4);
    sc.text(r, 6, pad(tr.name, 8), 'g', tt + 8, {roll: 2, delay: r === 4 ? delay : undefined});
    sc.text(r, 14, tr.status, 'w', tt + 16, {roll: 1});
  }
};
/** 表头（主题绿底上三块白牌：车次 / 节目 / 状态，序号那列不要列头）和底下一整排白的广播条——和顶上白的倒计时一上一下把墙框住 */
export const bands = (sc: Script, t: number) => {
  sc.fill(1, 0, 16, 'g', t);
  sc.text(1, 3, '车次', 'w', t + 4); sc.text(1, 6, '节目', 'w', t + 8); sc.text(1, 14, '状态', 'w', t + 16);
  sc.fill(8, 0, 16, 'w', t + 10);
};
export const ticker = (sc: Script, msg: string, t: number) => { sc.fill(8, 1, 15, 'w', t, .8); sc.center(8, msg, 'w', t + 3, {roll: 1}); };
/** 底下一整排白的广播条（两头也铺满）写一句话 */
export const band = (sc: Script, msg: string, t: number) => { sc.fill(8, 0, 16, 'w', t, .8); sc.center(8, msg, 'w', t + 3, {roll: 1}); };

/** 整分报时前后，顶上那排走秒收起来、整面墙给报时用（秒）。蛇吃掉时钟那段另算（见 Preshow） */
export const FULL: [number, number][] = [[57, 66], [119, 128], [177.2, 182.9], [238.3, 243.6], [299, 307], [318.4, 363], [418, 428], [539, 548]];
/** 把顶上那排收起来：从正中往两边翻成主题绿 */
export const hideClock = (sc: Script, t: number) => { for (let c = 0; c < COLS; c++) sc.set(0, c, t + Math.abs(c - 8) * 1.6, face(' ', 'g'), false, true); };
/** 顶上一排：距开演 MM:SS（白底绿字），在每一段 [from, to] 秒里每秒翻；整分时整行从中间往两边翻一下。
 *  中间断开的时候（被蛇吃了、最后一分钟）这一排归别的段管，再开始时整排重新翻出来 */
export const clock = (sc: Script, spans: [number, number][]) => spans.forEach(([from, to]) => {
  const str = (s: number) => { const left = Math.max(0, T0 - s); return `距开演 ${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`; };
  sc.fill(0, 0, 16, 'w', sec(from), 1);
  sc.text(0, 4, str(from), 'w', sec(from) + 4, {roll: 1});
  for (let s = from + 1; s <= to; s++) {
    const prev = [...str(s - 1)], cur = [...str(s)];
    cur.forEach((ch, i) => { if (ch !== prev[i]) sc.set(0, 4 + i, sec(s) + i * 1.5, face(ch, 'w')); });
    if ((T0 - s) % 60 === 0) for (let c = 0; c < COLS; c++) sc.set(0, c, sec(s) + 2 + Math.abs(c - 8) * 2, sc.faceAt(cellOf(0, c), sec(s) + 1), true);
  }
});
