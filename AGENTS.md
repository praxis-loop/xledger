# AGENTS.md（根目录）

本文件为 AI 编码代理在此仓库中工作时提供指引。

## 快速参考

```bash
# 完整部署（在 /deploy 目录执行）
docker compose up -d --build                      # 启动完整部署栈
docker compose ps                                 # 查看服务状态
docker compose down                               # 停止部署栈

# 后端（在 /backend 目录执行）
go test ./...                                    # 全量测试
go test ./internal/accounting -run TestCreate     # 单个测试
go fmt ./... && go vet ./...                      # 格式化 + 静态检查

# 前端（在 /frontend/app 目录执行）
pnpm run dev                                     # 开发服务器
pnpm run test                                    # 全量测试
pnpm run test -- src/App.test.tsx                # 单个测试
pnpm run check                                   # Lint + 测试

# 根目录 Makefile
make setup | make backend | make frontend | make migrate-up | make clean
```

## 层级说明

| 路径 | 领域 |
|------|------|
| `backend/AGENTS.md` | 后端概览、命令、约定 |
| `backend/internal/accounting/AGENTS.md` | 账本、账户、交易、转账 |
| `backend/internal/auth/AGENTS.md` | 认证、会话、OAuth |
| `backend/internal/bootstrap/AGENTS.md` | DI 装配、路由、基础设施 |
| `backend/internal/classification/AGENTS.md` | 分类、标签 |
| `backend/internal/portability/AGENTS.md` | 导入/导出、PAT |
| `backend/internal/reporting/AGENTS.md` | 统计、趋势 |
| `frontend/app/src/features/AGENTS.md` | Feature 模式、API/hooks 约定 |

## 代码风格

### TypeScript/React
- Imports：使用 `@/` 别名，按 external → internal → relative 分组
- Components：使用 PascalCase；函数使用 camelCase
- Types：对象优先使用 `interface`，联合类型使用 `type`
- Hooks：使用 `use` 前缀，并与功能代码同目录放在 `*-hooks.ts`
- Exports：优先使用命名导出，只有 page 允许默认导出

### Go
- 错误码：使用包内常量（如 `LEDGER_INVALID`）
- 错误类型：使用带 code 的 `contractError`
- Packages：按领域组织
- Testing：采用表驱动，测试文件与实现文件同目录

## 反模式

1. **不要使用 `as any` 或 `@ts-ignore`** — 应正确修复类型问题
2. **不要写空的 catch 块** — 必须显式处理错误
3. **迁移文件是追加式的** — 不要修改已有迁移
4. **`PRD.md` 是事实来源** — 改动记账逻辑前先阅读

## 关键文件

| 文件 | 用途 |
|------|------|
| `PRD.md` | 产品需求与记账规则 |
| `backend/openapi/openapi.yaml` | API 合约 |
| `frontend/app/src/lib/api.ts` | HTTP 客户端、响应类型 |
| `backend/internal/bootstrap/http/router.go` | 路由注册、DI |
| `deploy/docker-compose.yaml` | 完整部署栈入口 |
| `deploy/README.md` | 部署说明 |
| `Makefile` | 常用开发命令 |

## 环境变量

必需：`SMTP_HOST`、`AUTH_CODE_PEPPER`
可选：`DATABASE_URL`（留空则使用内存模式）、`REDIS_URL`

## 发布

按 skill `service-release` 执行，本节只写本服务的约定：

- 线上分支 `prd`，只经 PR 合入；`main` 暂时保留但不再作为发布来源。
- 批次分支 `feat/<主题>` 从最新 `prd` 拉；hotfix 从当前线上 tag 拉 `hotfix/<问题简称>`。
- tag 格式 `prd-vX.Y.Z/YYYY.MM.DD(.N)`，附注 tag，只打在 `prd` 上；版本号由人在定版时判断。
- 每个改动在同一个提交里更新 `CHANGELOG.md` 的 `[Unreleased]`；涉及环境变量、配置、数据库迁移的写进「发布清单」。
- **本服务没有 test 环境**：提测 = 本地验证（`go test ./...`、前端 `pnpm run check` 与 `pnpm run build`、本地起前后端跑关键流程），结论写进 PR 描述。
- 数据库迁移在后端连上 Postgres 启动时自动执行，迁移文件只追加不修改；每个迁移在发布清单里写明回滚方式。
- prd 只部署 tag，部署记录写 `DEPLOYMENTS.md`，提交 `docs(deploy): <tag>` 直接推 `prd`。机器、部署目录、备份位置见 `praxis-loop/servers` 的 `SERVICES.md`，不写进本仓库。

## 部署后验证

除 skill 的通用项（容器重启次数为 0、健康检查通过、日志没有新错误）外，逐项执行：

1. 对外入口 `https://xledger.xanne.cloud` 返回 200。
2. 前端容器本地端口返回 200；后端 `GET /api/auth/me` 未登录返回 401（说明后端在跑、认证中间件生效）。
3. 后端启动日志里迁移全部成功，`schema_migrations` 里有本版新增的迁移文件名。
4. 用测试账号登录，依次打开首页、交易、账户、设置，确认数据加载正常、没有报错提示。
5. 记一笔支出并删除，确认交易列表和首页总额随之变化后恢复。
