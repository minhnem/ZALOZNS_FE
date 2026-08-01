import axiosClient from './axiosClient';

const zaloZnsApi = {
  getConfig: () => {
    return axiosClient.get('/api/zns/config');
  },
  updateConfig: (data) => {
    return axiosClient.post('/api/zns/config', data);
  },
  addMilestone: (data) => {
    return axiosClient.post('/api/zns/milestones', data);
  },
  editMilestone: (id, data) => {
    return axiosClient.put(`/api/zns/milestones/${id}`, data);
  },
  deleteMilestone: (id) => {
    return axiosClient.delete(`/api/zns/milestones/${id}`);
  }
};

export default zaloZnsApi;
