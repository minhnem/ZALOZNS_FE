import apiClient from '../../services/apiClient';

export const fetchFacebookPages = async () => {
  return apiClient.get('/facebook-pages');
};

export const connectFacebookPage = async (data) => {
  return apiClient.post('/facebook-pages/connect', data);
};
