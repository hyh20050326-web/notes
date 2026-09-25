import { defineConfig } from 'vitepress'

// 参考 VitePress 官方文档：https://vitepress.dev/reference/site-config
export default defineConfig({
  // 网站标题与元数据
  title: "数字 IC 学习笔记",
  description: "聚焦 HDLBits 刷题、一生一芯 RISC-V 处理器与芯片设计核心八股",
  lang: 'zh-CN',
  
  // 部署在 GitHub Pages 时，仓库名为 notes，必须设置 base 为 '/notes/'
  base: '/notes/',

  // 浏览器标签页图标
  head: [
    ['link', { rel: 'icon', href: '/notes/logo.svg' }]
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
    siteTitle: '数字 IC 学习笔记',

    // 顶部导航栏
    nav: [
      { text: '首页', link: '/' },
      { 
        text: 'HDL Bits', 
        link: '/hdlbits/',
        activeMatch: '/hdlbits/'
      },
      { 
        text: '一生一芯', 
        link: '/ysyx/',
        activeMatch: '/ysyx/'
      },
      { 
        text: '基础八股', 
        link: '/ic-interview/',
        activeMatch: '/ic-interview/'
      }
    ],

    // 侧边栏多级导航树配置
    sidebar: {
      '/hdlbits/': [
        {
          text: 'HDLBits 刷题全记录',
          collapsed: false,
          items: [
            { text: '刷题总览与导读', link: '/hdlbits/' },
            { text: '01. 语言基础与入门', link: '/hdlbits/01-getting-started' },
            { text: '02. 组合逻辑电路设计', link: '/hdlbits/02-combinational-logic' },
            { text: '03. 时序逻辑电路设计', link: '/hdlbits/03-sequential-logic' },
            { text: '04. 有限状态机实战', link: '/hdlbits/04-finite-state-machines' }
          ]
        }
      ],
      '/ysyx/': [
        {
          text: '“一生一芯”学习记录',
          collapsed: false,
          items: [
            { text: '学习总览与路线', link: '/ysyx/' },
            { text: '01. 预学习阶段：环境与工具链', link: '/ysyx/01-pre-study' },
            { text: '02. PA 实验：模拟器 (NEMU)', link: '/ysyx/02-pa' },
            { text: '03. NPC 硬件设计：手搓 CPU', link: '/ysyx/03-npc' }
          ]
        }
      ],
      '/ic-interview/': [
        {
          text: '数字 IC 核心八股',
          collapsed: false,
          items: [
            { text: '八股知识体系导读', link: '/ic-interview/' },
            { text: '01. 静态时序分析 (STA)', link: '/ic-interview/01-sta-timing' },
            { text: '02. 亚稳态与跨时钟域 (CDC)', link: '/ic-interview/02-cdc-metastability' },
            { text: '03. FIFO 架构设计与握手', link: '/ic-interview/03-fifo-design' },
            { text: '04. 数字电路低功耗设计', link: '/ic-interview/04-low-power' }
          ]
        }
      ]
    },

    // 右侧大纲栏
    outline: {
      level: [2, 3],
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
            buttonText: '搜索笔记',
            buttonAriaLabel: '搜索笔记'
          },
          modal: {
            noResultsText: '未找到相关笔记',
            resetButtonTitle: '清除搜索条件',
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
    darkModeSwitchLabel: '外观模式'
  }
})
