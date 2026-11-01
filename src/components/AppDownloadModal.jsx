import React, { useState, useEffect } from 'react';
import { X, Smartphone, Download, CheckCircle2, ShieldCheck, Zap, Share2, PlusSquare, QrCode, Copy, Check, ExternalLink } from 'lucide-react';

export default function AppDownloadModal({ 
  isOpen, 
  onClose, 
  deferredPrompt, 
  onInstallSuccess 
}) {
  const [activeTab, setActiveTab] = useState('qr'); // 'qr' | 'pwa' | 'apk'
  const [isInstalling, setIsInstalling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [liveUrl, setLiveUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLiveUrl(window.location.origin || window.location.href);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (liveUrl) {
      navigator.clipboard.writeText(liveUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(() => {
        // Fallback prompt
        window.prompt('Sao chép đường dẫn này để gửi:', liveUrl);
      });
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        setIsInstalling(true);
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          onInstallSuccess?.();
          onClose();
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      } finally {
        setIsInstalling(false);
      }
    } else {
      alert('Để cài đặt ứng dụng: Hãy nhấn nút Chia sẻ (trên iPhone) hoặc Menu 3 chấm (trên Android) rồi chọn "Thêm vào màn hình chính" / "Cài đặt ứng dụng".');
    }
  };

  // QR Code Generator URL using standard high-res API
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(liveUrl || 'https://tiem-nha-nho.onrender.com')}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-stone-200/80 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Mở App & Cài Đặt</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-stone-950">
                  Online
                </span>
              </div>
              <p className="text-xs text-stone-300">
                Quét mã QR mở trên điện thoại hoặc cài trực tiếp
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-3 pt-3 gap-1">
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'qr'
                ? 'border-orange-500 text-orange-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Mã QR Điện Thoại</span>
          </button>

          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'pwa'
                ? 'border-orange-500 text-orange-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Cài Làm App (PWA)</span>
          </button>

          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'apk'
                ? 'border-orange-500 text-orange-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>File APK Android</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 1: QR CODE */}
          {activeTab === 'qr' && (
            <div className="text-center space-y-4">
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 flex flex-col items-center justify-center">
                {/* QR Code Container */}
                <div className="p-3 bg-white rounded-2xl border-2 border-dashed border-orange-300 shadow-md inline-block relative group">
                  <img
                    src={qrImageUrl}
                    alt="Mã QR mở web trên điện thoại"
                    className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-lg"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-stone-900/5 backdrop-blur-[0.5px] opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                    <span className="text-[11px] font-bold bg-white text-stone-800 px-2.5 py-1 rounded-full shadow-md">
                      Quét bằng Camera / Zalo
                    </span>
                  </div>
                </div>

                <p className="text-xs font-bold text-stone-800 mt-3 flex items-center gap-1.5 justify-center">
                  <Smartphone className="w-4 h-4 text-orange-600" />
                  Dùng Camera điện thoại hoặc Zalo để quét
                </p>
                <p className="text-[11px] text-stone-500 max-w-xs mt-0.5">
                  Điện thoại sẽ tự động mở trang web này ngay lập tức để trải nghiệm hoặc gửi thầy chấm bài.
                </p>
              </div>

              {/* Link copy box */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-stone-600">
                  Đường link website trực tuyến của bạn:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={liveUrl}
                    className="flex-1 px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl text-xs text-stone-800 font-mono select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-amber-300" />
                        <span>Chép Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-orange-50 border border-orange-200/60 text-left text-xs text-orange-950 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 font-bold text-[10px]">
                  💡
                </div>
                <div className="leading-relaxed">
                  <strong>Cách gửi bài cho thầy giáo:</strong> Bạn chỉ cần copy link website phía trên (sau khi deploy lên Render/Vercel) rồi gửi cho thầy. Thầy chỉ cần bấm vào là mở xem được ngay trên điện thoại hoặc máy tính!
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PWA */}
          {activeTab === 'pwa' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <h4 className="text-sm font-bold text-stone-900 mb-1">
                    Cài đặt làm Ứng Dụng Độc Lập
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Mở toàn màn hình, có icon riêng ngoài màn hình chính, tự nhận sản phẩm mới từ Shopee.
                  </p>
                </div>

                <button
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{deferredPrompt ? 'Cài đặt ngay' : 'Thêm vào điện thoại'}</span>
                </button>
              </div>

              {/* Instructions */}
              <div className="space-y-3 pt-1">
                <h5 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Hướng dẫn cài đặt trên điện thoại:
                </h5>

                <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">
                    Android
                  </div>
                  <div className="text-xs text-stone-700 space-y-1">
                    <p className="font-semibold text-stone-900">Chrome / Cốc Cốc / Samsung Internet:</p>
                    <p>1. Nhấn nút <strong>Menu 3 chấm (⋮)</strong> ở góc trên bên phải trình duyệt.</p>
                    <p>2. Chọn <strong>"Cài đặt ứng dụng"</strong> hoặc <strong>"Thêm vào Màn hình chính"</strong>.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 font-bold text-xs">
                    iPhone
                  </div>
                  <div className="text-xs text-stone-700 space-y-1">
                    <p className="font-semibold text-stone-900">Trình duyệt Safari:</p>
                    <p className="flex items-center gap-1">
                      1. Nhấn nút <strong>Chia sẻ (Share <Share2 className="w-3.5 h-3.5 inline text-sky-600" />)</strong> ở thanh dưới.
                    </p>
                    <p className="flex items-center gap-1">
                      2. Cuộn xuống và chọn <strong>"Thêm vào MH chính" (<PlusSquare className="w-3.5 h-3.5 inline text-stone-700" />)</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: APK */}
          {activeTab === 'apk' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <Download className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">Gói Tệp APK Android (v1.1.0)</h4>
                    <p className="text-xs text-stone-500">Dành cho người dùng Android muốn cài file APK trực tiếp</p>
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href="/download/tiem-nha-nho.apk"
                    download
                    className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Tải Về File APK (Android)</span>
                  </a>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-600 space-y-1.5 leading-relaxed">
                <p className="font-bold text-stone-800">Lưu ý khi cài file APK:</p>
                <p>• Sau khi tải về, mở file <code>TiemNhaNho_v1.1.apk</code> từ thanh thông báo.</p>
                <p>• Nếu điện thoại báo "Nguồn không xác định", hãy chọn Cho phép.</p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/80 flex items-center justify-between">
          <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Mở được trên mọi điện thoại & máy tính</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
