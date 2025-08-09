# AI对话框项目

这是一个基于React的AI对话框应用，后端使用Cloudflare Workers实现。

## 项目特性

- 🎨 现代化UI设计
- 💬 实时对话体验  
- 📱 响应式布局，支持移动端
- ⚡ 打字指示器
- 🔄 自动滚动到最新消息
- ⌨️ 支持回车发送
- 🚀 部署到Cloudflare Pages

## 技术栈

- **前端**: React 18
- **后端**: Cloudflare Workers (需要单独部署)
- **部署**: Cloudflare Pages

## 开发环境设置

1. 克隆项目
```bash
git clone https://github.com/wwz223/home-work-day1.git
cd home-work-day1
```

2. 安装依赖
```bash
npm install
```

3. 配置Workers API地址
在 `src/App.js` 中修改 `WORKERS_URL` 为你的Cloudflare Workers URL：
```javascript
const WORKERS_URL = 'https://your-worker.your-subdomain.workers.dev/api/chat';
```

4. 启动开发服务器
```bash
npm start
```

## 部署到Cloudflare Pages

1. 构建项目
```bash
npm run build
```

2. 在Cloudflare Dashboard中:
   - 进入Pages
   - 连接到Git仓库
   - 设置构建命令: `npm run build`
   - 设置构建输出目录: `build`
   - 部署

## Cloudflare Workers后端

后端需要单独创建Cloudflare Workers，处理AI对话请求。Workers应该:

1. 接收POST请求到 `/api/chat`
2. 处理包含 `message` 和 `history` 的JSON数据
3. 返回格式: `{"response": "AI回复内容"}`

## 项目结构

```
src/
├── App.js          # 主应用组件
├── App.css         # 主样式文件
├── index.js        # React入口
└── index.css       # 全局样式

public/
└── index.html      # HTML模板

package.json        # 项目依赖
README.md          # 项目说明
```

## 功能说明

- **消息发送**: 支持文本输入和回车发送
- **实时反馈**: 显示加载状态和打字指示器
- **错误处理**: 网络错误时显示友好提示
- **响应式设计**: 适配桌面和移动设备
- **消息时间**: 显示每条消息的发送时间

## 自定义配置

你可以根据需要修改：

- `WORKERS_URL`: Workers API地址
- 消息历史长度 (当前为5条)
- UI样式和主题颜色
- 错误处理逻辑

## 许可证

MIT License