# Deployments

每次部署一条，各节内最新在上。只写环境名；环境对应哪台机器、部署目录、
备份位置见 praxis-loop/servers 的 SERVICES.md。配置只写变量名，不写值。

## prd

### 2026-10-13 10:05 · prd-v1.0.1/2026.10.13 · x-xan · 成功
- 发布清单：已核对。按清单新建 `backend/config/production.yaml`（从原线上配置原样复制，600，原文件保留）；编排从 `deploy/docker-compose.dev.yaml` 切到 `deploy/docker-compose.prd.yaml`。
- 重建：前端、后端；redis 单独 `--force-recreate` 纳入 prd 编排，沿用数据卷 `xledger_redis_data`（部署前 0 个 key，并做了卷快照）。旧的 redis 部署目录已按确认删除。
- 例外：构建时同样用 `GOLANG_IMAGE` / `NODE_IMAGE` 复用服务器已缓存的基础镜像；构建完清理了构建缓存。
- 定版问题：tag `prd-v1.0.1/2026.10.13` 由出错的定版脚本先行推送，说明为空，tag 内的 CHANGELOG 仍是 `[Unreleased]`；指向的提交 `0664ada` 与提测通过的 `7da3409` 代码一致。按规则未移动、未重打，本版 CHANGELOG 由其后的 `chore(release)` 提交补上。
- 验证：三个容器 restarts=0、healthy，均由 prd 编排管理；对外 200；后端 `/healthz` 200、未登录 `/api/auth/me` 401；后端读取 `production.yaml`、带出站代理，容器内经代理访问 Google 200；`/api/auth/google` 307 跳转到 Google；线上前端已包含新文案；后端日志无错误。
- 回滚到：`prd-v1.0.0/2026.10.12`（镜像 `xledger-xledger-{frontend,backend}:pre-v1.0.1` 改回 `latest`，部署目录切回该 tag，用 `docker-compose.dev.yaml` 以 `--no-build --no-deps` 启动）。

### 2026-10-12 20:31 · prd-v1.0.0/2026.10.12 · x-xan · 成功
- 发布清单：已核对。迁移 0009 执行前已按清单备份账户类型（4 行，备份表 `accounts_type_bak_0009`）；线上 4 个账户都是 `cash`，迁移实际改动 0 行。
- 重建：前端、后端（`up -d --build --no-deps`，redis 未动）。部署目录从接入前的本地 `main` 切到 `prd` 分支并对齐本 tag；前端不再从开发 worktree 启动。
- 例外：服务器磁盘只剩约 1.9G，构建时用环境变量 `GOLANG_IMAGE` / `NODE_IMAGE` 改用服务器已缓存的 golang 1.26、node 22 基础镜像（`go.mod` 要求 1.22，前端要求 Node ≥ 20.19，均满足），没改任何文件；构建完清理了本次产生的构建缓存。
- 过程：第一次构建在解析基础镜像时遇到镜像源 502 失败，未动到线上容器；重试成功。
- 验证：三个容器 restarts=0、healthy；对外入口 200；后端 `/healthz` 200，未登录 `/api/auth/me` 401；后端日志 `Applied migration: 0009_account_type_contract.sql`，无 error / panic；线上前端包含本版新增代码。
- 未验证：「部署后验证」第 4、5 项（登录后逐页检查、记一笔再删除）需要生产测试账号，待人工补做。
- 回滚到：保留了旧镜像 `xledger-xledger-frontend:pre-v1.0.0`、`xledger-xledger-backend:pre-v1.0.0`（接入前状态，非 tag），改回 `latest` 后 `up -d --no-build --no-deps` 即可；账户类型按发布清单从备份表写回。

### 2026-10-12 · 接入前状态（非部署记录） · x-xan · 只读核实
- 接入发布流程前的线上状态，只读核实，本次没有部署。
- 线上三个容器不来自同一个提交：
  - 后端：约 `376ada9`（2026-07-18 构建，部署记录里的上一个提交也是它）
  - 前端：`codex/xledger-mobile-navigation-layout@f9e4753`（2026-07-19 构建），该分支当时比 `main` 多 19 个提交
  - redis：来自另一套部署配置
- 三者都用 `deploy/docker-compose.dev.yaml` 启动，不是 `deploy/docker-compose.prd.yaml`。
- 没有基线 tag；第一个 prd tag 是 `prd-v1.0.0`。
- 回滚到：无可用 tag，需要时按上面的提交号重建。

## test

本服务不设 test 环境（2026-10-12 确认）。提测改为本地验证（单元测试、构建、本地起前后端跑关键流程），
结论写在 PR 描述里，不在这里记录。
