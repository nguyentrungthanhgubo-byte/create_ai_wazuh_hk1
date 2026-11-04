import React, { Component } from 'react';
import {
    Plus,
    Grid,
    Image as ImageIcon,
    Clock,
    GraduationCap,
    MoreHorizontal,
    Settings,
    User,
    Star,
    MessageSquare,
    Trash2,
    PanelLeftClose
} from 'lucide-react';

import './PageLib.scss';

class PageLib extends Component {
    constructor(props) {
        super(props);
        this.state = {
            contextMenuId: null, // Lưu ID của phiên chat đang mở menu chuột phải
            contextMenuPosition: { x: 0, y: 0 } // Tọa độ hiển thị menu
        };
    }

    componentDidMount() {
        // Lắng nghe sự kiện click bất kỳ đâu trên màn hình để ẩn menu chuột phải khi bấm ra ngoài
        document.addEventListener('click', this.handleOutsideClick);
    }

    componentWillUnmount() {
        document.removeEventListener('click', this.handleOutsideClick);
    }

    // Ẩn menu chuột phải khi click ra ngoài
    handleOutsideClick = () => {
        if (this.state.contextMenuId !== null) {
            this.setState({ contextMenuId: null });
        }
    }

    // Xử lý sự kiện bấm chuột phải (Context Menu)
    handleContextMenu = (e, conversationId) => {
        e.preventDefault(); // Ngăn menu chuột phải mặc định của trình duyệt
        this.setState({
            contextMenuId: conversationId,
            contextMenuPosition: { x: e.pageX, y: e.pageY }
        });
    }

    // Gọi hàm xóa phiên chat (bạn có thể truyền hàm delete từ Home.js xuống hoặc xử lý trực tiếp)
    handleDeleteClick = (e, conversationId) => {
        e.stopPropagation();
        this.setState({ contextMenuId: null });

        // Kiểm tra xem ở Home.js đã truyền hàm deleteConversation chưa, nếu có thì gọi, nếu không thì thông báo
        if (this.props.deleteConversation) {
            this.props.deleteConversation(conversationId);
        } else {
            alert("Bạn chưa định nghĩa hàm xóa ở Home.js! ID cần xóa là: " + conversationId);
        }
    }

    render() {
        const {
  arrConversations,
  currentId,
  selectConversation,
  createNewChat,
  onClose
} = this.props;
        const { contextMenuId, contextMenuPosition } = this.state;

        return (
            <aside className="gemini-sidebar">
                <div className="sidebar-top">
                  <div className="brand">
  <Star className="sparkle-icon" size={20} />
  <span className="brand-name">AI Quỳnh Anh</span>

  <button
    className="sidebar-close-btn"
    onClick={onClose}
    title="Thu gọn thanh bên"
  >
    <PanelLeftClose size={19} />
  </button>
</div>

                    <button className="new-chat-btn" onClick={createNewChat}>
                        <Plus size={18} />
                        <span>New chat</span>
                    </button>

                    <nav className="nav-menu">
                        <div className="nav-item"><Grid size={18} /><span>Training AI</span></div>
                        <div className="nav-item"><ImageIcon size={18} /><span>Quét Lỗ Hỏng</span></div>
                        <div className="nav-item"><Clock size={18} /><span>Tạo tool</span></div>
                        <div className="nav-item"><GraduationCap size={18} /><span>quét mặng bằng wishark</span></div>
                        <div className="nav-item"><MoreHorizontal size={18} /><span>More</span></div>
                    </nav>
                </div>

                <div className="sidebar-middle">
                    <div className="section-title">Notebooks</div>
                    <div className="history-header">
                        <span>All</span>
                        <span className="filter-icon">⚙️</span>
                    </div>

                    <div className="history-list" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 350px)', position: 'relative' }}>
                        {arrConversations && arrConversations.length > 0 ? (
                            arrConversations.map((item) => {
                                let isActive = String(item.id) === String(currentId);
                                return (
                                    <div
                                        key={item.id}
                                        className={`history-item ${isActive ? 'active' : ''}`}
                                        onClick={() => selectConversation(item.id)}
                                        onContextMenu={(e) => this.handleContextMenu(e, item.id)} // Bắt sự kiện chuột phải
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '10px 12px',
                                            cursor: 'pointer',
                                            borderRadius: '8px',
                                            backgroundColor: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                                            color: isActive ? '#fff' : '#ccc',
                                            marginBottom: '4px',
                                            position: 'relative'
                                        }}
                                    >
                                        <MessageSquare size={15} />
                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '14px', flex: 1 }}>
                                            {item.title}
                                        </span>

                                        {/* Menu popup nhỏ khi bấm chuột phải đúng vào item này */}
                                        {contextMenuId === item.id && (
                                            <div
                                                className="custom-context-menu"
                                                onClick={(e) => this.handleDeleteClick(e, item.id)}
                                                style={{
                                                    position: 'fixed',
                                                    top: contextMenuPosition.y,
                                                    left: contextMenuPosition.x,
                                                    backgroundColor: '#2b2b2b',
                                                    border: '1px solid #444',
                                                    borderRadius: '6px',
                                                    padding: '8px 12px',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                                                    zIndex: 1000,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    color: '#ff4d4f',
                                                    fontSize: '13px'
                                                }}
                                            >
                                                <Trash2 size={14} />
                                                <span>Xóa cuộc trò chuyện</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ padding: '10px', fontSize: '13px', color: '#777', textAlign: 'center' }}>
                                Chưa có cuộc trò chuyện nào
                            </div>
                        )}
                    </div>
                </div>

                <div className="sidebar-bottom">
                    <div className="user-profile">
                        <div className="avatar">
                            <User size={16} />
                        </div>
                        <span className="username">Thành Nguyễn Trung</span>
                        <Settings size={16} className="settings-icon" />
                    </div>
                </div>
            </aside>
        );
    }
}

export default PageLib;