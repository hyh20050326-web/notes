import { defineConfig } from 'vitepress'

// 参考 VitePress 官方文档：https://vitepress.dev/reference/site-config
export default defineConfig({
  // 网站标题与元数据
  title: "我的学习知识库",
  description: "记录学习、技术探索与成长的在线数字花园",
  lang: 'zh-CN',
  
  // 部署在 GitHub Pages 时，仓库名为 notes，必须设置 base 为 '/notes/'
  base: '/notes/',

  // 浏览器标签页图标
  head: [
    ['link', { rel: 'icon', href: '/logo.svg' }]
  ],

  // Markdown 语法增强配置
  markdown: {
    lineNumbers: true, // 开启代码块行号显示
    math: true         // 开启数学公式 KaTeX 支持（例如 $E=mc^2$）
  },

  // 主题与页面布局配置
  themeConfig: {
    // 网站 Logo
    logo: '/logo.svg',
    siteTitle: '我的学习知识库',

    // 顶部导航栏
    nav: [
      { text: '首页', link: '/' },
      { 
        text: '计算机基础', 
        link: '/computer-basics/transistor-to-cpu',
        activeMatch: '/computer-basics/'
      },
      { 
        text: '编程开发', 
        link: '/programming/web-development',
        activeMatch: '/programming/'
      },
      { 
        text: '数据结构与算法', 
        link: '/algorithms/index',
        activeMatch: '/algorithms/'
      },
      { 
        text: '读书与随笔', 
        link: '/reading-notes/index',
        activeMatch: '/reading-notes/'
      }
    ],

    // 侧边栏多级导航树配置
    sidebar: {
      '/computer-basics/': [
        {
          text: '一、计算机是怎么回事',
          collapsed: false,
          items: [
            { text: '数字电路基础：从晶体管到 CPU', link: '/computer-basics/transistor-to-cpu' },
            { text: '操作系统核心原理与进程调度', link: '/computer-basics/os-principles' },
            { text: '计算机网络：从输入 URL 到页面展示', link: '/computer-basics/network-intro' }
          ]
        },
        {
          text: '二、开发环境与现代工具',
          collapsed: false,
          items: [
            { text: '现代终端工具与 Git 高效协作', link: '/computer-basics/tools-and-git' }
          ]
        }
      ],
      '/programming/': [
        {
          text: '现代 Web 开发技术',
          collapsed: false,
          items: [
            { text: '现代前端工程化指南', link: '/programming/web-development' },
            { text: 'Python 高效编程与工程实践', link: '/programming/python-tips' }
          ]
        }
      ],
      '/algorithms/': [
        {
          text: '算法思维与实战',
          collapsed: false,
          items: [
            { text: '算法与数据结构学习路线', link: '/algorithms/index' }
          ]
        }
      ],
      '/reading-notes/': [
        {
          text: '读书与知识管理',
          collapsed: false,
          items: [
            { text: '打造个人第二大脑：数字花园实践', link: '/reading-notes/index' }
          ]
        }
      ]
    },

    // 右侧大纲栏（与用户截图右侧的“页面导航”一致）
    outline: {
      level: [2, 3], // 抓取二级、三级标题
      label: '页面导航'
    },

    // 文章底部上一页 / 下一页文字定制
    docFooter: {
      prev: '上一页',
      next: '下一页'
    },

    // 在线编辑功能：直接指向 GitHub 在线编辑
    editLink: {
      pattern: 'https://github.com/hyh20050326-web/notes/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页'
    },

    // 本地快速全文搜索（无需后端，纯前端毫秒级检索）
    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档'
          },
          modal: {
            noResultsText: '未找到相关结果',
            resetButtonTitle: '清除查询条件',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭'
            }
          }
        }
      }
    },

    // 社交链接
    socialLinks: [
      { icon: 'github', link: 'https://github.com/hyh20050326-web/notes' }
    ],

    // 页面辅助信息
    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    },
    returnToTopLabel: '返回顶部',
    darkModeSwitchLabel: '深色模式切换'
  }
})
