# 根目录文件迁移清单（2026-03-09）

## 保留在根目录

以下文件属于项目入口、构建配置或仓库元信息，继续保留在根目录：

1. `.editorconfig`
2. `.env.example`
3. `.gitignore`
4. `.nvmrc`
5. `README.md`
6. `components.json`
7. `index.html`
8. `package.json`
9. `package-lock.json`
10. `postcss.config.js`
11. `stylelint.config.cjs`
12. `tsconfig.json`
13. `tsconfig.node.json`
14. `vite.config.ts`

## 已迁移到 docs

以下文件属于说明性文档，不应长期停留在根目录：

1. `DESIGN_GUIDES.md`
   已迁移到：`docs/design/DESIGN_GUIDES.md`

2. `Order Inquiry Function Purpose.md`
   已迁移到：`docs/domain/ORDER_INQUIRY_FUNCTION_PURPOSE.md`

## 已迁移到 scripts 或 tests

以下文件属于一次性脚本、手工测试或实验文件：

1. `test_cylinder_logic.js`
   已迁移到：`tests/manual/test_cylinder_logic.js`

2. `test-fold.js`
   当前状态：未跟踪文件
   处理策略：暂不迁移，不纳入本次改动

## 已迁移到 data 或 docs/assets

以下文件不应长期作为根目录杂项存在：

1. `color.csv`
   已迁移到：`data/imports/color.csv`

2. `packaging-config.png`
   已迁移到：`docs/assets/packaging-config.png`

## 应移出版本库跟踪

以下内容属于运行产物或依赖缓存，不应继续被 Git 跟踪：

1. `database.sqlite`
2. `node_modules/`

## 处理顺序建议

1. 先从版本库移除运行产物跟踪。
2. 再迁移根目录文档和脚本。
3. 最后更新 README 与工程规范中的目录说明。
