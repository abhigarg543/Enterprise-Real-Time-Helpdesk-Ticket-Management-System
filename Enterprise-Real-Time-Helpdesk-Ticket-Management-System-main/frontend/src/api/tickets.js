import axios from 'axios';

const api = axios.create();

api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.token) {
      config.headers['Authorization'] = 'Bearer ' + user.token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const getTickets = async () => {
  const response = await api.get('/api/tickets');
  return response.data;
};

export const getTicketById = async (id) => {
  const response = await api.get(`/api/tickets/${id}`);
  return response.data;
};

export const createTicket = async (ticketData) => {
  const response = await api.post('/api/tickets', ticketData);
  return response.data;
};

export const updateTicketStatus = async (id, status) => {
  const response = await api.put(`/api/tickets/${id}/status?status=${status}`);
  return response.data;
};

export const assignAgent = async (id, agentId) => {
  const query = agentId ? `?agentId=${agentId}` : '';
  const response = await api.put(`/api/tickets/${id}/assign${query}`);
  return response.data;
};

export const getComments = async (ticketId) => {
  const response = await api.get(`/api/tickets/${ticketId}/comments`);
  return response.data;
};

export const addComment = async (ticketId, content, isInternal) => {
  const response = await api.post(`/api/tickets/${ticketId}/comments`, { content, isInternal });
  return response.data;
};

export const getActivityLogs = async (ticketId) => {
  const response = await api.get(`/api/tickets/${ticketId}/logs`);
  return response.data;
};

export const getAgents = async () => {
  const response = await api.get('/api/users/agents');
  return response.data;
};

// Notifications API
export const getNotifications = async () => {
  const response = await api.get('/api/notifications');
  return response.data;
};

export const getUnreadNotifications = async () => {
  const response = await api.get('/api/notifications/unread');
  return response.data;
};

export const markNotificationRead = async (id) => {
  const response = await api.post(`/api/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.post('/api/notifications/read-all');
  return response.data;
};

// Knowledge Base API
export const getAllKbArticles = async () => {
  const response = await api.get('/api/kb');
  return response.data;
};

export const searchKbArticles = async (query) => {
  const response = await api.get(`/api/kb/search?query=${encodeURIComponent(query)}`);
  return response.data;
};

// CSAT Rating API
export const submitCsaRating = async (ticketId, score, feedback) => {
  const response = await api.post(`/api/tickets/${ticketId}/rate`, { score, feedback });
  return response.data;
};

export const getCsaRating = async (ticketId) => {
  const response = await api.get(`/api/tickets/${ticketId}/rate`);
  return response.data;
};
