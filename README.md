# competition-audio-toolkit

一个竞赛用的音频小工具集合，每个工具**独立使用**：

- `tts-gen`：批量把文本转成语音（Edge TTS）
- `audio-trim`：批量去掉音频首尾静音，方便后续处理/试听
- `audio-merge`：把多段音频拼接成一条，主要用于**人工检查 trim 效果**（听拼接后的节奏是否自然）

它们不是强绑定的流水线，你可以只用其中一个或两个。

## 安装

```bash
cd competition_audio_toolkit
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

---

## tts-gen：文本转语音

使用 Edge TTS（Python `edge-tts` 可执行）批量生成音频。

### 依赖

- Node.js 18+（推荐 22+）
- Python + `edge-tts`

```bash
pipx install edge-tts
# 或者
pip install edge-tts
```

### 用法 1：JSON 文件批量生成

`texts.json` 可以是：

```jsonc
// 方式 A：字符串数组
[
  "这是第一句",
  "这是第二句"
]

// 方式 B：对象数组
[
  { "id": "intro", "text": "这是第一句" },
  { "id": "q1", "text": "这是第二句" }
]

// 方式 C：字符串 + 自定义文件名前缀
[
  "intro::这是开头的提示语",
  "q1::这是第一道题目",
  "::没有自定义文件名，只是显式写个分隔符"
]
```

运行：

```bash
tts-gen \
  --in texts.json \
  --out out \
  --voice zh-CN-XiaoxiaoNeural \
  --format mp3 \
  --concurrency 3
```

输出：

- `out/*.mp3`
- `out/manifest.json`

### 用法 2：单句模式

不想写 JSON 时，可以直接传一条文本：

```bash
tts-gen \
  --text "这是单条语音的内容" \
  --out out_single
```

这会在 `out_single/` 里生成一条音频，并照常写 `manifest.json`。

---

## audio-trim：批量裁剪首尾静音

从 JSON 列表或 manifest 读取文件列表，去掉每个文件首尾的静音段。

示例输入 `list.json`：

```json
["out/tts_0001_intro_xxxxxxxx.mp3", "out/tts_0002_q1_xxxxxxxx.mp3"]
```

或直接用 `tts-gen` 的 manifest：

```bash
audio-trim \
  --in out/manifest.json \
  --outdir trimmed \
  --threshold -40 \
  --silenceduration 0.3
```

输出：

- 裁剪后的文件保存在 `trimmed/` 目录中，文件名与原文件相同。
- 在 `trimmed/trimmed.manifest.json` 中写入一个 manifest，结构大致为：

```jsonc
{
  "kind": "audio-trim",
  "outDir": "...",
  "items": [
    { "index": 0, "file": "trimmed/tts_0001_...mp3", "source": "out/tts_0001_...mp3", "ok": true }
  ]
}
```

这个 manifest 可以直接被 `audio-merge` 等工具消化使用。

---

## audio-merge：合并多段音频

从 JSON 列表或 manifest 读取文件列表，将它们顺序拼接为一个文件，用于人工检查整体节奏是否自然。

示例：

```bash
audio-merge \
  --in trimmed/trimmed.manifest.json \
  --out merged.mp3 \
  --format mp3
```

`--in` 同样可以是简单的字符串数组：

```json
["trimmed/tts_0001_...mp3", "trimmed/tts_0002_...mp3"]
```

输出：

- 一个合并后的文件：`merged.mp3`（或 `merged.wav`，取决于 `--format`）。

---

## 开发与测试

本地开发建议先跑完整检查：

```bash
npm run check
```

测试文件统一放在项目根目录 `test/` 下。

也可以分开执行：

```bash
npm run lint
npm test
```

仓库自带 GitHub Actions CI（`.github/workflows/ci.yml`），在指向 `master/main` 的 PR（以及 merge queue）上自动运行 lint + test。

开发流程见：`DEVELOPMENT_WORKFLOW.md`（branch -> review -> CI -> merge）。
