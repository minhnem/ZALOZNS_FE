import apiClient from '../../services/apiClient';

export const fetchBotConfigs = async () => {
  return apiClient.get('/bot-config');
};

export const updateBotConfig = async (id, data) => {
  return apiClient.put(`/bot-config/${id}`, data);
};
