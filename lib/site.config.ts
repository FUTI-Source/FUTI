export const site = {
  title: "张文涛",
  description: "个人网站与博客，记录与写作。",
  // 迁移到根路径，不再使用 /mencaold 子路径
  url: "https://www.zhang-wentao.tech",
  perPage: 9,
  nav: [
    { label: "首页", href: "/" },
    { label: "标签", href: "/tags" },
  ],
} as const;
