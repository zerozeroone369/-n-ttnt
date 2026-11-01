import React, { useState } from 'react';
import { X, Lock, Mail, User, Phone, MapPin, ShieldCheck, Check, Sparkles, AlertCircle } from 'lucide-react';
import { ApiClient } from '../services/api.js';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Hà Nội');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isLoginMode) {
        const res = await ApiClient.auth.login(email, password);
        setSuccessMsg(`Chào mừng bạn quay trở lại, ${res.user.name}!`);
        setTimeout(() => {
          onAuthSuccess(res.user);
          onClose();
        }, 800);
      } else {
        const res = await ApiClient.auth.register({
          email,
          password,
          name,
          phone,
          address,
          city
        });
        setSuccessMsg(`Đăng ký tài khoản thành công! Xin chào ${res.user.name}`);
        setTimeout(() => {
          onAuthSuccess(res.user);
          onClose();
        }, 800);
      }
    } catch (err) {
      setError(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setLoading(true);
    try {
      const res = await ApiClient.auth.login(demoEmail, demoPassword);
      setSuccessMsg(`Đăng nhập thành công với vai trò: ${res.user.role.toUpperCase()}`);
      setTimeout(() => {
        onAuthSuccess(res.user);
        onClose();
      }, 700);
    } catch (err) {
      setError(err.message || 'Lỗi đăng nhập nhanh.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="bg-stone-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-stone-400 hover:text-white p-1 rounded-full hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Hệ Thống Xác Thực & Phân Quyền</span>
          </div>
          <h3 className="font-serif font-bold text-xl text-white">
            {isLoginMode ? 'Đăng Nhập Tài Khoản' : 'Đăng Ký Thành Viên Mới'}
          </h3>
          <p className="text-stone-400 text-xs mt-1">
            {isLoginMode
              ? 'Đăng nhập để theo dõi đơn hàng, quản trị kho hoặc cửa hàng'
              : 'Tạo tài khoản để nhận ưu đãi thành viên và lưu địa chỉ nhận hàng'}
          </p>
        </div>

        {/* Quick Demo Accounts Selection */}
        <div className="bg-amber-50/70 border-b border-amber-200/60 p-4">
          <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Đăng Nhập Nhanh Trải Nghiệm (1-Click Demo):</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin@tiemnhanho.vn', 'admin123')}
              className="p-2 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-300 text-stone-900 text-left transition-all group"
            >
              <span className="font-bold text-[11px] block text-amber-900">
                👑 Chủ Shop
              </span>
              <span className="text-[10px] text-stone-500 block truncate">Toàn quyền</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('staff@tiemnhanho.vn', 'staff123')}
              className="p-2 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-300 text-stone-900 text-left transition-all group"
            >
              <span className="font-bold text-[11px] block text-blue-900">
                🛠️ Nhân Viên
              </span>
              <span className="text-[10px] text-stone-500 block truncate">Kho & Đơn</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('khachhang@gmail.com', 'khach123')}
              className="p-2 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-300 text-stone-900 text-left transition-all group"
            >
              <span className="font-bold text-[11px] block text-emerald-900">
                👤 Khách Mua
              </span>
              <span className="text-[10px] text-stone-500 block truncate">Hà Nội</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 flex items-center gap-2 text-xs font-bold">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Name (for registration) */}
          {!isLoginMode && (
            <div>
              <label className="block font-bold text-stone-700 mb-1">Họ và tên *</label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Thu Hà"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-800 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block font-bold text-stone-700 mb-1">Email đăng nhập *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="tenban@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block font-bold text-stone-700 mb-1">Mật khẩu *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                placeholder="Ít nhất 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Additional fields for register */}
          {!isLoginMode && (
            <>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Số điện thoại</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    placeholder="0912 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Địa chỉ giao hàng</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Số nhà, ngõ, tên đường..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-800 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-amber-900 hover:bg-amber-800 text-white font-bold rounded-xl shadow-md transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Đang xử lý...' : (isLoginMode ? 'Đăng Nhập Ngay' : 'Tạo Tài Khoản Thành Viên')}
          </button>

          {/* Mode toggle */}
          <div className="text-center pt-2 text-stone-500 text-xs">
            {isLoginMode ? (
              <p>
                Chưa có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => { setIsLoginMode(false); setError(''); }}
                  className="font-bold text-amber-900 hover:underline"
                >
                  Đăng ký ngay
                </button>
              </p>
            ) : (
              <p>
                Đã có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => { setIsLoginMode(true); setError(''); }}
                  className="font-bold text-amber-900 hover:underline"
                >
                  Đăng nhập tại đây
                </button>
              </p>
            )}
          </div>
        </form>

      </div>
    </div>
  );
}
