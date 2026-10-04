# 视频生成也能代码驱动了! Code Video Model 它来了!

视频生成模型的视觉质量不断提升，但当前主流视频扩散模型仍面临两项根本局限。第一是<span class="brush-highlight">物理规律约束不足</span>：模型从像素中学习世界的视觉表象，却缺少物理方程的显式约束，画面看似合理，实际却不符合物理规律。例如，**抛出的球可能悬浮、摆动可能偏离应有周期、碰撞可能看似合理却不符合物理规律**。第二是<span class="brush-highlight">精确控制的不足</span>：文本提示或 ControlNet 等控制模块可以引导生成，但仍难以像拍电影一样，**直接调整每个演员的站位与姿态、物件的大小与颜色、场景的布局，以及运动轨迹和相机时序**。这些要求的具体实现仍主要由模型隐式决定，只能在生成后检查，镜头迭代因此往往依赖反复修改提示词、调整控制条件和重新采样。如何显式表达物理与时空约束，并在生成前检查和修改，是实现可控视频生成的重要问题。

[![微软 Code Video Model 团队及项目资源](static/promotional-article/assets/code-video-model-team.png?v=75d751dd8796b397)](static/promotional-article/assets/code-video-model-team.png?v=75d751dd8796b397)

微软团队提出 **Code Video Model**，<span class="brush-highlight">以可执行代码作为视频的控制表示</span>，使镜头设计能够在生成前被检查、修改和验证。研究通过系统实验分析视觉条件的作用机制，据此提出免训练的阶段化条件调度，将程序的结构约束与预训练模型的视觉生成能力结合起来。Code Video Model <span class="brush-highlight">视频 demo</span> 如下：

<video controls playsinline preload="none" poster="static/promotional-article/assets/demo-poster.jpg?v=dacb2619eb4cd55d" src="static/demo/Demo_CodeVideoModel_New.mp4?v=f3259741b723aa48" aria-label="Code Video Model 完整演示视频">
</video>

## 01 可执行场景表示：统一描述、预演与编辑

**Code Video Model** 借鉴<span class="brush-highlight">影视预演</span>，由 Coding Agent 将 Prompt 转化为 Three.js 程序，把几何布局、物体运动、相机轨迹和事件时序统一为可执行场景表示。代码不仅描述场景，也定义场景如何随时间演化，使不同控制要求能够在同一表示中协同编辑。程序渲染出的<span class="brush-highlight">预演视频（proxy video）</span>提供时空参考，参考图指定目标外观，视频模型据此补充几何细节、材质与光照。

[![参考图、程序预演与最终生成视频的对应关系](static/promotional-article/assets/figure-01-overview.png?v=a5205bc236486179)](static/promotional-article/assets/figure-01-overview.png?v=a5205bc236486179)

*Figure 1｜外观参考、程序预演与生成结果的对应关系。*

<p class="video-replacement-note">换成 video</p>

围绕这份程序，Coding Agent 通过<span class="brush-highlight">“编程—渲染—检查—修订”</span>迭代场景。修改直接作用于对象、参数和事件逻辑，并在更新后的预演中呈现，便于判断目标变化是否实现、其余场景设定是否保留。程序确定后，预演渲染不到一分钟，使镜头设计的验证先于最终视频生成。

Figure 2 中，修改路径点即可重新规划四足机器人的路线，同时保留其余场景设定。更新后的预演再引导视频生成相应的轨迹变化。

[![编辑路径点改变机器人路线，以及有无早期条件调度的生成结果对比](static/promotional-article/assets/figure-02-program-control.png?v=bf0aef91ef62e429)](static/promotional-article/assets/figure-02-program-control.png?v=bf0aef91ef62e429)

*Figure 2｜程序化轨迹编辑，以及有无早期条件调度的生成对照。*

<p class="video-replacement-note">换成 GIF</p>

同一表示还支持物体增删、尺度调整、场景替换和动作时序编辑。独立控制物体运动与相机的时间进程，可以实现动作冻结、相机继续环绕的“子弹时间”镜头。对于具有数学描述的物理过程，<span class="brush-highlight">程序可通过方程计算运动</span>。双摆、弹簧回弹和牛顿摆等案例，以计算得到的动态预演为视频生成提供物理引导。

[![弹簧回弹与牛顿摆的程序预演及生成结果](static/promotional-article/assets/figure-08-physics.png?v=5cfe97e6e18c7eef)](static/promotional-article/assets/figure-08-physics.png?v=5cfe97e6e18c7eef)

*Figure 3｜弹簧回弹与牛顿摆：程序化物理预演及其生成引导效果。*

<p class="video-replacement-note">换成 GIF</p>

## 02 从条件机制研究到免训练生成范式

参考驱动的视频模型（R2V）可以将程序预演（proxy video）转化为具有真实感的视频，但面临一个关键难点：<span class="brush-highlight brush-highlight-wrap">程序预演的低多边形风格约束过强，容易使生成视频也呈现低多边形外观，从而失去真实感。</span>为厘清结构约束与外观生成之间的关系，研究在保持 MiniMax-H3 参数冻结的条件下，系统考察条件组成、介入阶段、持续时长及原生通路，并结合内部特征分析，追踪结构与外观信息如何影响生成。

<div class="article-placeholder article-placeholder-alert">此处添加 proxy video、直接 R2V 两列视频结果。</div>

时间条件分析（Temporal Conditioning）表明，预演的控制效果不仅取决于是否提供条件，还取决于其参与生成的阶段。早期介入不足会削弱结构跟随，等时长的后期引导也难以弥补，而持续施加预演又会增加合成外观的保留。加噪对照则显示，抑制预演外观可能同时损伤几何与运动信息，说明单纯削弱输入难以解决结构保持与外观生成之间的矛盾。

通路对照实验表明，<span class="brush-highlight brush-highlight-wrap">Qwen-VL 编码器与 VAE 通路对条件信息的利用各有侧重</span>：前者对外观的影响更为显著，后者对运动与结构约束的贡献更突出。Figure 4 的生成对照与配套定量消融共同显示，<span class="brush-highlight brush-highlight-wrap">双通路的综合表现优于单通路</span>，支持在条件调度中保留二者的互补信息。

[![Qwen-VL-only、VAE-only 与 Dual-path 的生成效果对照](static/promotional-article/assets/figure-06-pathways.png?v=f77a23cc81dd2d6d)](static/promotional-article/assets/figure-06-pathways.png?v=f77a23cc81dd2d6d)

*Figure 4｜不同条件通路的生成对照，依次为预演、Qwen-VL-only、VAE-only 和 Dual-path。*

基于条件干预的逐步敏感性分析进一步显示，预演通过 VAE 通路产生的影响在去噪早期最强，随后逐步衰减，编码器通路的响应则更快减弱。两类通路的作用<span class="brush-highlight">均具有明显的时序差异</span>，为确定预演的介入阶段提供了依据。两类通路的条件介入均在去噪过程的前<span class="brush-highlight brush-highlight-wrap">约 20% 阶段对生成产生更大影响。</span>

[![逐步条件敏感性，以及不同预演调度下的 Query 特征和输出](static/promotional-article/assets/figure-04-conditioning-analysis.png?v=69351c12c7b37dd0)](static/promotional-article/assets/figure-04-conditioning-analysis.png?v=69351c12c7b37dd0)

*Figure 5｜条件敏感性分析，以及不同调度下的 Query 特征与生成结果对照。*

注意力模块中的 Query 特征分析（图 b）则考察了条件撤去后的影响。不同早期调度形成的表征差异，在预演不再参与生成时仍可观察到，并与输出中的结构差异相对应。这为阶段化使用预演提供了表征层面的依据：<span class="brush-highlight brush-highlight-wrap">结构引导的作用能够延续，并不完全依赖条件的持续输入</span>。此外，生成对照还显示，若预演条件撤去过晚，甚至全程保留（图中最下方的 Full 一行），生成视频的外观容易被预演视频（proxy video）的低多边形（low-poly）、简化材质的合成渲染风格主导；若撤去过早，生成结果则难以保持预演所定义的场景结构与运动轨迹。

条件交互实验进一步验证了 reference image 与 proxy video 的功能分工。研究通过交叉组合不同主体的参考图与预演、交换条件通路，并对参考图的外观属性进行干预，观察两类条件分别如何影响生成结果。实验整体呈现出清晰趋势：夜景参考会相应改变生成视频的亮度与视觉风格，说明 reference image 主要提供 appearance；而主体的空间布局、几何形态与运动关系更多随经 VAE 编码的预演条件（Proxy-VAE）变化，说明 Proxy-VAE 主要传递 structure。尽管蓝色重绘等细粒度外观编辑尚未被完整保留，主体拓扑差异也会增加生成难度，<span class="brush-highlight brush-highlight-wrap">总体结果仍支持二者的互补分工：reference image 主要控制 appearance，Proxy-VAE 主要约束 structure。</span>

[![交叉组合参考图与预演，以及交换通路和改变参考外观的实验](static/promotional-article/assets/figure-11-visual-conditions.png?v=fe41dc9bfafe62d5)](static/promotional-article/assets/figure-11-visual-conditions.png?v=fe41dc9bfafe62d5)

*Figure 6｜主体交叉组合、通路交换与外观干预下的视觉条件交互。*

基于这些实验洞察，**Code Video Model** 提出 <span class="brush-highlight brush-highlight-wrap">Training-Free 的阶段化条件调度</span>：保留完整的预演信息与原生双通路，根据去噪过程中的作用差异协调条件介入。在结构建立阶段，预演提供显式时空约束，随后撤去这一条件，由持续有效的文本、参考图与模型先验引导外观细化。方法利用<span class="brush-highlight">早期引导的持续影响</span>，同时减少合成外观在后续生成中的干扰。

[![Code Video Model 流程与阶段化条件调度](static/promotional-article/assets/figure-03-pipeline.png?v=343dbb51a3b48c6b)](static/promotional-article/assets/figure-03-pipeline.png?v=343dbb51a3b48c6b)

*Figure 7｜阶段化条件调度：早期引入预演约束，后期由文本与参考图引导外观细化。*

与扰动输入或裁减通路不同，这一范式以条件的作用时序协调结构与外观。视频模型保持冻结，无需额外训练控制模块。

<div class="article-placeholder article-placeholder-alert">此处添加消融实验（Ablation study）：proxy video、直接 R2V、Code Video Model 三列视频结果。</div>

## 03 跨场景应用：从程序约束到多样化视觉生成

我们的算法支持丰富的业务场景，包括 Anime、Bullet Time、Gaming、Scene Editing、Robotics & Trajectory Control、Architectural Cinematics、Product Cinematography、Physical Grounding 和 3D / 4D Reconstruction。这些案例覆盖动作与相机的独立时序、场景结构编辑、主体与轨迹变化，以及物理过程表达，展示同一方法在不同控制需求与视觉风格下的表现。每组左侧为 Three.js 预演，右侧为生成视频，可同步播放并拖动分界线进行对照。

<div class="application-grid">
<figure class="application-card">
<h3>Anime</h3>
<div class="comparison-frame"><div class="application-video-pair">
<figure><video controls muted playsinline preload="none" poster="static/promotional-article/assets/application-anime-threejs.jpg?v=7699af087ce92142" src="static/project-page-cases/anime/anime-hotel/threejs-b0afbeca4b711b53.mp4?v=b0afbeca4b711b53" aria-label="动画 Three.js 预演"></video></figure>
<figure><video controls muted playsinline preload="none" poster="static/promotional-article/assets/application-anime.jpg?v=18d25a94c8cc4219" src="static/project-page-cases/anime/anime-hotel/Anime_01.mp4?v=a21781b4e0aed258" aria-label="动画应用：酒店大厅角色动作"></video></figure>
</div><div class="pair-labels"><span>Three.js</span><span>Code Video Model</span></div></div>
</figure>
<figure class="application-card">
<h3>Bullet Time</h3>
<div class="comparison-frame"><div class="application-video-pair">
<figure><video controls muted playsinline preload="none" poster="static/promotional-article/assets/application-bullet-time-threejs.jpg?v=1499541ef4530938" src="static/project-page-cases/experiment-inputs/2e39cbc22a4325da26c3ce79bfa6939aafb839776d288c49802c7a5064ca76e3/threejs.mp4?v=2e39cbc22a4325da" aria-label="子弹时间 Three.js 预演"></video></figure>
<figure><video controls muted playsinline preload="none" poster="static/promotional-article/assets/application-bullet-time.jpg?v=da0c6af4413de690" src="static/project-page-cases/selected-0907-seedvr2-2x/bullet-time/Bullet_Time_02.mp4?v=d0a8579dcd22aab2" aria-label="子弹时间应用：摩托车镜头"></video></figure>
</div><div class="pair-labels"><span>Three.js</span><span>Code Video Model</span></div></div>
</figure>
<figure class="application-card">
<h3>Gaming</h3>
<div class="comparison-frame"><div class="application-video-pair">
<figure><video controls muted playsinline preload="none" poster="static/promotional-article/assets/application-gaming-threejs.jpg?v=9db26f8958acac1c" src="static/project-page-cases/threejs/first-person-games/Gaming_04.mp4?v=1c03ca919eefbf43" aria-label="第一人称游戏 Three.js 预演"></video></figure>
<figure><video controls muted playsinline preload="none" poster="static/promotional-article/assets/application-gaming.jpg?v=282d30569ba4e4be" src="static/project-page-cases/code-video-model/first-person-games/Gaming_04.mp4?v=0c5f036db8d244d7" aria-label="游戏应用：第一人称森林行进"></video></figure>
</div><div class="pair-labels"><span>Three.js</span><span>Code Video Model</span></div></div>
</figure>
<figure class="application-card">
<h3>Scene Editing</h3>
<div class="pair-variants" role="group" aria-label="Scene Editing"><button type="button" class="pair-edit-toggle" data-edit-label="Replace Arch with Doorway" aria-pressed="false">Replace Arch with Doorway</button></div>
<div class="comparison-frame"><div class="application-video-pair">
<figure><video controls muted playsinline preload="none" poster="static/promotional-article/assets/application-scene-editing-threejs.jpg?v=bdb45d82f78f8bee" src="static/project-page-cases/experiment-inputs/143a3af92bb9dfb4b4dec3f10bfe7e7b9ad960b3fcc6be40b7f01bdb386ffc26/threejs.mp4?v=143a3af92bb9dfb4" data-src-a="static/project-page-cases/experiment-inputs/143a3af92bb9dfb4b4dec3f10bfe7e7b9ad960b3fcc6be40b7f01bdb386ffc26/threejs.mp4?v=143a3af92bb9dfb4" data-src-b="static/project-page-cases/experiment-inputs/d7214e64d64fe2bf0322bb08bf850f2de840c483164f642a76091e0eb0039d15/threejs.mp4?v=d7214e64d64fe2bf" data-poster-a="static/promotional-article/assets/application-scene-editing-threejs.jpg?v=bdb45d82f78f8bee" data-poster-b="static/promotional-article/assets/application-scene-editing-after-threejs.jpg?v=3766b1b314388b47" aria-label="场景与环境编辑 Three.js 预演"></video></figure>
<figure><video controls muted playsinline preload="none" poster="static/promotional-article/assets/application-scene-editing.jpg?v=ab8c5effeae0de7c" src="static/project-page-cases/experiment-group23-image-group23-4-v15/scene-world-editing/Scene_World_Editing_03_A.mp4?v=5337cc70270fd4ff" data-src-a="static/project-page-cases/experiment-group23-image-group23-4-v15/scene-world-editing/Scene_World_Editing_03_A.mp4?v=5337cc70270fd4ff" data-src-b="static/project-page-cases/experiment-group23-image-group23-4-v15/scene-world-editing/Scene_World_Editing_03_B.mp4?v=6efcee80e93deef2" data-poster-a="static/promotional-article/assets/application-scene-editing.jpg?v=ab8c5effeae0de7c" data-poster-b="static/promotional-article/assets/application-scene-editing-after-generated.jpg?v=6c31d52fb90ddd41" aria-label="场景与环境编辑应用"></video></figure>
</div><div class="pair-labels"><span>Three.js</span><span>Code Video Model</span></div></div>
</figure>
<figure class="application-card">
<h3>Robotics & Trajectory Control</h3>
<div class="pair-variants" role="group" aria-label="Robotics & Trajectory Control"><button type="button" class="pair-edit-toggle" data-edit-label="Use Quadruped Robot" aria-pressed="false">Use Quadruped Robot</button></div>
<div class="comparison-frame"><div class="application-video-pair">
<figure><video controls muted playsinline preload="none" poster="static/promotional-article/assets/application-robotics-threejs.jpg?v=e7d91b70e7b412fc" src="static/project-page-cases/experiment-inputs/a1d128ed64f19e89a83f7c788ac3abc26b6b78f9951f4984d63d19854695d834/threejs.mp4?v=a1d128ed64f19e89" data-src-a="static/project-page-cases/experiment-inputs/a1d128ed64f19e89a83f7c788ac3abc26b6b78f9951f4984d63d19854695d834/threejs.mp4?v=a1d128ed64f19e89" data-src-b="static/project-page-cases/experiment-inputs/254888291a343e47b34f855af274a89850641ef2aeb01e65f742e73f9fbedf3a/threejs.mp4?v=254888291a343e47" data-poster-a="static/promotional-article/assets/application-robotics-threejs.jpg?v=e7d91b70e7b412fc" data-poster-b="static/promotional-article/assets/application-robotics-after-threejs.jpg?v=90ac692a6f796b48" aria-label="机器人与轨迹控制 Three.js 预演"></video></figure>
<figure><video controls muted playsinline preload="none" poster="static/promotional-article/assets/application-robotics.jpg?v=0ce3e93b9dc916f2" src="static/project-page-cases/experiment-pairs/Robotics_Trajectory_Control_03/Robotics_Trajectory_Control_03_A.mp4?v=2bdfbe4b1b132f43" data-src-a="static/project-page-cases/experiment-pairs/Robotics_Trajectory_Control_03/Robotics_Trajectory_Control_03_A.mp4?v=2bdfbe4b1b132f43" data-src-b="static/project-page-cases/experiment-pairs/Robotics_Trajectory_Control_03/Robotics_Trajectory_Control_03_B.mp4?v=b8a23ca6efc40aba" data-poster-a="static/promotional-article/assets/application-robotics.jpg?v=0ce3e93b9dc916f2" data-poster-b="static/promotional-article/assets/application-robotics-after-generated.jpg?v=0488c98ffd7c84c3" aria-label="机器人与轨迹控制应用"></video></figure>
</div><div class="pair-labels"><span>Three.js</span><span>Code Video Model</span></div></div>
</figure>
<figure class="application-card">
<h3>Architectural Cinematics</h3>
<div class="comparison-frame"><div class="application-video-pair">
<figure><video controls muted playsinline preload="none" poster="static/promotional-article/assets/application-architecture-threejs.jpg?v=8ff24a5510803f9d" src="static/project-page-cases/threejs/architectural-cinematics/Architectural_Cinematics_01.mp4?v=2a282ae58fdab6a9" aria-label="建筑运镜 Three.js 预演"></video></figure>
<figure><video controls muted playsinline preload="none" poster="static/promotional-article/assets/application-architecture.jpg?v=e6e2175c482be304" src="static/project-page-cases/selected-0907-seedvr2-2x/architectural-cinematics/Architectural_Cinematics_01.mp4?v=5bc5de70220a0c80" aria-label="建筑应用：室内空间运镜"></video></figure>
</div><div class="pair-labels"><span>Three.js</span><span>Code Video Model</span></div></div>
</figure>
<figure class="application-card">
<h3>Product Cinematography</h3>
<div class="comparison-frame"><div class="application-video-pair">
<figure><video controls muted playsinline preload="none" poster="static/promotional-article/assets/application-product-threejs.jpg?v=9efb24bacce99dfb" src="static/project-page-cases/experiment-inputs/0a61f67c5cbaffe36ab3e673bd22f2728ba9968f3cc0fad8738f02e5b13af29b/threejs.mp4?v=0a61f67c5cbaffe3" aria-label="产品运镜 Three.js 预演"></video></figure>
<figure><video controls muted playsinline preload="none" poster="static/promotional-article/assets/application-product.jpg?v=8a7b09b4ee2d76ed" src="static/project-page-cases/experiment-threejs-v2-image-group19-4-v17/product-cinematography/Product_Cinematography_01.mp4?v=730d98dd23014052" aria-label="产品运镜应用"></video></figure>
</div><div class="pair-labels"><span>Three.js</span><span>Code Video Model</span></div></div>
</figure>
<figure class="application-card">
<h3>Physical Grounding</h3>
<div class="comparison-frame"><div class="application-video-pair">
<figure><video controls muted playsinline preload="none" poster="static/promotional-article/assets/application-physics-threejs.jpg?v=9522fc743dbacbab" src="static/project-page-cases/threejs/physical-grounding/Physical_Grounding_01.mp4?v=802dcff5b06015d9" aria-label="物理过程引导 Three.js 预演"></video></figure>
<figure><video controls muted playsinline preload="none" poster="static/promotional-article/assets/application-physics.jpg?v=8add2cd8d476e36f" src="static/project-page-cases/code-video-model/physical-grounding/Physical_Grounding_01.mp4?v=21eb15899b0e6050" aria-label="物理过程引导应用"></video></figure>
</div><div class="pair-labels"><span>Three.js</span><span>Code Video Model</span></div></div>
</figure>
<figure class="application-card">
<h3>3D / 4D Reconstruction</h3>
<div class="comparison-frame"><div class="application-video-pair">
<figure><video controls muted playsinline preload="none" poster="static/promotional-article/assets/application-reconstruction-threejs.jpg?v=50ee44f1fac53ed7" src="static/project-page-cases/threejs/reconstruction-3d-4d/astra-train-c822e0aa0db4.mp4?v=c822e0aa0db4fdce" aria-label="3D 与 4D 重建 Three.js 预演"></video></figure>
<figure><video controls muted playsinline preload="none" poster="static/promotional-article/assets/application-reconstruction.jpg?v=c87d5cee2ff314f7" src="static/project-page-cases/code-video-model/reconstruction-3d-4d/3D_4D_Reconstruction_08.mp4?v=785f39faf08a3516" aria-label="3D 与 4D 重建应用"></video></figure>
</div><div class="pair-labels"><span>Three.js</span><span>Code Video Model</span></div></div>
</figure>
</div>

**Code Video Model** 以可执行程序组织镜头设计，通过时序条件调度引导视觉生成，让结构编辑与外观合成能够在同一流程中协同完成。更多可视化结果详见[项目主页](https://code-video-model.github.io/)。

<footer class="article-footer">Code Video Model @ 2026</footer>
