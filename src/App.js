import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: '你好！我是AI助手，有什么可以帮助你的吗？我可以协助你解答问题、提供建议或进行技术讨论。',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // 监听网络状态
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 自动调整输入框高度
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputText, adjustTextareaHeight]);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 发送消息到Cloudflare Workers
  const sendMessage = async (userMessage) => {
    try {
      setIsLoading(true);

      // 这里替换为你的Cloudflare Workers URL
      const WORKERS_URL = 'https://wild-sky-87bf.wangweizheng223.workers.dev/chat';

      const response = await fetch(WORKERS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          // 传递更多上下文信息用于PC端更复杂的对话
          history: messages.slice(-10), // PC端可以处理更多历史消息
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          platform: 'web'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // 添加AI回复到消息列表
      const aiMessage = {
        id: Date.now() + Math.random(),
        text: data.response || '抱歉，我现在无法回答您的问题。',
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('发送消息错误:', error);

      // 更详细的错误处理
      let errorText = '抱歉，连接服务器失败。';
      if (!isOnline) {
        errorText = '网络连接已断开，请检查您的网络设置。';
      } else if (error.message.includes('fetch')) {
        errorText = '无法连接到AI服务，请稍后重试。';
      } else if (error.message.includes('HTTP')) {
        errorText = `服务器响应错误 (${error.message})，请稍后重试。`;
      }

      const errorMessage = {
        id: Date.now() + Math.random(),
        text: errorText,
        isUser: false,
        timestamp: new Date(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理发送
  const handleSend = useCallback(() => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    sendMessage(inputText.trim());
    setInputText('');
    // eslint-disable-next-line
  }, [inputText, isLoading]);

  // 处理键盘事件 - PC端优化
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift + Enter 换行
        return;
      } else if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd + Enter 也可以发送
        e.preventDefault();
        handleSend();
      } else {
        // 普通回车发送
        e.preventDefault();
        handleSend();
      }
    }

    // Escape 清空输入框
    if (e.key === 'Escape') {
      setInputText('');
    }
  }, [handleSend]);

  // 处理输入变化
  const handleInputChange = useCallback((e) => {
    setInputText(e.target.value);
  }, []);

  // 格式化时间 - 更详细的PC端显示
  const formatTime = useCallback((date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInMinutes = Math.floor((now - messageDate) / (1000 * 60));

    if (diffInMinutes < 1) {
      return '刚刚';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}分钟前`;
    } else if (messageDate.toDateString() === now.toDateString()) {
      return messageDate.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return messageDate.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }, []);

  // 快捷操作
  const handleQuickAction = useCallback((action) => {
    const quickMessages = {
      help: '请介绍一下你的功能',
      example: '给我一个代码示例',
      explain: '请详细解释一下',
      clear: ''
    };

    if (action === 'clear') {
      setMessages([{
        id: Date.now(),
        text: '对话已清空，有什么可以帮助你的吗？',
        isUser: false,
        timestamp: new Date()
      }]);
    } else {
      setInputText(quickMessages[action] || '');
      textareaRef.current?.focus();
    }
  }, []);

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div>
          <h1>AI 智能对话助手</h1>
          <small style={{ opacity: 0.8, fontSize: '0.85rem' }}>
            按 Enter 发送，Shift + Enter 换行，Esc 清空输入
          </small>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="status">
            {isOnline ? '在线' : '离线'}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleQuickAction('help')}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              帮助
            </button>
            <button
              onClick={() => handleQuickAction('clear')}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              清空
            </button>
          </div>
        </div>
      </div>

      <div className="messages-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.isUser ? 'user-message' : 'ai-message'} ${message.isError ? 'error-message' : ''}`}
          >
            <div className="message-content">
              {message.text}
            </div>
            <div className="message-time">
              {formatTime(message.timestamp)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message ai-message loading-message">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span style={{ marginLeft: '12px', color: '#666', fontSize: '0.9rem' }}>
                AI正在思考...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <button
            onClick={() => handleQuickAction('example')}
            style={{
              background: '#f7fafc',
              border: '1px solid #e2e8f0',
              color: '#4a5568',
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            🔧 代码示例
          </button>
          <button
            onClick={() => handleQuickAction('explain')}
            style={{
              background: '#f7fafc',
              border: '1px solid #e2e8f0',
              color: '#4a5568',
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            📚 详细解释
          </button>
        </div>
        <div style={{ display: 'flex', flex: 1, gap: '16px', alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isOnline ? "输入您的问题... (Enter发送，Shift+Enter换行)" : "网络连接已断开"}
            disabled={isLoading || !isOnline}
            rows={1}
            style={{
              minHeight: '56px',
              maxHeight: '150px',
              overflow: 'hidden'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading || !isOnline}
            className="send-button"
          >
            {isLoading ? '发送中...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;