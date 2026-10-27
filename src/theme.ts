// 颜色和字体。颜色只用三档绿加奶白；字一律阿里妈妈方圆体 Bold Round（可变字体：wght 700、BEVL 100）。
import React from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

export const W = 1920;
export const H = 1080;
export const FPS = 60;

/** g 主题绿；cream 奶白（翻片上字的默认颜色） */
export const V = {g: '#84b403', cream: '#f7fce8'};

export const FY = (w = 700): React.CSSProperties => ({
  fontFamily: '"FangYuan", "PingFang SC", sans-serif', fontWeight: w, fontVariationSettings: `"wght" ${w}, "BEVL" 100`,
});

/** 方圆体不随仓库分发：从阿里妈妈官方渠道下载，原名放进 public/fonts/（见 README）。 */
export const FANGYUAN_FILE = 'fonts/AlimamaFangYuanTiVF-Thin.ttf';

let loaded = false;
/** 渲染前用 delayRender 等字体就绪，避免第一帧用了后备字体 */
export const loadFonts = () => {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  const handle = delayRender('fonts');
  const face = new FontFace('FangYuan', `url(${staticFile(FANGYUAN_FILE)})`, {weight: '100 900'});
  (document.fonts as unknown as {add: (f: FontFace) => void}).add(face);
  face.load()
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(`没有载入方圆体（public/${FANGYUAN_FILE}），画面会用系统字体代替。下载方法见 README。`, e);
      continueRender(handle);
    });
};
