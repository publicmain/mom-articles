const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 注入到文章 HTML 中的移动端适配 CSS（最小化干预，保留美篇原始排版）
const MOBILE_INJECT_CSS = `
<style>
  /* 去掉美篇桌面端最小宽度限制 */
  html, body {
    min-width: 0 !important;
    overflow-x: hidden !important;
  }

  /* 隐藏美篇顶部导航栏 */
  .normal-tpl > :first-child {
    display: none !important;
  }

  /* 隐藏右侧浮动按钮（评论、点赞、分享）和 SingleFile 工具栏 */
  .abs-comment, .abs-praise, .abs-share,
  .bar-item-pop, .arrow, .pswp,
  [class*="sf-toolbar"], [class*="bp6-"] {
    display: none !important;
  }

  /* 返回按钮 */
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

  // 1. 移除 min-width:750PX（美篇桌面端样式，手机上会过宽）
  html = html.replace(/min-width\s*:\s*750\s*PX/gi, 'min-width: 0');

  // 2. 替换 viewport 中的 user-scalable=no，允许缩放
  html = html.replace(
    /<meta[^>]*name=["']?viewport["']?[^>]*>/gi,
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">'
  );

  // 2. 注入适配 CSS 到 </head> 前
  if (html.includes('</head>')) {
    html = html.replace('</head>', MOBILE_INJECT_CSS + '</head>');
  } else if (html.includes('</HEAD>')) {
    html = html.replace('</HEAD>', MOBILE_INJECT_CSS + '</HEAD>');
  } else {
    html = MOBILE_INJECT_CSS + html;
  }

  // 3. 注入返回按钮到 </body> 前
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
