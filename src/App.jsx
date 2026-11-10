import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Banner from './components/Banner';
import ProductList from './components/ProductList';
import ProductModal from './components/ProductModal';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import WishlistDrawer from './components/WishlistDrawer';
import CustomerOrdersModal from './components/CustomerOrdersModal';
import InvoicePrintModal from './components/InvoicePrintModal';
import Chatbot from './components/Chatbot';
import AdminDashboard from './components/AdminDashboard';
import AuthModal from './components/AuthModal';
import AppDownloadModal from './components/AppDownloadModal';
import { StorageService } from './services/storage';
import { ApiClient, IS_DEMO_MODE_ALLOWED } from './services/api';
import { getOrdersForUser } from './services/aiChatEngine';
import { STORE_INFO } from './data/initialData';
import { Heart, MapPin, Phone, Mail, Clock, ShieldCheck, Check } from 'lucide-react';

export default function App() {
  // Global Data State
  const [products, setProducts] = useState(() => StorageService.getProducts());
  const [currentUser, setCurrentUser] = useState(() => ApiClient.auth.getCurrentUser());
  const [orders, setOrders] = useState(() => getOrdersForUser(StorageService.getOrders(), ApiClient.auth.getCurrentUser()));
  const [cart, setCart] = useState(() => StorageService.getCart());
  const [wishlistIds, setWishlistIds] = useState(() => StorageService.getWishlist());
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // Authentication State & User Session
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // UI State
  const [isAdminView, setIsAdminView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isCustomerOrdersOpen, setIsCustomerOrdersOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isInvoicePrintOpen, setIsInvoicePrintOpen] = useState(false);
  const [orderToPrint, setOrderToPrint] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialQuery, setChatInitialQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isAppDownloadOpen, setIsAppDownloadOpen] = useState(false);

  // PWA install prompt handler (Đã gộp listener duy nhất, tối ưu kiểm tra thiết bị)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
      if (isMobile) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Verify persisted session token on startup & clear invalid/stale sessions
  useEffect(() => {
    let active = true;
    const verifyStartupSession = async () => {
      const token = ApiClient.auth.getToken();
      const storedUser = ApiClient.auth.getCurrentUser();

      if (storedUser?.isOfflineDemo) {
        if (!IS_DEMO_MODE_ALLOWED) {
          ApiClient.auth.clearLocalSession();
          if (active) {
            setCurrentUser(null);
            setOrders([]);
            setIsAdminView(false);
          }
        }
        return;
      }

      // Remove legacy insecure local tokens or user objects missing server token
      if ((token && token.startsWith('local_token_')) || (storedUser && !token)) {
        ApiClient.auth.clearLocalSession();
        if (active) {
          setCurrentUser(null);
          setOrders([]);
          setIsAdminView(false);
        }
        return;
      }

      if (!token) return;

      const online = await ApiClient.isServerOnline();
      if (!online || !active) return;

      try {
        const verifiedUser = await ApiClient.auth.me();
        if (active && verifiedUser) {
          setCurrentUser(verifiedUser);
        }
      } catch (err) {
        if (active && err.status === 401) {
          setCurrentUser(null);
          setOrders([]);
          setIsAdminView(false);
          showToast('Phiên đăng nhập trước đã hết hạn, vui lòng đăng nhập lại.');
        }
      }
    };

    verifyStartupSession();
    return () => { active = false; };
  }, []);

  // Initial Sync from Backend Database Server
  useEffect(() => {
    const syncDataWithServer = async () => {
      if (!(await ApiClient.isServerOnline())) return;

      const hasServerToken = Boolean(ApiClient.auth.getToken());
      const [productsResult, ordersResult] = await Promise.allSettled([
        ApiClient.products.getAll(),
        (currentUser && hasServerToken) ? ApiClient.orders.getAll() : Promise.resolve([])
      ]);

      if (productsResult.status === 'fulfilled') {
        setProducts(productsResult.value);
      } else {
        console.warn('Product sync error (using local storage):', productsResult.reason);
      }

      if (ordersResult.status === 'fulfilled') {
        setOrders(getOrdersForUser(ordersResult.value, currentUser));
      } else {
        if (ordersResult.reason?.status === 401 && hasServerToken) {
          ApiClient.auth.clearLocalSession();
          setCurrentUser(null);
          setIsAdminView(false);
          setOrders([]);
        }
        console.warn('Order sync error:', ordersResult.reason);
      }
    };
    syncDataWithServer();
  }, [currentUser?.id, currentUser?.role]);

  // Persist cart
  useEffect(() => {
    StorageService.saveCart(cart);
  }, [cart]);

  // Persist wishlist
  useEffect(() => {
    StorageService.saveWishlist(wishlistIds);
  }, [wishlistIds]);

  // Toast helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Wishlist toggle
  const handleToggleWishlist = (productId) => {
    const updated = StorageService.toggleWishlist(productId);
    setWishlistIds(updated);
    const isAdded = updated.includes(productId);
    showToast(isAdded ? 'Đã thêm vào danh sách yêu thích ❤️' : 'Đã bỏ khỏi danh sách yêu thích');
  };

  // Add Product Review
  const handleAddReview = async (productId, review) => {
    try {
      if (await ApiClient.isServerOnline()) {
        const result = await ApiClient.products.addReview(productId, review);
        const updated = products.map(product => product.id === productId ? result.product : product);
        setProducts(updated);
        StorageService.saveProducts(updated);
        if (selectedProduct && selectedProduct.id === productId) {
          setSelectedProduct(result.product);
        }
        showToast('Cảm ơn bạn đã gửi đánh giá sản phẩm! ⭐');
        return;
      }
    } catch (err) {
      console.warn('Review API fallback to localStorage:', err);
    }

    const updated = StorageService.addProductReview(productId, review);
    setProducts(updated);
    if (selectedProduct && selectedProduct.id === productId) {
      setSelectedProduct(updated.find(item => item.id === productId));
    }
    showToast('Cảm ơn bạn đã gửi đánh giá sản phẩm! ⭐');
  };

  // Cart operations
  const handleAddToCart = (product, quantity = 1, variant = 'Mặc định') => {
    const stock = Number(product?.stock || 0);
    if (stock <= 0) {
      showToast('Sản phẩm hiện đã hết hàng, không thể thêm vào giỏ.');
      return;
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) => item.id === product.id && item.variant === variant
      );
      const currentQuantity = existingIndex > -1 ? prevCart[existingIndex].quantity : 0;
      const requestedQuantity = Math.max(1, Number(quantity) || 1);
      const availableQuantity = stock - currentQuantity;

      if (availableQuantity <= 0) {
        showToast(`Sản phẩm chỉ còn ${stock} sản phẩm trong kho.`);
        return prevCart;
      }

      const quantityToAdd = Math.min(requestedQuantity, availableQuantity);
      if (quantityToAdd < requestedQuantity) {
        showToast(`Chỉ có thể thêm tối đa ${availableQuantity} sản phẩm nữa theo tồn kho.`);
      }

      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity += quantityToAdd;
        return updated;
      } else {
        return [
          ...prevCart,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.images[0],
            variant,
            quantity: quantityToAdd
          }
        ];
      }
    });

    showToast(`Đã thêm "${product.name}" vào giỏ hàng!`);
  };

  const handleUpdateCartQuantity = (productId, variant, newQty) => {
    if (newQty <= 0) {
      handleRemoveCartItem(productId, variant);
      return;
    }

    const product = products.find(item => item.id === productId);
    const stock = Number(product?.stock || 0);
    if (stock <= 0) {
      showToast('Sản phẩm đã hết hàng, không thể giữ số lượng trong giỏ.');
      return;
    }

    const cappedQuantity = Math.min(newQty, stock);
    if (cappedQuantity < newQty) {
      showToast(`Số lượng đã được giới hạn ở ${stock} theo tồn kho hiện tại.`);
    }

    setCart((prev) =>
      prev.map((item) =>
        item.id === productId && item.variant === variant
          ? { ...item, quantity: cappedQuantity }
          : item
      )
    );
  };

  const handleRemoveCartItem = (productId, variant) => {
    setCart((prev) =>
      prev.filter((item) => !(item.id === productId && item.variant === variant))
    );
  };

  const handleBuyNow = (product, quantity = 1, variant = null) => {
    // Cập nhật giỏ hàng tức thời và đồng bộ Storage trước khi mở Checkout
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.id === product.id && item.variant === variant
      );
      let updated;
      if (existingIndex > -1) {
        updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity
        };
      } else {
        updated = [...prev, { ...product, quantity, variant }];
      }
      StorageService.saveCart(updated);
      return updated;
    });

    setSelectedProduct(null);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleOpenCheckout = () => {
    const invalidItem = cart.find(item => {
      const product = products.find(candidate => candidate.id === item.id);
      return !product || Number(product.stock) <= 0 || item.quantity > Number(product.stock);
    });

    if (invalidItem) {
      showToast('Giỏ hàng có sản phẩm không đủ tồn kho. Vui lòng kiểm tra lại số lượng.');
      return;
    }

    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleOrderSuccess = async (newOrderPayload) => {
    let saved = null;
    if (await ApiClient.isServerOnline()) {
      saved = await ApiClient.orders.create(newOrderPayload);
      setOrders(prev => [saved, ...prev]);
    } else {
      const fallbackOrder = {
        ...newOrderPayload,
        id: `ORD-${Date.now().toString(36).toUpperCase()}`,
        createdAt: new Date().toISOString(),
        orderStatus: 'pending'
      };
      const updatedOrders = StorageService.addOrder(fallbackOrder);
      setOrders(updatedOrders);
      saved = fallbackOrder;
    }

    setCart([]);
    setAppliedCoupon(null);
    StorageService.saveCart([]);
    return saved;
  };

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    setOrders(getOrdersForUser(StorageService.getOrders(), user));
    showToast(`Xin chào, ${user.name}! 👋`);
    if (user.role === 'admin' || user.role === 'staff') {
      setIsAdminView(true);
    }
  };

  const handleLogout = async () => {
    await ApiClient.auth.logout();
    setCurrentUser(null);
    setOrders([]);
    setIsAdminView(false);
    showToast('Đã đăng xuất tài khoản.');
  };

  const handleOpenChatWithOrder = (orderId) => {
    setChatInitialQuery(`Kiểm tra tiến độ đơn hàng ${orderId}`);
    setIsChatOpen(true);
  };

  const handleApplyCouponFromChat = (coupon) => {
    setAppliedCoupon(coupon);
    showToast(`Đã áp dụng mã "${coupon.code}" vào giỏ hàng! 🎉`);
  };

  const handlePrintInvoice = (order) => {
    setOrderToPrint(order);
    setIsInvoicePrintOpen(true);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-800 flex flex-col selection:bg-amber-100 selection:text-amber-900">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-5 z-50 bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-stone-800 flex items-center gap-2.5 text-xs font-semibold animate-slideDown">
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-stone-950 flex items-center justify-center">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        cartCount={cartCount}
        cartTotal={cartTotal}
        onOpenCart={() => setIsCartOpen(true)}
        wishlistCount={wishlistIds.length}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        ordersCount={orders.length}
        onOpenOrders={() => setIsCustomerOrdersOpen(true)}
        onOpenDownload={() => setIsAppDownloadOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isAdminView={isAdminView}
        setIsAdminView={setIsAdminView}
        onOpenChat={() => {
          setChatInitialQuery('');
          setIsChatOpen(true);
        }}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Content Switch: Admin View vs Storefront */}
      {isAdminView ? (
        <AdminDashboard
          products={products}
          setProducts={setProducts}
          orders={orders}
          setOrders={setOrders}
          onExitAdmin={() => setIsAdminView(false)}
          onPrintInvoice={handlePrintInvoice}
          currentUser={currentUser}
        />
      ) : (
        <main className="flex-1">
          {/* Hero Banner with Flash Sale countdown */}
          <Banner
            onOpenChat={() => {
              setChatInitialQuery('Gợi ý cho tôi các sản phẩm bán chạy nhất');
              setIsChatOpen(true);
            }}
            onExplore={() => {
              const el = document.getElementById('products-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
          />

          {/* Catalog & Filter Grid */}
          <ProductList
            products={products}
            searchQuery={searchQuery}
            onSelectProduct={setSelectedProduct}
            onAddToCart={handleAddToCart}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
          />
        </main>
      )}

      {/* Store Footer */}
      {!isAdminView && (
        <footer className="bg-stone-900 text-stone-300 pt-12 pb-8 border-t border-stone-800 text-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-stone-800">
              {/* Brand Col */}
              <div className="space-y-3 md:col-span-1">
                <div className="flex items-center gap-2 text-white font-serif font-bold text-lg">
                  <span>🛍️ Tiệm Nhà Nhỏ</span>
                </div>
                <p className="text-stone-400 text-xs leading-relaxed">
                  {STORE_INFO.tagline}. Chúng mình trân trọng từng đơn hàng và mong muốn mang đến niềm vui nho nhỏ cho ngôi nhà của bạn.
                </p>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-amber-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Kinh doanh có trách nhiệm & uy tín</span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-white uppercase tracking-wider text-xs">Liên hệ tiệm</h4>
                <p className="flex items-start gap-2 text-stone-400">
                  <MapPin className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>{STORE_INFO.address}</span>
                </p>
                <p className="flex items-center gap-2 text-stone-400">
                  <Phone className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Hotline: {STORE_INFO.phone}</span>
                </p>
                <p className="flex items-center gap-2 text-stone-400">
                  <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>{STORE_INFO.email}</span>
                </p>
                <p className="flex items-center gap-2 text-stone-400">
                  <Clock className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span>Giờ mở cửa: {STORE_INFO.operatingHours}</span>
                </p>
              </div>

              {/* Policies */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-white uppercase tracking-wider text-xs">Chính sách & Hỗ trợ</h4>
                <ul className="space-y-1.5 text-stone-400">
                  <li className="hover:text-white cursor-pointer transition-colors" onClick={() => { setChatInitialQuery('Chính sách freeship và phí vận chuyển'); setIsChatOpen(true); }}>
                    • Miễn phí vận chuyển đơn từ 450k
                  </li>
                  <li className="hover:text-white cursor-pointer transition-colors" onClick={() => { setChatInitialQuery('Chính sách đổi trả trong 7 ngày'); setIsChatOpen(true); }}>
                    • Đổi trả 1 đổi 1 trong 7 ngày
                  </li>
                  <li className="hover:text-white cursor-pointer transition-colors" onClick={() => { setChatInitialQuery('Hướng dẫn thanh toán chuyển khoản và COD'); setIsChatOpen(true); }}>
                    • Hướng dẫn thanh toán VietQR / COD
                  </li>
                  <li className="hover:text-white cursor-pointer transition-colors" onClick={() => { setChatInitialQuery('Kiểm tra mã giảm giá đang áp dụng'); setIsChatOpen(true); }}>
                    • Ưu đãi & Vouchers thành viên
                  </li>
                </ul>
              </div>

              {/* AI Chat Bot Assistant Callout */}
              <div className="space-y-3 bg-stone-800/80 p-4 rounded-2xl border border-stone-700/80">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Trợ Lý Bán Hàng & CSKH AI
                </h4>
                <p className="text-stone-400 text-[11px] leading-relaxed">
                  Cần tìm đồ trang trí phòng ngủ, chọn quà tặng theo ngân sách hoặc kiểm tra tiến độ đơn hàng?
                </p>
                <button
                  onClick={() => {
                    setChatInitialQuery('Tư vấn giúp mình các sản phẩm phù hợp');
                    setIsChatOpen(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-bold text-xs transition-colors shadow-sm text-center"
                >
                  💬 Mở Trò Chuyện Ngay
                </button>
              </div>
            </div>

            {/* Bottom copyright */}
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-stone-500 text-[11px] gap-2">
              <p>© {new Date().getFullYear()} Tiệm Nhà Nhỏ - E-Commerce Mini Shop. Thiết kế & phát triển cho mô hình kinh doanh nhỏ.</p>
              <p className="flex items-center gap-1 text-stone-400">
                Phục vụ bằng cả trái tim <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              </p>
            </div>
          </div>
        </footer>
      )}

      {/* PWA Install Banner */}
      {!isAdminView && showInstallBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-stone-900 text-white p-4 flex items-center justify-between shadow-[0_-4px_10px_rgba(0,0,0,0.1)] border-t border-stone-700 pb-safe">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-xl shadow-inner">
              🛍️
            </div>
            <div>
              <p className="font-bold text-sm">📱 Cài Tiệm Nhà Nhỏ lên điện thoại</p>
              <p className="text-xs text-stone-300">Cài đặt ứng dụng để trải nghiệm tốt hơn</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowInstallBanner(false)}
              className="px-3 py-1.5 text-xs font-medium text-stone-300 hover:text-white"
            >
              Để sau
            </button>
            <button 
              onClick={async () => {
                if (deferredPrompt) {
                  deferredPrompt.prompt();
                  const { outcome } = await deferredPrompt.userChoice;
                  if (outcome === 'accepted') {
                    setDeferredPrompt(null);
                    setShowInstallBanner(false);
                  }
                }
              }}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-lg shadow-sm"
            >
              Cài đặt
            </button>
          </div>
        </div>
      )}

      {/* Product Quick View / Detail Modal with Reviews */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          isWishlisted={wishlistIds.includes(selectedProduct.id)}
          onToggleWishlist={handleToggleWishlist}
          onAddReview={handleAddReview}
        />
      )}

      {/* Slide-over Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={handleOpenCheckout}
        appliedCoupon={appliedCoupon}
        setAppliedCoupon={setAppliedCoupon}
      />

      {/* Wishlist Drawer */}
      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlistIds={wishlistIds}
        products={products}
        onRemoveWishlist={handleToggleWishlist}
        onAddToCart={handleAddToCart}
        onSelectProduct={setSelectedProduct}
      />

      {/* Customer Orders & Timeline Modal */}
      <CustomerOrdersModal
        isOpen={isCustomerOrdersOpen}
        onClose={() => setIsCustomerOrdersOpen(false)}
        orders={orders}
        currentUser={currentUser}
        onOpenChatWithOrder={handleOpenChatWithOrder}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        appliedCoupon={appliedCoupon}
        onOrderSuccess={handleOrderSuccess}
        onOpenChatWithOrder={handleOpenChatWithOrder}
      />

      {/* Printable Invoice / Packing Slip Modal */}
      <InvoicePrintModal
        isOpen={isInvoicePrintOpen}
        onClose={() => setIsInvoicePrintOpen(false)}
        order={orderToPrint}
      />

      {/* 24/7 AI Sales & Customer Support Chatbot */}
      <Chatbot
        isOpen={isChatOpen}
        setIsOpen={setIsChatOpen}
        products={products}
        orders={orders}
        currentUser={currentUser}
        onSelectProduct={(p) => {
          setSelectedProduct(p);
        }}
        onAddToCart={handleAddToCart}
        onApplyCoupon={handleApplyCouponFromChat}
        onOpenOrdersModal={() => setIsCustomerOrdersOpen(true)}
        onOrderSuccess={handleOrderSuccess}
        onOpenCheckout={handleOpenCheckout}
        initialQuery={chatInitialQuery}
      />

      {/* Login / Register & RBAC Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Cài App / Web-to-App Install Modal */}
      <AppDownloadModal
        isOpen={isAppDownloadOpen}
        onClose={() => setIsAppDownloadOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallSuccess={() => {
          setDeferredPrompt(null);
          setShowInstallBanner(false);
          showToast('🎉 Chúc mừng bạn đã cài đặt ứng dụng Tiệm Nhà Nhỏ thành công!');
        }}
      />

    </div>
  );
}
