import React, { useState, useMemo } from 'react';
import ProductCard from './ProductCard';
import { CATEGORIES } from '../data/initialData';
import { SlidersHorizontal, Sparkles, Shirt, Home, Coffee, Smartphone, SearchX, Flame } from 'lucide-react';

const ICON_MAP = {
  Sparkles: Sparkles,
  Shirt: Shirt,
  Home: Home,
  Coffee: Coffee,
  Smartphone: Smartphone,
};

export default function ProductList({
  products,
  searchQuery,
  onSelectProduct,
  onAddToCart,
  activeCategory,
  setActiveCategory,
  wishlistIds = [],
  onToggleWishlist
}) {
  const [priceFilter, setPriceFilter] = useState('all'); // all, under200, 200to500, over500
  const [sortBy, setSortBy] = useState('featured'); // featured, priceAsc, priceDesc, rating
  const [onlyFlashSale, setOnlyFlashSale] = useState(false);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // 1. Category
      if (activeCategory !== 'all' && product.category !== activeCategory) {
        return false;
      }

      // 2. Flash Sale filter
      if (onlyFlashSale && !product.isFlashSale) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const fullText = (product.name + ' ' + product.shortDesc + ' ' + product.tags.join(' ')).toLowerCase();
        if (!fullText.includes(query)) return false;
      }

      // 4. Price Filter
      if (priceFilter === 'under200' && product.price > 200000) return false;
      if (priceFilter === '200to500' && (product.price < 200000 || product.price > 500000)) return false;
      if (priceFilter === 'over500' && product.price < 500000) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'priceAsc') return a.price - b.price;
      if (sortBy === 'priceDesc') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      // Default: featured first
      return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
    });
  }, [products, activeCategory, searchQuery, priceFilter, sortBy, onlyFlashSale]);

  return (
    <section id="products-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none sm:justify-start">
        {CATEGORIES.map((cat) => {
          const Icon = ICON_MAP[cat.icon] || Sparkles;
          const isActive = activeCategory === cat.id && !onlyFlashSale;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setOnlyFlashSale(false);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all shadow-sm ${
                isActive
                  ? 'bg-stone-900 text-white shadow-stone-900/20 scale-[1.02]'
                  : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-stone-400'}`} />
              <span>{cat.name}</span>
            </button>
          );
        })}

        {/* Flash Sale Tab */}
        <button
          onClick={() => setOnlyFlashSale(!onlyFlashSale)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-sm ${
            onlyFlashSale
              ? 'bg-rose-600 text-white shadow-rose-600/30 scale-[1.02]'
              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
          }`}
        >
          <Flame className="w-4 h-4 text-rose-500" />
          <span>Deal Flash Sale</span>
        </button>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 py-3 border-y border-stone-200/80 text-xs sm:text-sm">
        
        {/* Price Range Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-stone-400 font-medium mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Khoảng giá:
          </span>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'under200', label: 'Dưới 200k' },
            { id: '200to500', label: '200k - 500k' },
            { id: 'over500', label: 'Trên 500k' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPriceFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                priceFilter === item.id
                  ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Sort selector & Count */}
        <div className="flex items-center gap-3">
          <span className="text-stone-500 font-medium">
            <strong className="text-stone-900 font-bold">{filteredProducts.length}</strong> sản phẩm
          </span>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-700 shadow-sm cursor-pointer"
          >
            <option value="featured">Nổi bật nhất</option>
            <option value="priceAsc">Giá: Thấp đến Cao</option>
            <option value="priceDesc">Giá: Cao đến Thấp</option>
            <option value="rating">Đánh giá cao nhất</option>
          </select>
        </div>

      </div>

      {/* Product Grid */}
      {filteredProducts.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelectProduct={onSelectProduct}
              onAddToCart={onAddToCart}
              isWishlisted={wishlistIds.includes(product.id)}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="my-16 text-center py-12 px-4 bg-white rounded-3xl border border-stone-200/80 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto mb-3">
            <SearchX className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-stone-900 text-base mb-1">Không tìm thấy sản phẩm</h3>
          <p className="text-xs text-stone-500 mb-4">
            Không có sản phẩm nào khớp với bộ lọc hoặc từ khóa "{searchQuery}".
          </p>
          <button
            onClick={() => {
              setActiveCategory('all');
              setPriceFilter('all');
              setOnlyFlashSale(false);
            }}
            className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-all"
          >
            Xóa bộ lọc & xem lại
          </button>
        </div>
      )}
    </section>
  );
}
