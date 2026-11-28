export const site = {
  title: "张文涛",
  description: "个人网站与博客，记录与写作。",
  // 迁移到根路径，不再使用 /mencaold 子路径
  url: "http://192.168.0.31:3000",
  author: {
    name: "张文涛",
    bio: "记录与写作。",
    avatar: "/images/headshotvintage.png",
    email: "meredithcook@proton.me",
  },
  perPage: 9,
  nav: [
    { label: "首页", href: "/" },
    { label: "标签", href: "/tags" },
  ],
  // 原站留空，保持可配置但默认不启用
  googleAnalytics: "",
  mailchimp: "",
} as const;
