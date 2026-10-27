import axios from 'axios';

/**
 * Utility tải file Excel từ API backend an toàn, tránh lỗi file hỏng (corrupted)
 * @param {string} endpoint - API path (ví dụ: '/api/purchase-orders/template')
 * @param {string} defaultFilename - Tên file khi tải về máy
 */
export const downloadExcel = async (endpoint, defaultFilename = 'data.xlsx') => {
  const baseURL = (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
    ? `http://${window.location.hostname}:3001`
    : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001');
  let token = null;

  if (typeof window !== 'undefined') {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        token = userObj?.token || null;
      }
      if (!token) {
        token = localStorage.getItem('token');
      }
    } catch (e) {
      console.error('Lỗi khi đọc token từ localStorage:', e);
    }
  }

  const url = endpoint.startsWith('http') ? endpoint : `${baseURL}${endpoint}`;

  const response = await axios.get(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    responseType: 'blob'
  });

  // Nếu backend trả về JSON (ví dụ token hết hạn, không có quyền, hoặc lỗi 400/500 nhưng trả blob json)
  if (response.data && response.data.type === 'application/json') {
    const text = await response.data.text();
    let errorMessage = 'Lỗi khi tải file từ hệ thống';
    try {
      const json = JSON.parse(text);
      if (json.message) errorMessage = json.message;
    } catch (_) {}
    throw new Error(errorMessage);
  }

  // response.data là dữ liệu nhị phân chuẩn XLSX do axios trả về
  const blob = response.data instanceof Blob
    ? response.data
    : new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', defaultFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
  return true;
};

export default downloadExcel;
