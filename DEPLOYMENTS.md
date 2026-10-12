# Deployments

每次部署一条，各节内最新在上。只写环境名；环境对应哪台机器、部署目录、
备份位置见 praxis-loop/servers 的 SERVICES.md。配置只写变量名，不写值。

## prd

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
