const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 注入到文章 HTML 中的移动端适配代码（纯 CSS，注入到已有 head 内）
const MOBILE_INJECT_CSS = `
<style>
  /* === 覆盖美篇原始的 min-width:750PX === */
  html, body {
    min-width: 0 !important;
    max-width: 100vw !important;
    width: 100% !important;
    overflow-x: hidden !important;
    font-size: 16px !important;
  }

  /* === 隐藏美篇顶部导航栏、广告、侧边栏、底部下载提示 === */
  .normal-tpl > :first-child,
  .header-navs-qrcode,
  [class*="header-nav"],
  [class*="download"],
  [class*="app-download"],
  [class*="open-app"],
  [class*="guide-app"],
  .bar-item-iconfont,
  .bar-item-pop,
  .arrow,
  .pswp,
  .mp-reward-hand,
  [class*="sf-toolbar"],
  [class*="bp6-"] {
    display: none !important;
  }

  /* === 隐藏美篇右侧浮动按钮（评论、点赞、分享）=== */
  .abs-comment, .abs-praise, .abs-share,
  [class*="abs-comment"], [class*="abs-praise"], [class*="abs-share"] {
    display: none !important;
  }

  /* === 文章主体适配 === */
  .mp-frame, .mp-article, .normal-tpl, [class*="mp-frame"] {
    min-width: 0 !important;
    max-width: 100% !important;
    width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  /* === 所有元素不超过屏幕 === */
  *, *::before, *::after {
    max-width: 100vw !important;
    box-sizing: border-box !important;
  }

  img, video, canvas, svg, iframe {
    max-width: 100% !important;
    height: auto !important;
  }

  /* === 文字内容区域 === */
  .mp-article-texts, .mp-content, .ql-block {
    max-width: 100% !important;
    width: auto !important;
    padding-left: 16px !important;
    padding-right: 16px !important;
  }

  /* === 标题区域 === */
  .mp-article-caption-title {
    padding-left: 16px !important;
    padding-right: 16px !important;
    font-size: 22px !important;
  }

  /* === 返回按钮 === */
  .back-to-list {
    position: fixed;
    bottom: 20px;
    right: 16px;
    z-index: 99999;
    background: rgba(74,55,40,0.85);
    color: #fff !important;
    text-decoration: none;
    padding: 10px 18px;
    border-radius: 24px;
    font-size: 14px;
    font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
    box-shadow: 0 2px 12px rgba(0,0,0,0.2);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  @supports (padding: env(safe-area-inset-bottom)) {
    .back-to-list { bottom: calc(20px + env(safe-area-inset-bottom)); }
  }
</style>
`;

const BACK_BUTTON = '<a class="back-to-list" href="/">&#8592; &#x8FD4;&#x56DE;&#x5217;&#x8868;</a>';

// 获取文章列表的 API
app.get('/api/articles', (req, res) => {
  const articlesDir = path.join(__dirname, 'public', 'articles');
  try {
    const files = fs.readdirSync(articlesDir)
      .filter(f => f.endsWith('.html'))
      .map(f => {
        const stat = fs.statSync(path.join(articlesDir, f));
        return {
          name: f.replace('.html', '').replace(/_/g, ' '),
          file: f,
          date: stat.mtime.toISOString().split('T')[0],
          size: (stat.size / 1024).toFixed(0) + ' KB'
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
    res.json(files);
  } catch (e) {
    res.json([]);
  }
});

// 文章路由 - 注入移动端适配代码
app.get('/articles/:file', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'articles', req.params.file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('文章未找到');
  }

  let html = fs.readFileSync(filePath, 'utf-8');

  // 1. 替换原有的 viewport 标签（美篇自带的 user-scalable=no 会导致问题）
  html = html.replace(
    /<meta[^>]*name=["']?viewport["']?[^>]*>/gi,
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">'
  );

  // 2. 移除原始 CSS 中的 min-width:750PX（美篇的桌面端样式）
  html = html.replace(/min-width\s*:\s*750\s*PX/gi, 'min-width: 0');

  // 3. 移除 html 标签上的 font-size:50px（美篇用的 rem 基准，手机上太大）
  html = html.replace(/(<html[^>]*style=['"][^'"]*?)font-size\s*:\s*50px/gi, '$1font-size: 16px');

  // 4. 注入适配 CSS 到 </head> 前（放在最后确保优先级最高）
  if (html.includes('</head>')) {
    html = html.replace('</head>', MOBILE_INJECT_CSS + '</head>');
  } else if (html.includes('</HEAD>')) {
    html = html.replace('</HEAD>', MOBILE_INJECT_CSS + '</HEAD>');
  } else {
    html = MOBILE_INJECT_CSS + html;
  }

  // 5. 注入返回按钮到 </body> 前
  if (html.includes('</body>')) {
    html = html.replace('</body>', BACK_BUTTON + '</body>');
  } else if (html.includes('</BODY>')) {
    html = html.replace('</BODY>', BACK_BUTTON + '</BODY>');
  } else {
    html += BACK_BUTTON;
  }

  res.type('html').send(html);
});

// 静态文件服务（index.html 等）
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`服务运行在端口 ${PORT}`);
});
