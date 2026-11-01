import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, X, ArrowRight, Zap, ShoppingBag } from 'lucide-react';

export default function AppUpdateNotification({ 
  latestShopUpdate, 
  onViewNewProducts,
  hasAppCodeUpdate,
  onApplyAppCodeUpdate
}) {
  const [visible, setVisible] = useState(false);
  const [currentUpdate, setCurrentUpdate] = useState(null);

  // When a new shop update arrives via SSE or prop
  useEffect(() => {
    if (latestShopUpdate) {
      setCurrentUpdate(latestShopUpdate);
      setVisible(true);

      // Auto dismiss after 12 seconds unless hovered
      const timer = setTimeout(() => {
        setVisible(false);
      }, 12000);

      return () => clearTimeout(timer);
    }
  }, [latestShopUpdate?.id, latestShopUpdate?.timestamp]);

  if (hasAppCodeUpdate) {
    return (
      <aside 
        aria-label="Cập nhật ứng dụng"
        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-lg animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
      >
        <div className="bg-stone-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-amber-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 animate-pulse">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Phiên bản mới</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-300">v1.1.0</span>
              </div>
              <p className="text-sm font-semibold text-stone-100">
                Đã có bản cập nhật ứng dụng mới!
              </p>
            </div>
          </div>

          <button
            onClick={onApplyAppCodeUpdate}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Nạp ngay</span>
          </button>
        </div>
      </aside>
    );
  }

  if (!visible || !currentUpdate) return null;

  return (
    <aside 
      aria-label="Thông báo cập nhật shop"
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-lg animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
    >
      <div className="bg-white/95 backdrop-blur-md text-stone-900 p-4 rounded-2xl shadow-2xl border border-orange-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500" />

        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-200/60 text-orange-600 flex items-center justify-center shrink-0 shadow-xs">
            <ShoppingBag className="w-6 h-6 animate-bounce" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500 text-white shadow-xs">
                Cập nhật Shopee
              </span>
              <span className="text-xs text-stone-500 font-medium">
                {currentUpdate.count ? `+${currentUpdate.count} sản phẩm` : 'Vừa xong'}
              </span>
            </div>
            <p className="text-sm font-bold text-stone-900 truncate mt-0.5">
              {currentUpdate.title || 'Cửa hàng vừa cập nhật sản phẩm mới!'}
            </p>
            <p className="text-xs text-stone-600 truncate">
              {currentUpdate.message || 'Sản phẩm mới đã được tự động đồng bộ lên ứng dụng của bạn.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-stone-100">
          <button
            onClick={() => {
              setVisible(false);
              onViewNewProducts?.(currentUpdate);
            }}
            className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Xem ngay</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setVisible(false)}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

