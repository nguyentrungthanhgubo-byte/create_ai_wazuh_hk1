import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Lấy danh sách hội thoại
export const getAllConversations = async () => {
  const response = await api.get('/conversations');
  return response.data;
};

// Tạo hội thoại mới
export const createNewConversation = async (title = 'Cuộc trò chuyện mới') => {
  const response = await api.post('/conversations', { title });
  return response.data;
};

// Lấy tin nhắn theo hội thoại
export const getMessagesByConversation = async (conversationId) => {
  const response = await api.get(`/messages/${conversationId}`);
  return response.data;
};

// Gửi tin nhắn và nhận phản hồi AI
export const saveMessage = async (
  conversationId,
  sender,
  content,
  skill = 'general'
) => {
  const response = await api.post('/messages', {
    conversation_id: conversationId,
    sender,
    content,
    skill
  });

  return response.data;
};

// Xóa hội thoại
export const deleteConversation = async (conversationId) => {
  const response = await api.delete(`/conversations/${conversationId}`);
  return response.data;
};

// Đổi tên hội thoại
export const updateConversationTitle = async (conversationId, title) => {
  const response = await api.put(`/conversations/${conversationId}`, {
    title
  });

  return response.data;
};
