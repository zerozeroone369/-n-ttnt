import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, Store, ShieldCheck, Sparkles, UserCheck, Heart, User, LogOut, Smartphone } from 'lucide-react';
import { formatCurrency } from '../services/aiChatEngine.js';

function isRunningStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.matchMedia?.('(display-mode: fullscreen)')?.matches ||
    window.navigator?.standalone === true
  );
}

export default function Header({
  cartCount,
  cartTotal,
  onOpenCart,
  wishlistCount,
  onOpenWishlist,
  ordersCount,
  onOpenOrders,
  onOpenDownload,
  searchQuery,
  setSearchQuery,
  isAdminView,
  setIsAdminView,
  onOpenChat,
  currentUser,
  onOpenAuth,
  onLogout
}) {
  const [isStandalonePwa, setIsStandalonePwa] = useState(() => isRunningStandalonePwa());

  useEffect(() => {
    const syncStandalone = () => setIsStandalonePwa(isRunningStandalonePwa());
    syncStandalone();
    const mq = window.matchMedia?.('(display-mode: standalone)');
    mq?.addEventListener?.('change', syncStandalone);
    window.addEventListener('appinstalled', syncStandalone);
    return () => {
      mq?.removeEventListener?.('change', syncStandalone);
      window.removeEventListener('appinstalled', syncStandalone);
    };
  }, []);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] px-1.5 py-0.2 rounded font-bold whitespace-nowrap">
            👑 <span className="hidden sm:inline">Chủ Shop</span><span className="sm:hidden">Admin</span>
          </span>
        );
      case 'staff':
        return (
          <span className="bg-blue-100 text-blue-900 border border-blue-300 text-[10px] px-1.5 py-0.2 rounded font-bold whitespace-nowrap">
            🛠️ <span className="hidden sm:inline">Nhân Viên</span><span className="sm:hidden">Kho</span>
          </span>
        );
      case 'customer':
        return (
          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] px-1.5 py-0.2 rounded font-bold whitespace-nowrap">
            👤 <span className="hidden sm:inline">Thành Viên</span><span className="sm:hidden">Khách</span>
          </span>
        );
      default:
        return null;
    }
  };

  const handleAdminToggle = () => {
    if (!currentUser && !isAdminView) {
      onOpenAuth();
      return;
    }
    setIsAdminView(!isAdminView);
  };

  const canAccessPortal = Boolean(currentUser?.role === 'admin' || currentUser?.role === 'staff' || isAdminView);
  const showInstallControl = !isAdminView && !isStandalonePwa;

  return (
    <header className="sticky top-0 z-40 w-full max-w-full overflow-x-clip bg-white/95 backdrop-blur-md border-b border-stone-200 transition-all pt-safe">
      {/* Top Announcement Bar */}
      <div className="bg-stone-900 text-stone-200 text-[11px] sm:text-xs py-1.5 px-3 sm:px-4 text-center flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 font-medium leading-snug">
        <span className="inline-flex items-center gap-1 text-amber-300 whitespace-nowrap">
          <Sparkles className="w-3.5 h-3.5 animate-spin shrink-0" style={{ animationDuration: '3s' }} /> 
          Ưu đãi khai trương:
        </span>
        <span>Nhập mã <strong className="text-amber-300 bg-stone-800 px-1.5 py-0.5 rounded tracking-wider">TIEMMOI</strong> giảm 20.000đ • Freeship đơn từ 450.000đ</span>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
          {/* Brand Logo */}
          <div 
            onClick={() => setIsAdminView(false)}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group min-w-0 flex-1 md:flex-initial"
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-700 via-amber-800 to-stone-900 flex items-center justify-center text-white shadow-md shadow-amber-900/20 group-hover:scale-105 transition-transform flex-shrink-0">
              <Store className="w-5 h-5 sm:w-6 sm:h-6 text-amber-100" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-[15px] sm:text-2xl tracking-tight text-stone-900 font-serif block truncate">Tiệm Nhà Nhỏ</span>
              <p className="text-xs text-stone-500 hidden sm:block truncate">Living & Lifestyle Selection</p>
            </div>
          </div>

          {/* Search Bar */}
          {!isAdminView && (
            <div className="flex-1 max-w-lg mx-2 hidden md:block">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm áo linen, nến thơm, ly gốm, quà tặng..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-full border border-stone-200 bg-stone-50 text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700 focus:bg-white transition-all shadow-inner"
                />
                <Search className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700 bg-stone-200 hover:bg-stone-300 rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            
            {/* Nút Cài App Trên Desktop/Tablet (trên mobile tự đặt gọn cùng hàng tìm kiếm & ẩn khi đang mở App đã cài) */}
            {showInstallControl && (
              <button
                onClick={onOpenDownload}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Cài app Tiệm Nhà Nhỏ lên điện thoại hoặc máy tính (Web App)"
              >
                <Smartphone className="w-4 h-4 text-amber-700 animate-pulse" />
                <span>Cài App</span>
              </button>
            )}

            {/* Wishlist Button */}
            {!isAdminView && (
              <button
                onClick={onOpenWishlist}
                className="relative p-2 sm:p-2.5 rounded-xl bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-600 border border-stone-200 transition-colors"
                title="Sản phẩm yêu thích"
              >
                <Heart className={`w-4 h-4 ${wishlistCount > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">
                    {wishlistCount}
                  </span>
                )}
              </button>
            )}

            {/* User Account / Auth Button */}
            {currentUser ? (
              <div className="flex items-center gap-1 sm:gap-1.5 bg-stone-100 border border-stone-200 p-1 sm:p-1.5 rounded-xl min-w-0">
                <div className="flex flex-col text-left px-1 sm:px-1.5 min-w-0">
                  <span className="text-[11px] sm:text-xs font-bold text-stone-900 max-w-[68px] sm:max-w-[115px] truncate leading-tight">
                    {currentUser.name}
                  </span>
                  <div className="mt-0.5 flex items-center gap-1 flex-wrap">
                    {getRoleBadge(currentUser.role)}
                    {currentUser.isOfflineDemo && (
                      <span className="hidden sm:inline bg-amber-50 text-amber-800 border border-amber-300 text-[9px] px-1 py-0.2 rounded font-bold uppercase">
                        Demo Offline
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors flex-shrink-0"
                  title="Đăng xuất"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors whitespace-nowrap"
                title="Đăng nhập hoặc đăng ký tài khoản"
              >
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-600 flex-shrink-0" />
                <span>Đăng Nhập</span>
              </button>
            )}

            {/* Admin / Staff Portal Toggle (Desktop/Tablet) */}
            {canAccessPortal && (
              <button
                onClick={handleAdminToggle}
                className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  isAdminView
                    ? 'bg-amber-900 text-white border-amber-900 shadow-sm'
                    : 'bg-amber-100/70 text-amber-950 hover:bg-amber-200/80 border-amber-300'
                }`}
              >
                {isAdminView ? (
                  <>
                    <UserCheck className="w-4 h-4 text-amber-300" />
                    <span>Về Cửa Hàng</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-amber-800" />
                    <span>{currentUser?.role === 'staff' ? 'Xử Lý Đơn Hàng' : 'Quản Trị Shop'}</span>
                  </>
                )}
              </button>
            )}

            {/* Shopping Cart Button */}
            {!isAdminView && (
              <button
                onClick={onOpenCart}
                className="relative flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow active:scale-95 flex-shrink-0"
              >
                <div className="relative">
                  <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2.5 bg-rose-500 text-white font-bold text-[10px] w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                      {cartCount}
                    </span>
                  )}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-tight">
                  <span className="text-[10px] text-stone-300 uppercase tracking-wider font-semibold">Giỏ hàng</span>
                  <span className="text-xs font-bold text-amber-200">{formatCurrency(cartTotal)}</span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search & Quick Controls Row (Luôn vừa khít màn hình dọc 320px+ mà không tràn ngang) */}
        {(!isAdminView || canAccessPortal) && (
          <div className="pb-2.5 md:hidden flex items-center gap-2">
            {!isAdminView && (
              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm, quà tặng..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-700"
                />
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            )}

            {showInstallControl && (
              <button
                onClick={onOpenDownload}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-all cursor-pointer shrink-0 whitespace-nowrap"
                title="Cài app Tiệm Nhà Nhỏ"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-700" />
                <span>Cài App</span>
              </button>
            )}

            {canAccessPortal && (
              <button
                onClick={handleAdminToggle}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all border shrink-0 whitespace-nowrap ${
                  isAdminView
                    ? 'w-full bg-amber-900 text-white border-amber-900 shadow-sm'
                    : 'bg-amber-100/70 text-amber-950 hover:bg-amber-200/80 border-amber-300'
                }`}
              >
                {isAdminView ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-amber-300" />
                    <span>Quay Lại Cửa Hàng</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-800" />
                    <span>{currentUser?.role === 'staff' ? 'Đơn Hàng' : 'Quản Trị'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
