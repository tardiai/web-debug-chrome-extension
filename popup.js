// 提取按钮点击事件
document.getElementById('extractBtn').addEventListener('click', async () => {
  const extractBtn = document.getElementById('extractBtn');
  const loading = document.getElementById('loading');
  const status = document.getElementById('status');
  const stats = document.getElementById('stats');
  const viewBtn = document.getElementById('viewBtn');

  // 显示加载状态
  extractBtn.style.display = 'none';
  loading.style.display = 'block';
  status.style.display = 'none';
  stats.style.display = 'none';
  viewBtn.style.display = 'none';

  try {
    // 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 检查是否为受限页面
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
      throw new Error('此页面不支持提取信息（Chrome内部页面）');
    }

    // 检查是否为Chrome应用商店
    if (tab.url.includes('chrome.google.com/webstore')) {
      throw new Error('Chrome应用商店不支持提取信息');
    }

    // 检查是否为本地文件
    if (tab.url.startsWith('file://')) {
      throw new Error('本地文件不支持提取信息（需要在扩展设置中启用"允许访问文件网址"）');
    }

    // 注入并执行提取脚本
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractPageInfo
    });

    const report = results[0].result;

    // 生成Markdown
    const markdown = generateMarkdown(report);

    // 复制到剪贴板
    await navigator.clipboard.writeText(markdown);

    // 保存报告到本地存储
    chrome.storage.local.set({ 
      lastReport: markdown,
      lastStats: report 
    });

    // 显示成功状态
    loading.style.display = 'none';
    extractBtn.style.display = 'block';
    status.style.display = 'block';
    status.className = 'success';
    status.innerHTML = '✅ 信息已复制到剪贴板！<br><small>现在可以粘贴给AI了</small>';

    // 显示统计数据
    stats.style.display = 'grid';
    document.getElementById('elementCount').textContent = report.html.totalElements;
    document.getElementById('styleCount').textContent = report.css.stylesheets;
    document.getElementById('scriptCount').textContent = report.javascript.scripts;
    document.getElementById('issueCount').textContent = 
      report.accessibility.missingAlt + report.accessibility.emptyLinks;

    // 显示查看按钮
    viewBtn.style.display = 'block';

  } catch (error) {
    loading.style.display = 'none';
    extractBtn.style.display = 'block';
    status.style.display = 'block';
    status.className = 'error';
    
    // 友好的错误提示
    let errorMessage = '❌ 提取失败：';
    if (error.message.includes('不支持提取信息')) {
      errorMessage += error.message + '<br><br>💡 <strong>请在普通网页上使用</strong><br>如：baidu.com、github.com';
    } else {
      errorMessage += error.message;
    }
    
    status.innerHTML = errorMessage;
  }
});

// 查看完整报告
document.getElementById('viewBtn').addEventListener('click', () => {
  chrome.storage.local.get(['lastReport'], (result) => {
    if (result.lastReport) {
      // 在新标签页显示报告
      chrome.tabs.create({
        url: chrome.runtime.getURL('report.html')
      });
    }
  });
});

// 提取页面信息的函数（注入到目标页面执行）
function extractPageInfo() {
  const report = {
    timestamp: new Date().toLocaleString('zh-CN'),
    page: {
      title: document.title,
      url: window.location.href,
      viewport: window.innerWidth + 'x' + window.innerHeight,
      scrollPosition: `X: ${window.scrollX}, Y: ${window.scrollY}`
    },
    html: {
      totalElements: document.querySelectorAll('*').length,
      forms: document.forms.length,
      buttons: document.querySelectorAll('button').length,
      inputs: document.querySelectorAll('input').length,
      images: document.images.length,
      links: document.links.length,
      semanticElements: {
        headers: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
        sections: document.querySelectorAll('section').length,
        articles: document.querySelectorAll('article').length,
        navs: document.querySelectorAll('nav').length
      }
    },
    css: {
      stylesheets: document.styleSheets.length,
      inlineStyles: document.querySelectorAll('[style]').length,
      bodyStyles: {
        color: getComputedStyle(document.body).color,
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        fontSize: getComputedStyle(document.body).fontSize,
        fontFamily: getComputedStyle(document.body).fontFamily
      }
    },
    javascript: {
      scripts: document.scripts.length,
      hasJQuery: typeof jQuery !== 'undefined',
      hasReact: typeof React !== 'undefined',
      hasVue: typeof Vue !== 'undefined',
      hasAngular: typeof angular !== 'undefined'
    },
    accessibility: {
      missingAlt: document.querySelectorAll('img:not([alt])').length,
      emptyLinks: document.querySelectorAll('a:not([href]), a[href=""]').length,
      missingLabels: document.querySelectorAll('input:not([type="submit"]):not([type="button"]):not([aria-label])').length
    },
    // ============ 新增：SEO检查 ============
    seo: {
      meta: {
        description: document.querySelector('meta[name="description"]')?.content || '未设置',
        keywords: document.querySelector('meta[name="keywords"]')?.content || '未设置',
        author: document.querySelector('meta[name="author"]')?.content || '未设置',
        viewport: document.querySelector('meta[name="viewport"]')?.content || '未设置',
        robots: document.querySelector('meta[name="robots"]')?.content || '默认'
      },
      og: {
        title: document.querySelector('meta[property="og:title"]')?.content || '未设置',
        description: document.querySelector('meta[property="og:description"]')?.content || '未设置',
        image: document.querySelector('meta[property="og:image"]')?.content || '未设置',
        url: document.querySelector('meta[property="og:url"]')?.content || '未设置',
        type: document.querySelector('meta[property="og:type"]')?.content || '未设置'
      },
      twitter: {
        card: document.querySelector('meta[name="twitter:card"]')?.content || '未设置',
        title: document.querySelector('meta[name="twitter:title"]')?.content || '未设置',
        description: document.querySelector('meta[name="twitter:description"]')?.content || '未设置',
        image: document.querySelector('meta[name="twitter:image"]')?.content || '未设置'
      },
      structure: {
        h1Count: document.querySelectorAll('h1').length,
        h1Text: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim().substring(0, 50)).join(' | ') || '无',
        canonical: document.querySelector('link[rel="canonical"]')?.href || '未设置',
        favicon: document.querySelector('link[rel="icon"]')?.href || 
                 document.querySelector('link[rel="shortcut icon"]')?.href || '未设置',
        language: document.documentElement.lang || '未设置'
      },
      performance: {
        titleLength: document.title.length,
        metaDescLength: (document.querySelector('meta[name="description"]')?.content || '').length,
        hasSchemaOrg: document.querySelectorAll('script[type="application/ld+json"]').length > 0,
        schemaCount: document.querySelectorAll('script[type="application/ld+json"]').length
      }
    },
    // ======================================
    performance: (() => {
      if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        return {
          pageLoadTime: timing.loadEventEnd - timing.navigationStart,
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          domInteractive: timing.domInteractive - timing.navigationStart
        };
      }
      return null;
    })()
  };

  return report;
}

// 生成Markdown报告
function generateMarkdown(report) {
  return `# 网页调试信息报告

**生成时间**: ${report.timestamp}  
**页面URL**: ${report.page.url}

---

## 📄 页面信息

| 属性 | 值 |
|------|-----|
| 页面标题 | ${report.page.title} |
| 视口尺寸 | ${report.page.viewport} |
| 滚动位置 | ${report.page.scrollPosition} |

---

## 🏗️ HTML结构

- **总元素数**: ${report.html.totalElements}
- **表单**: ${report.html.forms} 个
- **按钮**: ${report.html.buttons} 个
- **输入框**: ${report.html.inputs} 个
- **图片**: ${report.html.images} 个
- **链接**: ${report.html.links} 个

### 语义化元素
- 标题(h1-h6): ${report.html.semanticElements.headers}
- Section: ${report.html.semanticElements.sections}
- Article: ${report.html.semanticElements.articles}
- Nav: ${report.html.semanticElements.navs}

---

## 🎨 CSS样式

- **样式表数量**: ${report.css.stylesheets}
- **内联样式元素**: ${report.css.inlineStyles}

### Body计算样式
\`\`\`css
color: ${report.css.bodyStyles.color};
background-color: ${report.css.bodyStyles.backgroundColor};
font-size: ${report.css.bodyStyles.fontSize};
font-family: ${report.css.bodyStyles.fontFamily};
\`\`\`

---

## ⚡ JavaScript

- **脚本数量**: ${report.javascript.scripts}
- **检测到的库**:
  - jQuery: ${report.javascript.hasJQuery ? '✅' : '❌'}
  - React: ${report.javascript.hasReact ? '✅' : '❌'}
  - Vue: ${report.javascript.hasVue ? '✅' : '❌'}
  - Angular: ${report.javascript.hasAngular ? '✅' : '❌'}

---

## ♿ 可访问性检查

⚠️ **需要注意的问题**:
- 缺少alt属性的图片: **${report.accessibility.missingAlt}** 个
- 空链接: **${report.accessibility.emptyLinks}** 个
- 可能缺少标签的输入框: **${report.accessibility.missingLabels}** 个

---

## 🔍 SEO检查

### 基础Meta标签
| 标签 | 内容 | 状态 |
|------|------|------|
| Description | ${report.seo.meta.description.substring(0, 50)}... | ${report.seo.meta.description === '未设置' ? '❌' : '✅'} |
| Keywords | ${report.seo.meta.keywords.substring(0, 50)}... | ${report.seo.meta.keywords === '未设置' ? '⚠️' : '✅'} |
| Viewport | ${report.seo.meta.viewport} | ${report.seo.meta.viewport === '未设置' ? '❌' : '✅'} |
| Robots | ${report.seo.meta.robots} | ✅ |

### Open Graph (社交分享)
| 属性 | 内容 | 状态 |
|------|------|------|
| og:title | ${report.seo.og.title.substring(0, 40)}... | ${report.seo.og.title === '未设置' ? '❌' : '✅'} |
| og:description | ${report.seo.og.description.substring(0, 40)}... | ${report.seo.og.description === '未设置' ? '❌' : '✅'} |
| og:image | ${report.seo.og.image === '未设置' ? '未设置' : '已设置'} | ${report.seo.og.image === '未设置' ? '❌' : '✅'} |
| og:url | ${report.seo.og.url === '未设置' ? '未设置' : '已设置'} | ${report.seo.og.url === '未设置' ? '⚠️' : '✅'} |

### Twitter Card
| 属性 | 内容 | 状态 |
|------|------|------|
| twitter:card | ${report.seo.twitter.card} | ${report.seo.twitter.card === '未设置' ? '❌' : '✅'} |
| twitter:title | ${report.seo.twitter.title.substring(0, 40)}... | ${report.seo.twitter.title === '未设置' ? '❌' : '✅'} |
| twitter:image | ${report.seo.twitter.image === '未设置' ? '未设置' : '已设置'} | ${report.seo.twitter.image === '未设置' ? '❌' : '✅'} |

### 页面结构
- **H1标签数量**: ${report.seo.structure.h1Count} ${report.seo.structure.h1Count === 1 ? '✅' : report.seo.structure.h1Count === 0 ? '❌ 缺少H1' : '⚠️ 有多个H1'}
- **H1内容**: ${report.seo.structure.h1Text}
- **Canonical URL**: ${report.seo.structure.canonical === '未设置' ? '❌ 未设置' : '✅ 已设置'}
- **Favicon**: ${report.seo.structure.favicon === '未设置' ? '❌ 未设置' : '✅ 已设置'}
- **页面语言**: ${report.seo.structure.language === '未设置' ? '❌ 未设置' : report.seo.structure.language}

### SEO性能指标
- **标题长度**: ${report.seo.performance.titleLength} 字符 ${report.seo.performance.titleLength >= 10 && report.seo.performance.titleLength <= 60 ? '✅' : '⚠️'}
- **描述长度**: ${report.seo.performance.metaDescLength} 字符 ${report.seo.performance.metaDescLength >= 50 && report.seo.performance.metaDescLength <= 160 ? '✅' : '⚠️'}
- **结构化数据**: ${report.seo.performance.hasSchemaOrg ? '✅ 已配置' : '❌ 未配置'} (${report.seo.performance.schemaCount} 个)

### 💡 SEO优化建议
${generateSEOSuggestions(report.seo)}

---

## ⏱️ 性能指标

${report.performance ? `
- 页面加载时间: ${report.performance.pageLoadTime}ms
- DOM内容加载: ${report.performance.domContentLoaded}ms
- DOM可交互: ${report.performance.domInteractive}ms
` : '性能数据不可用'}

---

## 💡 使用提示

将此报告提供给Claude/Cursor/Copilot，并描述你遇到的具体问题：
- 样式问题："某个CSS属性不生效..."
- 交互问题："按钮点击没反应..."
- 性能问题："页面加载太慢..."
- SEO问题："搜索引擎排名低..."
- 布局问题："移动端显示错乱..."

AI将基于这些结构化信息帮你精准定位问题！

---

*Generated by Vibe Coding Web Debug Extension v1.0*
`;
}

// 生成SEO优化建议
function generateSEOSuggestions(seo) {
  const suggestions = [];
  
  if (seo.meta.description === '未设置') {
    suggestions.push('- ❌ **缺少Meta Description**：搜索引擎无法正确展示页面摘要');
  } else if (seo.performance.metaDescLength < 50) {
    suggestions.push('- ⚠️ **Meta Description过短**：建议50-160字符，当前仅' + seo.performance.metaDescLength + '字符');
  } else if (seo.performance.metaDescLength > 160) {
    suggestions.push('- ⚠️ **Meta Description过长**：建议50-160字符，当前' + seo.performance.metaDescLength + '字符可能被截断');
  }
  
  if (seo.performance.titleLength < 10) {
    suggestions.push('- ⚠️ **标题过短**：建议10-60字符，当前仅' + seo.performance.titleLength + '字符');
  } else if (seo.performance.titleLength > 60) {
    suggestions.push('- ⚠️ **标题过长**：建议10-60字符，当前' + seo.performance.titleLength + '字符可能被截断');
  }
  
  if (seo.structure.h1Count === 0) {
    suggestions.push('- ❌ **缺少H1标签**：每个页面应该有且仅有一个H1标签');
  } else if (seo.structure.h1Count > 1) {
    suggestions.push('- ⚠️ **有多个H1标签**：建议每页只有一个H1，当前有' + seo.structure.h1Count + '个');
  }
  
  if (seo.structure.canonical === '未设置') {
    suggestions.push('- ⚠️ **缺少Canonical URL**：建议添加以避免重复内容问题');
  }
  
  if (seo.og.title === '未设置' || seo.og.description === '未设置' || seo.og.image === '未设置') {
    suggestions.push('- ⚠️ **Open Graph标签不完整**：影响社交媒体分享效果');
  }
  
  if (!seo.performance.hasSchemaOrg) {
    suggestions.push('- ⚠️ **未配置结构化数据**：建议添加Schema.org标记提升搜索结果展示');
  }
  
  if (seo.structure.language === '未设置') {
    suggestions.push('- ⚠️ **未设置页面语言**：建议在<html>标签添加lang属性');
  }
  
  if (suggestions.length === 0) {
    return '✅ SEO配置良好，未发现明显问题';
  }
  
  return suggestions.join('\n');
}