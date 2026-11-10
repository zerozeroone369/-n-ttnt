import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, Tag, Check, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../services/aiChatEngine';
import { STORE_INFO } from '../data/initialData';
import { StorageService } from '../services/storage';
import { resolveMediaUrl } from '../services/api';

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  appliedCoupon,
  setAppliedCoupon
}) {
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  if (!isOpen) return null;

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Free shipping check
  const amountToFreeship = Math.max(0, STORE_INFO.freeshipThreshold - subtotal);
  const freeshipProgress = Math.min(100, Math.round((subtotal / STORE_INFO.freeshipThreshold) * 100));

  // Discount calculation
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountPercent > 0) {
      discountAmount = Math.round((subtotal * appliedCoupon.discountPercent) / 100);
    } else if (appliedCoupon.discountAmount > 0) {
      discountAmount = appliedCoupon.discountAmount;
    }
    // Cannot discount more than subtotal
    discountAmount = Math.min(subtotal, discountAmount);
  }

  const shippingFee = subtotal >= STORE_INFO.freeshipThreshold ? 0 : STORE_INFO.standardShippingFee;
  const finalTotal = Math.max(0, subtotal - discountAmount + (subtotal > 0 ? shippingFee : 0));

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    setCouponError('');
    setCouponSuccess('');
    const code = couponInput.trim().toUpperCase();
    if (!code) return;

    const availableCoupons = StorageService.getCoupons();
    const found = availableCoupons.find(c => c.code === code);

    if (!found) {
      setCouponError('Mã ưu đãi không hợp lệ hoặc đã hết hạn.');
      return;
    }

    if (found.isActive === false) {
      setCouponError('Mã ưu đãi này hiện đã bị tắt.');
      return;
    }

    if (found.minOrderValue && subtotal < found.minOrderValue) {
      setCouponError(`Mã này chỉ áp dụng cho đơn hàng từ ${formatCurrency(found.minOrderValue)}.`);
      return;
    }

    setAppliedCoupon(found);
    setCouponSuccess(`Đã áp dụng mã "${found.code}" thành công!`);
    setCouponInput('');
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponSuccess('');
    setCouponError('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          
          {/* Drawer Header */}
          <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-900 text-white flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-base">Giỏ hàng của bạn</h3>
                <p className="text-xs text-stone-500">{cart.length} món trong giỏ</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-600 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Freeship progress bar */}
          {cart.length > 0 && (
            <div className="bg-amber-50/70 px-5 py-3 border-b border-amber-100 text-xs">
              {amountToFreeship > 0 ? (
                <p className="text-amber-900 font-medium mb-1.5">
                  Mua thêm <strong className="font-bold text-amber-800">{formatCurrency(amountToFreeship)}</strong> để được <span className="text-emerald-700 font-bold">Freeship toàn quốc</span>!
                </p>
              ) : (
                <p className="text-emerald-800 font-bold flex items-center gap-1 mb-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Bạn đã đủ điều kiện được Miễn phí vận chuyển! 🎉
                </p>
              )}
              <div className="w-full bg-amber-200/60 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${freeshipProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 rounded-3xl bg-stone-100 flex items-center justify-center text-stone-400 mb-4">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-stone-800 text-base mb-1">Giỏ hàng trống</h4>
                <p className="text-xs text-stone-500 max-w-xs mb-5">
                  Bạn chưa chọn món đồ nào. Hãy lướt xem các sản phẩm thủ công tinh tế của tiệm nhé!
                </p>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-all"
                >
                  Tiếp tục mua sắm
                </button>
              </div>
            ) : (
              cart.map((item, index) => (
                <div 
                  key={`${item.id}-${item.variant}-${index}`}
                  className="flex gap-3.5 p-3 rounded-2xl bg-stone-50/80 border border-stone-200/70"
                >
                  {/* Thumbnail */}
                  <img
                    src={resolveMediaUrl(item.image || item.images?.[0])}
                    alt={item.name}
                    className="w-18 h-18 w-20 h-20 rounded-xl object-cover bg-white flex-shrink-0"
                    onError={(e) => {
                      const fallback = item.images?.[1];
                      if (fallback && e.target.src !== fallback) e.target.src = fallback;
                      else e.target.src = '/placeholder.svg';
                    }}
                  />

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-stone-900 text-xs line-clamp-1 leading-snug">
                          {item.name}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(item.id, item.variant)}
                          className="text-stone-400 hover:text-rose-600 transition-colors p-0.5"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Phân loại: <span className="font-medium text-stone-700">{item.variant}</span>
                      </p>
                      <p className="text-xs font-bold text-amber-900 mt-1">
                        {formatCurrency(item.price)}
                      </p>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-white">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.variant, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center text-xs text-stone-600 hover:bg-stone-100"
                        >
                          -
                        </button>
                        <span className="w-7 text-center font-bold text-xs text-stone-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.variant, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center text-xs text-stone-600 hover:bg-stone-100"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-[11px] text-stone-400 font-medium">
                        = {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer with Checkout Info */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-stone-200 bg-stone-50/50 space-y-4">
              {/* Voucher Code Form */}
              <div>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                    <div className="flex items-center gap-2 text-emerald-800 font-medium">
                      <Tag className="w-4 h-4 text-emerald-600" />
                      <span>Mã <strong>{appliedCoupon.code}</strong> (-{appliedCoupon.discountPercent > 0 ? `${appliedCoupon.discountPercent}%` : formatCurrency(appliedCoupon.discountAmount)})</span>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-stone-400 hover:text-stone-600 text-xs underline"
                    >
                      Bỏ mã
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Mã giảm giá (ví dụ: TIEMMOI, GIAM10)"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-200 text-xs uppercase font-medium focus:outline-none focus:ring-2 focus:ring-amber-700 bg-white"
                      />
                      <Tag className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-all flex-shrink-0"
                    >
                      Áp dụng
                    </button>
                  </form>
                )}

                {couponError && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {couponError}
                  </p>
                )}
                {couponSuccess && (
                  <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> {couponSuccess}
                  </p>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-stone-600 pt-1 border-t border-stone-200/60">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span className="font-semibold text-stone-900">{formatCurrency(subtotal)}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Giảm giá ({appliedCoupon.code}):</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Phí vận chuyển:</span>
                  <span>
                    {shippingFee === 0 ? (
                      <strong className="text-emerald-700 font-bold">Miễn phí</strong>
                    ) : (
                      formatCurrency(shippingFee)
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-sm pt-2 border-t border-stone-200">
                  <span className="font-bold text-stone-900">Tổng thanh toán:</span>
                  <span className="font-extrabold text-base text-amber-900">
                    {formatCurrency(finalTotal)}
                  </span>
                </div>
              </div>

              {/* Checkout Action Button */}
              <button
                onClick={onCheckout}
                className="w-full py-3.5 px-4 rounded-2xl bg-amber-900 hover:bg-amber-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20 transition-all active:scale-[0.98]"
              >
                <span>Tiến hành Đặt Hàng</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
