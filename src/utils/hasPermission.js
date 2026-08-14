export const hasPermission = (user, permission) => {
  if (!user || !user.permissions) return false;
  if (user.permissions.includes('*')) return true;
  return user.permissions.includes(permission);
};
