# 临时分享

本轮 Cloudflare Quick Tunnel 地址：

https://mild-header-movies-korea.trycloudflare.com/?review=0

映射目标为现有 `http://127.0.0.1:8795`，仅服务 `project-page-template` 目录。站点本身包含的交互源码和媒体可随页面访问，仓库根目录下的脚本、导入暂存目录及隧道日志不在此服务目录内。

这是公开、无登录保护的临时链接。保持电脑联网、不休眠，并保持预览服务和 cloudflared 运行；隧道退出后链接失效，重新启动通常生成新地址。本地内容修改后，访问者刷新链接可看到更新。

隧道运行记录与日志位于 `.local-tunnel/`，工具位于 `.local-tools/`，均已从 Git 忽略。关闭分享时先核对当前记录中的进程身份，再停止隧道进程；无需停止原本的本地预览服务。未设置自动启动，也未改变电脑电源设置。
