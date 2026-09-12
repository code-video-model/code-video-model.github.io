# 本地定制记录

## 720p Demo 替换（2026-09-12）

按用户提供的新文件，将当前 Demo 替换为 static/demo/CodeVideoPromoV9Refined_720p.mp4，1280×720、30 FPS、137.966667 秒、24,789,173 bytes；原样复制，SHA256 d64f4c0154b1ca178adbf6daa82434e96ecccdfdfaa117e7850e45b4aa1ed84b。新视频时长与旧版不同，以用户新文件为准。封面继续使用第 30 帧的开头文字，并同步原像素尺寸和来源校验。

旧 V9 1080p 文件移至被忽略的 .local-import/demo-backups/，从当前 Git 文件树删除；历史提交仍可恢复它，未重写 Git 历史。用户提供的两个原文件均未修改。

## 分类网址去除锚点

分类展开、案例切换和返回不再向地址附加 #分类名，返回概览时同步清理残留锚点。旧分类锚点链接仍能定位并自动整理地址；case / selection / category 查询参数保留以支持刷新和分享，非分类锚点不受影响。clean-navigation-url.cjs 覆盖首页、旧锚点、案例深链接和独立 Gallery。

## V9 Demo 视频（2026-09-12）

后续按用户要求，将预览封面改为第 30 帧（1 秒）完整显示的 “What if a video started as code?”。仅更换封面，播放仍从头开始。

将用户提供的 CodeVideoPromoV9Refined_1080p_render_x264.mp4 原样复制到 project-page-template/static/demo/，首页改用该文件。1920×1080、30 FPS、146.496 秒，H.264/AAC，70,479,379 bytes。复制前后 SHA256 均为 7cf79ea18bbcc2ac6ba52bc9e95f86ffcba90a9fd4f0c02f9c6c21f4b5050604，未重新编码。封面使用新片第 540 帧（18 秒）的车辆 proxy/output 对比，原像素尺寸 WebP。旧 project-demo.mp4 与用户原文件保留，网页不再引用旧视频。

## 首屏精简版

主标题统一为更紧凑的字距；Microsoft Logo 与团队署名合为轻量一行，Paper / Code 链接收拢在其下。Demo 标题缩短为 From Code to Video，保留 Gallery 同级字体样式。首屏内容宽度 980px，移动端保留安全留白。

Demo 封面从黑底文字改为演示本身第 600 帧（20 秒）的夕阳飞机画面，原生 1280×720 并生成 WebP；不改动视频、播放仍从开头开始。未播放时隐藏原生控制条，只保留左下 Watch；播放成功后恢复原生控制，失败时仍可重试。未新增自动视频请求，Gallery 未调整。opening-layout.cjs 检查 1440/390/320px 首屏、封面、播放与暂停。

## Demo 引导标题

后续统一为与 Gallery 完全相同的章节标题字族、字号、字重、字距与颜色；桌面 34px、手机 29px，并匹配标题到下方内容的留白。

将 Conditioning Video Generation on Code 从主标题 h1 的副标题移到 Demo 视频正上方，作为独立 h2；标题与视频相邻，桌面/手机字号和间距自适应。主标题只保留 Code Video Model，其他内容顺序不变。

## Bullet Time 首页改为摩托车

首页 highlight 从 518（狗接飞盘）改为 508（蓝色摩托车漂移定格），使用 Gallery 当前发布的 fine_particles_707 / seedvr2-2x 结果及其对应 Three.js 输入。封面继续使用原像素尺寸 WebP 和懒加载；概览拼贴同步排除摩托车、纳入原飞盘案例。Gallery 的案例与顺序均保留。

## 多片段编辑动画与当前版本代码

编辑动画改为浮动代码窗：桌面最多三块，手机保留两块主要变化。语义变化按位置、旋转、结构等分组，配合真实文件 patch；共享源码上下文独立显示为中性色，不与投影后的状态语句拼成一个虚构源码文件。新增 edit-diff-segments.mjs，无额外视频、运行时依赖或持续绘制循环。

View code 的问题来自共用场景：main.js 内仍包含原始默认状态，实际录制版本由 selection-adapter.mjs 选择；之前默认打开 main.js 且统一标注 Original source。code-presentation.mjs 现在核验 selected_variant 与真实入口的 setVariant 参数，优先展示当前入口；共用文件明确说明默认初始值会被当前入口覆盖。独立源码案例仍展示当前案例原文件，不改写任何源码。切换编辑/恢复原版时保持代码面板的展开状态，并加载目标案例内容。

验证：edited-code.mjs 覆盖全部 21 组正反向、42 个代码状态与源码证据；detail-editing.cjs 对椅子、路径、机器人、桌椅分别逐字核对编辑前/后/恢复后的代码，验证失败重试、手机与取消；semantic-edit-layout.cjs 检查全部 21 组桌面和手机布局。

## 加载性能优化

保留选帧、原始 PNG、视频分辨率和全部交互。新增原像素尺寸的 quality-92 WebP 网页副本；首屏以外的 highlight 封面和拼贴在接近视口 350px 时加载，拼贴不再先小图后大图重复下载。字体样式不阻塞首屏，服务端支持 gzip、ETag/304 和正确 WebP 类型，并保留视频 Range。

相同限速冷启动条件下，初始本地资源桌面约 32.18 MB → 0.51 MB，手机约 34.07 MB → 1.15 MB。不是与历史原版网站直接比较，也不是实际公网耗时承诺。完整方法、结果和维护命令见 LOADING_PERFORMANCE.md。以后重建原生封面或拼贴后运行 `python scripts/build_web_posters.py`。

## 移除审阅模式

移除首页/独立 Gallery 的 review-mode.js 引用、审阅脚本与样式、编号标签/工具条/复制弹窗，以及专用模式文档和旧测试。旧 review 查询参数会移除，已保存的 code-video-model-review 偏好会清除；case、selection、category 深链接保留。

编号映射迁移至不对外提供的 scripts/data/case-catalog.json，仅供素材工具、语义差异验证和历史记录使用；生成脚本改为 build_case_catalog.py。公开 static/review/registry.json 不再存在。以下历史条目中的 R 编号不再对应可开启的网页审阅功能。65 个结果入口和 21 组编辑结果均保留。

验证：review-removed.cjs 覆盖旧偏好/链接、静态资源删除、无编号标签或审阅请求、深链接及返回；all-semantic-edits.mjs 验证维护目录迁移后全部编辑组仍可验证。

## Gallery 全部编辑组的语义片段

检查发现此前仅 4/21 组匹配语义解析，其余退回文件 diff。本轮补齐全部 21 组：R013 椅子位姿，R014 餐桌创建/移除，R015 门洞模型，R016 卷帘门高度/叶片数，R017 车辆位姿，R018 双门角度，R030–R041 的不同机器人源码/版本，R042–R044 路径控制点。

semantic-edit-patterns.mjs 从实际选中的源码提取创建调用、变换、可见性、运动调用与路径数组；兼容直接改写源码及共享程序 selected_variant 两种形式。改动行附带原文件片段/行号证据。无 eval、不执行源代码、不按 R 编号填入演示参数。添加餐桌只标真实新增调用，不虚构原本不存在的 false 状态。反向恢复的增删行严格互换；标题保持方向中立。未识别的未来结构仍返回空结果并使用明确标注的原始源码片段，而不是臆造语义。

显示注明 Source-derived excerpt。窄屏允许代码折行，空间不足时先缩减可选上下文，保留所有变化行和机器人编号对应的构造说明。视频、场景源码及审阅编号未改动。

验证：all-semantic-edits.mjs（21 组双向、来源证据、相同源无差异）；semantic-edit-layout.cjs（21 组 × 桌面/360px 显示，无宽高裁切）；现有详情编辑和首页编辑回归。复测命令 npm run test:semantic-edits。

## 自主交互巡检与 Return

详情返回按钮统一改为「← Return」，Back to overview 不变；运行时、静态 Gallery 与物理分类导入模板同步更新。

模拟十个分类各一个代表案例，覆盖播放/暂停、声音、时间轴、源码文件/标签、编辑/恢复、Return/overview；另对三个场景检查 3D 视角/reset 不改变拍摄相机，并检查 65 个结果入口的图片及手机网格/加载时返回。

发现并修复：① 快速播放—暂停—播放时旧 play promise 的迟到失败会暂停最新播放，详情使用操作序号隔离过期回调，首页播放器也统一忽略过期播放回调；② Demo 下载未完成便打开 Gallery 时可能迟到自动播放，增加可取消的请求与操作序号，离开时取消并可重新 Watch，Demo 与首页视频互斥；③ R044 预览 manifest 的 selection_id 残留为 581/582 的旧版本，改为与实际页面一致的 trajectory-group23-577-578-image-group23-2-v16。

新测试：interaction-races.cjs（先验证旧版两处异常，再验证修复、重启 Demo、互斥播放）、exploratory-journey.cjs（十分类流程及手机）。详见 QA_AUDIT.md 与 test-results/exploratory-audit.json。

## 网络失败恢复与统一返回控件

详情中的 catalog、发布清单、case.json、输出视频（包括响应体读取）与按需源码/编辑差异，使用 resource-fetch.mjs 统一读取。仅网络中断、超时和短暂 HTTP 状态做至多两次额外重试；退避及请求均支持取消，404/权限/JSON 格式错误和源版本检查不靠重试绕过。最终失败包含阶段和尝试次数，通过 bf-error 附带资源路径，父页面的 Load details 按需展开具体路径，Try again 可重新载入。未声称还原用户历史那次断线的具体网络/本地文件原因；此前 bare Failed to fetch 没有记录是哪一个请求失败。

Back to results 与 Back to overview 共用 gallery-navigation.css：相同箭头、字体、内边距、圆角、玻璃背景、边框及 hover/focus/mobile 规则；只保留不同返回目标的文案。独立 Gallery 返回文案也统一。

验证：resource-fetch.cjs（中断响应体、临时状态、404、JSON、取消、超时）；network-recovery.cjs（真实浏览器连接重置注入后自动恢复、持续故障细节/手动重试、两种按钮桌面/手机计算样式一致）。

## 首帧防闪：详情准备完成后再显示

workbench.html 自带内联 loading 状态保护，主内容默认 opacity:0 + inert + aria-hidden，不依赖外部脚本/样式先到达。父页面立即显示与编辑/非编辑布局对应的玻璃占位；新 iframe 在准备完成前透明、不可交互。保留布局尺寸和媒体渲染，用于 WebGL 和取色计算，不使用 display:none 或 visibility:hidden，以免不可见媒体被浏览器延后准备。

入口等待静态壳的 load（此时尚无视频 src），并检查样式失败记录及 sheet，然后启动模块；不会因错过已缓存样式的单独 load 事件而卡住。新版结构、媒体与场景初始化完成后，同步调用 paintGlass，解除主内容保护，再发送 bf-ready。父页面不再在 iframe load 时淡入；只在 bf-ready 后移除占位并显示内容。错误保持隐藏并显示 Try again，关闭/切换移除占位和加载中的 iframe。

验证脚本 workbench-first-paint.cjs 对编辑/非编辑案例阻塞主模块或玻璃 CSS，采样首帧状态并截图，检查无旧版式可见；覆盖样式 503 后重试。详情编辑重试与集成返回另外回归。

## 编辑类详情与首页统一

所有带 data-case-b 的结果统一为单按钮状态机：动作标签 / Restore original，加载期间锁定、成功提交后才改变状态。详情标记 editing=1，仅编辑类将 Three.js 和 output 合并为带键盘/触摸支持的斜线对比窗口；非编辑类保留双栏。液态玻璃、按需源码/3D/参数、共享播放条保留。分界线位置跨编辑保留。

移除编辑过渡中的三栏 loading 占位和冗长说明，使用旧帧静态合成 + 与首页共用的语义代码分阶段动画（detail-edit-transition.js / preview-edit-diff.js）；未识别的旧版源代码使用有长度上限的真实源码片段，不编造参数。成功后淡出揭示新结果，失败保留重试入口，关闭取消计时与加载。scene-host.js 的暂停清理支持源程序尚未初始化的情况，避免快速返回时异常阻断清理。

首页及详情动作按钮使用浅色半透明玻璃、深灰绿文字，替代深蓝色块。验证：detail-editing.cjs 覆盖三类与额外非 highlight 编辑项的双向切换、拖动、手机、取消；detail-edit-retry.cjs 覆盖失败重试、提交状态、分界线保持与键盘事件隔离；首页编辑及集成状态回归通过。

## 详情液态玻璃与开篇入口

删除首页 publication-links 中的 Gallery，仅保留 Paper / Code。结果区及分类入口不变。

详情的 Three.js/Output、源码折叠栏、播放条采用通透玻璃背景、边缘高光、内外柔和阴影。`section-atmospheres.js` 暴露只读取色 API；`liquid-glass.js` 按每块面板在父页面的实际坐标采样同一渐变图（三个位置，包含背景漂移偏移），而非采用结果图片调色板或固定统一底色。iframe 内的 backdrop-filter 不能直接读取父页面背景，因此以位置取色补足跨文档色彩透射。只在布局/背景变化时更新，无逐帧 JS 动画；视频与代码不加滤镜。支持减少透明度/提高对比度偏好，详情销毁时清理父页面监听。`tests/liquid-glass.cjs` 验证不同位置的不同取色、两按钮、代码展开、播放、手机和关闭。

最新调整：Physical Grounding 首页 highlight 已由 R065 切换为电磁感应 R063，proxy/output 均使用各自原分辨率的 1 秒帧；四个 Gallery 结果与 R 编号保持不变。以下导入记录描述初始状态。

## Physical Grounding：四个用户提供的物理实验包

新增分类放在 Scientific Visualization 后、Robotics Simulation 前。首页 highlight 为三棱镜色散（R065），proxy 与 output 的海报均取原分辨率 3 秒帧。其他三项用 1 秒高清帧；展开网格复用自适应排列、详情、代码/检查器按需加载和返回逻辑。

- R063 / physical-induction：Electromagnetic Induction（源包 review candidate，视频流 113/24 秒，保留该状态与原始时长）
- R064 / physical-isochronous：Isochronous Circle
- R065 / physical-prism：Prism Dispersion
- R066 / physical-pendulum：Double Pendulum

`scripts/import_physical_grounding.py` 校验 tar 路径和交付清单 SHA，只提取所需视频、Three.js 与物理资料到忽略版本控制且不被预览服务公开的 `.local-import`。网页只纳入必要媒体、源码、数据及许可证，不导入 provider 请求、托管信息或内部任务文件。原始视频字节与源代码不变；runtime 副本仅增加现有 workbench 的捕获接口（等时圆适配 setTime；三棱镜使用其原有降采样画布）。物理模拟 Python/模型文本可从 View code 的文件选择器查看，不在网页执行。详情时间轴按输出帧率/帧数驱动，保持绝对秒同步，不补帧、拉伸或截取结果。四个原始 tar.gz 未修改。

验证：`tests/physical-grounding.cjs` 覆盖四例 live scene、输出、0/2/4 秒 seek、源码、播放/返回、旧号不重排与手机 2+2；完整资源核验扩展至 75 cases / 97 源包。

## 2026-09-11：结果优先的详情与分阶段编辑

删除 Gallery 小字。首页拼图采用低不透明度高光与轻度磨砂玻璃（不改变视频区清晰度）；展开网格改为清晰的 16:10 影像卡片，不再叠加半透明洗白。连续页面渐变和整体无缝圆角保留。

语义动画保留真实实现的上下文，依次显示原状态 850ms、删除强调 650ms、插入 950ms、应用后停留 1100ms，再揭示新视频；反向同理。减少动态效果模式不播放分阶段动画。

详情默认仅显示 Three.js、Output 与共享播放条；View code / Explore in 3D / Scene details 按需展开。源码下载与排版延后；额外 WebGL 检查器及完整逐帧相机采样延后，并每四帧让出主线程。场景与视频准备并行，移除多面板大幅缩放入场。隐藏参数不再逐帧刷新 DOM。示例 583 同机单次对照从约 12.1s 到 6.6s；仍有首次 WebGL 场景初始化开销，不承诺所有设备/场景相同收益。

播放中断 AbortError 不再销毁场景；播放/seek 的非致命异常允许重新操作。真实详情加载失败增加 Try again，保持当前 case/selection。资源核验 71 cases / 93 源包 / 624 文件无缺失和 SHA 冲突。验证：refined-workbench.cjs、detail-retry.cjs、integrated-gallery.cjs、integrated-state.cjs、preview-edit-diff.cjs。尚不能确认用户未指明按钮的全部偶发 fail 都来自此路径。

## 编辑动画：源码状态的语义投影

首页动画现展示影响画面的实际参数，而非 selector 编号：椅子位置/朝向、路线前两个不同的中间控制点、humanoid/dog 可见性。`semantic-edit-diff.mjs` 从当前所选版本绑定的源码和 selected_variant 提取数值，不执行源码，不硬编码演示参数。反向操作对调同一状态；路线明确标注为片段。标识为 Source-derived changes，预生成视频说明保留；完整代码界面的原始 diff 不变。不支持的未来源码结构安全回退到标注清楚的原始 diff，不臆造语义改动。以下早期记录中的 selector 动画已被此版本替代。

## 当前编辑交互：单按钮与方向性源码差异

首页顺序调整为：重建、Bullet Time、Scene / World Editing、Trajectory Variation、Architectural Cinematics、Product Cinematography、Scientific Visualization、Robotics Simulation、Gaming。Scene / World Editing 与 Trajectory Variation 紧邻，R 编号和结果选择不变。

所有带 `data-case-b` 及 A/B 媒体的首页预览共用一个编辑状态机（当前三类，包括 Robotics）。按钮位于 highlight 视频顶部中央：A 时显示具体编辑动作，B 时显示 Restore original。移除独立 restore 按钮和 Original/Edited 小字。旧格式控件可在初始化时自动归一化，新增类别不需要按类别名添加分支。

切换流程：暂停并冻结当前画面 → 左侧滑入真实源码 diff → 读取并准备目标视频，同时显示差异至少 2.7 秒 → 差异淡出、目标视频出现 → 按钮反向，恢复同步播放。反向操作重新计算 B→A 的真实差异，增删行互换。若只有 selector 改动，仅把真实 selector 标为增删；共享实现上下文标注 unchanged。这里切换的是预生成结果，不是现场调用生成模型。

读取、展示和提交期间按钮锁定，进度/分界线也暂时锁定。请求失败保留最后提交的版本并可重试；打开更多结果、切换页面等会取消未提交的预览操作，清除计时器和临时画面。

实现：`static/js/preview-edit-diff.js`、`static/css/preview-edit-diff.css`，复用 `source-transition.mjs` 的版本绑定源读取与 `source-diff.mjs` 的真实行差异算法。验证：`tests/preview-edit-diff.cjs`（三类双向、真实逆向行差异、按钮位置、锁定、取消与手机截图）；`tests/preview-edit-errors.cjs`（失败回退、重试、页面退出取消）。

## 当前细节：边缘填满、简化提示、平滑返回

去掉所有 Explore N results / N result groups 数量提示（含对应 aria-label 中的数量）。每类只保留顶部一个 `← Back to overview`，不再生成底部的重复按钮。详情中的 `← Back to results` 仍保留，因为它返回的是本类网格而非概览。

概览拼接体统一使用外层 rounded clip-path，内部视频以 cover 居中等比铺满，消除 960×544 等素材与 16:9 窗口之间的细黑边；仅做比例差带来的轻微裁切，不修改源视频。

返回时先将结果淡出约 160ms，再将概览淡入约 440ms，并同步收缩高度、调整滚动位置。重复操作或切换类别会取消旧返回动画；减少动态效果模式下直接切换。关闭开始时先暂停详情音频，淡出结束后释放工作台。

`tests/gallery-return-polish.cjs` 已验证数量标签为零、每类一个返回按钮、原生填充/裁切，以及返回过程实际存在透明度和高度中间帧；已查看 2× 像素密度与手机边缘截图。

## 当前视觉修正：无缝图像拼接，而非彩色卡片

分类色板只由整页 atmosphere 使用。移除 category-shell 的局部渐变、边框、阴影和内边距。highlight 对比视频与其余结果帧在一个零间隙的图像组合内紧贴，只有 application-preview 外轮廓做圆角，各视频边缘和内部图片无独立圆角/边框。

其他结果图片以无缝 2×2（数量不足时自适应）铺满侧边，subtitle 直接叠在图片中央。局部仅使用中性的暗色遮罩保证白字可读，不使用分类彩色底板。左右交错保留；小屏上下紧贴。编辑/恢复按钮保留在图片区域，审阅标签移到拼接体外下方，避免遮挡标题。

32 张当前拼接图片使用对应结果视频的原分辨率帧，映射由 `scripts/build_mosaic_posters.py` 生成到 `static/images/mosaic-posters.json`。先呈现已有轻量缩略图，在接近视口时换入原生高清帧，避免等待高清资源时出现空白块。修改展示案例后应重新运行该生成器。

实现：`static/css/seamless-gallery.css` 覆盖早期卡片方案的视觉规则；原地展开/返回逻辑保持不变。`tests/seamless-gallery.cjs` 验证零间隙、整页渐变、仅外轮廓圆角、字幕在图像内部、原生图片加载、手机布局和展开/收起。已直接查看完整桌面与手机截图。

## 当前：原地展开的整合 Gallery

- 首页代表案例：3D / 4D Reconstruction 使用 R008 / Train；Trajectory Variation 使用 R044 / 577↔578 / Image-Group23-2 v16，包括正确 A/B 视频、海报与 selection。其他选择保持不变。
- Demo 按钮改为 Watch；下方增加 Gallery / click for more results 标题。顶部 Gallery 导航滚动到该标题。
- 每类独立圆角容器，标题约 24–29px（小屏 23px），保留左右交错的对比视频。标题下方展示其他结果的半透明帧拼贴。分类色板复用原 Gallery，整页背景连续过渡。
- 点击标题或拼贴，当前容器在文档流中展开为该类网格，下面内容平滑下移；同时只展开一个类别。点击结果进入原工作台，Back to results 返回本类网格，Collapse results 收起概览，顶部和底部均有收起按钮。
- 概览隐藏时暂停视频（也暂停 Demo），收起后保留原来的时间、斜线位置和 A/B 选择，不自动发声。加载中的工作台在收起时取消并释放 iframe。
- `?category=分类ID` 恢复结果网格，首页 `?case=...&selection=...` 原地打开工作台；`gallery.html` 保持兼容。审阅模式支持首页概览、整合后的结果及 A/B 深链接，R 编号不变。
- `home-gallery.js` 只从同一份 `gallery.html` 提取网格和工作台容器，不加载整个 Gallery iframe，也不复制第二份维护数据。首页加载失败时保留原类别链接作为后备。

实现：`static/js/home-gallery.js`、`static/css/integrated-gallery.css`，并复用导出的 `initializeBubbles` 与 `balanceGallery`。当前 HTML 的类别容器不可再被旧一次性定制脚本覆盖，该脚本已加保护。

验证通过：`tests/integrated-gallery.cjs`（9 类/61 组、色板/拼贴、原地展开/下推/返回、手机布局）；`tests/integrated-state.cjs`（播放与斜线位置保留、快速切换、加载取消、R044 深链接和 A/B 源码 SHA、iframe 释放）；原斜线对比测试也通过。已直接检查桌面概览、展开结果与手机截图。没有更改或发布公网网站。

封面选帧策略已改为“原生分辨率、清晰且有代表性的画面”，不强制第 1 帧。Demo 使用第 60 帧（2 秒）的完整标题画面，替代黑屏；其他已清晰的对比封面保留。选帧保存在 `static/images/poster-selections.json`，生成器按配置抽取并校验像素，未来调整成对封面时应保持相同画面时刻。

## 原分辨率第一帧封面

首页 25 段视频（18 个默认对比视频、6 个编辑版本视频、1 个 Demo）均使用对应视频的第一个显示帧。无缩放，rgb24 无损 PNG，保留源尺寸：960×540 / 960×544、1280×720 或 1920×1088。不再放大原 480px JPEG。

所有 poster 和 data-poster-a/b 都已更新。生成与像素校验：`python -X utf8 scripts/build_native_posters.py`；浏览器校验：`node tests/native-posters.cjs`。清单保存在 `static/images/first-frames-native/manifest.json`，记录视频/图片 SHA、原生尺寸和 frame_index=0。旧封面保留但首页不再使用。修改视频选择后重新运行该脚本即可。

## 当前：单窗口斜线对比首页

首页升级为每类一行，视频与标题左右交错。保留九个已选案例、现有顺序和 Gallery 链接，不再使用下文历史的两类同排行布局。

每组两个 video 在同一个 16:9 窗口等尺寸重叠，斜向 clip-path 分界线独立控制可见区域。左右拖动可达到完整 proxy / 完整 output；不是透明度混合。保留语义 figcaption 供辅助技术读取，视觉上不显示两侧标签。

播放、音频与进度条移入视频底部浮层：桌面悬停/键盘聚焦显示，触屏轻触显示。音频只控制 output。斜线拖动与视频进度相互独立，支持方向键、Home/End；手机纵向手势仍可滚动页面。

编辑/恢复按钮保留在标题旁，审阅标签保留在文字列。Gallery 布局、编号和媒体资源没有变化。

实现：`static/css/comparison-previews.css`、`static/js/diagonal-comparison.js` 和原同步播放器 `application-previews.js`。旧 `application-previews.css` 不再被首页引用。选择视频后将本地 blob 的 preload 设置为 auto，以可靠触发 loadeddata；未点击前仍不下载视频。

标记迁移脚本 `scripts/convert_home_comparisons.py` 可重复执行，不改变媒体选择。新回归测试：`node tests/comparison-preview.cjs`。历史 `tests/project_page_application_previews.cjs` 的并排布局断言不适用于当前首页。

## 2026-09-10：第一轮内容选择与布局

首页案例：3D / 4D Reconstruction → R003（Garden）；Bullet Time → R011（518）；Architectural Cinematics → R050（656）；Gaming → R024（Jurassic Encounter）。所有视频、海报和首页 manifest 已一同更新。

桌面首页行顺序：

1. 3D / 4D Reconstruction / Bullet Time
2. Scene / World Editing / Architectural Cinematics
3. Product Cinematography / Scientific Visualization
4. Robotics Simulation / Trajectory Variation
5. Gaming（居中）

删除原 hero tagline，在同一位置显示用户提供的 `assets/logo.png`。网站内副本是 `project-page-template/assets/logo.png`；保留原图，使用 CSS 控制尺寸及白底混合。

Gallery：隐藏 R056 / case 434，不删除视频或源码；在发布清单标记 gallery_visible=false，固定审阅号 inactive。Architectural Cinematics 剩下七组，桌面排成居中 4+3。

均衡行布局按照视口容量计算最少行数，然后均分数量：桌面最多四列，6→3+3，7→4+3，10→4+3+3；平板最多三列，手机最多两列。短行居中，DOM 顺序与原有交互保持不变。页面上的 First-Person Games 改名为 Gaming，保留内部 section ID 和资源目录以兼容链接。

实现：`scripts/customize_homepage.py`（本轮明确的内容选择，不要用于后续覆盖新的选择）、`static/js/balanced-gallery.js`、`static/css/custom-layout.css`。审阅清单更新后现有编号不变，61 个 active IDs。

验证：`node tests/custom-layout.cjs` 已通过指定 R 编号、首页同排行、Logo、名称、R056 移除、4+3 居中、6 个分成 3+3 和手机无横向溢出检查；已直接查看桌面首页及 Architectural Cinematics 截图。

当前已是在公网快照基础上的本地定制版本，不再与公网逐字节一致。旧 ZIP 仍是旧版归档。
