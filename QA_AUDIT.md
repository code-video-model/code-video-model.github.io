# 项目页交互巡检 · 2026-09-11

## 手机触屏专项（追加）

采用 Chrome 触屏模拟（isMobile、hasTouch、DPR 2），分别测试 360×800、390×844、430×932，并交换宽高检查横屏。不是单纯缩小桌面窗口，也不等同于真实 iOS Safari/WebKit 测试。

代表案例：场景编辑 583↔663、电磁感应 physical-induction、Gaming 132。覆盖点按显示控制条、播放/暂停、声音、真实触摸拖动分界线、视频区域纵向滑动页面、拖动时间轴、源码折叠、首页/详情编辑恢复、横屏重排、Return/overview、加载期间立即返回。三种尺寸均通过，未出现脚本错误或横向溢出，360 像素编辑代码片段没有裁切。

测试修正：在页面底部改用向下手势检查向上滚动，不把滚动边界误报为故障；横屏超出视口的元素截图存在浏览器截图伪影，改用实际视口截图复核，页面并未空白。本轮未修改生产页面的样式或行为。

复测：`npm run test:mobile`。详细记录 `test-results/mobile-touch-audit.json`，截图 `test-results/mobile-360-*`、`mobile-390-*`、`mobile-430-*`。

## 本次修改

- 详情返回文案改为 **← Return**，保留统一的玻璃按钮样式。
- 修复快速播放/暂停/再播放时，旧请求取消回调干扰最新播放的问题。
- 修复 Demo 下载期间进入 Gallery 后，下载完成又在后台播放的问题；取消后可重新 Watch，Demo 与首页结果播放互斥。
- 修正 R044 预览配置的旧 selection_id，不改变当前视频内容。

两个时序问题均通过浏览器故障时序模拟先复现，再复测：修复前「最新播放仍继续」与「离开 Demo 后保持暂停」均为 false，修复后均为 true。

## 覆盖范围

| 分类 | 实际打开的代表案例 |
| --- | --- |
| 3D / 4D Reconstruction | astra-train |
| Bullet Time | 518 |
| Scene / World Editing | 583 ↔ 663 |
| Trajectory Variation | 577 ↔ 578，v16 |
| Architectural Cinematics | 656 |
| Product Cinematography | 624 |
| Scientific Visualization | black-hole-background-grade |
| Physical Grounding | physical-induction |
| Robotics Simulation | 564 ↔ 563，v13 |
| Gaming | 132 |

逐类模拟分类展开、打开详情、播放/暂停、声音开关、时间跳转、源码展开和文件选择、代码标签切换、Return、Back to overview。编辑类另检查分界线键盘控制及双向编辑；Scene Editing、Physical Grounding、Gaming 另检查 3D 视角与 Reset 不改变拍摄相机。

检查页面 65 个结果入口涉及的图片资源；手机端（390×844）检查 Physical Grounding 和 Gaming 网格、打开后立即 Return、返回概览与横向溢出。

修复后十分类复查未发现脚本错误或流程阻断。此结论不等于全部 65 个案例均逐个完成深度测试，也不涵盖所有设备和网络状况。

## 保留待办

Paper / Code 目前仍没有实际链接地址，需要后续提供地址后接入。未更改其指向或增删内容。

## 可复测记录

- `node tests/exploratory-journey.cjs`
- `node tests/interaction-races.cjs`
- 逐项步骤和结果：`test-results/exploratory-audit.json`
- 页面截图：`test-results/audit-*.png`
