import DefaultTheme from 'vitepress/theme'
import './custom.css'

// 导出默认主题并应用自定义样式
export default {
  extends: DefaultTheme,
  enhanceApp({ app, router, siteData }) {
    // 可以在此处挂载全局组件或插件
  }
}
