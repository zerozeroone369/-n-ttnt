import React from 'react';
import { X, Sparkles, ShoppingBag, Clock, ArrowRight, ExternalLink, Tag } from 'lucide-react';

export default function ShopUpdatesModal({ 
  isOpen, 
  onClose, 
  updates = [], 
  onSelectProduct 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200/80 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between bg-gradient-to-r from-orange-50 via-amber-50 to-stone-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-stone-900">Bản Cập Nhật Cửa Hàng</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  {updates.length} đợt cập nhật
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Lịch sử hàng mới cào từ Shopee & đồng bộ tự động
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {updates.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-3xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-8 h-8" />
              </div>
              <h4 className="text-stone-800 font-bold mb-1">Chưa có lịch sử cập nhật</h4>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                Khi cửa hàng cào thêm sản phẩm mới từ Shopee, các đợt cập nhật sẽ xuất hiện tự động tại đây.
              </p>
            </div>
          ) : (
            updates.map((upd, idx) => {
              const formattedTime = new Date(upd.timestamp || Date.now()).toLocaleString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              });

              return (
                <div 
                  key={upd.id || idx} 
                  className="p-4 rounded-2xl border border-stone-100 bg-stone-50/50 hover:bg-stone-50 hover:border-orange-200 transition-all shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-500 text-white">
                          Shopee Sync
                        </span>
                        <span className="text-xs text-stone-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formattedTime}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-stone-900">
                        {upd.title || 'Cập nhật sản phẩm từ Shopee'}
                      </h4>
                    </div>
                    {upd.count && (
                      <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-xl shrink-0 border border-orange-200/60">
                        +{upd.count} SP
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-stone-600 mb-3 leading-relaxed">
                    {upd.message}
                  </p>

                  {/* Sample products thumbnails if available */}
                  {upd.productsSample && upd.productsSample.length > 0 && (
                    <div className="pt-2 border-t border-stone-200/60">
                      <div className="text-[11px] font-semibold text-stone-500 mb-2 flex items-center gap-1">
                        <Tag className="w-3 h-3" /> Sản phẩm tiêu biểu trong đợt này:
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {upd.productsSample.map((prod, pIdx) => (
                          <div 
                            key={prod.id || pIdx}
                            onClick={() => {
                              onClose();
                              onSelectProduct?.(prod);
                            }}
                            className="p-2 bg-white rounded-xl border border-stone-200/70 hover:border-orange-400 hover:shadow-xs transition-all cursor-pointer group flex items-center gap-2"
                          >
                            <img 
                              src={prod.image} 
                              alt={prod.name}
                              className="w-10 h-10 object-cover rounded-lg shrink-0 group-hover:scale-105 transition-transform" 
                            />
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold text-stone-800 truncate group-hover:text-orange-600">
                                {prod.name}
                              </p>
                              <p className="text-[10px] font-bold text-orange-600">
                                {prod.price ? Number(prod.price).toLocaleString('vi-VN') + 'đ' : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/80 flex items-center justify-between">
          <div className="text-xs text-stone-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Kênh SSE thời gian thực đang hoạt động</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

