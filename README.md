# Code Video Model

Code Video Model 项目主页，包含 Demo、案例 Gallery、Three.js 场景与编辑对比。视频和图片素材已包含在仓库中。

## 本地预览

安装 Node.js 后运行：

```sh
npm start
```

访问 [localhost:8795](http://127.0.0.1:8795/)。

## 主要目录

- `project-page-template/`：网站页面及全部静态素材。
- `scripts/`：本地服务和素材维护工具。
- `tests/`：页面与交互测试。

静态托管时，以 `project-page-template/` 为网站根目录，无需构建。

## 发布

GitHub Pages 使用 `.github/workflows/pages.yml` 发布当前主页及 Gallery 的依赖，
不再对整个仓库运行 Jekyll。发布目录的 `index.html` 直接对应站点根地址。

```sh
python scripts/build_public_site.py --output _site
python -m unittest discover -s tests -p 'test_build_public_site.py'
```

`_site` 必须是不存在或为空的目录。打包保留可见案例、编辑变体、代码和 3D
交互依赖，不复制历史实验页、未启用模板或未选中的旧媒体。原始封面 PNG 和
封面维护清单可留在开发目录，但不随页面发布。Git 历史不会因清理当前文件而缩小。

## Demo 视频

正式主页使用 `project-page-template/static/demo/Demo_CodeVideoModel_New.mp4`：
1600×900、30 FPS、约 138 秒，保留 Microsoft 片尾。文件从提供的新版视频原样复制，未裁剪或重新编码；首页封面取第 30 帧。
