# 公网版本对齐（2026-09-10）

对齐来源：https://shopzilla-belief-noted-entertaining.trycloudflare.com/

这次同步的是公网可取得的前端发布快照，不是上游研究仓库的 Git 历史或完整开发工具链。主页、Gallery、脚本、样式、发布清单、媒体和场景源码按远端文件原样更新；本地启动服务与独立仓库结构保留。

## 版本差异

- 首页从 8 个分区变为 9 个分区，加入 3D / 4D Reconstruction。
- 主页顺序：3D / 4D Reconstruction、Bullet Time、Scene / World Editing、First-Person Games、Robotics Simulation、Trajectory Variation、Product Cinematography、Architectural Cinematics、Scientific Visualization。
- 发布清单有 71 条案例记录。包含新增 Astra 重建、黑洞等场景。
- 机器人默认 564/563 配对使用 Group23 v13；轨迹默认 581/582 使用 Group23 v12。
- 同步新版封面、视频、展示清单、场景源码和相机数据；不是只替换首页 HTML。

## 本地保留与备份

同步计划：680 个原有文件更新、616 个新文件、897 个文件与公网快照一致。未删除旧网站额外资源；这样不会破坏未被新页面引用的历史资料。

每个被替换的网站文件的旧版本保存在：

`.local-sync/public-20260910/backup/`

下载快照和完整报告分别在 `.local-sync/public-20260910/files/` 与 `.local-sync/public-20260910/report.json`。此目录已被 Git 忽略。

依赖扫描还会遇到元数据中的原始路径、源码字符串、未使用候选路径以及远端 404。它们保留在扫描报告用于排查，不能直接等同于页面缺失；实际发布清单校验以 `scripts/verify_public_snapshot.py` 和当前页面运行验证为准。

## 后续修改与验证

直接编辑 `project-page-template/` 中的 HTML/CSS/JS，然后刷新本地页面即可。不要用旧的生成脚本覆盖这份发布快照：公网没有提供对应新版 Python 页面生成工具，旧脚本已加保护并保留原实现，取得匹配工具后再恢复生成流程。

```powershell
python -X utf8 scripts/verify_public_snapshot.py
$env:BROWSER_CHANNEL='chrome'
npm test
# 下项使用已经启动的本地 8795 服务
npm run test:previews
```

旧 `tests/project_page_application_previews.cjs` 仅作为旧版回归记录保留，不再用于 npm 的当前测试命令。

上一次生成的同级 `code-video-model-page.zip` 是旧版提取归档，本次没有覆盖它。后续开发请以当前目录为准，不要从旧 ZIP 还原。

## 本次验证结果

- 同步完成后重新读取公网 32 个核心 HTML/JS/CSS/JSON 文件，与本地 SHA-256 一致。
- 71 条发布记录、93 份场景包的 617 个关键文件存在性及适用哈希校验通过，无缺失、无哈希冲突。
- 19 个页面 JS/MJS 文件的 Node 语法检查通过；5 个 Python 脚本语法解析通过。
- `npm test` 通过：首页 9 项、静态资源、实际播放、Gallery、505 深链接和附属对比页面，无本地 HTTP/pageerror。
- 扩展预览检查：每次重载页面后分别验证 3 个编辑/恢复配对，全部通过；390px 布局无横向溢出。
- 新场景检查：442、astra-bicycle、black-hole-background-grade、564（Group23 v13 selection）均达到工作台 ready 状态，源码包 SHA 与发布项一致，无本地 HTTP/pageerror。
- 直接查看了公网与本地首页截图，以及自行车、黑洞工作台截图。截图位于 Git 忽略的 `test-results/public-version/`。
- 首轮连续快速操作多个预览时曾有编辑/恢复超时；独立页面复查通过。没有把该现象归因于同步遗漏，也没有在此次对齐中修改上游交互逻辑。未逐一运行所有 71 个场景的完整时间轴。
- 原本地 8795 预览服务保持运行，临时测试服务已关闭。未更改公网网站，未提交或推送 Git。
