import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useModal } from '../../contexts/ModalContext';
import { User, View, PERMISSIONS_LIST } from '../../types';
import { Users, Plus, Edit, Trash2, Key, ToggleLeft, ToggleRight, X, User as UserIcon, Lock, Check, ShieldCheck, ChefHat, Store } from 'lucide-react';
import { EmptyState } from '../EmptyState';

export const UserManagementView: React.FC = () => {
  const { users, registerUser, updateUser, deleteUser, currentUser } = useAuth();
  const { showToast } = useToast();
  const { showModal } = useModal();

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ fullName: '', username: '', password: '' });
  const [selectedPermissions, setSelectedPermissions] = useState<Set<View>>(new Set());

  const openUserModal = (user: User | null) => {
    setEditingUser(user);
    if (user) {
      setFormData({ fullName: user.fullName, username: user.username, password: '' }); // Don't show old password
    } else {
      setFormData({ fullName: '', username: '', password: '' });
    }
    setIsUserModalOpen(true);
  };

  const openPermissionModal = (user: User) => {
    setEditingUser(user);
    setSelectedPermissions(new Set(user.permissions));
    setIsPermissionModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!formData.fullName || !formData.username) {
        showToast('نام و نام کاربری الزامی است', 'error');
        return;
    }

    try {
        if (editingUser) { // Updating existing user
            const updates: Partial<User> = {
                fullName: formData.fullName,
                username: formData.username,
            };
            if (formData.password) {
                updates.password = formData.password;
            }
            await updateUser(editingUser.id, updates);
            showToast('کاربر با موفقیت ویرایش شد.');
        } else { // Creating new user
            if (!formData.password) {
                showToast('رمز عبور برای کاربر جدید الزامی است', 'error');
                return;
            }
            await registerUser({
                fullName: formData.fullName,
                username: formData.username,
                password: formData.password,
                role: 'server', // Default role, can be changed visually
                permissions: ['pos'], // Default permission for new user
                isActive: true
            });
            showToast('کاربر جدید با موفقیت اضافه شد.');
        }
        setIsUserModalOpen(false);
    } catch (error: any) {
        showToast(error.message, 'error');
    }
  };

  const handleSavePermissions = async () => {
      if (!editingUser) return;
      await updateUser(editingUser.id, { permissions: Array.from(selectedPermissions) });
      showToast('دسترسی‌ها با موفقیت ذخیره شد.');
      setIsPermissionModalOpen(false);
  };

  const handleDeleteUser = (user: User) => {
      if (user.id === currentUser?.id) {
          showToast('شما نمی‌توانید حساب کاربری خود را حذف کنید.', 'error');
          return;
      }
      showModal(
          `حذف ${user.fullName}`,
          'آیا از حذف این کاربر اطمینان دارید؟ این عمل غیرقابل بازگشت است.',
          async () => {
              await deleteUser(user.id);
              showToast('کاربر با موفقیت حذف شد.', 'success');
          }
      );
  };

  const toggleUserStatus = async (user: User) => {
      if (user.id === currentUser?.id) {
          showToast('شما نمی‌توانید حساب کاربری خود را غیرفعال کنید.', 'error');
          return;
      }
      await updateUser(user.id, { isActive: !user.isActive });
      showToast(`کاربر ${user.fullName} ${!user.isActive ? 'فعال' : 'غیرفعال'} شد.`);
  };

  const togglePermission = (permission: View) => {
      setSelectedPermissions(prev => {
          const newSet = new Set(prev);
          if (newSet.has(permission)) {
              newSet.delete(permission);
          } else {
              newSet.add(permission);
          }
          return newSet;
      });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'manager': return <ShieldCheck className="w-4 h-4 text-indigo-500" />;
      case 'chef': return <ChefHat className="w-4 h-4 text-orange-500" />;
      case 'cashier': return <Store className="w-4 h-4 text-emerald-500" />;
      default: return <UserIcon className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 md:p-12 pt-24 pb-32 md:pb-12 md:pt-12 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <Users className="w-8 h-8 text-indigo-600" />
                    مدیریت کاربران
                </h2>
                <p className="text-slate-400 font-bold text-sm mt-1">{users.length} کاربر فعال در سیستم</p>
            </div>
            <button
                onClick={() => openUserModal(null)}
                className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-slate-200 hover:scale-105 active:scale-95 transition-transform"
            >
                <Plus className="w-5 h-5"/>
                افزودن کاربر جدید
            </button>
        </div>

        {users.length === 0 ? (
            <EmptyState
                icon={<Users className="w-12 h-12" />}
                title="کاربری یافت نشد"
                description="اولین کاربر پرسنل خود را برای شروع اضافه کنید."
                action={{ label: "افزودن کاربر", onClick: () => openUserModal(null) }}
            />
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map(user => (
                    <div key={user.id} className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-5 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-lg text-slate-800">{user.fullName}</p>
                                    <p className="text-sm text-slate-400 font-mono">{user.username}</p>
                                </div>
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                                    {getRoleIcon(user.role)}
                                    <span>{user.role}</span>
                                </div>
                            </div>
                            <div className="my-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-500">وضعیت</span>
                                <button onClick={() => toggleUserStatus(user)} className="flex items-center gap-2 text-sm font-bold">
                                    {user.isActive ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                                    <span className={user.isActive ? 'text-emerald-600' : 'text-slate-400'}>
                                        {user.isActive ? 'فعال' : 'غیرفعال'}
                                    </span>
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => openPermissionModal(user)} className="flex-1 flex items-center justify-center gap-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-sm font-bold py-3 rounded-xl transition-colors">
                                <Key className="w-4 h-4"/> دسترسی‌ها
                            </button>
                            <button onClick={() => openUserModal(user)} className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors"><Edit className="w-4 h-4"/></button>
                            <button onClick={() => handleDeleteUser(user)} className="p-3 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-500 rounded-xl transition-colors"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    </div>
                ))}
            </div>
        )}
        
        {isUserModalOpen && (
             <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="text-xl font-black text-slate-800">{editingUser ? 'ویرایش کاربر' : 'کاربر جدید'}</h3>
                        <button onClick={() => setIsUserModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="نام کامل" className="w-full bg-slate-50 p-4 rounded-xl font-bold" />
                        <input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="نام کاربری (ایمیل)" className="w-full bg-slate-50 p-4 rounded-xl font-bold" />
                        <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={editingUser ? 'رمز عبور جدید (اختیاری)' : 'رمز عبور'} className="w-full bg-slate-50 p-4 rounded-xl font-bold" />
                    </div>
                    <div className="p-6 border-t"><button onClick={handleSaveUser} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl">ذخیره</button></div>
                 </div>
            </div>
        )}

        {isPermissionModalOpen && editingUser && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="text-xl font-black text-slate-800">دسترسی‌های {editingUser.fullName}</h3>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar grid grid-cols-2 gap-4">
                        {PERMISSIONS_LIST.map(p => (
                            <button key={p.id} onClick={() => togglePermission(p.id)} className={`p-4 rounded-2xl border-2 text-right font-bold transition-all flex items-center gap-3 ${selectedPermissions.has(p.id) ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'bg-slate-50 border-transparent text-slate-600'}`}>
                                {selectedPermissions.has(p.id) ? <Check className="w-5 h-5 text-indigo-500" /> : <div className="w-5 h-5 border-2 border-slate-300 rounded-md"></div>}
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <div className="p-6 border-t"><button onClick={handleSavePermissions} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl">ذخیره دسترسی‌ها</button></div>
                </div>
            </div>
        )}

    </div>
  );
};
