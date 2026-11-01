import React from 'react';
import { ShoppingBag, Search, Store, ShieldCheck, Sparkles, UserCheck, Heart, PackageCheck, User, LogOut, Bell, Smartphone } from 'lucide-react';
import { formatCurrency } from '../services/aiChatEngine.js';

export default function Header({
  cartCount,
  cartTotal,
  onOpenCart,
  wishlistCount,
  onOpenWishlist,
  ordersCount,
  onOpenOrders,
  updatesCount = 0,
  onOpenUpdates,
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
  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] px-1.5 py-0.2 rounded font-bold">👑 Chủ Shop</span>;
      case 'staff':
        return <span className="bg-blue-100 text-blue-900 border border-blue-300 text-[10px] px-1.5 py-0.2 rounded font-bold">🛠️ Nhân Viên</span>;
      case 'customer':
        return <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] px-1.5 py-0.2 rounded font-bold">👤 Thành Viên</span>;
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

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 transition-all">
      {/* Top Announcement Bar */}
      <div className="bg-stone-900 text-stone-200 text-xs py-1.5 px-4 text-center flex items-center justify-center gap-2 font-medium">
        <span className="inline-flex items-center gap-1 text-amber-300">
          <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} /> 
          Ưu đãi khai trương:
        </span>
        <span>Nhập mã <strong className="text-amber-300 bg-stone-800 px-1.5 py-0.5 rounded tracking-wider">TIEMMOI</strong> giảm 20.000đ • Miễn phí vận chuyển đơn từ 450.000đ</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Brand Logo */}
          <div 
            onClick={() => setIsAdminView(false)}
            className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-700 via-amber-800 to-stone-900 flex items-center justify-center text-white shadow-md shadow-amber-900/20 group-hover:scale-105 transition-transform">
              <Store className="w-6 h-6 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-stone-900 font-serif">Tiệm Nhà Nhỏ</span>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-full border border-amber-300">Boutique</span>
              </div>
              <p className="text-xs text-stone-500 hidden sm:block">Living & Lifestyle Selection</p>
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
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">

            {/* Install / Download App Button */}
            {!isAdminView && (
              <button
                onClick={onOpenDownload}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200/80 transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Cài đặt App Tiệm Nhà Nhỏ lên điện thoại"
              >
                <Smartphone className="w-4 h-4 text-orange-600 animate-pulse" />
                <span className="hidden sm:inline">Cài App</span>
                <span className="sm:hidden text-[11px]">App</span>
              </button>
            )}

            {/* Shop Updates Bell Icon */}
            {!isAdminView && (
              <button
                onClick={onOpenUpdates}
                className="relative p-2.5 rounded-xl bg-stone-100 hover:bg-amber-50 text-stone-700 hover:text-amber-800 border border-stone-200 transition-colors cursor-pointer"
                title="Bản cập nhật từ Shop & Shopee"
              >
                <Bell className="w-4 h-4" />
                {updatesCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white animate-bounce">
                    {updatesCount}
                  </span>
                )}
              </button>
            )}
            
            {/* Customer Orders button */}
            {!isAdminView && (
              <button
                onClick={onOpenOrders}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors"
                title="Xem đơn hàng của bạn"
              >
                <PackageCheck className="w-4 h-4 text-stone-600" />
                <span className="hidden sm:inline">Đơn của tôi</span>
                {ordersCount > 0 && (
                  <span className="bg-amber-900 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {ordersCount}
                  </span>
                )}
              </button>
            )}

            {/* Wishlist Button */}
            {!isAdminView && (
              <button
                onClick={onOpenWishlist}
                className="relative p-2.5 rounded-xl bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-600 border border-stone-200 transition-colors"
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
              <div className="flex items-center gap-1.5 bg-stone-100 border border-stone-200 p-1.5 rounded-xl">
                <div className="flex flex-col text-left px-1.5">
                  <span className="text-xs font-bold text-stone-900 max-w-[110px] truncate leading-tight">
                    {currentUser.name}
                  </span>
                  <div className="mt-0.5">{getRoleBadge(currentUser.role)}</div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors"
                title="Đăng nhập hoặc đăng ký tài khoản"
              >
                <User className="w-4 h-4 text-stone-600" />
                <span>Đăng Nhập</span>
              </button>
            )}

            {/* Admin / Staff Portal Toggle */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'staff' || isAdminView) && (
              <button
                onClick={handleAdminToggle}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  isAdminView
                    ? 'bg-amber-900 text-white border-amber-900 shadow-sm'
                    : 'bg-amber-100/70 text-amber-950 hover:bg-amber-200/80 border-amber-300'
                }`}
              >
                {isAdminView ? (
                  <>
                    <UserCheck className="w-4 h-4 text-amber-300" />
                    <span className="hidden sm:inline">Về Cửa Hàng</span>
                    <span className="sm:hidden">Cửa hàng</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-amber-800" />
                    <span className="hidden sm:inline">
                      {currentUser?.role === 'staff' ? 'Xử Lý Đơn Hàng' : 'Quản Trị Shop'}
                    </span>
                    <span className="sm:hidden">Quản trị</span>
                  </>
                )}
              </button>
            )}

            {/* Shopping Cart Button */}
            {!isAdminView && (
              <button
                onClick={onOpenCart}
                className="relative flex items-center gap-2.5 bg-stone-900 hover:bg-stone-800 text-white px-3.5 sm:px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow active:scale-95"
              >
                <div className="relative">
                  <ShoppingBag className="w-5 h-5 text-amber-200" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2.5 bg-rose-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
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

        {/* Mobile Search input */}
        {!isAdminView && (
          <div className="pb-3 md:hidden">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm, quà tặng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
