import axios from 'axios'
import queryString from 'query-string'

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
    const { response } = error
    const errMessage = response?.data?.message || error.message || 'Đã có lỗi xảy ra';
    console.error("🔴 Lỗi Axios API Call:", errMessage);
    
    return Promise.reject(errMessage);
})

export default axiosClient
