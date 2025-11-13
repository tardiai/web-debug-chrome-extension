let debugLog = [];

function addDebug(msg) {
  debugLog.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
  const debugEl = document.getElementById('debugInfo');
  if (debugEl) {
    debugEl.innerHTML = debugLog.join('<br>');
  }
}

// 页面加载完成后执行
addDebug('页面开始加载');

document.addEventListener('DOMContentLoaded', function() {
  addDebug('DOM加载完成');
  
  // 绑定按钮事件
  setupButtons();
  
  // 加载报告
  loadReport();
});

// 绑定所有按钮事件
function setupButtons() {
  addDebug('开始绑定按钮事件');
  
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const manualBtn = document.getElementById('manualBtn');
  
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      addDebug('📋 点击了复制按钮');
      copyReport();
    });
    addDebug('✓ 复制按钮已绑定');
  }
  
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function() {
      addDebug('💾 点击了下载按钮');
      downloadReport();
    });
    addDebug('✓ 下载按钮已绑定');
  }
  
  if (manualBtn) {
    manualBtn.addEventListener('click', function() {
      addDebug('📄 点击了另存为按钮');
      manualDownload();
    });
    addDebug('✓ 另存为按钮已绑定');
  }
}

// 加载报告
function loadReport() {
  addDebug('开始加载报告函数');

  if (typeof chrome === 'undefined') {
    addDebug('❌ chrome对象未定义');
    showError('Chrome API不可用');
    return;
  }
  addDebug('✓ chrome对象存在');

  if (!chrome.storage || !chrome.storage.local) {
    addDebug('❌ chrome.storage.local未定义');
    showError('Storage API不可用');
    return;
  }
  addDebug('✓ chrome.storage.local存在');

  addDebug('开始读取存储数据...');
  
  try {
    chrome.storage.local.get(['lastReport', 'lastStats'], function(result) {
      addDebug('get回调函数被调用');
      
      if (chrome.runtime.lastError) {
        addDebug('❌ 读取错误: ' + chrome.runtime.lastError.message);
        showError('读取存储失败: ' + chrome.runtime.lastError.message);
        return;
      }

      addDebug('result对象: ' + JSON.stringify(Object.keys(result)));
      addDebug('lastReport存在: ' + (result.lastReport ? '是' : '否'));
      
      if (result.lastReport) {
        addDebug('报告长度: ' + result.lastReport.length);
        showReport(result.lastReport, result.lastStats);
      } else {
        addDebug('❌ 未找到报告数据');
        showError('没有找到报告数据<br><small>请先在网页上提取信息</small>');
      }
    });
  } catch (e) {
    addDebug('❌ 异常: ' + e.message);
    showError('读取数据异常: ' + e.message);
  }
}

function showReport(markdown, stats) {
  addDebug('显示报告界面');
  
  const loading = document.getElementById('loading');
  const mainContent = document.getElementById('mainContent');
  const reportEl = document.getElementById('report');
  const statsEl = document.getElementById('stats');

  loading.style.display = 'none';
  mainContent.style.display = 'block';
  reportEl.textContent = markdown;

  if (stats) {
    addDebug('显示统计数据');
    statsEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${stats.html.totalElements}</div>
        <div class="stat-label">HTML元素</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.css.stylesheets}</div>
        <div class="stat-label">样式表</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.javascript.scripts}</div>
        <div class="stat-label">脚本文件</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.accessibility.missingAlt + stats.accessibility.emptyLinks}</div>
        <div class="stat-label">待优化项</div>
      </div>
    `;
  }
  
  addDebug('✓ 报告显示完成');
}

function showError(msg) {
  addDebug('显示错误: ' + msg);
  
  document.getElementById('loading').style.display = 'none';
  const errorEl = document.getElementById('error');
  errorEl.innerHTML = '⚠️ ' + msg;
  errorEl.style.display = 'block';
}

// 复制报告
function copyReport() {
  addDebug('📋 执行复制函数');
  
  const report = document.getElementById('report').textContent;
  
  if (!report || report === '正在加载...') {
    addDebug('❌ 没有可复制的内容');
    alert('没有可复制的报告内容');
    return;
  }
  
  addDebug('报告长度: ' + report.length);
  
  navigator.clipboard.writeText(report).then(function() {
    addDebug('✅ 复制成功');
    const successEl = document.getElementById('success');
    successEl.style.display = 'block';
    setTimeout(function() {
      successEl.style.display = 'none';
    }, 2000);
  }).catch(function(err) {
    addDebug('❌ 复制失败: ' + err.message);
    alert('复制失败: ' + err.message);
  });
}

// 下载报告
function downloadReport() {
  addDebug('💾 执行下载函数');
  
  const report = document.getElementById('report').textContent;
  
  if (!report || report === '正在加载...') {
    addDebug('❌ 没有可下载的内容');
    alert('没有可下载的报告内容');
    return;
  }

  try {
    addDebug('创建Blob对象');
    const blob = new Blob([report], { 
      type: 'text/markdown;charset=utf-8' 
    });
    
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `web-debug-report-${timestamp}.md`;
    
    addDebug('📦 文件名: ' + filename);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = filename;
    
    addDebug('添加链接到DOM');
    document.body.appendChild(downloadLink);
    
    addDebug('触发点击');
    downloadLink.click();
    
    setTimeout(function() {
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
      addDebug('✅ 下载完成');
    }, 100);
    
  } catch (e) {
    addDebug('❌ 下载异常: ' + e.message);
    console.error('下载失败:', e);
    alert('下载失败: ' + e.message);
  }
}

// 手动下载（打开新窗口）
function manualDownload() {
  addDebug('📄 执行手动下载');
  
  const report = document.getElementById('report').textContent;
  
  if (!report || report === '正在加载...') {
    addDebug('❌ 没有可下载的内容');
    alert('没有可下载的报告内容');
    return;
  }

  try {
    addDebug('打开新窗口');
    const newWindow = window.open('', '_blank');
    
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>调试报告 - 请手动保存</title>
          <style>
            body {
              font-family: monospace;
              padding: 20px;
              background: #f5f5f5;
              line-height: 1.6;
            }
            .instructions {
              background: #fff3cd;
              border: 2px solid #ffc107;
              padding: 15px;
              margin-bottom: 20px;
              border-radius: 8px;
            }
            .instructions strong {
              display: block;
              margin-bottom: 10px;
              font-size: 16px;
            }
            .instructions ol {
              margin-left: 20px;
              margin-top: 10px;
            }
            .instructions li {
              margin: 5px 0;
            }
            kbd {
              background: #333;
              color: white;
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 12px;
            }
            pre {
              background: white;
              padding: 20px;
              border-radius: 8px;
              border: 1px solid #ddd;
              white-space: pre-wrap;
              word-wrap: break-word;
              overflow-x: auto;
            }
          </style>
        </head>
        <body>
          <div class="instructions">
            <strong>💡 保存说明：</strong>
            <ol>
              <li>按 <kbd>Ctrl+S</kbd> (Mac用 <kbd>Cmd+S</kbd>) 保存此页面</li>
              <li>文件名改为：<code>web-debug-report.md</code></li>
              <li>文件类型选择 "网页，仅HTML" 或 "文本文件"</li>
            </ol>
            <p style="margin-top: 10px;">或者：直接选中下面的内容，<kbd>Ctrl+A</kbd> 全选 → <kbd>Ctrl+C</kbd> 复制到文本编辑器保存</p>
          </div>
          <pre>${report.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </body>
        </html>
      `);
      newWindow.document.close();
      addDebug('✅ 新窗口已打开');
    } else {
      addDebug('❌ 无法打开新窗口（被拦截）');
      alert('无法打开新窗口\n请允许浏览器弹窗后重试');
    }
  } catch (e) {
    addDebug('❌ 异常: ' + e.message);
    alert('打开失败: ' + e.message);
  }
}