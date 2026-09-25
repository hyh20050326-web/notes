# 我的在线学习笔记与知识库

这是一个基于 **VitePress** 现代架构搭建的个人在线学习知识库，具有与主流现代技术文档（如 Easy-Vibe、Vue 官方文档）完全一致的三栏典雅阅读排版，支持**公网免费部署**与**网页端随时在线编辑**。

---

## ✨ 核心特性

- 🎨 **经典文档排版**：左侧多级折叠目录树、中间沉浸式阅读正文、右侧大纲（TOC）滚动高亮。
- 🌓 **暗黑/深色模式**：右上角一键平滑切换明暗主题，夜间阅读更舒适。
- 🔍 **毫秒级全文搜索**：内置本地离线分词搜索引擎，无须后台数据库，键入即搜。
- 📐 **专业公式与图表**：开箱支持 LaTeX/KaTeX 数学公式渲染（例如 $E=mc^2$、$\sum_{i=1}^n x_i$）与 Mermaid 流程图/时序图。
- 💻 **优雅代码块**：支持多种编程语言高亮（Python, Verilog, C++, JS, Rust 等），自带行号与一键复制代码功能。
- ☁️ **终身免费公网托管**：通过 GitHub Actions 自动化 CI/CD 流水线，一键自动发布至 GitHub Pages。
- ✍️ **随时随地在线编辑**：脱离本地环境限制，电脑、平板、手机打开网页即可实时记录和修改。

---

## 🚀 本地开发与预览

在项目根目录打开终端（PowerShell 或 CMD）：

```bash
# 启动本地实时热重载开发服务器
npm run docs:dev
```

启动后在浏览器访问：[http://localhost:5173/](http://localhost:5173/) 即可实时预览。修改任意 Markdown 文件，浏览器将毫秒级热更新。

---

## 📝 随时随地“在线可编辑”指南

### 模式 1：阅读时一键修改（最快捷）
1. 访问您发布的在线笔记网站；
2. 滑动到任意一篇文章最底部，点击 **「在 GitHub 上编辑此页」**；
3. 浏览器将自动跳转到 GitHub 对应的 Markdown 源文件编辑界面；
4. 点击右上方铅笔图标直接修改，改完点击 **「Commit changes...」** 保存；
5. GitHub Actions 机器人会在 **1~2 分钟内自动重新编译并上线**，完全无需手动操作！

### 模式 2：网页版 VS Code 全局管理（最强大）
1. 在浏览器中打开你的 GitHub 笔记仓库主页；
2. 键盘轻按一下字母句号键 **`.`**（或将网址的 `github.com` 修改为 `github.dev`）；
3. 网页会直接秒级载入一个完整的 **Web 版 VS Code**；
4. 你可以在左侧目录树右键新建文件、修改多篇文章、批量整理目录、拖拽粘贴图片；
5. 左侧切换到「源代码管理」图标，输入保存说明后点击提交，线上站点即可同步更新。

---

## 🌐 如何将网站发布到公网（免费上线）

### 第 1 步：在 GitHub 上创建一个新仓库
1. 登录 [GitHub](https://github.com/)，点击右上角 **「New repository」**；
2. 仓库名可以起为 `notes` 或 `study-notes`（建议设为 **Public**）；
3. 不需要勾选初始化 README（本地已为您生成好完整项目）。

### 第 2 步：调整 base 路径（若仓库名为子路径）
- 打开 [docs/.vitepress/config.mts](file:///d:/QQ/web/docs/.vitepress/config.mts)；
- 如果您的仓库名称是 `notes`，且打算使用默认的 `https://<用户名>.github.io/notes/` 访问，将 `base` 设置为：
  ```ts
  base: '/notes/',
  ```
- 如果绑定了独立域名（如 `notes.yourdomain.com`），保持 `base: '/'` 即可。

### 第 3 步：推送到 GitHub
在本地项目根目录运行：
```bash
git init
git add .
git commit -m "初始化在线学习知识库"
git branch -M main
git remote add origin https://github.com/<你的GitHub用户名>/<你的仓库名>.git
git push -u origin main
```

### 第 4 步：开启 GitHub Pages 自动化发布
1. 进入 GitHub 仓库页面，点击顶部的 **Settings** $\rightarrow$ 左侧的 **Pages**；
2. 在 **Build and deployment** 下方的 **Source** 选择：
   👉 **`GitHub Actions`**；
3. 此时 GitHub 会自动运行我们在 `.github/workflows/deploy.yml` 中配置好的自动化构建流水线；
4. 等待 1~2 分钟构建完成后，页面上方就会生成您专属的公网在线访问网址！

---

## 📂 目录结构说明

```text
d:\QQ\web\
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 自动化持续集成与部署脚本
├── docs/                       # 笔记内容根目录
│   ├── .vitepress/
│   │   ├── config.mts          # 站点全局配置文件（导航栏、侧边栏、大纲、搜索）
│   │   └── theme/              # 主题配置与样式增强
│   │       ├── index.ts
│   │       └── custom.css      # 自定义阅读体验样式
│   ├── public/                 # 静态资源存放目录（图标、图片等）
│   │   └── logo.svg
│   ├── computer-basics/        # 计算机基础知识分类
│   │   ├── transistor-to-cpu.md # 数字电路：从晶体管到 CPU（1:1 还原截图样本）
│   │   ├── os-principles.md
│   │   ├── network-intro.md
│   │   └── tools-and-git.md    # 在线编辑详细技巧
│   ├── programming/            # 编程开发分类
│   ├── algorithms/             # 算法与数据结构
│   ├── reading-notes/          # 读书与随笔
│   └── index.md                # 知识库网站精美门户首页
├── package.json
└── README.md
```
