import React, { useState } from 'react';
import { X, Star, ShoppingBag, Check, Shield, Truck, RotateCcw, Heart, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../services/aiChatEngine';
import { resolveMediaUrl } from '../services/api';

export default function ProductModal({ 
  product, 
  onClose, 
  onAddToCart, 
  onBuyNow,
  isWishlisted,
  onToggleWishlist,
  onAddReview
}) {
  if (!product) return null;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.variants?.colors?.[0] || '');
  const [selectedSize, setSelectedSize] = useState(product.variants?.sizes?.[0] || '');
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // details, reviews

  // New review form
  const [reviewForm, setReviewForm] = useState({
    author: '',
    rating: 5,
    comment: ''
  });
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const discountPercent = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const handleAddToCart = () => {
    const variantStr = [selectedColor, selectedSize].filter(Boolean).join(' - ') || 'Mặc định';
    onAddToCart(product, quantity, variantStr);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  const handleBuyNow = () => {
    const variantStr = [selectedColor, selectedSize].filter(Boolean).join(' - ') || 'Mặc định';
    onBuyNow(product, quantity, variantStr);
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!reviewForm.author.trim() || !reviewForm.comment.trim()) {
      alert('Vui lòng nhập tên và nhận xét của bạn.');
      return;
    }

    const newRev = {
      id: `rev-${Date.now()}`,
      author: reviewForm.author.trim(),
      rating: reviewForm.rating,
      date: new Date().toISOString().split('T')[0],
      comment: reviewForm.comment.trim(),
      verified: true
    };

    onAddReview(product.id, newRev);
    setReviewSubmitted(true);
    setReviewForm({ author: '', rating: 5, comment: '' });
    setTimeout(() => setReviewSubmitted(false), 2500);
  };

  const reviewsList = product.reviews || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div 
        className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-stone-100 my-8 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 flex-1">
          
          {/* Left: Gallery */}
          <div className="md:col-span-6 p-6 bg-stone-50/70 flex flex-col justify-between">
            {/* Main image */}
            <div className="aspect-square rounded-2xl overflow-hidden bg-white shadow-inner relative">
              <img
                src={resolveMediaUrl(product.images?.[activeImageIndex] || product.images?.[0])}
                alt={product.name}
                className="w-full h-full object-cover object-center"
                onError={(e) => {
                  const fallback = product.images?.[1];
                  if (fallback && e.target.src !== fallback) e.target.src = fallback;
                  else e.target.src = '/placeholder.svg';
                }}
              />

              {discountPercent > 0 && (
                <span className="absolute top-3 left-3 bg-rose-500 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow">
                  Tiết kiệm {discountPercent}%
                </span>
              )}

              {/* Wishlist toggle */}
              <button
                onClick={() => onToggleWishlist(product.id)}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-stone-600 hover:text-rose-500 flex items-center justify-center shadow-md transition-all hover:scale-110"
                title="Lưu vào yêu thích"
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-2.5 mt-4 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                      activeImageIndex === idx ? 'border-amber-800 scale-105 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={resolveMediaUrl(img)}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = '/placeholder.svg';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Badges / Guarantees */}
            <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-stone-200/60 text-center">
              <div className="flex flex-col items-center text-stone-600">
                <Truck className="w-4 h-4 text-amber-700 mb-1" />
                <span className="text-[10px] font-medium leading-tight">Freeship từ 450k</span>
              </div>
              <div className="flex flex-col items-center text-stone-600">
                <RotateCcw className="w-4 h-4 text-emerald-700 mb-1" />
                <span className="text-[10px] font-medium leading-tight">Đổi trả 7 ngày</span>
              </div>
              <div className="flex flex-col items-center text-stone-600">
                <Shield className="w-4 h-4 text-blue-700 mb-1" />
                <span className="text-[10px] font-medium leading-tight">Chính hãng 100%</span>
              </div>
            </div>
          </div>

          {/* Right: Info & Reviews Tabs */}
          <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between max-h-[85vh] overflow-y-auto">
            <div>
              {/* Rating header */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center text-amber-400">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                </div>
                <span className="text-sm font-bold text-stone-800">{product.rating}</span>
                <span className="text-xs text-stone-400">({product.reviewsCount} nhận xét từ người mua)</span>
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900 leading-snug font-serif">
                {product.name}
              </h2>

              {/* Price */}
              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-900">
                  {formatCurrency(product.price)}
                </span>
                {product.originalPrice && (
                  <span className="text-sm text-stone-400 line-through">
                    {formatCurrency(product.originalPrice)}
                  </span>
                )}
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Còn {product.stock} sản phẩm
                </span>
              </div>

              {/* Tab Navigation: Details vs Reviews */}
              <div className="flex border-b border-stone-200 mt-4 text-xs font-bold">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`pb-2.5 mr-4 transition-all border-b-2 ${
                    activeTab === 'details'
                      ? 'border-amber-900 text-amber-900'
                      : 'border-transparent text-stone-400 hover:text-stone-700'
                  }`}
                >
                  Thông tin sản phẩm
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`pb-2.5 transition-all border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'reviews'
                      ? 'border-amber-900 text-amber-900'
                      : 'border-transparent text-stone-400 hover:text-stone-700'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Đánh giá ({reviewsList.length})</span>
                </button>
              </div>

              {/* TAB 1: DETAILS */}
              {activeTab === 'details' && (
                <div className="space-y-4 pt-3 text-xs">
                  <p className="text-stone-600 leading-relaxed">
                    {product.desc}
                  </p>

                  {/* Variant: Colors */}
                  {product.variants?.colors?.length > 0 && (
                    <div>
                      <label className="block text-stone-700 font-bold uppercase tracking-wider mb-2">
                        Phân loại: <span className="text-amber-800 font-semibold">{selectedColor}</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {product.variants.colors.map((c) => (
                          <button
                            key={c}
                            onClick={() => setSelectedColor(c)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                              selectedColor === c
                                ? 'bg-amber-900 text-white border-amber-900 shadow-sm'
                                : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border-stone-200'
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Variant: Sizes */}
                  {product.variants?.sizes?.length > 0 && (
                    <div>
                      <label className="block text-stone-700 font-bold uppercase tracking-wider mb-2">
                        Kích cỡ: <span className="text-amber-800 font-semibold">{selectedSize}</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {product.variants.sizes.map((s) => (
                          <button
                            key={s}
                            onClick={() => setSelectedSize(s)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                              selectedSize === s
                                ? 'bg-amber-900 text-white border-amber-900 shadow-sm'
                                : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border-stone-200'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity */}
                  <div className="flex items-center gap-4 pt-1">
                    <span className="font-bold text-stone-700 uppercase tracking-wider">Số lượng:</span>
                    <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden bg-stone-50">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-8 h-8 flex items-center justify-center text-stone-600 hover:bg-stone-200"
                      >
                        -
                      </button>
                      <span className="w-10 text-center font-bold text-stone-900">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                        className="w-8 h-8 flex items-center justify-center text-stone-600 hover:bg-stone-200"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Specs table */}
                  {product.specs && (
                    <div className="pt-3 border-t border-stone-100">
                      <h4 className="font-bold text-stone-900 uppercase tracking-wider mb-2">Thông số kỹ thuật:</h4>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {Object.entries(product.specs).map(([k, v]) => (
                          <div key={k} className="flex flex-col py-1 border-b border-stone-100">
                            <dt className="text-stone-400">{k}</dt>
                            <dd className="font-semibold text-stone-800">{v}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: REVIEWS */}
              {activeTab === 'reviews' && (
                <div className="space-y-4 pt-3 text-xs">
                  {/* Reviews List */}
                  <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                    {reviewsList.length === 0 ? (
                      <p className="text-stone-400 italic text-center py-4">Chưa có đánh giá nào cho sản phẩm này.</p>
                    ) : (
                      reviewsList.map((rev) => (
                        <div key={rev.id} className="p-3 bg-stone-50 rounded-2xl border border-stone-200/70 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold text-stone-900">
                              <span>{rev.author}</span>
                              {rev.verified && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Đã mua hàng
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-stone-400">{rev.date}</span>
                          </div>

                          <div className="flex items-center text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}`}
                              />
                            ))}
                          </div>

                          <p className="text-stone-600 leading-relaxed">{rev.comment}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Submit Review Form */}
                  <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200/80">
                    <h4 className="font-bold text-stone-900 uppercase text-[10px] tracking-wider mb-2">
                      Để lại đánh giá của bạn:
                    </h4>

                    {reviewSubmitted ? (
                      <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl font-bold text-center">
                        ✓ Cảm ơn bạn! Đánh giá đã được đăng thành công.
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitReview} className="space-y-2.5">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-stone-700">Mức độ hài lòng:</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                                className="p-0.5 text-amber-400 hover:scale-110 transition-transform"
                              >
                                <Star className={`w-4 h-4 ${star <= reviewForm.rating ? 'fill-amber-400' : 'text-stone-300'}`} />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <input
                            type="text"
                            required
                            placeholder="Họ và tên của bạn..."
                            value={reviewForm.author}
                            onChange={(e) => setReviewForm({ ...reviewForm, author: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-amber-700"
                          />
                        </div>

                        <div>
                          <textarea
                            required
                            rows={2}
                            placeholder="Cảm nhận của bạn về sản phẩm, chất liệu, đóng gói..."
                            value={reviewForm.comment}
                            onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-amber-700"
                          />
                        </div>

                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                        >
                          <Send className="w-3 h-3" />
                          <span>Gửi đánh giá</span>
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Buttons */}
            <div className="mt-6 pt-4 border-t border-stone-200 flex items-center gap-3">
              <button
                onClick={handleAddToCart}
                className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
                  isAdded
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Đã thêm vào giỏ!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Thêm vào giỏ</span>
                  </>
                )}
              </button>

              <button
                onClick={handleBuyNow}
                className="flex-1 py-3 px-4 rounded-2xl bg-amber-900 hover:bg-amber-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                Mua ngay
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
