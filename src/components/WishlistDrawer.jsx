import React from 'react';
import { X, Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../services/aiChatEngine';
import { resolveMediaUrl } from '../services/api';

export default function WishlistDrawer({
  isOpen,
  onClose,
  wishlistIds,
  products,
  onRemoveWishlist,
  onAddToCart,
  onSelectProduct
}) {
  const wishlistProducts = products.filter(p => wishlistIds.includes(p.id));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          
          {/* Drawer Header */}
          <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-base">Sản phẩm yêu thích</h3>
                <p className="text-xs text-stone-500">{wishlistProducts.length} món đã lưu</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-600 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Product list */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
            {wishlistProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-400 flex items-center justify-center mb-4">
                  <Heart className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-stone-800 text-base mb-1">Chưa có sản phẩm yêu thích</h4>
                <p className="text-xs text-stone-500 max-w-xs mb-5">
                  Bạn có thể bấm vào biểu tượng trái tim trên các sản phẩm để lưu lại xem sau nha!
                </p>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-all"
                >
                  Khám phá cửa hàng
                </button>
              </div>
            ) : (
              wishlistProducts.map(product => (
                <div
                  key={product.id}
                  className="flex gap-3.5 p-3 rounded-2xl bg-stone-50/90 border border-stone-200/80 hover:border-amber-300 transition-all"
                >
                  {/* Thumbnail */}
                  <img
                    src={resolveMediaUrl(product.images?.[0])}
                    alt={product.name}
                    onClick={() => {
                      onSelectProduct(product);
                      onClose();
                    }}
                    className="w-20 h-20 rounded-xl object-cover bg-white cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
                    onError={(e) => {
                      const fallback = product.images?.[1];
                      if (fallback && e.target.src !== fallback) e.target.src = fallback;
                      else e.target.src = '/placeholder.svg';
                    }}
                  />

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 
                          onClick={() => {
                            onSelectProduct(product);
                            onClose();
                          }}
                          className="font-bold text-stone-900 text-xs line-clamp-1 hover:text-amber-800 cursor-pointer"
                        >
                          {product.name}
                        </h4>
                        <button
                          onClick={() => onRemoveWishlist(product.id)}
                          className="text-stone-400 hover:text-rose-600 transition-colors"
                          title="Bỏ thích"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-xs font-extrabold text-amber-900 mt-1">
                        {formatCurrency(product.price)}
                      </div>
                      <div className="text-[10px] text-stone-400">
                        Còn {product.stock} món trong kho
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => {
                          onAddToCart(product, 1, product.variants?.colors?.[0] || 'Mặc định');
                        }}
                        className="flex-1 py-1.5 px-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-amber-200" />
                        <span>Thêm vào giỏ</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {wishlistProducts.length > 0 && (
            <div className="p-4 border-t border-stone-200 bg-stone-50">
              <button
                onClick={() => {
                  wishlistProducts.forEach(p => onAddToCart(p, 1, p.variants?.colors?.[0] || 'Mặc định'));
                  onClose();
                }}
                className="w-full py-3 rounded-2xl bg-amber-900 hover:bg-amber-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <span>Chuyển tất cả vào giỏ hàng</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
