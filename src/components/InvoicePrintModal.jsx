import React from 'react';
import { X, Printer, CheckCircle, Package } from 'lucide-react';
import { formatCurrency } from '../services/aiChatEngine';
import { STORE_INFO } from '../data/initialData';

export default function InvoicePrintModal({
  isOpen,
  onClose,
  order
}) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div 
        className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-stone-200 my-8 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Action Header (Hidden during print) */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-100 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-stone-700" />
            <span className="font-bold text-sm text-stone-900">Phiếu Đóng Gói & Giao Hàng (In Nhiệt / A5)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>In Phiếu Ngay</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-600 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div id="printable-invoice" className="p-8 bg-white text-stone-900 text-xs space-y-6">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-stone-900 pb-4">
            <div>
              <h2 className="font-serif font-black text-xl tracking-tight uppercase">{STORE_INFO.name}</h2>
              <p className="text-stone-500 text-[11px] mt-0.5">{STORE_INFO.tagline}</p>
              <p className="text-[11px] text-stone-600 mt-1">📍 {STORE_INFO.address}</p>
              <p className="text-[11px] text-stone-600">☎️ Hotline: {STORE_INFO.phone}</p>
            </div>

            <div className="text-right">
              <div className="bg-stone-900 text-white px-3 py-1 font-mono font-bold text-sm rounded">
                {order.id}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Ngày đặt: {new Date(order.createdAt).toLocaleDateString('vi-VN')}
              </p>
              <p className="text-[11px] font-semibold text-stone-700 mt-0.5">
                Đơn vị: {order.trackingCarrier || 'GHTK'}
              </p>
            </div>
          </div>

          {/* Customer & Shipping Section */}
          <div className="grid grid-cols-2 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div>
              <div className="font-bold text-stone-500 uppercase text-[10px] tracking-wider mb-1">Người nhận:</div>
              <div className="font-bold text-stone-900 text-sm">{order.customer.name}</div>
              <div className="font-semibold text-stone-700 mt-0.5">SĐT: {order.customer.phone}</div>
              <div className="text-stone-600 mt-1 leading-snug">
                {order.customer.address}, {order.customer.city}
              </div>
            </div>

            <div>
              <div className="font-bold text-stone-500 uppercase text-[10px] tracking-wider mb-1">Ghi chú giao hàng:</div>
              <p className="italic text-stone-700 bg-white p-2 rounded border border-stone-200">
                "{order.customer.notes || 'Cho khách xem hàng trước khi nhận. Đồ dễ vỡ xin nhẹ tay!'}"
              </p>
              <div className="mt-2 text-[11px]">
                Hình thức: <span className="uppercase font-bold">{order.paymentMethod}</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-stone-300 text-[10px] font-bold uppercase text-stone-600">
                  <th className="py-2">STT</th>
                  <th className="py-2">Tên sản phẩm / Phân loại</th>
                  <th className="py-2 text-center">SL</th>
                  <th className="py-2 text-right">Đơn giá</th>
                  <th className="py-2 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-xs">
                {order.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 font-mono text-stone-400">{idx + 1}</td>
                    <td className="py-2.5">
                      <div className="font-bold text-stone-900">{item.name}</div>
                      <div className="text-[10px] text-stone-500">{item.variant}</div>
                    </td>
                    <td className="py-2.5 text-center font-bold">{item.quantity}</td>
                    <td className="py-2.5 text-right">{formatCurrency(item.price)}</td>
                    <td className="py-2.5 text-right font-bold">{formatCurrency(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment Summary */}
          <div className="flex justify-between items-end pt-4 border-t-2 border-stone-300">
            <div className="text-[11px] text-stone-500 space-y-1">
              <p>• Quý khách vui lòng kiểm tra niêm phong hộp hàng.</p>
              <p>• Hỗ trợ đổi trả trong 7 ngày qua Zalo: <strong>{STORE_INFO.phone}</strong></p>
              <p className="font-serif italic text-stone-700 mt-2">Cảm ơn bạn đã lựa chọn Tiệm Nhà Nhỏ!</p>
            </div>

            <div className="w-60 space-y-1 text-right text-xs">
              <div className="flex justify-between text-stone-500">
                <span>Tiền hàng:</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Giảm giá ({order.couponCode || 'Voucher'}):</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-500">
                <span>Phí vận chuyển:</span>
                <span>{order.shippingFee === 0 ? 'Miễn phí' : formatCurrency(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-stone-900 pt-2 border-t border-stone-300">
                <span>{order.paymentMethod === 'cod' ? 'TIỀN THU COD:' : 'TỔNG ĐÃ TRẢ:'}</span>
                <span className="text-base text-amber-900">
                  {order.paymentStatus === 'paid' && order.paymentMethod !== 'cod' ? '0 đ (Đã CK)' : formatCurrency(order.total)}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
