import React, { useState, useRef, useEffect } from 'react';
import {
    Plus, Mic, ChevronDown, User, Send,
    Image as ImageIcon, X, Bot, Cpu
} from 'lucide-react';
import './PageContent.scss';

const PageContent = ({
    currentConversationId,
    arrMessages,
    saveMessage
}) => {
    const [prompt, setPrompt] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState('general');
    const [showModelDropdown, setShowModelDropdown] = useState(false);

    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setShowModelDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [arrMessages, isLoading]);

    const handleAddClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);

        if (files.length > 0) {
            setSelectedFiles(prev => [...prev, ...files].slice(0, 10));
        }
    };

    const handleRemoveFile = (indexToRemove) => {
        setSelectedFiles(prev =>
            prev.filter((_, index) => index !== indexToRemove)
        );

        if (selectedFiles.length <= 1 && fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Gửi tin nhắn qua Node.js.
    // Backend tự lưu tin nhắn user, gọi Python AI và lưu phản hồi assistant.
    const handleSendMessage = async () => {
        if (isLoading) return;

        if (!prompt.trim() && selectedFiles.length === 0) return;

        if (!currentConversationId) {
            alert("Vui lòng bấm nút 'New chat' ở bên trái trước khi gửi tin nhắn nhé!");
            return;
        }

        let contentToSend = prompt.trim();

        // Backend hiện chưa có API upload file thực tế.
        // Tạm thời chỉ đưa tên file vào nội dung tin nhắn.
        if (selectedFiles.length > 0) {
            const fileNames = selectedFiles.map(file => file.name).join(', ');
            contentToSend =
                `[Tệp đính kèm: ${fileNames}] ${contentToSend}`.trim();
        }

        const messageToRestore = prompt;

        setIsLoading(true);
        setPrompt('');

        try {
            await saveMessage('user', contentToSend, selectedModel);

            setSelectedFiles([]);

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Lỗi gửi tin nhắn:', error);
            setPrompt(messageToRestore);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <main className="gemini-main">
            <header className="main-header">
                <div className="header-right">
                    <div className="user-avatar-top">
                        <User size={16} />
                    </div>
                </div>
            </header>

            <div className="main-body">
                <div className="glow-effect"></div>

                <div className="messages-container">
                    {arrMessages && arrMessages.length > 0 ? (
                        arrMessages.map((msg, index) => {
                            const isUser =
                                msg.sender === 'user' ||
                                msg.sender === 'human';

                            return (
                                <div
                                    key={msg.id || index}
                                    style={{
                                        display: 'flex',
                                        justifyContent: isUser
                                            ? 'flex-end'
                                            : 'flex-start',
                                        marginBottom: '20px',
                                        alignItems: 'flex-start',
                                        gap: '12px'
                                    }}
                                >
                                    {!isUser && (
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: '#a855f7',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            flexShrink: 0
                                        }}>
                                            <Bot size={18} />
                                        </div>
                                    )}

                                    <div style={{
                                        padding: '14px 18px',
                                        borderRadius: '16px',
                                        background: isUser ? '#2b2b2b' : '#1e1e1e',
                                        color: '#fff',
                                        maxWidth: '75%',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                        border: isUser ? 'none' : '1px solid #333'
                                    }}>
                                        <strong style={{
                                            fontSize: '11px',
                                            color: '#888',
                                            display: 'block',
                                            marginBottom: '4px'
                                        }}>
                                            {isUser ? 'Bạn' : 'AI Quỳnh Anh'}
                                        </strong>

                                        {!isUser &&
                                            msg.sources &&
                                            msg.sources.length > 0 && (
                                                <div style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '6px',
                                                    marginBottom: '8px'
                                                }}>
                                                    {msg.sources.map((src, sIdx) => (
                                                        <a
                                                            key={sIdx}
                                                            href={src.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                backgroundColor: '#26262e',
                                                                border: '1px solid #3d3e48',
                                                                padding: '4px 10px',
                                                                borderRadius: '12px',
                                                                color: '#4dabf7',
                                                                fontSize: '12px',
                                                                textDecoration: 'none',
                                                                maxWidth: '220px',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                            title={src.title}
                                                        >
                                                            🌐 {src.title || src.url}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}

                                        <span style={{
                                            wordBreak: 'break-word',
                                            fontSize: '14px',
                                            lineHeight: '1.5',
                                            whiteSpace: 'pre-wrap'
                                        }}>
                                            {msg.content}
                                        </span>
                                    </div>

                                    {isUser && (
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: '#444',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            flexShrink: 0
                                        }}>
                                            <User size={18} />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            color: '#666',
                            marginTop: '100px'
                        }}>
                            <h2 style={{
                                color: '#fff',
                                marginBottom: '10px'
                            }}>
                                Chào bạn, tôi là AI Quỳnh Anh
                            </h2>
                            <p>
                                Hãy bấm{' '}
                                <span style={{ color: '#a855f7' }}>
                                    New chat
                                </span>{' '}
                                ở menu trái rồi gõ tin nhắn để bắt đầu trò chuyện nhé!
                            </p>
                        </div>
                    )}

                    {isLoading && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-start',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '20px'
                        }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: '#a855f7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                flexShrink: 0
                            }}>
                                <Bot size={18} />
                            </div>

                            <div style={{
                                padding: '12px 18px',
                                borderRadius: '16px',
                                background: '#1e1e1e',
                                color: '#aaa',
                                border: '1px solid #333',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '14px'
                            }}>
                                <span>AI Quỳnh Anh đang suy nghĩ</span>
                                <span className="typing-dots">
                                    <span>.</span><span>.</span><span>.</span>
                                </span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            <footer className="main-footer">
                {selectedFiles.length > 0 && (
                    <div className="file-preview-bar">
                        {selectedFiles.map((file, index) => (
                            <div key={index} className="file-tag">
                                <ImageIcon size={14} color="#4dabf7" />
                                <span>{file.name}</span>
                                <X
                                    size={14}
                                    onClick={() => handleRemoveFile(index)}
                                />
                            </div>
                        ))}
                    </div>
                )}

                <div className="chat-input-container">
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                        multiple
                    />

                    <button
                        className="add-btn"
                        onClick={handleAddClick}
                        title="Đính kèm tệp"
                    >
                        <Plus size={20} />
                    </button>

                    <input
                        type="text"
                        placeholder="Type @ for connectors, skills and more (Nhấn Enter để gửi)"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                    />

                    <div
                        className="input-actions"
                        style={{ position: 'relative' }}
                        ref={dropdownRef}
                    >
                        <button
                            className="model-selector"
                            onClick={() =>
                                setShowModelDropdown(!showModelDropdown)
                            }
                            title="Chọn Model AI"
                            disabled={isLoading}
                        >
                            <Cpu size={14} />
                            <span>
                                {selectedModel === 'general'
                                    ? 'Qwen2.5-14B'
                                    : 'Qwen Coder'}
                            </span>
                            <ChevronDown size={14} />
                        </button>

                        {showModelDropdown && (
                            <div style={{
                                position: 'absolute',
                                bottom: '45px',
                                right: '0',
                                backgroundColor: '#1e1f24',
                                border: '1px solid #2a2b30',
                                borderRadius: '12px',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                padding: '8px',
                                width: '180px',
                                zIndex: 100
                            }}>
                                <div
                                    onClick={() => {
                                        setSelectedModel('general');
                                        setShowModelDropdown(false);
                                    }}
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        color: selectedModel === 'general'
                                            ? '#a855f7'
                                            : '#e3e3e3',
                                        backgroundColor:
                                            selectedModel === 'general'
                                                ? 'rgba(168, 85, 247, 0.1)'
                                                : 'transparent',
                                        marginBottom: '4px'
                                    }}
                                >
                                    💬 Qwen General
                                </div>

                                <div
                                    onClick={() => {
                                        setSelectedModel('tool_generator');
                                        setShowModelDropdown(false);
                                    }}
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        color: selectedModel === 'tool_generator'
                                            ? '#4dabf7'
                                            : '#e3e3e3',
                                        backgroundColor:
                                            selectedModel === 'tool_generator'
                                                ? 'rgba(77, 171, 247, 0.1)'
                                                : 'transparent'
                                    }}
                                >
                                    💻 Qwen Coder (Tạo tool)
                                </div>
                            </div>
                        )}

                        <button className="mic-btn" title="Microphone">
                            <Mic size={18} />
                        </button>

                        <button
                            className="send-btn"
                            onClick={handleSendMessage}
                            title="Gửi"
                            disabled={isLoading}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </footer>
        </main>
    );
};

export default PageContent;
