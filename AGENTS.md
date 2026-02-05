# Repository Guidelines

## 项目概览
Breathing Circle 是一款极简风格的呼吸冥想 Web 应用（MVP），核心练习为 **4-7-8 呼吸法**。目标是“打开即用”、低干扰、动画流畅，并提供开始/暂停/继续/结束等最小控制。

## 项目结构与模块组织
当前仓库仅包含规划文档：
- `game-design-document.md`：产品需求（页面流程、交互规则、指标口径）
- `tech-stack.md`：预期技术栈

后续加入代码时，建议采用常见 Next.js（App Router）结构：
- `app/`：路由与页面（Landing/Meditation/Completion）
- `components/`：可复用 UI（如 `BreathingCircle`、`TimerControls`）
- `lib/`：纯工具与业务逻辑（计时、格式化、Zod 校验）
- `tests/`：Vitest 单元/组件测试
- `e2e/`：Playwright 端到端测试

## 构建、测试与开发命令
项目计划使用 Next.js + TypeScript + Tailwind。初始化后建议提供并使用：
- `npm run dev`：启动本地开发服务器
- `npm run build`：构建生产包
- `npm run start`：以生产模式启动服务
- `npm run test`：运行 Vitest 测试
- `npm run lint`：ESLint 检查
- `npm run format`：Prettier 格式化
- `npm run test:e2e`：运行 Playwright e2e

## 代码风格与命名约定
- **语言**：TypeScript；除非必要，避免使用 `any`。
- **格式化**：Prettier（默认 2 空格缩进；以项目配置为准）。
- **Lint**：ESLint；保持 CI / 本地检查无警告。
- **命名**：
  - React 组件：`PascalCase`，文件如 `BreathingCircle.tsx`
  - Hooks：`useX`，如 `useBreathingTimer`
  - 工具函数：`camelCase`，如 `formatDuration`

## 测试指南
- **框架**：Vitest + React Testing Library；Playwright 负责 e2e。
- **约定**：
  - 单元/组件测试：`*.test.ts` / `*.test.tsx`（就近放置或集中在 `tests/`）
  - E2E：`e2e/*.spec.ts`
- 对计时与阶段切换重点覆盖：暂停不计入时长、阶段推进、4-7-8 一个循环=19 秒。

## 提交与 PR 规范
当前未检测到 Git 历史。建议从现在开始统一：
- Commit：`feat: ...`、`fix: ...`、`docs: ...`、`chore: ...`
- PR：写清变更目的与范围；UI 改动附截图/GIF；说明可访问性影响（键盘焦点、减少动效 `prefers-reduced-motion`）。

## 安全与配置提示
- 不要提交密钥；本地使用 `.env.local`。
- 如接入统计/监控（Vercel Analytics / Sentry），在文档中说明是否可选、采集内容与开关方式。

# IMPORTANT:
# Always read memory-bank/@architecture.md before writing any code. Include entire database schema.
# Always read memory-bank/@game-design-document.md before writing any code.
# After adding a major feature or completing a milestone, update memory-bank/@architecture.md.
