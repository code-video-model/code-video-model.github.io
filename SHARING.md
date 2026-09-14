# 临时分享

本轮 Cloudflare Quick Tunnel 地址：

https://agree-arrested-viewpicture-southwest.trycloudflare.com/?review=0

映射目标为 `http://127.0.0.1:8010`，由本仓库的 `scripts/serve.cjs` 提供服务（`PORT=8010 npm start`），仅服务同一工作目录中的 `project-page-template`。站点本身包含的交互源码和媒体可随页面访问，仓库根目录下的脚本、导入暂存目录及隧道日志不在此服务目录内。

这是公开、无登录保护的临时链接。保持电脑联网、不休眠，并保持预览服务和 cloudflared 运行；隧道退出后链接失效，重新启动通常生成新地址。本地内容修改后，访问者刷新链接可看到更新。

公网预览直接读取工作目录，不维护另一份网站副本。GitHub 版本通过提交和推送同步；未配置后台自动拉取或自动推送。

隧道运行记录与日志位于 `.local-tunnel/`，已从 Git 忽略。关闭分享时先核对当前记录中的进程身份，再停止隧道进程；无需停止原本的本地预览服务。未设置自动启动，也未改变电脑电源设置。
