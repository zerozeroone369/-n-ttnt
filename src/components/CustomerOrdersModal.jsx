import React, { useEffect, useState } from 'react';
import { X, Package, Clock, CheckCircle2, Truck, MessageSquare, AlertCircle, ShoppingBag, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../services/aiChatEngine';
import { getOrdersForUser } from '../services/aiChatEngine';

export default function CustomerOrdersModal({
  isOpen,
  onClose,
  orders,
  onOpenChatWithOrder,
  currentUser
}) {
  const visibleOrders = getOrdersForUser(orders, currentUser);
  const [selectedOrderId, setSelectedOrderId] = useState(visibleOrders[0]?.id || null);

  useEffect(() => {
    if (!visibleOrders.some(order => order.id === selectedOrderId)) {
      setSelectedOrderId(visibleOrders[0]?.id || null);
    }
  }, [selectedOrderId, visibleOrders]);

  if (!isOpen) return null;

  const selectedOrder = visibleOrders.find(o => o.id === selectedOrderId) || visibleOrders[0];

  const steps = [
    { key: 'placed', label: 'Đặt hàng thành công', desc: 'Đơn đã lưu hệ thống' },
    { key: 'confirmed', label: 'Shop xác nhận', desc: 'Kiểm tra tồn kho' },
    { key: 'processing', label: 'Đang đóng gói', desc: 'Bọc chống sốc & hộp carton' },
    { key: 'shipping', label: 'Đang giao hàng', desc: 'Bàn giao cho shipper' },
    { key: 'delivered', label: 'Đã nhận hàng', desc: 'Giao hàng thành công' }
  ];

  const getStepIndex = (status) => {
    switch (status) {
      case 'pending': return 1; // placed & confirmed
      case 'processing': return 2; // processing
      case 'shipping': return 3; // shipping
      case 'delivered': return 4; // delivered
      case 'cancelled': return -1;
      default: return 1;
    }
  };

  const currentStep = selectedOrder ? getStepIndex(selectedOrder.orderStatus) : 1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div 
        className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-stone-200 my-8 flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-900 text-white flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">Đơn Hàng Của Bạn</h3>
              <p className="text-xs text-stone-500">Theo dõi hành trình và lịch sử các đơn hàng đã đặt</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {visibleOrders.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 rounded-3xl bg-stone-100 flex items-center justify-center mx-auto text-stone-400 mb-3">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-stone-800 text-base">Chưa có đơn hàng nào</h4>
              <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                Khi bạn hoàn tất đặt hàng, thông tin hành trình giao hàng sẽ hiển thị đầy đủ tại đây.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Order List Sidebar */}
              <div className="md:col-span-5 space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                  Danh sách đơn hàng ({visibleOrders.length}):
                </div>
                {visibleOrders.map(order => {
                  const isSelected = order.id === selectedOrder?.id;
                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-amber-900 bg-amber-50/50 shadow-sm' 
                          : 'border-stone-200 hover:bg-stone-50 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-extrabold text-xs text-amber-900">{order.id}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.orderStatus === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                          order.orderStatus === 'shipping' ? 'bg-blue-100 text-blue-800' :
                          order.orderStatus === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.orderStatus === 'delivered' ? 'Đã nhận' :
                           order.orderStatus === 'shipping' ? 'Đang giao' :
                           order.orderStatus === 'processing' ? 'Đang đóng gói' :
                           order.orderStatus === 'cancelled' ? 'Đã hủy' : 'Chờ xác nhận'}
                        </span>
                      </div>
                      
                      <div className="text-[11px] text-stone-500 mt-1">
                        {new Date(order.createdAt).toLocaleDateString('vi-VN')} • {order.items.length} món
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-200/60 text-xs">
                        <span className="text-stone-400">Tổng tiền:</span>
                        <span className="font-extrabold text-stone-900">{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Order Details & Timeline */}
              {selectedOrder && (
                <div className="md:col-span-7 bg-stone-50/80 rounded-2xl p-5 border border-stone-200/80 space-y-5">
                  
                  {/* Order Top Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                    <div>
                      <div className="text-xs text-stone-500">Mã đơn hàng</div>
                      <div className="font-mono text-lg font-bold text-amber-900">{selectedOrder.id}</div>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenChatWithOrder(selectedOrder.id);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Tra cứu qua AI</span>
                    </button>
                  </div>

                  {/* 5-Step Order Stepper */}
                  <div>
                    <div className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-4">
                      Tiến trình vận chuyển:
                    </div>

                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                      {steps.map((step, idx) => {
                        const isDone = currentStep >= idx;
                        const isCurrent = currentStep === idx;

                        return (
                          <div key={step.key} className="relative flex items-start gap-3">
                            <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ring-4 ring-white ${
                              isDone ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-500'
                            }`}>
                              {isDone ? '✓' : idx + 1}
                            </div>
                            <div>
                              <div className={`text-xs font-bold ${isCurrent ? 'text-amber-900' : isDone ? 'text-stone-800' : 'text-stone-400'}`}>
                                {step.label}
                                {isCurrent && <span className="ml-2 text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-semibold">Hiện tại</span>}
                              </div>
                              <div className="text-[11px] text-stone-500 mt-0.5">{step.desc}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tracking info if any */}
                  {selectedOrder.trackingCode && (
                    <div className="bg-white p-3 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-amber-800" />
                        <span>Đơn vị: <strong className="text-stone-900">{selectedOrder.trackingCarrier}</strong></span>
                      </div>
                      <span className="font-mono font-bold bg-stone-100 px-2 py-0.5 rounded text-stone-800">
                        {selectedOrder.trackingCode}
                      </span>
                    </div>
                  )}

                  {/* Receiver Information */}
                  <div className="bg-white p-3.5 rounded-xl border border-stone-200 text-xs space-y-1 text-stone-600">
                    <div className="font-bold text-stone-800 uppercase tracking-wider text-[10px] mb-1">Thông tin giao nhận:</div>
                    <p>• Người nhận: <strong className="text-stone-900">{selectedOrder.customer.name}</strong> ({selectedOrder.customer.phone})</p>
                    <p>• Địa chỉ: <span className="text-stone-900">{selectedOrder.customer.address}, {selectedOrder.customer.city}</span></p>
                    <p>• Hình thức thanh toán: <span className="uppercase font-semibold text-stone-800">{selectedOrder.paymentMethod}</span></p>
                  </div>

                  {/* Items List */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Món hàng trong kiện:</div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {selectedOrder.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-stone-200/70 text-xs">
                          <div className="flex items-center gap-2">
                            <img src={it.image} alt="" className="w-8 h-8 rounded object-cover" />
                            <div>
                              <div className="font-bold text-stone-900 line-clamp-1">{it.name}</div>
                              <div className="text-[10px] text-stone-400">{it.variant} x{it.quantity}</div>
                            </div>
                          </div>
                          <span className="font-bold text-amber-900">{formatCurrency(it.price * it.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
