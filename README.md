# competition-audio-toolkit

一个竞赛用的音频小工具集合，每个工具**独立使用**：

- `tts-gen`：批量把文本转成语音（Edge TTS）
- `audio-trim`：批量去掉音频首尾静音，方便后续处理/试听
- `audio-merge`：把多段音频拼接成一条，主要用于**人工检查 trim 效果**（听听拼接后节奏是否自然）

它们不是强绑定的流水线（pipeline），你可以只用其中一个或两个。

## 安装

```bash
cd competition-audio-toolkit
npm i
npm link
```

安装后会在 PATH 里提供三个命令：`tts-gen`、`audio-trim`、`audio-merge`。

## 通用约定

- `--in`：输入 JSON 文件
  - 可以是字符串数组：`["a.mp3", "b.mp3"]`
  - 或 `tts-gen` / `audio-trim` 生成的 manifest：`{ items: [{ file: "..." }] }`
- 所有文件路径默认相对于 `--in` 所在目录解析
- 所有命令尽量统一为 `--in` + `--out` / `--outdir` 的风格

（详细用法可以按命令加 `--help` 查看，也可以后续再补全到 README）
