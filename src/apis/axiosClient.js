import axios from 'axios'
import queryString from 'query-string'

const baseURL = 'http://localhost:3001'
//const baseURL = 'https://doan-server-9zrj.onrender.com'

const axiosClient = axios.create({
    baseURL: baseURL,
    paramsSerializer: (params) => queryString.stringify(params)
})

axiosClient.interceptors.request.use(async (config) => {
    config.headers = {
        Accept: 'application/json',
        ...config.headers
    }
    return {...config, data: config.data ?? null}
})

axiosClient.interceptors.response.use((res) => {
    if(res.data && res.status >= 200 && res.status < 300){
        return res.data
    }else {
        return Promise.reject(res.data);
    }
}, (error) => {
    const {response} = error
    return Promise.reject(response?.data || error)
})

export default axiosClient
