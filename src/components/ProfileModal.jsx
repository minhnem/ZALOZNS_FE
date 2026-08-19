import React, { useState, useEffect } from 'react';
import { Modal, Upload, message, Button, Avatar, Spin, Tabs, Form, Input } from 'antd';
import { UploadOutlined, UserOutlined, LockOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { updateUser } from '../features/auth/authSlice';
import { uploadFile } from '../utils/uploadFile';
import handleAPI from '../apis/handleAPI';

const ProfileModal = ({ open, onCancel }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [previewImage, setPreviewImage] = useState(user?.avatar || '');
  const [formProfile] = Form.useForm();
  const [formPassword] = Form.useForm();

  useEffect(() => {
    if (open) {
      setPreviewImage(user?.avatar || '');
      setFileList([]);
      formProfile.setFieldsValue({
        fullName: user?.fullName || user?.name || '',
        email: user?.email || '',
      });
      formPassword.resetFields();
    }
  }, [open, user, formProfile, formPassword]);

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
    let newFileList = [...info.fileList].slice(-1);
    setFileList(newFileList);
    if (newFileList.length > 0 && newFileList[0].originFileObj) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewImage(e.target.result);
      reader.readAsDataURL(newFileList[0].originFileObj);
    } else {
      setPreviewImage(user?.avatar || '');
    }
  };

  const handleUpdateProfile = async (values) => {
    setLoadingProfile(true);
    try {
      let avatarUrl = user?.avatar;
      
      if (fileList.length > 0) {
        const file = fileList[0].originFileObj;
        avatarUrl = await uploadFile(file);
        if (avatarUrl === 'Lỗi upload file') {
          throw new Error('Lỗi upload ảnh lên Cloudinary');
        }
      }

      const payload = {
        fullName: values.fullName,
        avatar: avatarUrl
      };

      await handleAPI(`/api/auth/profile/${user.id}`, payload, 'put');
      
      dispatch(updateUser({ avatar: avatarUrl, fullName: values.fullName }));
      message.success('Cập nhật hồ sơ thành công!');
      
      setFileList([]);
      onCancel();
    } catch (error) {
      console.error(error);
      message.error('Có lỗi xảy ra khi cập nhật hồ sơ.');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      return message.error('Mật khẩu xác nhận không khớp!');
    }
    setLoadingPassword(true);
    try {
      const payload = {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword
      };
      await handleAPI(`/api/auth/change-password/${user.id}`, payload, 'put');
      message.success('Đổi mật khẩu thành công!');
      formPassword.resetFields();
      onCancel();
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || 'Có lỗi xảy ra khi đổi mật khẩu.');
    } finally {
      setLoadingPassword(false);
    }
  };

  const items = [
    {
      key: '1',
      label: 'Thông tin cá nhân',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
          <Form form={formProfile} layout="vertical" onFinish={handleUpdateProfile}>
            <Form.Item label="Email" name="email" style={{ marginBottom: 16 }}>
              <Input size="large" disabled style={{ backgroundColor: '#f5f5f5', color: '#888' }} />
            </Form.Item>
            <Form.Item 
              label="Tên hiển thị" 
              name="fullName"
              rules={[{ required: true, message: 'Vui lòng nhập tên hiển thị!' }]}
              style={{ marginBottom: 16 }}
            >
              <Input size="large" placeholder="Nhập tên hiển thị" />
            </Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loadingProfile}
              size="large"
              style={{ backgroundColor: '#0d6e57', color: 'white', width: '100%', marginTop: '8px' }}
            >
              Lưu thay đổi
            </Button>
          </Form>
        </div>
      ),
    },
    {
      key: '2',
      label: 'Bảo mật',
      children: (
        <Form form={formPassword} layout="vertical" onFinish={handleChangePassword} style={{ marginTop: '10px' }}>
          <Form.Item 
            label="Mật khẩu hiện tại" 
            name="oldPassword"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại!' }]}
            style={{ marginBottom: 16 }}
          >
            <Input.Password size="large" placeholder="Nhập mật khẩu hiện tại" prefix={<LockOutlined />} />
          </Form.Item>
          <Form.Item 
            label="Mật khẩu mới" 
            name="newPassword"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
              { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự!' }
            ]}
            style={{ marginBottom: 16 }}
          >
            <Input.Password size="large" placeholder="Nhập mật khẩu mới" prefix={<LockOutlined />} />
          </Form.Item>
          <Form.Item 
            label="Xác nhận mật khẩu mới" 
            name="confirmPassword"
            rules={[{ required: true, message: 'Vui lòng xác nhận mật khẩu mới!' }]}
            style={{ marginBottom: 16 }}
          >
            <Input.Password size="large" placeholder="Nhập lại mật khẩu mới" prefix={<LockOutlined />} />
          </Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loadingPassword}
            size="large"
            style={{ backgroundColor: '#0d6e57', color: 'white', width: '100%', marginTop: '8px' }}
          >
            Đổi mật khẩu
          </Button>
        </Form>
      ),
    },
  ];

  return (
    <Modal
      title={<div style={{ fontSize: '18px', fontWeight: 'bold' }}>Quản lý tài khoản</div>}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={480}
      centered
      destroyOnClose
      bodyStyle={{ padding: '20px 24px' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
        <Spin spinning={loadingProfile}>
          <Avatar 
            size={100} 
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
          showUploadList={false}
          customRequest={({ onSuccess }) => setTimeout(() => onSuccess("ok"), 0)}
        >
          <Button icon={<UploadOutlined />}>Tải ảnh lên</Button>
        </Upload>
      </div>
      <Tabs defaultActiveKey="1" items={items} />
    </Modal>
  );
};

export default ProfileModal;
