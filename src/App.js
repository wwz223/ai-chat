import React, { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";

function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "你好！我是AI助手，有什么可以帮助你的吗？我可以协助你解答问题、提供建议或进行技术讨论。",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // 监听网络状态
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 自动调整输入框高度
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + "px";
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

  // GraphQL 请求工具函数
  const makeGraphQLRequest = async (query, variables = {}) => {
    const GRAPHQL_URL = process.env.REACT_APP_WORKERS_URL;
    
    if (!GRAPHQL_URL) {
      throw new Error('GraphQL URL 未配置，请检查环境变量 REACT_APP_WORKERS_URL');
    }
    
    console.log('🚀 GraphQL 请求:', GRAPHQL_URL);
    
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HTTP 错误:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // 处理 GraphQL 错误
    if (data.errors && data.errors.length > 0) {
      console.error('❌ GraphQL 错误:', data.errors);
      throw new Error(`GraphQL Error: ${data.errors[0].message}`);
    }

    return data.data;
  };

  // 发送消息到GraphQL后端
  const sendMessage = async (userMessage) => {
    try {
      setIsLoading(true);

      console.log('📝 发送消息:', userMessage);

      // 构建 GraphQL Mutation - 匹配后端的 chat mutation
      const mutation = `
        mutation Chat($input: ChatInput!) {
          chat(input: $input) {
            content
            model
            timestamp
            tokensUsed
          }
        }
      `;

      // 执行 GraphQL 请求
      const data = await makeGraphQLRequest(mutation, {
        input: {
          prompt: userMessage,
          temperature: 0.7,
          maxTokens: 512,
          topP: 0.7,
          topK: 50,
          frequencyPenalty: 0.5,
        },
      });

      // 检查响应和提取内容
      const result = data?.chat;
      let responseText = "抱歉，我现在无法回答您的问题。";
      
      if (result && result.content) {
        responseText = result.content;
        console.log('✅ AI回复成功，使用模型:', result.model, '消耗tokens:', result.tokensUsed);
      } else {
        console.warn('⚠️ 未收到有效的AI响应:', result);
      }

      // 添加AI回复到消息列表
      const aiMessage = {
        id: Date.now() + Math.random(),
        text: responseText,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("发送消息错误:", error);

      // 更详细的错误处理
      let errorText = "抱歉，连接服务器失败。";
      if (!isOnline) {
        errorText = "网络连接已断开，请检查您的网络设置。";
      } else if (error.message.includes("fetch")) {
        errorText = "无法连接到AI服务，请稍后重试。";
      } else if (error.message.includes("HTTP")) {
        errorText = `服务器响应错误 (${error.message})，请稍后重试。`;
      } else if (error.message.includes("GraphQL Error")) {
        errorText = `GraphQL 错误：${error.message.replace("GraphQL Error: ", "")}`;
      } else if (error.message.includes("服务器处理失败")) {
        errorText = error.message;
      }

      const errorMessage = {
        id: Date.now() + Math.random(),
        text: errorText,
        isUser: false,
        timestamp: new Date(),
        isError: true,
      };

      setMessages((prev) => [...prev, errorMessage]);
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
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    sendMessage(inputText.trim());
    setInputText("");
    // eslint-disable-next-line
  }, [inputText, isLoading]);

  // 处理键盘事件 - PC端优化
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
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
      if (e.key === "Escape") {
        setInputText("");
      }
    },
    [handleSend]
  );

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
      return "刚刚";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}分钟前`;
    } else if (messageDate.toDateString() === now.toDateString()) {
      return messageDate.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return messageDate.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }, []);

  // 快捷操作
  const handleQuickAction = useCallback((action) => {
    const quickMessages = {
      help: "请介绍一下你的功能",
      example: "给我一个代码示例",
      explain: "请详细解释一下",
      clear: "",
    };

    if (action === "clear") {
      setMessages([
        {
          id: Date.now(),
          text: "对话已清空，有什么可以帮助你的吗？",
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    } else {
      setInputText(quickMessages[action] || "");
      textareaRef.current?.focus();
    }
  }, []);

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-title">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <rect
                x="8"
                y="10"
                width="16"
                height="12"
                rx="6"
                fill="currentColor"
              />
              <circle cx="12" cy="15" r="1.5" fill="white" />
              <circle cx="20" cy="15" r="1.5" fill="white" />
              <circle cx="12" cy="15" r="0.7" fill="currentColor" />
              <circle cx="20" cy="15" r="0.7" fill="currentColor" />
              <path
                d="M14 18 Q16 19 18 18"
                stroke="white"
                strokeWidth="1"
                strokeLinecap="round"
                fill="none"
              />
              <rect x="15" y="6" width="2" height="4" fill="currentColor" />
              <circle cx="16" cy="6" r="1" fill="#ef4444" />
            </svg>
          </div>
          <h1>AI 助手</h1>
        </div>
        <div className="header-actions">
          <span className={`status ${isOnline ? "online" : "offline"}`}>
            <svg width="8" height="8" viewBox="0 0 8 8" className="status-dot">
              <circle cx="4" cy="4" r="3" fill="currentColor" />
            </svg>
            {isOnline ? "在线" : "离线"}
          </span>
          <button
            onClick={() => handleQuickAction("clear")}
            className="clear-button"
            title="清空对话"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      </div>

      <div className="messages-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${
              message.isUser ? "user-message" : "ai-message"
            } ${message.isError ? "error-message" : ""}`}
          >
            <div className="message-header">
              <div className="message-avatar">
                {message.isUser ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                ) : message.isError ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
                    <rect
                      x="8"
                      y="10"
                      width="16"
                      height="12"
                      rx="6"
                      fill="currentColor"
                    />
                    <circle cx="12" cy="15" r="1.5" fill="white" />
                    <circle cx="20" cy="15" r="1.5" fill="white" />
                    <circle cx="12" cy="15" r="0.7" fill="currentColor" />
                    <circle cx="20" cy="15" r="0.7" fill="currentColor" />
                    <path
                      d="M14 18 Q16 19 18 18"
                      stroke="white"
                      strokeWidth="1"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <rect
                      x="15"
                      y="6"
                      width="2"
                      height="4"
                      fill="currentColor"
                    />
                    <circle cx="16" cy="6" r="1" fill="#ef4444" />
                  </svg>
                )}
              </div>
              <div className="message-time">
                {formatTime(message.timestamp)}
              </div>
            </div>
            <div className="message-content">{message.text}</div>
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
              <span
                style={{
                  marginLeft: "12px",
                  color: "#666",
                  fontSize: "0.9rem",
                }}
              >
                AI正在思考...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <div className="input-hint">
          <div className="keyboard-shortcuts">
            <span className="shortcut-item">
              <kbd>Enter</kbd>
              <span>发送</span>
            </span>
            <span className="shortcut-item">
              <kbd>Shift</kbd> + <kbd>Enter</kbd>
              <span>换行</span>
            </span>
            <span className="shortcut-item">
              <kbd>Esc</kbd>
              <span>清空</span>
            </span>
          </div>
        </div>
        <div className="input-wrapper">
          <div className="input-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isOnline ? "输入消息..." : "网络连接已断开"}
            disabled={isLoading || !isOnline}
            rows={1}
            className="message-input"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading || !isOnline}
            className="send-button"
            title="发送消息"
          >
            {isLoading ? (
              <svg
                className="loading-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 2l-7 20-4-9-9-4z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
