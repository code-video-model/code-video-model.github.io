# 视频生成也能代码驱动了! Code Video Model 它来了!

视频生成模型的视觉质量不断提升，但当前主流视频扩散模型仍面临两项根本局限。第一是<span class="brush-highlight">物理规律约束不足</span>：模型从像素中学习世界的视觉表象，却缺少物理方程的显式约束，画面看似合理，实际却不符合物理规律。例如，**抛出的球可能悬浮、摆动可能偏离应有周期、碰撞可能看似合理却不符合物理规律**。第二是<span class="brush-highlight">精确控制的不足</span>：文本提示或 ControlNet 等控制模块可以引导生成，但仍难以像拍电影一样，**直接调整每个演员的站位与姿态、物件的大小与颜色、场景的布局，以及运动轨迹和相机时序**。这些要求的具体实现仍主要由模型隐式决定，只能在生成后检查，镜头迭代因此往往依赖反复修改提示词、调整控制条件和重新采样。如何显式表达物理与时空约束，并在生成前检查和修改，是实现可控视频生成的重要问题。

[![微软 Code Video Model 团队及项目资源](static/promotional-article/assets/code-video-model-team.png?v=75d751dd8796b397)](static/promotional-article/assets/code-video-model-team.png?v=75d751dd8796b397)

微软团队提出 **Code Video Model**，<span class="brush-highlight">以可执行代码作为视频的控制表示</span>，使镜头设计能够在生成前被检查、修改和验证。研究通过系统实验分析视觉条件的作用机制，据此提出免训练的阶段化条件调度，将程序的结构约束与预训练模型的视觉生成能力结合起来。Code Video Model <span class="brush-highlight">视频 demo</span> 如下：

<video controls playsinline preload="none" poster="static/promotional-article/assets/demo-poster.jpg?v=dacb2619eb4cd55d" src="static/demo/Demo_CodeVideoModel_New.mp4?v=f3259741b723aa48" aria-label="Code Video Model 完整演示视频">
</video>

## 01 可执行场景表示：统一描述、预演与编辑

**Code Video Model** 借鉴<span class="brush-highlight">影视预演</span>，由 Coding Agent 将 Prompt 转化为 Three.js 程序，把几何布局、物体运动、相机轨迹和事件时序统一为可执行场景表示。代码不仅描述场景，也定义场景如何随时间演化，使不同控制要求能够在同一表示中协同编辑。程序渲染出的<span class="brush-highlight">预演视频（proxy video）</span>提供时空参考，参考图指定目标外观，视频模型据此补充几何细节、材质与光照。

<figure class="composite-video-panel figure-one-composite" aria-label="Figure 1 三组同步视频案例">
<div class="composite-heading-row"><span></span><div class="composite-column-labels composite-column-labels-two"><span>Three.js</span><span>Code Video Model</span></div></div>
<div class="composite-row-layout"><div class="composite-row-labels composite-row-labels-three"><span>Tank Assault</span><span>Titan Attack</span><span>Double Pendulum</span></div><video aria-label="三组程序预演与生成结果同步对照" autoplay controls loop muted playsinline preload="metadata" src="static/promotional-article/composites/figure-01-grid.mp4?v=601477fb551bc5a1"></video></div>
</figure>

*Figure 1｜程序预演与生成结果的对应关系。*

围绕这份程序，Coding Agent 通过<span class="brush-highlight">“编程—渲染—检查—修订”</span>迭代场景。修改直接作用于对象、参数和事件逻辑，并在更新后的预演中呈现，便于判断目标变化是否实现、其余场景设定是否保留。程序确定后，预演渲染不到一分钟，使镜头设计的验证先于最终视频生成。

Figure 2 中，修改路径点即可重新规划四足机器人的路线，同时保留其余场景设定。更新后的预演再引导视频生成相应的轨迹变化。

<div class="figure-two-unified" aria-label="Figure 2 程序化轨迹编辑案例">
<div class="figure-two-headers"><div>Program (edited lines)</div><div>Proxy Video</div><div>Code Video Model</div></div>
<div class="figure-two-unified-body"><div class="figure-two-program-stack">
<div class="figure-two-program"><pre><code>route=[v(-.75,6.75),
  v(-.75,4.6), v(-3.2,1.2),
  v(-2.9,-0.7), v(-2.4,-2.15),
  v(-0.4,-3.25), v(1.45,-3.9),
  v(2.65,-4.58), v(2.7,-5.06)];</code></pre></div>
<div class="figure-two-program"><pre><code>route=[v(-.75,6.75),v(-.75,4.6),
  v(0.4,3.3), v(2.5,3.0),
  v(4.3,2.3), v(5.35,0.4),
  v(5.05,-2.0), v(3.95,-3.9),
  v(2.75,-4.58), v(2.7,-5.06)];</code></pre></div>
</div><video aria-label="两组程序预演与 Code Video Model 结果同步对照" autoplay controls loop muted playsinline preload="metadata" src="static/promotional-article/composites/figure-02-grid.mp4?v=10fddf429af5acef"></video></div>
</div>

*Figure 2｜程序化轨迹编辑：程序代码、预演与 Code Video Model 生成结果。*

同一表示还支持物体增删、尺度调整、场景替换和动作时序编辑。独立控制物体运动与相机的时间进程，可以实现动作冻结、相机继续环绕的“子弹时间”镜头。对于具有数学描述的物理过程，<span class="brush-highlight">程序可通过方程计算运动</span>。双摆、弹簧回弹和牛顿摆等案例，以计算得到的动态预演为视频生成提供物理引导。

<figure class="composite-video-panel figure-three-composite" aria-label="Figure 3 程序化物理预演案例">
<div class="composite-heading-row"><span></span><div class="composite-column-labels composite-column-labels-three"><span>Proxy Video</span><span>w/o Proxy</span><span>w Proxy</span></div></div>
<div class="composite-row-layout"><div class="composite-row-labels composite-row-labels-two"><span>Newton's Cradle</span><span>Spring Recoil</span></div><video aria-label="牛顿摆与弹簧回弹的六组同步结果" autoplay controls loop muted playsinline preload="metadata" src="static/promotional-article/composites/figure-03-grid.mp4?v=11c2dc9d098c1f5f"></video></div>
</figure>

*Figure 3｜牛顿摆与弹簧回弹：程序预演及有无预演引导的生成结果。*

## 02 从条件机制研究到免训练生成范式

参考驱动的视频模型（R2V）可以将程序预演（proxy video）转化为具有真实感的视频，但面临一个关键难点：<span class="brush-highlight brush-highlight-wrap">程序预演的低多边形风格约束过强，容易使生成视频也呈现低多边形外观，从而失去真实感。</span>为厘清结构约束与外观生成之间的关系，研究在保持 MiniMax-H3 参数冻结的条件下，系统考察条件组成、介入阶段、持续时长及原生通路，并结合内部特征分析，追踪结构与外观信息如何影响生成。

<div class="ablation-video-panel" aria-label="Figure 4 Proxy Video 与 Direct R2V 对照">
<div class="ablation-composite-labels ablation-composite-labels-two"><span>Proxy Video</span><span>Direct R2V</span></div>
<div class="ablation-media-composite ablation-media-composite-two"><video aria-label="Proxy Video 与 Direct R2V 合成结果" muted playsinline preload="metadata" src="static/promotional-article/r2v-ablation/row2-comparison.mp4?v=16b8d55673616da4"></video></div>
<div class="ablation-controls"><button aria-label="播放消融对照视频" class="ablation-play" type="button">▶</button><input aria-label="消融对照视频进度" class="ablation-seek" disabled max="1000" min="0" type="range" value="0"></div><p class="ablation-status" role="status"></p>
</div>

*Figure 4｜Proxy Video 与 Direct R2V 的生成结果对照。*

时间条件分析（Temporal Conditioning）表明，预演的控制效果不仅取决于是否提供条件，还取决于其参与生成的阶段。早期介入不足会削弱结构跟随，等时长的后期引导也难以弥补，而持续施加预演又会增加合成外观的保留。加噪对照则显示，抑制预演外观可能同时损伤几何与运动信息，说明单纯削弱输入难以解决结构保持与外观生成之间的矛盾。

通路对照实验表明，<span class="brush-highlight brush-highlight-wrap">Qwen-VL 编码器与 VAE 通路对条件信息的利用各有侧重</span>：前者对外观的影响更为显著，后者对运动与结构约束的贡献更突出。Figure 5 的生成对照与配套定量消融共同显示，<span class="brush-highlight brush-highlight-wrap">双通路的综合表现优于单通路</span>，支持在条件调度中保留二者的互补信息。

[![Qwen-VL-only、VAE-only 与 Dual-path 的生成效果对照](static/promotional-article/assets/figure-06-pathways.png?v=f77a23cc81dd2d6d)](static/promotional-article/assets/figure-06-pathways.png?v=f77a23cc81dd2d6d)

*Figure 5｜不同条件通路的生成对照，依次为预演、Qwen-VL-only、VAE-only 和 Dual-path。*

基于条件干预的逐步敏感性分析进一步显示，预演通过 VAE 通路产生的影响在去噪早期最强，随后逐步衰减，编码器通路的响应则更快减弱。两类通路的作用<span class="brush-highlight">均具有明显的时序差异</span>，为确定预演的介入阶段提供了依据。两类通路的条件介入均在去噪过程的前<span class="brush-highlight brush-highlight-wrap">约 25% 阶段对生成产生更大影响。</span>

[![逐步条件敏感性，以及不同预演调度下的 Query 特征和输出](static/promotional-article/assets/figure-04-conditioning-analysis.png?v=69351c12c7b37dd0)](static/promotional-article/assets/figure-04-conditioning-analysis.png?v=69351c12c7b37dd0)

*Figure 6｜条件敏感性分析，以及不同调度下的 Query 特征与生成结果对照。*

注意力模块中的 Query 特征分析（图 b）则考察了条件撤去后的影响。不同早期调度形成的表征差异，在预演不再参与生成时仍可观察到，并与输出中的结构差异相对应。这为阶段化使用预演提供了表征层面的依据：<span class="brush-highlight brush-highlight-wrap">结构引导的作用能够延续，并不完全依赖条件的持续输入</span>。此外，生成对照还显示，若预演条件撤去过晚，甚至全程保留（图中最下方的 Full 一行），生成视频的外观容易被预演视频（proxy video）的低多边形（low-poly）、简化材质的合成渲染风格主导；若撤去过早，生成结果则难以保持预演所定义的场景结构与运动轨迹。

条件交互实验进一步验证了 reference image 与 proxy video 在不同通路中的功能分工。研究交换两份 proxy 在 Qwen-VL 与 VAE 通路中的输入，并分别搭配日间、蓝色与夜间的 reference image，观察外观和结构随哪一类条件变化。结果显示，生成视频的亮度与整体视觉风格主要随 reference image 变化；场景布局、视角和几何结构则主要跟随经 VAE 编码的预演条件（Proxy-VAE）。<span class="brush-highlight brush-highlight-wrap">这些结果揭示了两类条件清晰而互补的分工：reference image 负责塑造生成结果的 appearance，Proxy-VAE 负责保持预演所定义的 structure。</span>

<span class="visual-conditions-crop"><img alt="交换 Proxy 通路并改变参考外观的实验" src="static/promotional-article/assets/figure-11-visual-conditions.png?v=fe41dc9bfafe62d5"/></span>

*Figure 7｜Proxy 通路交换与参考外观干预下的视觉条件分工。*

基于这些实验洞察，**Code Video Model** 提出 <span class="brush-highlight brush-highlight-wrap">Training-Free 的阶段化条件调度</span>：保留完整的预演信息与原生双通路，根据去噪过程中的作用差异协调条件介入。在结构建立阶段，预演提供显式时空约束，随后撤去这一条件，由持续有效的文本、参考图与模型先验引导外观细化。方法利用<span class="brush-highlight">早期引导的持续影响</span>，同时减少合成外观在后续生成中的干扰。

[![Code Video Model 流程与阶段化条件调度](static/promotional-article/assets/figure-03-pipeline.png?v=343dbb51a3b48c6b)](static/promotional-article/assets/figure-03-pipeline.png?v=343dbb51a3b48c6b)

*Figure 8｜阶段化条件调度：早期引入预演约束，后期由文本与参考图引导外观细化。*

与扰动输入或裁减通路不同，这一范式以条件的作用时序协调结构与外观。视频模型保持冻结，无需额外训练控制模块。

<div class="ablation-video-panel" aria-label="Figure 9 Proxy Video、Direct R2V 与 Code Video Model 消融对照">
<div class="ablation-composite-labels ablation-composite-labels-three"><span>Proxy Video</span><span>Direct R2V</span><span>Code Video Model</span></div>
<div class="ablation-media-composite ablation-media-composite-three"><video aria-label="Proxy Video、Direct R2V 与 Code Video Model 合成结果" muted playsinline preload="metadata" src="static/promotional-article/r2v-ablation/row1-comparison.mp4?v=fe4682bf65990b82"></video></div>
<div class="ablation-controls"><button aria-label="播放消融对照视频" class="ablation-play" type="button">▶</button><input aria-label="消融对照视频进度" class="ablation-seek" disabled max="1000" min="0" type="range" value="0"></div><p class="ablation-status" role="status"></p>
</div>

*Figure 9｜Proxy Video、Direct R2V 与 Code Video Model 的生成结果对照。*

## 03 跨场景应用：从程序约束到多样化视觉生成

我们的算法支持丰富的业务场景，包括 Anime、Bullet Time、Gaming、Scene Editing、Robotics & Trajectory Control、Architectural Cinematics、Product Cinematography、Physical Grounding 和 3D / 4D Reconstruction。这些案例覆盖动作与相机的独立时序、场景结构编辑、主体与轨迹变化，以及物理过程表达，展示同一方法在不同控制需求与视觉风格下的表现。常规应用逐行展示 Three.js 预演与 Code Video Model 生成结果；Scene Editing 和 Robotics & Trajectory Control 则同时展示编辑前后的预演与生成结果。

<div class="application-composite-grid">
<figure class="composite-video-panel application-composite application-overview-composite" aria-label="七类应用的同步对照">
<div class="composite-heading-row"><span></span><div class="composite-column-labels composite-column-labels-two"><span>Three.js</span><span>Code Video Model</span></div></div>
<div class="composite-row-layout"><div class="composite-row-labels composite-row-labels-seven"><span>Anime</span><span>Bullet Time</span><span>Gaming</span><span>Architectural<br>Cinematics</span><span>Product<br>Cinematography</span><span>Physical<br>Grounding</span><span>3D / 4D<br>Reconstruction</span></div><video aria-label="七类应用的程序预演与生成结果逐行同步对照视频" autoplay controls loop muted playsinline preload="metadata" src="static/promotional-article/composites/applications-overview.mp4?v=6dce9e4734c390c8"></video></div>
</figure>

*Figure 10｜多场景应用中的程序预演与 Code Video Model 生成结果对照。*

<figure class="composite-video-panel application-composite application-composite-edits" aria-label="Scene Editing 与 Robotics 同步对照">
<div class="composite-heading-row"><span></span><div class="composite-column-labels composite-column-labels-four"><span>Original Three.js</span><span>Original Result</span><span>Edited Three.js</span><span>Edited Result</span></div></div>
<div class="composite-row-layout"><div class="composite-row-labels composite-row-labels-two"><span>Scene Editing</span><span>Robotics &amp;<br>Trajectory Control</span></div><video aria-label="场景编辑与机器人轨迹控制的原始及编辑结果同步对照视频" autoplay controls loop muted playsinline preload="metadata" src="static/promotional-article/composites/applications-edits.mp4?v=baeb15ca5b83ea62"></video></div>
</figure>

*Figure 11｜Scene Editing 与 Robotics &amp; Trajectory Control 的原始及编辑结果对照。*
</div>

**Code Video Model** 以可执行程序组织镜头设计，通过时序条件调度引导视觉生成，让结构编辑与外观合成能够在同一流程中协同完成。更多可视化结果详见[项目主页](https://code-video-model.github.io/)。

<footer class="article-footer">Code Video Model © 2026</footer>
