const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 注入到文章 HTML 中的移动端适配代码
const MOBILE_INJECT = `
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
<style>
  /* 移动端适配 - 强制内容适应屏幕宽度 */
  html, body {
    max-width: 100vw !important;
    overflow-x: hidden !important;
  }
  img, video, canvas, svg, iframe {
    max-width: 100% !important;
    height: auto !important;
  }
  /* 美篇文章内容区域自适应 */
  .article-content, .content, .main-content,
  [class*="article"], [class*="content"], [class*="wrapper"],
  .rich_media_content, .rich_media_area_primary {
    max-width: 100% !important;
    width: 100% !important;
    padding-left: 12px !important;
    padding-right: 12px !important;
    box-sizing: border-box !important;
  }
  /* 处理固定宽度的元素 */
  div, section, article, main, p {
    max-width: 100% !important;
    box-sizing: border-box !important;
  }
  /* 处理设置了固定宽度的内联样式 */
  [style*="width: 10"] , [style*="width: 11"],
  [style*="width: 12"], [style*="width: 13"],
  [style*="width: 14"], [style*="width: 15"],
  [style*="width:10"], [style*="width:11"],
  [style*="width:12"], [style*="width:13"] {
    width: 100% !important;
    max-width: 100% !important;
  }
  /* 返回按钮 */
  .back-to-list {
    position: fixed;
    bottom: 20px;
    right: 16px;
    z-index: 99999;
    background: rgba(74,55,40,0.85);
    color: #fff;
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

  // 注入 viewport 和 CSS 到 <head> 中
  if (html.includes('<head>')) {
    html = html.replace('<head>', '<head>' + MOBILE_INJECT);
  } else if (html.includes('<HEAD>')) {
    html = html.replace('<HEAD>', '<HEAD>' + MOBILE_INJECT);
  } else {
    // 没有 head 标签就加到最前面
    html = MOBILE_INJECT + html;
  }

  // 注入返回按钮到 </body> 前
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
