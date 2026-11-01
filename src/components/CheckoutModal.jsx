import React, { useState } from 'react';
import { X, CheckCircle, QrCode, CreditCard, Truck, ShieldCheck, Copy, ArrowRight, MessageSquareText } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatCurrency } from '../services/aiChatEngine';
import { STORE_INFO } from '../data/initialData';

export default function CheckoutModal({
  isOpen,
  onClose,
  cart,
  appliedCoupon,
  onOrderSuccess,
  onOpenChatWithOrder
}) {
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: 'Hà Nội',
    address: '',
    notes: '',
  });

  const [shippingMethod, setShippingMethod] = useState('standard'); // standard, express
  const [paymentMethod, setPaymentMethod] = useState('vietqr'); // vietqr, cod, momo
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountPercent > 0) {
      discountAmount = Math.round((subtotal * appliedCoupon.discountPercent) / 100);
    } else if (appliedCoupon.discountAmount > 0) {
      discountAmount = appliedCoupon.discountAmount;
    }
    discountAmount = Math.min(subtotal, discountAmount);
  }

  const isFreeShip = subtotal >= STORE_INFO.freeshipThreshold;
  const shippingFee = shippingMethod === 'express'
    ? STORE_INFO.expressShippingFee
    : (isFreeShip ? 0 : STORE_INFO.standardShippingFee);

  const total = Math.max(0, subtotal - discountAmount + shippingFee);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.address) {
      alert('Vui lòng điền đầy đủ Họ tên, Số điện thoại và Địa chỉ nhận hàng.');
      return;
    }

    setIsSubmitting(true);

    // Simulate order placement
    setTimeout(() => {
      const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      const newOrder = {
        id: orderId,
        createdAt: new Date().toISOString(),
        customer: { ...formData },
        items: cart.map(item => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          variant: item.variant,
          image: item.image || item.images?.[0]
        })),
        subtotal,
        discount: discountAmount,
        couponCode: appliedCoupon?.code || null,
        shippingFee,
        shippingMethod,
        total,
        paymentMethod,
        paymentStatus: paymentMethod === 'vietqr' ? 'pending_verification' : 'pending',
        orderStatus: 'pending',
        trackingCarrier: shippingMethod === 'express' ? 'Ahamove Hỏa Tốc' : 'GHTK Tiêu Chuẩn',
        trackingCode: `${shippingMethod === 'express' ? 'EXP' : 'GHTK'}-${Math.floor(100000 + Math.random() * 900000)}`
      };

      // Trigger Confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        // Safe fallback if canvas blocked
      }

      setCompletedOrder(newOrder);
      onOrderSuccess(newOrder);
      setIsSubmitting(false);
    }, 600);
  };

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div 
        className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-stone-200 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <div>
            <h3 className="font-bold text-stone-900 text-lg">
              {completedOrder ? '🎉 Đặt hàng thành công!' : 'Xác nhận đơn hàng & Thanh toán'}
            </h3>
            <p className="text-xs text-stone-500">
              {completedOrder 
                ? 'Cảm ơn bạn đã tin tưởng ủng hộ Tiệm Nhà Nhỏ' 
                : 'Vui lòng kiểm tra kỹ thông tin nhận hàng bên dưới'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {completedOrder ? (
            /* Order Success View */
            <div className="text-center space-y-5 py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div>
                <h4 className="font-bold text-xl text-stone-900">Đơn hàng đã được tiếp nhận!</h4>
                <div className="mt-2 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-1.5 rounded-xl">
                  <span className="text-xs text-stone-600">Mã đơn hàng:</span>
                  <strong className="font-mono text-base font-bold text-amber-900">{completedOrder.id}</strong>
                  <button
                    onClick={() => handleCopy(completedOrder.id)}
                    className="p-1 text-stone-400 hover:text-amber-800 transition-colors"
                    title="Sao chép mã đơn"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {copiedCode && <span className="text-[10px] text-emerald-600 font-bold">Đã chép!</span>}
                </div>
              </div>

              {/* VietQR instructions if selected */}
              {completedOrder.paymentMethod === 'vietqr' && (
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-left space-y-3">
                  <div className="flex items-center gap-2 text-stone-800 font-bold text-sm">
                    <QrCode className="w-5 h-5 text-amber-800" />
                    <span>Quét mã VietQR chuyển khoản (MB Bank):</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-xl border border-stone-100">
                    <img
                      src={`https://api.vietqr.io/image/970422-0982123456-compact2.jpg?amount=${completedOrder.total}&addInfo=DH%20${completedOrder.id}&accountName=NGUYEN%20THI%20ANH`}
                      alt="VietQR Chuyển khoản"
                      className="w-40 h-40 object-contain rounded-lg border border-stone-200 shadow-sm"
                    />
                    <div className="text-xs space-y-1.5 text-stone-600 flex-1">
                      <p>• Ngân hàng: <strong className="text-stone-900">{STORE_INFO.bankAccount.bankName}</strong></p>
                      <p>• Số tài khoản: <strong className="text-stone-900 font-mono">{STORE_INFO.bankAccount.accountNumber}</strong></p>
                      <p>• Chủ tài khoản: <strong className="text-stone-900">{STORE_INFO.bankAccount.accountName}</strong></p>
                      <p>• Số tiền: <strong className="text-amber-900 font-bold">{formatCurrency(completedOrder.total)}</strong></p>
                      <p>• Nội dung CK: <strong className="text-stone-900 font-mono bg-stone-100 px-1 py-0.5 rounded">DH {completedOrder.id}</strong></p>
                      <p className="text-[11px] text-stone-400 italic mt-1">* Hệ thống sẽ tự động xác nhận sau khi nhận được chuyển khoản.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Info Summary */}
              <div className="bg-stone-50 rounded-2xl p-4 text-left text-xs space-y-1 text-stone-600">
                <p>• Người nhận: <strong className="text-stone-900">{completedOrder.customer.name}</strong> ({completedOrder.customer.phone})</p>
                <p>• Địa chỉ: <span className="text-stone-900">{completedOrder.customer.address}, {completedOrder.customer.city}</span></p>
                <p>• Đơn vị vận chuyển: <span className="text-stone-900 font-semibold">{completedOrder.trackingCarrier}</span></p>
                <p>• Tổng thanh toán: <strong className="text-amber-900 font-bold text-sm">{formatCurrency(completedOrder.total)}</strong></p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onOpenChatWithOrder(completedOrder.id);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <MessageSquareText className="w-4 h-4" />
                  <span>💬 Nhắn Trợ lý AI tra cứu đơn này</span>
                </button>

                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-all"
                >
                  Quay lại Cửa Hàng
                </button>
              </div>
            </div>
          ) : (
            /* Checkout Form View */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer details */}
              <div className="space-y-3">
                <h4 className="font-bold text-stone-900 text-sm uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-900 text-white text-xs flex items-center justify-center">1</span>
                  Thông tin giao hàng
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Họ và tên *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-700"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Số điện thoại nhận hàng *</label>
                    <input
                      type="tel"
                      required
                      placeholder="0987 654 321"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-700"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-stone-700 font-semibold mb-1">Địa chỉ chi tiết (Số nhà, tên đường, phường/xã) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Số 25 Ngách 8/11 Hoàng Hoa Thám, Ba Đình"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-700"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Tỉnh / Thành phố</label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-700 bg-white"
                    >
                      <option value="Hà Nội">Hà Nội</option>
                      <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                      <option value="Đà Nẵng">Đà Nẵng</option>
                      <option value="Hải Phòng">Hải Phòng</option>
                      <option value="Cần Thơ">Cần Thơ</option>
                      <option value="Tỉnh thành khác">Tỉnh thành khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Ghi chú cho shipper (nếu có)</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Giao sau 5h chiều, gọi trước khi đến"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-700"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Method */}
              <div className="space-y-3 pt-4 border-t border-stone-100">
                <h4 className="font-bold text-stone-900 text-sm uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-900 text-white text-xs flex items-center justify-center">2</span>
                  Phương thức vận chuyển
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label 
                    onClick={() => setShippingMethod('standard')}
                    className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                      shippingMethod === 'standard' ? 'border-amber-900 bg-amber-50/50' : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Truck className="w-4 h-4 text-stone-600" />
                      <div>
                        <div className="font-bold text-stone-900">Giao tiêu chuẩn</div>
                        <div className="text-stone-500 text-[11px]">Nhận sau 2 - 3 ngày</div>
                      </div>
                    </div>
                    <span className="font-bold text-stone-900">
                      {isFreeShip ? <span className="text-emerald-700">Miễn phí</span> : formatCurrency(STORE_INFO.standardShippingFee)}
                    </span>
                  </label>

                  <label 
                    onClick={() => setShippingMethod('express')}
                    className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                      shippingMethod === 'express' ? 'border-amber-900 bg-amber-50/50' : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Truck className="w-4 h-4 text-amber-700" />
                      <div>
                        <div className="font-bold text-stone-900">Hỏa tốc nội thành</div>
                        <div className="text-stone-500 text-[11px]">Nhận trong 2 - 4 tiếng</div>
                      </div>
                    </div>
                    <span className="font-bold text-stone-900">
                      {formatCurrency(STORE_INFO.expressShippingFee)}
                    </span>
                  </label>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-3 pt-4 border-t border-stone-100">
                <h4 className="font-bold text-stone-900 text-sm uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-900 text-white text-xs flex items-center justify-center">3</span>
                  Phương thức thanh toán
                </h4>

                <div className="space-y-2 text-xs">
                  <label 
                    onClick={() => setPaymentMethod('vietqr')}
                    className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                      paymentMethod === 'vietqr' ? 'border-amber-900 bg-amber-50/50' : 'border-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-stone-900">Chuyển khoản VietQR tự động</div>
                        <div className="text-stone-500 text-[11px]">Quét mã QR qua app ngân hàng MB, Techcombank, VCB...</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">Khuyên dùng</span>
                  </label>

                  <label 
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                      paymentMethod === 'cod' ? 'border-amber-900 bg-amber-50/50' : 'border-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center font-bold">
                        💵
                      </div>
                      <div>
                        <div className="font-bold text-stone-900">Thanh toán khi nhận hàng (COD)</div>
                        <div className="text-stone-500 text-[11px]">Kiểm tra hàng trước khi thanh toán tiền mặt cho shipper</div>
                      </div>
                    </div>
                  </label>

                  <label 
                    onClick={() => setPaymentMethod('momo')}
                    className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                      paymentMethod === 'momo' ? 'border-amber-900 bg-amber-50/50' : 'border-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
                        M
                      </div>
                      <div>
                        <div className="font-bold text-stone-900">Ví MoMo / ZaloPay</div>
                        <div className="text-stone-500 text-[11px]">Thanh toán qua ví điện tử phổ biến</div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Order total & Submit */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-500">Tổng thanh toán:</span>
                  <div className="text-xl font-extrabold text-amber-900">{formatCurrency(total)}</div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3.5 rounded-2xl bg-amber-900 hover:bg-amber-800 text-white font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang tạo đơn hàng...' : 'Hoàn Tất Đặt Hàng'}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
