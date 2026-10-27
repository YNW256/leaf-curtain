# 应急垫片成品：渲一圈 60 秒 → 电视范围 → 拷贝拼 N 圈 → 配声音。在仓库根目录跑：
#   python3 scripts/build_slate.py                  10 圈（10 分钟），出 out/应急垫片_1080p60.mp4
#   --loops 5          拼几圈；--norender  用已有的一圈（out/slate/一圈_原始.mp4）只重做后面
#   --bgm <音频文件>   再垫一首配乐（压到 -27 LUFS，头尾各淡 2 秒）。仓库里不带配乐，用你有权使用的音乐
# 声音：翻牌声一圈（audio/make_slate_sound.py）+ 车站底（make_bed.py 出的那段无缝循环，没有就先跑 make_bed.py），整体 -20 LUFS、真峰值 -2。
import argparse, os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = f'{ROOT}/out/slate'
AMB = f'{ROOT}/out/sound/车站底_无缝循环.wav'
NICE = ['nice', '-n', '10']

ap = argparse.ArgumentParser()
ap.add_argument('--loops', type=int, default=10)
ap.add_argument('--norender', action='store_true')
ap.add_argument('--bgm')
A = ap.parse_args()
T = A.loops * 60


def run(cmd, **kw):
    print('  $', ' '.join(cmd)[:160], flush=True)
    subprocess.run(cmd, cwd=ROOT, check=True, **kw)


os.makedirs(D, exist_ok=True)
if not A.norender:
    run(NICE + ['npx', 'remotion', 'render', 'src/index.ts', 'Slate', f'{D}/一圈_原始.mp4', '--concurrency=50%', '--muted', '--crf=16', '--log=error'])
run(NICE + ['ffmpeg', '-v', 'error', '-y', '-i', f'{D}/一圈_原始.mp4', '-vf', 'scale=out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p',
            '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '60', '-g', '120',
            '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-an', f'{D}/一圈.mp4'])
with open(f'{D}/圈.txt', 'w') as f:
    f.write("file '一圈.mp4'\n" * A.loops)
run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{D}/圈.txt', '-c', 'copy', f'{D}/画面.mp4'])
# 翻牌声事件表 → 一圈翻牌声
run(NICE + ['npm', 'run', '--silent', 'slate-events'])
run(NICE + ['python3', 'audio/make_slate_sound.py'])
if not os.path.exists(AMB):
    run(NICE + ['npm', 'run', '--silent', 'events'])
    run(NICE + ['python3', 'audio/make_sfx.py', 'B'])
    run(NICE + ['python3', 'audio/make_bed.py'])
ins = ['-stream_loop', '-1', '-i', f'{D}/翻牌一圈.wav', '-stream_loop', '-1', '-i', AMB]
fc = (f'[0:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:{T}[fl];'
      f'[1:a]aresample=48000,aformat=channel_layouts=stereo,volume=-8dB,atrim=0:{T}[amb];')
if A.bgm:
    ins += ['-stream_loop', '-1', '-i', A.bgm]
    fc += (f'[2:a]aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=-27:TP=-6:LRA=11,aresample=48000,atrim=0:{T},'
           f'afade=t=in:d=2,afade=t=out:st={T - 2}:d=2[bed];[fl][amb][bed]amix=inputs=3')
else:
    fc += '[fl][amb]amix=inputs=2'
fc += ':duration=longest:normalize=0,loudnorm=I=-20:TP=-2:LRA=11,aresample=48000[a]'
run(NICE + ['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', fc, '-map', '[a]', '-c:a', 'pcm_s16le', '-t', str(T), f'{D}/声音.wav'])
out = f'{ROOT}/out/应急垫片_1080p60.mp4'
run(['ffmpeg', '-v', 'error', '-y', '-i', f'{D}/画面.mp4', '-i', f'{D}/声音.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
     '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-shortest', '-movflags', '+faststart', out])
for f in ('圈.txt', '画面.mp4', '声音.wav'):
    os.remove(f'{D}/{f}')
print('  出片', out)
