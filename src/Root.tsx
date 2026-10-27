// 合成登记：整场一个（Preshow-All），每段各一个（Preshow-1 … Preshow-10，分段渲染再拼起来更快、也方便单独看）；
// 另外是同一面翻牌墙做的应急垫片（Slate，60 秒一圈、首尾无缝）和视频封面（Cover-*，每个比例一个，只出静帧）。
import React from 'react';
import {Composition} from 'remotion';
import {PRESHOW_LEN, PreshowAll, PreshowSeg, SEGS} from './preshow/Preshow';
import {SLATE_FRAMES, Slate} from './standby/Slate';
import {COVERS, YemuCover} from './standby/YemuCover';
import {FPS, H, W} from './theme';

export const Root: React.FC = () => (
  <>
    <Composition id="Preshow-All" component={PreshowAll} durationInFrames={PRESHOW_LEN} fps={FPS} width={W} height={H} />
    {SEGS.map(([n, a, b]) => (
      <Composition key={n} id={`Preshow-${n}`} component={PreshowSeg} defaultProps={{n}} durationInFrames={Math.round((b - a) * FPS)} fps={FPS} width={W} height={H} />
    ))}
    <Composition id="Slate" component={Slate} durationInFrames={SLATE_FRAMES} fps={FPS} width={W} height={H} />
    {Object.entries(COVERS).map(([id, L]) => <Composition key={id} id={id} component={YemuCover} durationInFrames={1} fps={FPS} width={L.W} height={L.H} defaultProps={L} />)}
  </>
);
