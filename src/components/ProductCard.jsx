import React, { useState } from 'react';
import { Star, Plus, Eye, Check, Heart, Flame } from 'lucide-react';
import { formatCurrency } from '../services/aiChatEngine';

export default function ProductCard({ 
  product, 
  onSelectProduct, 
  onAddToCart,
  isWishlisted,
  onToggleWishlist
}) {
  const [added, setAdded] = useState(false);

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    onAddToCart(product, 1, product.variants?.colors?.[0] || 'Mặc định');
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleWishlistClick = (e) => {
    e.stopPropagation();
    onToggleWishlist(product.id);
  };

  const discountPercent = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) 
    : 0;

  return (
    <div 
      onClick={() => onSelectProduct(product)}
      className="group bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:border-amber-300/80 transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Image container */}
      <div className="relative aspect-square overflow-hidden bg-stone-100">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />

        {/* Badges on Top Left */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {product.isFlashSale && (
            <span className="bg-rose-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
              <Flame className="w-3 h-3" /> Sale
            </span>
          )}
          {discountPercent > 0 && !product.isFlashSale && (
            <span className="bg-rose-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-sm">
              -{discountPercent}%
            </span>
          )}
          {product.isNew && (
            <span className="bg-emerald-600 text-white font-semibold text-[10px] px-2 py-0.5 rounded-full shadow-sm">
              Mới
            </span>
          )}
          {product.isFeatured && !product.isNew && !product.isFlashSale && (
            <span className="bg-amber-600 text-white font-semibold text-[10px] px-2 py-0.5 rounded-full shadow-sm">
              Hot
            </span>
          )}
        </div>

        {/* Wishlist Heart Button on Top Right */}
        <button
          onClick={handleWishlistClick}
          aria-label="Thêm vào yêu thích"
          className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-stone-600 hover:text-rose-500 flex items-center justify-center shadow-md transition-all hover:scale-110"
        >
          <Heart className={`w-4 h-4 transition-colors ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>

        {/* Stock warning if low */}
        {product.stock <= 15 && (
          <div className="absolute bottom-2.5 left-2.5 bg-stone-900/80 backdrop-blur text-white text-[10px] px-2 py-0.5 rounded-md font-medium">
            Chỉ còn {product.stock} món
          </div>
        )}

        {/* Quick View Button on hover */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none sm:pointer-events-auto">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onSelectProduct(product);
            }}
            className="bg-white/95 text-stone-900 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-lg hover:bg-white flex items-center gap-1.5 hover:scale-105 transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Xem nhanh</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Rating */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="flex items-center text-amber-500">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            </div>
            <span className="text-xs font-semibold text-stone-700">{product.rating}</span>
            <span className="text-[11px] text-stone-400">({product.reviewsCount})</span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-stone-900 text-sm line-clamp-2 group-hover:text-amber-800 transition-colors leading-snug">
            {product.name}
          </h3>

          {/* Short description */}
          <p className="text-xs text-stone-500 mt-1 line-clamp-1">
            {product.shortDesc}
          </p>
        </div>

        {/* Price & Add to Cart button */}
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
          <div>
            <div className="text-base font-extrabold text-stone-900">
              {formatCurrency(product.price)}
            </div>
            {product.originalPrice && (
              <div className="text-[11px] text-stone-400 line-through">
                {formatCurrency(product.originalPrice)}
              </div>
            )}
          </div>

          <button
            onClick={handleQuickAdd}
            aria-label="Thêm vào giỏ"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm ${
              added 
                ? 'bg-emerald-600 text-white scale-95' 
                : 'bg-stone-100 hover:bg-amber-800 hover:text-white text-stone-800'
            }`}
            title="Thêm vào giỏ hàng"
          >
            {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
