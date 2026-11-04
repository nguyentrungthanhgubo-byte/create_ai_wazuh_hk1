import React, { Component } from 'react';
import PageLib from './pageLib';
import PageContent from './PageContent';
import './Home.scss';
import { Menu } from 'lucide-react';

import ToolNavigation from '../Tools/ToolNavigation/ToolNavigation';
import ToolHome from '../Tools/ToolHome/ToolHome';

import ToolIPManager from '../Tools/ToolIPManager/ToolIPManager';
import ToolCreateRule from '../Tools/ToolCreateRule/ToolCreateRule';
import ToolServerMonitor from '../Tools/ToolServerMonitor/ToolServerMonitor';
import ToolAttackAnalysis from '../Tools/ToolAttackAnalysis/ToolAttackAnalysis';
import ToolIPTracking from '../Tools/ToolIPTracking/ToolIPTracking';

import {
  getAllConversations,
  createNewConversation,
  getMessagesByConversation,
  saveMessage,
  deleteConversation,
  updateConversationTitle
} from '../../services';

class Home extends Component {
  constructor(props) {
    super(props);

    this.state = {
      arrConversations: [],
      currentConversationId: '',
      arrMessages: [],
      showSidebar: true,
      activePage: 'home',
      showAppMenu: false,
    };
  }

  async componentDidMount() {
    await this.loadConversations();
  }

  // Tải danh sách hội thoại
  loadConversations = async () => {
    try {
      const conversations = await getAllConversations();

      this.setState({
        arrConversations: Array.isArray(conversations) ? conversations : []
      });

      if (
        conversations?.length > 0 &&
        !this.state.currentConversationId
      ) {
        await this.handleSelectConversation(conversations[0].id);
      }
    } catch (error) {
      console.error('Lỗi tải hội thoại:', error);
    }
  };

  // Tạo hội thoại mới
  handleCreateNewConversation = async () => {
    try {
      const conversation = await createNewConversation('Cuộc trò chuyện mới');

      if (!conversation?.id) {
        throw new Error('Backend không trả về ID hội thoại');
      }

      await this.loadConversations();
      await this.handleSelectConversation(conversation.id);
    } catch (error) {
      console.error('Lỗi tạo hội thoại:', error);
      alert('Không thể tạo hội thoại mới!');
    }
  };

  // Chọn hội thoại
  handleSelectConversation = async (conversationId) => {
    this.setState({
      currentConversationId: conversationId,
      arrMessages: []
    });

    await this.loadMessages(conversationId);
  };

  // Tải tin nhắn
  loadMessages = async (conversationId) => {
    try {
      const messages = await getMessagesByConversation(conversationId);

      // Không ghi đè tin nhắn nếu người dùng đã chuyển sang hội thoại khác
      if (
        String(this.state.currentConversationId) !== String(conversationId)
      ) {
        return;
      }

      this.setState({
        arrMessages: Array.isArray(messages) ? messages : []
      });
    } catch (error) {
      console.error('Lỗi tải tin nhắn:', error);
      this.setState({ arrMessages: [] });
    }
  };

  // Gửi tin nhắn. Backend tự gọi AI và lưu cả câu trả lời.
  handleSaveMessage = async (sender, content, skill = 'general') => {
    const { currentConversationId, arrMessages, arrConversations } = this.state;

    if (!currentConversationId) {
      alert('Vui lòng tạo hoặc chọn hội thoại trước!');
      return;
    }

    if (!content?.trim()) return;

    try {
      const result = await saveMessage(
        currentConversationId,
        sender,
        content,
        skill
      );

      // Đổi tên hội thoại theo câu hỏi đầu tiên
      if (sender === 'user' && arrMessages.length === 0) {
        const currentConversation = arrConversations.find(
          item => String(item.id) === String(currentConversationId)
        );

        if (
          currentConversation?.title === 'Cuộc trò chuyện mới' ||
          currentConversation?.title === 'New conversation'
        ) {
          const newTitle =
            content.length > 35
              ? content.substring(0, 35) + '...'
              : content;

          await updateConversationTitle(currentConversationId, newTitle);
        }
      }

      // Backend đã lưu cả user và assistant, chỉ cần tải lại lịch sử
      await this.loadMessages(currentConversationId);
      await this.loadConversations();

      return result;
    } catch (error) {
      console.error('Lỗi gửi tin nhắn:', error);

      alert(
        error.response?.data?.error ||
        error.message ||
        'Không thể gửi tin nhắn đến AI!'
      );

      throw error;
    }
  };

  // Xóa hội thoại
  handleDeleteConversation = async (conversationId) => {
    try {
      await deleteConversation(conversationId);

      const remaining = this.state.arrConversations.filter(
        item => String(item.id) !== String(conversationId)
      );

      const wasCurrent =
        String(this.state.currentConversationId) === String(conversationId);

      this.setState({
        arrConversations: remaining,
        currentConversationId: wasCurrent ? '' : this.state.currentConversationId,
        arrMessages: wasCurrent ? [] : this.state.arrMessages
      });

      if (wasCurrent && remaining.length > 0) {
        await this.handleSelectConversation(remaining[0].id);
      }
    } catch (error) {
      console.error('Lỗi xóa hội thoại:', error);
      alert('Không thể xóa hội thoại!');
    }
  };

  // ADD TOOL
  handleNavigatePage = (page) => {
    this.setState({
      activePage: page,
      showAppMenu: false
    });
  };

  renderActivePage = () => {
    const { activePage } = this.state;

    switch (activePage) {
      case 'toolHome':
        return (
          <ToolHome
            onNavigate={this.handleNavigatePage}
          />
        );

      case 'toolIPManager':
        return (
          <ToolIPManager
            onBack={() => this.handleNavigatePage('toolHome')}
          />
        );

      case 'toolCreateRule':
        return (
          <ToolCreateRule
            onBack={() => this.handleNavigatePage('toolHome')}
          />
        );

      case 'toolServerMonitor':
        return (
          <ToolServerMonitor
            onBack={() => this.handleNavigatePage('toolHome')}
          />
        );

      case 'toolAttackAnalysis':
        return (
          <ToolAttackAnalysis
            onBack={() => this.handleNavigatePage('toolHome')}
          />
        );

      case 'toolIPTracking':
        return (
          <ToolIPTracking
            onBack={() => this.handleNavigatePage('toolHome')}
          />
        );

      default:
        return (
          <PageContent
            currentConversationId={this.state.currentConversationId}
            arrMessages={this.state.arrMessages}
            saveMessage={this.handleSaveMessage}
          />
        );
    }
  };
  render() {
    const {
      arrConversations,
      currentConversationId,
      arrMessages,
      showSidebar
    } = this.state;

    return (
      <div className="gemini-container">
        {showSidebar && (
          <PageLib
            arrConversations={arrConversations}
            currentId={currentConversationId}
            selectConversation={this.handleSelectConversation}
            createNewChat={this.handleCreateNewConversation}
            deleteConversation={this.handleDeleteConversation}
            onClose={() => this.setState({ showSidebar: false })}
          />
        )}

        {!showSidebar && (
          <button
            className="sidebar-reopen-btn"
            onClick={() => this.setState({ showSidebar: true })}
            title="Mở thanh bên"
          >
            ☰
          </button>
        )}
        {/* CONTENT */}
        <button
          className={`app-menu-trigger ${showSidebar ? '' : 'sidebar-collapsed'
            }`}
          onClick={() => this.setState({
            showAppMenu: !this.state.showAppMenu
          })}
          title="Mở menu điều hướng"
        >
          <Menu size={21} />
        </button>

        <ToolNavigation
          isOpen={this.state.showAppMenu}
          activePage={this.state.activePage}
          onClose={() => this.setState({ showAppMenu: false })}
          onNavigate={this.handleNavigatePage}
        />

        {this.renderActivePage()}
      </div>
    );
  }
}

export default Home;
