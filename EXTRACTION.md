# 拆分记录

日期：2026-09-10

来源：同级 `ThreeJSVideo` 工作目录中的现有文件快照，非 Git HEAD 导出。

原项目主要由四部分组成：

1. `goal_pipeline` / `goal_pipeline_v2` / `goal_infer_pipeline`：视频重建与程序场景生成。
2. Application Demo、MiniMax-H3、FLUX 和 Nano Banana 相关目录：推理及首帧处理。
3. `Exp`、`experiment-results-site`、批处理和评估脚本：实验、评分与结果展示。
4. `project-page-template`：面向项目介绍的首页、Gallery 与交互式程序场景展示，本次提取对象。

提取完整 `project-page-template/`（2070 个文件，1,672,890,078 字节），保留原始相对路径及内容。

额外提取：

- `scripts/build_main_application_previews.py`
- `scripts/build_first_person_bubbles.py`
- `scripts/project_page_experiment_pairs.py`
- `tests/project_page_application_previews.cjs`

这三个 Python 脚本形成闭合的本地依赖集；除 Python 标准库外仅依赖 Pillow、FFmpeg 和网站内现有资源。没有提取依赖集群路径、原始实验目录或云端凭据的 publisher/sync 脚本。

新增：独立说明、npm 配置与锁文件、Git 忽略规则、支持视频 Range 的本地服务器、浏览器冒烟测试。

原项目工作树存在大量暂存删除和同名未跟踪文件，因此未修改其索引、未提交、未重置。新仓库不继承原 Git 历史或远程设置；原文件保持不变。

完整展示资源保留了实验溯源信息，其中 JSON/源码内可能含原机器路径等历史说明；它们不是运行时依赖，也不应被视为已完成公开发布的数据审查。大体积媒体未来可单独设计存储策略，本次没有擅自删除或切换为远程 URL。
