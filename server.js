const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 文章路由 - 直接访问 /articles/xxx.html
app.use('/articles', express.static(path.join(__dirname, 'public', 'articles')));

app.listen(PORT, () => {
  console.log(`服务运行在端口 ${PORT}`);
});
