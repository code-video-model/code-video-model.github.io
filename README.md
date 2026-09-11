# Code Video Model 项目主页

当前内容选择与自适应布局已本地定制，见 [CUSTOMIZATIONS.md](CUSTOMIZATIONS.md)。

网页封面采用保持原像素尺寸的 WebP 副本和按需加载；重新生成 PNG 封面/拼贴后，请运行 `python scripts/build_web_posters.py`。性能对比和验证命令见 [LOADING_PERFORMANCE.md](LOADING_PERFORMANCE.md)。

首页当前使用“一类一行、左右交错”的斜线拖动视频对比窗口；悬停显示播放控件，手机轻触显示。

点击类别标题或半透明拼贴，可在首页原地展开更多结果。Return 返回本类网格，顶部唯一的 Back to overview 返回概览。旧 Gallery 地址仍可访问。整合功能回归测试：`npm run test:gallery`。

审阅模式已移除。旧 `review` 参数与浏览器偏好会自动清理；本地素材工具所需的历史编号仅保存在 `scripts/data/case-catalog.json`，不对外提供。更新维护清单可运行 `python scripts/build_case_catalog.py`。

> 基于 2026-09-10 公网发布快照，后续增加 Physical Grounding，当前包含 10 个应用分区和 75 条案例记录。同步来源、备份位置及维护限制见 [PUBLIC_SYNC.md](PUBLIC_SYNC.md)。下文提取体积与历史工具描述属于最初拆分版本。

从 ThreeJSVideo 单独提取的静态项目网站。本仓库不需要原项目、模型权重、GPU、云端任务或推理服务，即可浏览当前已发布的内容。

## 本地运行

安装 Node.js 后，在本仓库目录执行（启动本身不需要 npm install）：

```sh
npm start
```

访问 http://127.0.0.1:8795/ 。本地服务器只监听回环地址，并支持视频 Range 请求。退出时按 Ctrl+C。

## 目录与维护

- `project-page-template/index.html`：项目介绍、Demo 和十类 Application 预览。
- `project-page-template/gallery.html`：完整 Gallery、场景编辑/恢复及源码对比。
- `project-page-template/static/interactive/`：独立 Three.js 工作台、场景源码、按版本保存的 revisions 和本地依赖。
- `project-page-template/static/project-page-cases/`：视频及 `prompts.json` 发布清单。
- `project-page-template/static/images/`、`static/css/`、`static/js/`：海报、视觉样式与页面交互。
- `project-page-template/group23-pairs.html`、`seedvr-comparison.html`：附属对比页面。
- `scripts/`：本地预览服务器和无需原推理环境的页面生成脚本。
- `tests/`：浏览器冒烟测试及原首页预览回归测试。

保留 `project-page-template` 这一层目录，使已有页面生成脚本的相对路径无需修改。所有原网站文件按原样保留，包括历史版本和暂未展示的资源，避免破坏源码对比、编辑恢复及深链接。约 1.67 GB 媒体资源已包含，不是需要另行下载的占位文件。

直接修改 HTML/CSS/JS 不需要构建。以下是初次提取时的旧版生成流程，**当前公网快照不适用，脚本已加保护**；需要上游提供匹配的新版生成器后才能恢复：

```sh
python -m pip install -r requirements.txt
python -X utf8 scripts/build_main_application_previews.py
```

需在 PATH 中安装 FFmpeg。重新生成 Gallery 气泡和封面可运行 `python -X utf8 scripts/build_first_person_bubbles.py`，随后重新生成首页预览。生成操作会改写页面与封面，执行前请保存自己的修改。

## 验证

```sh
npm ci
npx playwright install chromium
npm test
```

冒烟测试自行启动并关闭测试服务器，检查首页资源、播放、Gallery、案例深链接和附属页面。截图输出到被 Git 忽略的 `test-results/`。

已有 Chrome 时也可省略 Chromium 下载，在 PowerShell 执行 `$env:BROWSER_CHANNEL='chrome'; npm test`。

新版预览回归测试需另行启动服务器，运行 `npm run test:previews`（默认访问本地 8795 端口；可用 `DEMO_URL` 指定地址）。旧版回归文件仅保留作历史记录。

## 静态托管与访问控制

静态托管的站点根目录应设为 **`project-page-template/`**，不是仓库根目录。不需要构建命令。请使用 HTTP 服务浏览，避免 `file://` 导致模块和 fetch 被阻止。

原 `project-page-template/serve.py` 仍提供 Basic Auth 预览：从环境变量读取 `PROJECT_PAGE_USERNAME` 和 `PROJECT_PAGE_PASSWORD`，执行 `python project-page-template/serve.py`。Basic Auth 应在可信环境中使用，公网需配合 HTTPS。`npm start` 不带认证，仅供本地预览。

Google Fonts 仍是外部字体依赖；离线时使用 CSS 回退字体。网页上的外部链接及论文、视频、商标素材沿用原项目，拆分不代表已获公开发布许可。本次仅创建本地仓库，不设置远程地址、不推送、不公开部署。没有替原项目指定新的开源许可证。

## 拆分范围

见 [EXTRACTION.md](EXTRACTION.md)。训练、视频重建、评分、AMLT 提交和实验产物发布脚本不属于这个独立网站仓库。未来的新视频生成与发布仍在原研究项目完成，再将审核过的媒体、清单和场景源码同步到本仓库。
