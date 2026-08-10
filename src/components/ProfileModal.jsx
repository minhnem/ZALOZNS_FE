import React, { useState, useEffect } from 'react';
import { Modal, Upload, message, Button, Avatar, Spin, Typography } from 'antd';
import { UploadOutlined, UserOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { updateUser } from '../features/auth/authSlice';
import { uploadFile } from '../utils/uploadFile';
import handleAPI from '../apis/handleAPI';

const { Text } = Typography;

const ProfileModal = ({ open, onCancel }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [previewImage, setPreviewImage] = useState(user?.avatar || '');

  // Cập nhật previewImage nếu user avatar thay đổi
  useEffect(() => {
    if (open) {
      setPreviewImage(user?.avatar || '');
      setFileList([]);
    }
  }, [open, user?.avatar]);

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('Vui lòng chọn ảnh trước khi lưu!');
      return;
    }

    const file = fileList[0].originFileObj;
    setLoading(true);

    try {
      // 1. Tải ảnh lên Cloudinary
      const avatarUrl = await uploadFile(file);
      if (avatarUrl === 'Lỗi upload file') {
        throw new Error('Lỗi upload ảnh lên Cloudinary');
      }

      // 2. Gửi URL ảnh mới lên Backend
      const payload = {
        fullName: user?.fullName || user?.name,
        avatar: avatarUrl
      };

      await handleAPI(`/api/auth/profile/${user.id}`, payload, 'put');
      
      // 3. Cập nhật Redux State
      dispatch(updateUser({ avatar: avatarUrl }));
      message.success('Cập nhật ảnh đại diện thành công!');
      
      setFileList([]);
      onCancel();
    } catch (error) {
      console.error(error);
      message.error('Có lỗi xảy ra khi cập nhật ảnh đại diện');
    } finally {
      setLoading(false);
    }
  };

  const beforeUpload = (file) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('Bạn chỉ có thể tải lên file định dạng JPG/PNG!');
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('Dung lượng ảnh phải nhỏ hơn 2MB!');
    }
    return isJpgOrPng && isLt2M;
  };

  const handleChange = (info) => {
    let newFileList = [...info.fileList];
    newFileList = newFileList.slice(-1); // Chỉ giữ lại 1 file cuối cùng
    setFileList(newFileList);

    if (newFileList.length > 0 && newFileList[0].originFileObj) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target.result);
      };
      reader.readAsDataURL(newFileList[0].originFileObj);
    } else {
      setPreviewImage(user?.avatar || '');
    }
  };

  return (
    <Modal
      title="Hồ sơ cá nhân"
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="back" onClick={onCancel}>
          Đóng
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          loading={loading} 
          onClick={handleUpload}
          style={{ backgroundColor: '#0d6e57', color: 'white' }}
          disabled={fileList.length === 0}
        >
          Lưu ảnh đại diện
        </Button>,
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '20px 0' }}>
        <Spin spinning={loading}>
          <Avatar 
            size={120} 
            src={previewImage || undefined} 
            icon={<UserOutlined />}
            style={{ backgroundColor: '#111827', marginBottom: 16 }}
          />
        </Spin>

        <Upload
          name="avatar"
          beforeUpload={beforeUpload}
          onChange={handleChange}
          fileList={fileList}
          showUploadList={false} // Ẩn list file mặc định của Antd vì ta đã làm preview ở Avatar
          customRequest={({ file, onSuccess }) => {
            // Giả lập upload thành công để onChange bắt được trạng thái "done"
            setTimeout(() => {
              onSuccess("ok");
            }, 0);
          }}
        >
          <Button icon={<UploadOutlined />}>Tải ảnh lên</Button>
        </Upload>
      </div>

      <div style={{ padding: '0 24px' }}>
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">Tên tài khoản:</Text>
          <div style={{ fontSize: 16, fontWeight: 500 }}>{user?.fullName || user?.name || 'Chưa cập nhật'}</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">Email:</Text>
          <div style={{ fontSize: 16, fontWeight: 500 }}>{user?.email || 'Chưa cập nhật'}</div>
        </div>
      </div>
    </Modal>
  );
};

export default ProfileModal;
