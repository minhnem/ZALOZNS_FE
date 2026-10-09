import axios from 'axios'
import queryString from 'query-string'
import { message } from 'antd'

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
// const baseURL = 'https://api.truenet.vn'

const axiosClient = axios.create({
    baseURL: baseURL,
    paramsSerializer: (params) => queryString.stringify(params)
})

axiosClient.interceptors.request.use(async (config) => {
    let token = null;
    if (typeof window !== 'undefined') {
        try {
            const userObj = JSON.parse(localStorage.getItem('user'));
            if (userObj && userObj.token) {
                token = userObj.token;
            }
        } catch (e) {
            console.error("Lỗi parse user từ localStorage:", e);
        }
    }
    
    config.headers = {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...config.headers
    }
    return { ...config, data: config.data ?? null }
})

axiosClient.interceptors.response.use((res) => {
    if (res.data && res.status >= 200 && res.status < 300) {
        return res.data
    } else {
        return Promise.reject(res.data);
    }
}, (error) => {
    const { response } = error;
    
    // Xử lý tự động đăng xuất khi token hết hạn hoặc không hợp lệ (lỗi 401)
    // LƯU Ý: Không áp dụng chặn nếu API đang gọi là /login (để form login tự bắt lỗi sai mật khẩu)
    if (response && response.status === 401 && !error.config.url.includes('/login')) {
        console.error("🔴 Token hết hạn hoặc không hợp lệ, đang đăng xuất...");
        if (typeof window !== 'undefined') {
            localStorage.removeItem('user');
            // Hiển thị thông báo thân thiện
            message.warning("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!");
            // Đợi 1.5s để người dùng kịp đọc thông báo rồi mới đá ra
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);
            
            // Trả về một Promise "treo" (không resolve hay reject) 
            // để ngăn không cho luồng code chạy tiếp vào .catch() của các Component
            return new Promise(() => {});
        }
    }

    const errMessage = response?.data?.message || error.message || 'Đã có lỗi xảy ra';
    console.error("🔴 Lỗi Axios API Call:", errMessage);
    
    return Promise.reject(errMessage);
})

export default axiosClient
