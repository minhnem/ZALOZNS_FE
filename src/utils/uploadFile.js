
import axios from 'axios'

export const uploadFile = async (file) => {
    const data = new FormData()
    data.append('file', file)
    data.append('upload_preset', process.env.NEXT_PUBLIC_UPLOAD_PRESET)

    const api = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUD_NAME}/image/upload`

    const res = await axios.post(api, data) 
    if(res) {
        return res.data.secure_url
    } else {
        return 'Lỗi upload file'
    }
}