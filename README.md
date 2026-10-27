# 叶幕降临 · leaf-curtain

《叶幕降临》是第四届纳西妲生日会「旅叶知微」直播前的翻牌墙预热动画。须弥站的报站、天气、小游戏和乘客名单，陪大家倒数到开演。

![叶幕降临预览](docs/preview.png)

[在 B 站观看](https://www.bilibili.com/video/BV11KxM6hEjS/)

本仓库包含 Remotion 动画工程、音效脚本、应急垫片和视频封面。开源版使用示例乘客名单，音轨保留翻牌声、天气和车站环境声，不含直播版背景音乐及曲谱。

## 运行

需要 Node.js、Python 3、numpy、scipy 和 ffmpeg。字体使用[阿里妈妈方圆体](https://www.iconfont.cn/fonts/detail?cnid=pOvFIr086ADR)，请从官方渠道下载，将 `AlimamaFangYuanTiVF-Thin.ttf` 放入 `public/fonts/`。

```bash
npm ci
python3 -m pip install numpy scipy
npm run studio                  # 预览
python3 scripts/build.py        # 输出 1080p60 整片
python3 scripts/build.py --uhd  # 输出 4K60 整片
```

整片分段渲染并合成，耗时较长。其他常用命令：

```bash
npx remotion still src/index.ts Cover-16x9 out/cover.png  # 封面
python3 scripts/build_slate.py                           # 应急垫片
```

乘客名单可在 `src/data/crew.json` 修改。如需为缺字生成后备字体，安装 `fonttools` 后使用 `scripts/make_fallback_font.py`，并遵守所选字体的许可。

## 授权与鸣谢

代码、文案和叶子图形以 [CC0 1.0](LICENSE) 发布。音效素材来自 Freesound，作者和来源见 [audio/sfx/SOURCES.md](audio/sfx/SOURCES.md)。阿里妈妈方圆体不随仓库分发，使用请遵循其许可。Remotion 的使用许可见 [Remotion License](https://www.remotion.dev/license)。

本作品是《原神》同人二次创作，与米哈游（miHoYo / HoYoverse）无关；相关角色、名称和设定的权利归其权利人所有。

设计·制作 / 音频：是咚咚小圆帽吗  
文案：十有十一、猫苏妲  
动画代码、物理模拟和音效脚本由 Claude Opus 5.5 在作者指导下编写。
