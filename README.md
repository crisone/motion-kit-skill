# Motion Kit · Agent Native 视频特效 Skill

用自然语言告诉 Agent 想做什么，它通过本地 API 生成特效。需要细调时打开网页；用户的参数调整会保存并记录前后差异，Agent 可以继续修改同一实例。

包含完整可运行源码和 Skill：论文逐行高亮、论文聚焦、引用卡、数字强调、柔纸翻页、文档放大镜、视频放大镜、时间线。支持项目管理、参数锁定、修改记录和 MP4 / ProRes 422 HQ 导出。

## 安装给 Codex

将本仓库克隆为 Skill 文件夹：

```sh
git clone https://github.com/crisone/motion-kit-skill.git ~/.codex/skills/motion-kit
```

重新打开 Codex 会话，然后说：

> 使用 $motion-kit，帮我启动工具，做一个包含三个节点的研究进展时间线。先用默认样式，然后给我网页微调链接。

如果目标目录已存在，先检查它，不要直接覆盖。其他支持 SKILL.md 的 Agent 也可以读取仓库入口，但自动发现方式由相应产品决定。

## 本地启动

当前支持 **macOS Apple Silicon**，需要 Node >=22.12、Python >=3.10、Google Chrome。

```sh
cd ~/.codex/skills/motion-kit/assets/app
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
PAPER_PYTHON="$PWD/.venv/bin/python" npm run dev
```

打开 http://127.0.0.1:4317/#templates 。完整环境设置见 [setup](references/setup.md)，Agent 调用约定见 [SKILL.md](SKILL.md) 和 [API 说明](references/api.md)。

## 可以这样说

- “把这篇 PDF 中这句话逐行高亮，背景暗一点，保持六秒。”
- “视频 A 翻页到 B，从右下角向左上角翻，下面的视频先虚焦再清晰。”
- “先提示视频右上角这块区域，再放大到 2.5 倍。”
- “做一个三节点时间线，用蓝色细线，之前的节点不要太暗。”

时间线样式用简单 JSON 表达：

```json
{"orientation":"horizontal","accentColor":"#66b8e8","lineWidth":4,"pastOpacity":0.45}
```

目前时间线支持 2–5 个等距节点。视频放大镜是固定位置取样，不做物体追踪；PDF 需要文字层，不含 OCR。输出为 1920×1080、30fps、完整不透明背景，适合导入 Final Cut / Premiere。

## 数据与依赖

仓库不包含个人论文、参考视频、项目实例、缓存、导出成片或本机配置。运行后这些内容只保存在本地，已通过 `.gitignore` 排除。自然语言由调用 Skill 的 Agent 理解，不需要向此工具配置模型 API Key。

Remotion、PyMuPDF 及其他第三方依赖保留各自的许可证；本仓库不重新授权这些依赖。安装、预览与导出都在本机完成。
