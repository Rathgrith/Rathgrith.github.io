# Nostalgia 1990s 个人主页

这是当前仓库使用的深色复古 Jekyll 模板，包含学术主页、Gallery 和 Playground。爱丽丝、魔理沙、帕秋莉三个配色共用同一套布局。正文使用 W95FA，日文对话使用本地 Fusion Pixel 字体。

[English README](../README.md) · [模板复用指南](template-customization.md) · [前端结构与检查](frontend-architecture.md)

## 本地运行

使用 Ruby 2.7.8 和仓库锁定的依赖。初次准备环境可运行 `bash scripts/setup_debug_env.sh`；随后运行 `bash run_server.sh`，浏览器打开 `http://127.0.0.1:4000`。

仅生成静态站点：

```sh
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 bundle exec jekyll build
```

配置文件修改后需要重启 Jekyll。正式站点不需要 Node；浏览器回归检查使用 Node、Playwright 和 Chrome。

## 替换内容与配置

| 内容 | 位置 |
| --- | --- |
| 作者、联系方式、域名、项目路径 | `_config.yml` |
| 默认配色、标题栏文字、首页加载、数学公式、运行时间开关 | `_config.yml` 的 `classic` |
| 顶部导航、页内目录 | `_data/navigation.yml` |
| 头像、顶部角色 icon、Live2D 模型路径 | `_data/characters.yml` |
| 个人介绍、教育经历、论文等 | `_pages/about.md` |
| Gallery 分组、图片说明 | `_data/gallery_groups.yml`、`_data/gallery_captions.yml` |
| Gallery 原图目录 | `_config.yml` 的 `gallery.originals_url` |
| 主题颜色、字体、背景 | `assets/css/classic-theme.css` |
| 两套页面布局的样式与脚本加载顺序 | `_data/frontend.yml` |

用户站点使用 `baseurl: ""`；项目站点例如 `https://name.github.io/portfolio/` 使用 `url: "https://name.github.io"` 和 `baseurl: "/portfolio"`。新添本地链接或图片时使用 Liquid 的 `relative_url`。运行时动态加载的素材由 `site-assets.js` 处理项目路径。不要把原作者的个人信息、论文或 Gallery 原图地址直接作为自己的内容发布。

`classic.default_character` 可设为 `alice`、`marisa` 或 `patchouli`，访客已保存的选择优先。`home_loading`、`math`、`runtime` 可分别设为 `false`，同时移除对应界面和脚本。添加第四位角色还需要相应对话、调色板、场景与游戏数据，单改角色数据文件并不足够。

## 组件约定

主页桌面侧栏随页面滚动，Playground 默认在页内导航下方；Gallery 使用右侧停靠栏。移动端默认开启，位于底部目录之后。独立页面拥有自己的场景和固定对话桌面布局。对话选项只能在对话栏内部滚动，不能挤占模型或播放器。

电台在所有页面都等待手动播放；独立页面的弹幕战默认启用音乐与音效，两者偏好互相独立。Gallery 每次进入重新打乱各组顺序，不写回数据；缩略图统一 4:3，查看器保留原比例。站点没有访客追踪和分析脚本。

- [对话系统](companion-system.md)
- [弹幕游戏](danmaku-game.md)
- [天气历法](weather-calendar.md)
- [电台音源与歌词](../assets/music/radio/README.md)

## 验证与发布

`node tests/template-config.cjs` 会创建临时的 `/portfolio` 子路径站点，替换作者、标题、默认配色和原图地址，并检查功能开关、链接、manifest、页面切换和动态弹幕素材；不会覆盖日常预览的 `_site`。其他屏幕尺寸和交互回归见前端结构文档。

Pages 工作流部署 `main`。通过分支和 PR 审查后合并，确认工作流成功，并复查主页、Gallery、Playground 三个路由。模板布局许可证保存在 `nostalgia-template-LICENSE`；照片、音乐、模型、角色图和语音仍需遵守各自来源的使用条件。
