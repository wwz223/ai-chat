import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: '你好！我是AI助手，有什么可以帮助你的吗？',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 发送消息到Cloudflare Workers
  const sendMessage = async (userMessage) => {
    try {
      setIsLoading(true);
      
      // 这里替换为你的Cloudflare Workers URL
      const WORKERS_URL = 'https://your-worker.your-subdomain.workers.dev/api/chat';
      
      const response = await fetch(WORKERS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          // 可以传递对话历史用于上下文
          history: messages.slice(-5) // 只传递最近5条消息
        })
      });

      if (!response.ok) {
        throw new Error('网络请求失败');
      }

      const data = await response.json();
      
      // 添加AI回复到消息列表
      const aiMessage = {
        id: Date.now() + Math.random(),
        text: data.response || '抱歉，我现在无法回答。',
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('发送消息错误:', error);
      
      // 添加错误消息
      const errorMessage = {
        id: Date.now() + Math.random(),
        text: '抱歉，连接服务器失败，请稍后重试。',
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
  const handleSend = () => {
    if (!inputText.trim() || isLoading) return;

    // 添加用户消息
    const userMessage = {
      id: Date.now(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // 发送到AI
    sendMessage(inputText.trim());
    
    // 清空输入框
    setInputText('');
  };

  // 处理回车键
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 格式化时间
  const formatTime = (date) => {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>AI 对话助手</h1>
        <span className="status">在线</span>
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
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="input-container">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入您的问题..."
          disabled={isLoading}
          rows={1}
        />
        <button 
          onClick={handleSend} 
          disabled={!inputText.trim() || isLoading}
          className="send-button"
        >
          {isLoading ? '发送中...' : '发送'}
        </button>
      </div>
    </div>
  );
}

export default App;