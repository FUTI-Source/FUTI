import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

/**
 * ESLint 扁平配置（flat config）。
 *
 * 规则主体来自 `eslint-config-next/core-web-vitals`，它自带两组配置：
 * `next`（react / react-hooks / import / jsx-a11y / @next/next，覆盖所有
 * js/jsx/mjs/ts/tsx/mts/cts 文件）与 `next/typescript`（@typescript-eslint，
 * 只覆盖 ts/tsx 文件）。因此这里不再手工注册插件，也不再用
 * `@eslint/eslintrc` 的 FlatCompat 兼容层——`eslint-config-next/core-web-vitals`
 * 的类型是 `Linter.Config[]`（扁平数组），FlatCompat 只接受 eslintrc 形状的
 * 配置对象，按旧写法 `compat.extends('next/core-web-vitals')` 拿不到这套规则。
 *
 * 版本口径：`eslint` 锁 9.x。`eslint-config-next` 依赖的 eslint-plugin-react /
 * -import / -jsx-a11y 的 peer 上限都是 `^9`，装 10.x 每次 install 都会打
 * ERESOLVE overriding 警告。
 *
 * 运行：`npm run lint`（即 `eslint .`）。哪些文件参与检查由本文件的
 * ignores / files 决定，脚本里不再传 `--ext`。
 */
export default [
  // 忽略项必须放在最前面：被忽略的文件完全不参与解析，
  // 避免对厂商代码与构建产物报警。
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'coverage/**',
      'public/**',
      'scripts/**',
      // Live2D Cubism 官方运行时，不属于本项目可维护代码
      'src/features/avatar/live2d/**',
      // 根目录配置文件按 Node 全局书写，不参与校验
      '*.config.{js,mjs,cjs,ts}',
    ],
  },
  ...nextCoreWebVitals,
  {
    // 必须与 next/typescript 的 files 范围一致，否则这些规则会被套到
    // 没有注册 @typescript-eslint 插件的文件上，直接报 "could not find plugin"。
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // 降级为 warn：未使用参数/占位变量在 React 与 zod 推导里很常见，
      // `_` 前缀表示「故意不用」。
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // 支付回调、Live2D 交互等动态结构确实需要 any，先 warn 保证存量可跑通。
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
    rules: {
      // react-hooks v7 新增的两条 React Compiler 风格规则，按 error 会把存量代码
      // 全部判死：`useLatest`/`useEventEmitter` 的渲染期写 ref 是这类工具的既定写法，
      // `set-state-in-effect` 命中的也多是受控状态同步。先降为 warn 保留可见性，
      // 新代码按提示改写；清理完毕后把这两行删掉即可恢复默认 error。
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];
