export const site = {
  title: "张文涛",
  description: "Personal website and blog.",
  // 迁移到根路径，不再使用 /mencaold 子路径
  url: "http://192.168.0.31:3000",
  author: {
    name: "张文涛",
    bio: "Mom. Grant Writer. Author.",
    avatar: "/images/headshotvintage.png",
    email: "meredithcook@proton.me",
  },
  perPage: 9,
  nav: [
    { label: "Home", href: "/" },
    { label: "Tags", href: "/tags" },
  ],
  // 原站留空，保持可配置但默认不启用
  googleAnalytics: "",
  mailchimp: "",
} as const;
