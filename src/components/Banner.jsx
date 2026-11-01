import React, { useState, useEffect } from 'react';
import { Truck, RotateCcw, HeartHandshake, Bot, ArrowRight, Flame, Clock } from 'lucide-react';
import { STORE_INFO } from '../data/initialData';

export default function Banner({ onOpenChat, onExplore }) {
  // Flash sale countdown timer (Hours, Minutes, Seconds)
  const [timeLeft, setTimeLeft] = useState({
    hours: 5,
    minutes: 42,
    seconds: 18
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDigit = (num) => String(num).padStart(2, '0');

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-stone-100 via-[#f7f3ee] to-[#faf8f5] pt-8 pb-12 border-b border-stone-200/70">
      {/* Decorative background blurs */}
      <div className="absolute top-0 right-10 w-96 h-96 bg-amber-100/60 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-rose-100/40 rounded-full blur-3xl pointer-events-none -z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Flash Sale Ribbon Bar */}
        <div className="mb-6 p-3 bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-rose-600 text-white animate-bounce">
              <Flame className="w-4 h-4" />
            </span>
            <div>
              <span className="font-extrabold text-xs sm:text-sm tracking-wide text-amber-300 uppercase">Flash Sale Hôm Nay:</span>
              <span className="text-xs text-stone-300 ml-2 hidden sm:inline">Giảm đến 20% hàng ngàn sản phẩm chính hãng tuyển chọn!</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-400 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Kết thúc trong:
            </span>
            <div className="flex items-center gap-1 font-mono font-bold">
              <span className="bg-stone-800 text-amber-300 px-2 py-1 rounded-lg border border-stone-700">
                {formatDigit(timeLeft.hours)}
              </span>
              <span>:</span>
              <span className="bg-stone-800 text-amber-300 px-2 py-1 rounded-lg border border-stone-700">
                {formatDigit(timeLeft.minutes)}
              </span>
              <span>:</span>
              <span className="bg-stone-800 text-rose-400 px-2 py-1 rounded-lg border border-stone-700">
                {formatDigit(timeLeft.seconds)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Main Hero Text */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100/80 text-amber-900 text-[11px] sm:text-xs font-semibold border border-amber-200 max-w-full">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse shrink-0"></span>
              <span className="truncate">Mua sắm thông minh — Hàng chính hãng, giao nhanh</span>
            </div>
            
            <h1 className="text-left text-2xl sm:text-4xl lg:text-5xl font-extrabold text-stone-900 tracking-tight font-serif leading-tight break-words">
              Hàng ngàn sản phẩm chính hãng, giá tốt mỗi ngày.
            </h1>
            
            <p className="text-stone-600 text-xs sm:text-base max-w-xl leading-relaxed">
              Thời trang, điện tử, thể thao, đồ dùng du lịch và nhiều hơn nữa. Tất cả sản phẩm đều được kiểm duyệt chất lượng, giao hàng nhanh chóng và hỗ trợ đổi trả dễ dàng.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                onClick={onExplore}
                className="px-6 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2 active:scale-95"
              >
                <span>Khám phá bộ sưu tập</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenChat}
                className="px-5 py-3 rounded-xl bg-white hover:bg-amber-50 text-stone-800 border border-stone-300 text-sm font-semibold transition-all shadow-sm flex items-center gap-2.5 active:scale-95 group"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Bot className="w-4 h-4" />
                </div>
                <span>Hỏi Trợ lý Bán hàng AI</span>
              </button>
            </div>
          </div>

          {/* Feature Highlight Cards */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-3.5 sm:gap-4">
            <div className="bg-white/80 backdrop-blur p-4 rounded-2xl border border-stone-200/80 shadow-sm hover:shadow-md transition-all">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-stone-900 text-sm mb-1">Miễn phí vận chuyển</h4>
              <p className="text-xs text-stone-500 leading-relaxed">Đơn hàng từ 450.000đ đóng gói hộp carton an toàn.</p>
            </div>

            <div className="bg-white/80 backdrop-blur p-4 rounded-2xl border border-stone-200/80 shadow-sm hover:shadow-md transition-all">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-stone-900 text-sm mb-1">Đổi trả 7 ngày</h4>
              <p className="text-xs text-stone-500 leading-relaxed">1 đổi 1 nhanh chóng nếu lỗi xưởng hoặc không đúng mô tả.</p>
            </div>

            <div className="bg-white/80 backdrop-blur p-4 rounded-2xl border border-stone-200/80 shadow-sm hover:shadow-md transition-all">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center mb-3">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-stone-900 text-sm mb-1">Hàng chính hãng</h4>
              <p className="text-xs text-stone-500 leading-relaxed">Sản phẩm kiểm duyệt kỹ, đảm bảo đúng mô tả và chất lượng.</p>
            </div>

            <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-stone-700/70 text-amber-300 flex items-center justify-center mb-3">
                  <Bot className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm mb-1">Tư vấn AI 24/7</h4>
                <p className="text-xs text-stone-300 leading-relaxed">Tìm quà tặng & giải đáp đơn hàng tức thì.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
