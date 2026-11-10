import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, ShoppingCart, DollarSign, AlertTriangle, Plus, Trash2, Edit, 
  CheckCircle, XCircle, Search, Sparkles, RefreshCw, Key, ArrowLeft, Printer, Tag, History, Shield, Globe, Download, Loader2, CheckSquare, Square, Star, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { formatCurrency, AIChatEngine } from '../services/aiChatEngine';
import { StorageService } from '../services/storage';
import { ApiClient, resolveMediaUrl } from '../services/api';
import { filterShopeeCatalog, splitScrapeInputs } from '../utils/shopeeFilter.js';
import { STORE_INFO } from '../data/initialData';

export default function AdminDashboard({
  products,
  setProducts,
  orders,
  setOrders,
  onExitAdmin,
  onPrintInvoice,
  currentUser
}) {
  const isStaff = currentUser?.role === 'staff';
  const [activeTab, setActiveTab] = useState('orders'); // orders, products, coupons, auditLogs, settings
  const [auditLogs, setAuditLogs] = useState([]);
  const [orderFilter, setOrderFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  
  // New product form state
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'fashion',
    price: '',
    originalPrice: '',
    stock: '',
    imageUrl: '',
    shortDesc: '',
    desc: '',
    tags: ''
  });

  // Edit product state
  const [editingProduct, setEditingProduct] = useState(null);

  // Coupons state
  const [coupons, setCoupons] = useState(() => StorageService.getCoupons());
  const [isAddingCoupon, setIsAddingCoupon] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountPercent: 10,
    discountAmount: 0,
    minOrderValue: 200000,
    description: '',
    type: 'percent' // 'percent' or 'fixed'
  });

  // Settings state
  const [settings, setSettings] = useState(() => StorageService.getSettings());
  const [geminiStatus, setGeminiStatus] = useState({
    checked: false,
    online: false,
    configured: false,
    model: '',
    keyMasked: null
  });
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [apiTestStatus, setApiTestStatus] = useState(null); // null | 'testing' | { ok, message }

  // Shopee Scraper state
  const [shopeeKeywords, setShopeeKeywords] = useState('áo khoác');
  const [shopeeLimit, setShopeeLimit] = useState(20);
  const [shopeeLoading, setShopeeLoading] = useState(false);
  const [shopeeProgress, setShopeeProgress] = useState('');
  const [shopeeResults, setShopeeResults] = useState([]);
  const [shopeeSelected, setShopeeSelected] = useState(new Set());
  const [shopeeImporting, setShopeeImporting] = useState(false);
  const [shopeeError, setShopeeError] = useState(null);
  const [shopeeSuccess, setShopeeSuccess] = useState(null);
  const [shopeeServerOnline, setShopeeServerOnline] = useState(null);
  const [shopeeSessionId, setShopeeSessionId] = useState(null);
  const [scraperConfig, setScraperConfig] = useState(null);
  const [scraperConfigLoading, setScraperConfigLoading] = useState(false);
  const [scraperConfigOpen, setScraperConfigOpen] = useState(false);
  const [scraperProviderInput, setScraperProviderInput] = useState('zenrows');
  const [scraperApiKeyInput, setScraperApiKeyInput] = useState('');
  const [scraperConfigSaving, setScraperConfigSaving] = useState(false);
  const [scraperConfigFeedback, setScraperConfigFeedback] = useState(null);
  const [shopeeBlockedByBot, setShopeeBlockedByBot] = useState(false);
  const [shopeeLoginRequired, setShopeeLoginRequired] = useState(false);
  const [cookieMeta, setCookieMeta] = useState(null);
  const [cookiePanelOpen, setCookiePanelOpen] = useState(false);
  const [shopeeCookieInput, setShopeeCookieInput] = useState('');
  const [cookieSaving, setCookieSaving] = useState(false);
  const [cookieFeedback, setCookieFeedback] = useState(null);
  const [retryingBackend, setRetryingBackend] = useState(false);
  const isMountedRef = useRef(true);

  const loadCookieStatus = async () => {
    if (!ApiClient.auth.getToken() || currentUser?.role !== 'admin') return;
    try {
      const meta = await ApiClient.shopee.getCookieStatus();
      if (isMountedRef.current) setCookieMeta(meta);
    } catch (err) {
      console.warn('Fetch cookie status error:', err);
    }
  };

  const handleSaveShopeeCookie = async (e) => {
    e.preventDefault();
    setCookieFeedback(null);
    const raw = shopeeCookieInput.trim();
    if (!raw) {
      setCookieFeedback({ ok: false, message: 'Vui lòng dán chuỗi Cookie Shopee từ trình duyệt đã đăng nhập.' });
      return;
    }
    if (!ApiClient.auth.getToken()) {
      setCookieFeedback({ ok: false, message: 'Vui lòng đăng nhập tài khoản Chủ Shop trên backend để lưu cookie.' });
      return;
    }
    setCookieSaving(true);
    try {
      const saved = await ApiClient.shopee.updateCookie(raw);
      if (!isMountedRef.current) return;
      setCookieMeta(saved);
      setShopeeCookieInput('');
      setShopeeLoginRequired(false);
      setShopeeBlockedByBot(false);
      setCookieFeedback({
        ok: true,
        message: `✅ Đã lưu ${saved.cookieCount} cookie Shopee lên máy chủ (${saved.hasAuthToken ? 'có token đăng nhập SPC' : 'cookie phiên khách'}). Bây giờ bạn có thể bấm "Bắt Đầu Cào" lại!`
      });
    } catch (err) {
      if (isMountedRef.current) {
        setCookieFeedback({ ok: false, message: err.message || 'Không thể lưu Cookie Shopee.' });
      }
    } finally {
      if (isMountedRef.current) setCookieSaving(false);
    }
  };

  const loadScraperConfig = async () => {
    if (!ApiClient.auth.getToken() || currentUser?.role !== 'admin') return;
    setScraperConfigLoading(true);
    try {
      const meta = await ApiClient.shopee.getScraperConfig();
      if (isMountedRef.current) {
        setScraperConfig(meta);
        if (meta?.selectedProvider === 'auto') {
          setScraperProviderInput('auto');
        } else if (meta?.activeProvider) {
          setScraperProviderInput(meta.activeProvider);
        }
        if (!meta?.configured) {
          setScraperConfigOpen(true);
        }
      }
    } catch (err) {
      console.warn('Fetch scraping API config error:', err);
    } finally {
      if (isMountedRef.current) setScraperConfigLoading(false);
    }
  };

  const handleSaveScraperConfig = async (e) => {
    e.preventDefault();
    setScraperConfigFeedback(null);
    const trimmedKey = scraperProviderInput === 'auto' ? '' : scraperApiKeyInput.trim();
    if (trimmedKey && (trimmedKey.length < 8 || /\s/.test(trimmedKey))) {
      setScraperConfigFeedback({
        ok: false,
        message: 'API Key không hợp lệ (cần tối thiểu 8 ký tự và không chứa khoảng trắng).'
      });
      return;
    }
    if (!ApiClient.auth.getToken()) {
      setScraperConfigFeedback({
        ok: false,
        message: 'Bạn đang ở chế độ Demo Offline. Vui lòng đăng nhập bằng tài khoản Chủ Shop trên backend để lưu cấu hình.'
      });
      return;
    }

    setScraperConfigSaving(true);
    try {
      const saved = await ApiClient.shopee.updateScraperConfig({
        provider: scraperProviderInput,
        ...(trimmedKey ? { apiKey: trimmedKey } : {})
      });
      if (!isMountedRef.current) return;
      setScraperConfig(saved);
      setScraperApiKeyInput('');
      setShopeeBlockedByBot(false);
      setShopeeError(null);
      setScraperConfigFeedback({
        ok: true,
        message: saved?.configured
          ? `✅ Đã cấu hình Scraping API (${saved.activeProvider?.toUpperCase()}). Bây giờ bạn có thể bấm "Bắt Đầu Cào" để lấy dữ liệu thật!`
          : 'Đã cập nhật nhà cung cấp ưu tiên. Hãy dán thêm API Key để kích hoạt cào trực tiếp.'
      });
    } catch (err) {
      if (isMountedRef.current) {
        setScraperConfigFeedback({ ok: false, message: err.message || 'Không thể lưu cấu hình Scraping API lên máy chủ.' });
      }
    } finally {
      if (isMountedRef.current) setScraperConfigSaving(false);
    }
  };

  const handleClearScraperKey = async (providerName) => {
    if (!ApiClient.auth.getToken()) return;
    setScraperConfigSaving(true);
    setScraperConfigFeedback(null);
    try {
      const saved = await ApiClient.shopee.updateScraperConfig({
        provider: providerName,
        clearKey: true
      });
      if (!isMountedRef.current) return;
      setScraperConfig(saved);
      setScraperConfigFeedback({
        ok: true,
        message: `Đã xóa key lưu cục bộ của ${providerName.toUpperCase()}.`
      });
    } catch (err) {
      if (isMountedRef.current) {
        setScraperConfigFeedback({ ok: false, message: err.message || 'Không thể xóa key.' });
      }
    } finally {
      if (isMountedRef.current) setScraperConfigSaving(false);
    }
  };

  const pollScrapeSession = async (activeSessionId, keywords, limitVal) => {
    const maxDeadline = Date.now() + 360 * 1000;
    let finalState = null;
    let consecutivePollErrors = 0;

    while (isMountedRef.current && Date.now() < maxDeadline) {
      let statusData;
      try {
        statusData = await ApiClient.shopee.getStatus(activeSessionId);
        consecutivePollErrors = 0;
      } catch (pollErr) {
        consecutivePollErrors += 1;
        if (pollErr?.status === 404) {
          throw new Error(
            'Phiên cào tạm bị ngắt do máy chủ backend (Render Free) vừa khởi động lại. Vui lòng thử lại hoặc dán Link chi tiết 1 sản phẩm Shopee cụ thể để xử lý nhẹ hơn.'
          );
        }
        if (pollErr?.status === 401 || pollErr?.status === 403 || consecutivePollErrors >= 5) {
          throw pollErr;
        }
        await new Promise(resolve => setTimeout(resolve, 2500));
        continue;
      }
      if (!isMountedRef.current) return;
      if (statusData.progress) {
        setShopeeProgress(statusData.progress);
      }
      if (!statusData.running) {
        finalState = statusData;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    if (!isMountedRef.current) return;

    if (!finalState) {
      setShopeeError('Quá thời gian chờ phản hồi từ phiên cào trên máy chủ.');
      setShopeeLoading(false);
      return;
    }

    if (finalState.status === 'config_required') {
      setShopeeResults([]);
      setScraperConfigOpen(true);
      setShopeeError(finalState.error || finalState.message || 'Chưa cấu hình Scraping API Key (Phương án B).');
      setShopeeLoading(false);
      return;
    }

    if (finalState.status === 'failed') {
      if (finalState.configRequired) setScraperConfigOpen(true);
      setShopeeError(finalState.error || finalState.message || 'Phiên cào dữ liệu Shopee thất bại.');
      setShopeeLoading(false);
      return;
    }

    if (finalState.status === 'login_required' || finalState.loginRequired) {
      setShopeeResults([]);
      setShopeeLoginRequired(true);
      setShopeeBlockedByBot(true);
      setCookiePanelOpen(true);
      setShopeeError(
        finalState.message || 'Shopee đang yêu cầu đăng nhập (/buyer/login) để xem tìm kiếm. Vui lòng dán Cookie Shopee đã đăng nhập vào mục Cookie phía trên rồi thử lại.'
      );
      setShopeeLoading(false);
      return;
    }

    if (finalState.status === 'blocked') {
      setShopeeResults([]);
      setShopeeBlockedByBot(true);
      setCookiePanelOpen(true);
      setShopeeError(
        finalState.message || 'Shopee tạm thời giới hạn phản hồi qua Scraping API. Bạn có thể bổ sung Cookie Shopee hoặc kiểm tra gói antibot/proxy của provider.'
      );
      setShopeeLoading(false);
      return;
    }

    const rawResults = Array.isArray(finalState.results) ? finalState.results : [];
    const matched = filterShopeeCatalog(rawResults, keywords, limitVal);

    if (matched.length === 0 || finalState.status === 'empty') {
      setShopeeResults([]);
      setShopeeError(
        finalState.message || `Không tìm thấy sản phẩm mới nào trên Shopee khớp với từ khóa "${keywords.join(', ')}". Vui lòng thử từ khóa khác.`
      );
      setShopeeLoading(false);
      return;
    }

    setShopeeResults(matched);
    setShopeeSuccess(
      `🎉 Phiên ${activeSessionId}: Đã cào trực tiếp và lọc ${matched.length} sản phẩm thật khớp từ khóa "${keywords.join(', ')}" từ Shopee!`
    );
    setShopeeLoading(false);
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Computed metrics
  const totalRevenue = orders.reduce((sum, o) => sum + (o.orderStatus !== 'cancelled' ? o.total : 0), 0);
  const lowStockCount = products.filter(p => p.stock <= 15).length;

  // Filtered Orders
  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'all') return true;
    return o.orderStatus === orderFilter;
  });

  // Filtered Products
  const filteredProducts = products.filter(p => {
    if (!productSearch) return true;
    return p.name.toLowerCase().includes(productSearch.toLowerCase());
  });

  useEffect(() => {
    if (activeTab === 'auditLogs' && !isStaff) {
      ApiClient.auditLogs.getAll()
        .then(data => { if (isMountedRef.current) setAuditLogs(data); })
        .catch(err => console.warn('Fetch audit logs error:', err));
    }

    if (activeTab === 'settings') {
      (async () => {
        const online = await ApiClient.isServerOnline();
        if (!isMountedRef.current) return;
        if (!online) {
          setGeminiStatus({ checked: true, online: false, configured: false, model: '', keyMasked: null });
          return;
        }
        try {
          const st = await ApiClient.chat.getStatus();
          if (!isMountedRef.current) return;
          setGeminiStatus({
            checked: true,
            online: true,
            configured: Boolean(st?.configured),
            model: st?.model || '',
            keyMasked: st?.keyMasked || null
          });
        } catch {
          if (isMountedRef.current) {
            setGeminiStatus({ checked: true, online: true, configured: false, model: '', keyMasked: null });
          }
        }
      })();
    }

    const initShopeeTab = async () => {
      const online = await ApiClient.isServerOnline();
      if (!isMountedRef.current) return;
      setShopeeServerOnline(online);
      if (!online) {
        return;
      }
      loadScraperConfig();
      loadCookieStatus();
      try {
        const st = await ApiClient.shopee.getStatus();
        if (!isMountedRef.current) return;
        if (st?.running && st?.sessionId) {
          setShopeeSessionId(st.sessionId);
          setShopeeLoading(true);
          setShopeeProgress(st.progress || '');
          pollScrapeSession(st.sessionId, st.requestedKeywords || [], st.limit || shopeeLimit);
        } else if (st?.status === 'config_required') {
          setShopeeSessionId(st.sessionId || null);
          setScraperConfigOpen(true);
        } else if (st?.status === 'login_required') {
          setShopeeSessionId(st.sessionId || null);
          setShopeeLoginRequired(true);
          setShopeeBlockedByBot(true);
          setCookiePanelOpen(true);
          if (st.progress) setShopeeProgress(st.progress);
        } else if (st?.status === 'blocked') {
          setShopeeSessionId(st.sessionId || null);
          setShopeeBlockedByBot(true);
          setCookiePanelOpen(true);
          if (st.progress) setShopeeProgress(st.progress);
        } else if (st?.status === 'completed' && Array.isArray(st.results) && st.results.length > 0 && shopeeResults.length === 0) {
          setShopeeSessionId(st.sessionId || null);
          setShopeeResults(st.results);
          setShopeeSuccess(`Phiên ${st.sessionId}: đã nạp ${st.results.length} sản phẩm cào trực tiếp gần nhất trên máy chủ.`);
        }
      } catch (err) {
        console.warn('Fetch shopee status error:', err);
      }
    };

    if (activeTab === 'shopeeScraper') {
      initShopeeTab();
    }
  }, [activeTab]);

  // Handle order status update with audit trail
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    const staffName = currentUser?.name || (isStaff ? 'Nhân Viên Kho' : 'Chủ Shop');
    try {
      if (await ApiClient.isServerOnline()) {
        const updated = await ApiClient.orders.updateStatus(orderId, { status: newStatus });
        setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      } else {
        const updated = orders.map(o => {
          if (o.id === orderId) {
            return { 
              ...o, 
              orderStatus: newStatus,
              handledBy: staffName,
              paymentStatus: newStatus === 'delivered' ? 'paid' : o.paymentStatus
            };
          }
          return o;
        });
        setOrders(updated);
        StorageService.saveOrders(updated);
      }
    } catch (err) {
      console.warn("Update status error:", err);
    }
  };

  // Handle Create Product – ghi vào backend JSON, fallback localStorage
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || !newProduct.stock) {
      alert('Vui lòng nhập tên sản phẩm, giá bán và số lượng tồn kho.');
      return;
    }

    const defaultImg = newProduct.imageUrl.trim() || "/placeholder.svg";

    const productPayload = {
      id: `sp-${Date.now()}`,
      name: newProduct.name,
      category: newProduct.category,
      price: parseInt(newProduct.price, 10),
      originalPrice: newProduct.originalPrice ? parseInt(newProduct.originalPrice, 10) : null,
      stock: parseInt(newProduct.stock, 10),
      rating: 5.0,
      reviewsCount: 0,
      isFeatured: true,
      isNew: true,
      isFlashSale: false,
      images: [defaultImg],
      variants: {
        colors: ["Mặc định"],
        sizes: ["Tiêu chuẩn"]
      },
      shortDesc: newProduct.shortDesc || newProduct.name,
      desc: newProduct.desc || newProduct.shortDesc || newProduct.name,
      specs: {
        "Xuất xứ": "Việt Nam",
        "Tình trạng": "Mới 100%"
      },
      tags: newProduct.tags ? newProduct.tags.split(',').map(t => t.trim().toLowerCase()) : [newProduct.name.toLowerCase()],
      reviews: []
    };

    try {
      let savedProduct = productPayload;
      if (await ApiClient.isServerOnline()) {
        savedProduct = await ApiClient.products.create(productPayload);
      }
      const updated = [savedProduct, ...products];
      setProducts(updated);
      StorageService.saveProducts(updated);
    } catch (err) {
      console.warn('Create product fallback to localStorage:', err);
      const updated = [productPayload, ...products];
      setProducts(updated);
      StorageService.saveProducts(updated);
    }

    setIsAddingProduct(false);
    setNewProduct({
      name: '',
      category: 'fashion',
      price: '',
      originalPrice: '',
      stock: '',
      imageUrl: '',
      shortDesc: '',
      desc: '',
      tags: ''
    });
  };

  // Handle Edit Product Save – ghi vào backend JSON, fallback localStorage
  const handleSaveEditedProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      let savedProduct = editingProduct;
      if (await ApiClient.isServerOnline()) {
        savedProduct = await ApiClient.products.update(editingProduct.id, editingProduct);
      }
      const updated = products.map(p => p.id === editingProduct.id ? savedProduct : p);
      setProducts(updated);
      StorageService.saveProducts(updated);
    } catch (err) {
      console.warn('Update product fallback to localStorage:', err);
      const updated = products.map(p => p.id === editingProduct.id ? editingProduct : p);
      setProducts(updated);
      StorageService.saveProducts(updated);
    }

    setEditingProduct(null);
  };

  // Delete product – ghi vào backend JSON, fallback localStorage
  const handleDeleteProduct = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;

    try {
      if (await ApiClient.isServerOnline()) {
        await ApiClient.products.delete(id);
      }
    } catch (err) {
      console.warn('Delete product API error, removing locally:', err);
    }

    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    StorageService.saveProducts(updated);
  };

  // Handle Add Coupon
  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!newCoupon.code.trim()) return;

    const couponObj = {
      id: `c-${Date.now()}`,
      code: newCoupon.code.trim().toUpperCase(),
      discountPercent: newCoupon.type === 'percent' ? parseInt(newCoupon.discountPercent, 10) : 0,
      discountAmount: newCoupon.type === 'fixed' ? parseInt(newCoupon.discountAmount, 10) : 0,
      minOrderValue: parseInt(newCoupon.minOrderValue, 10) || 0,
      description: newCoupon.description || (newCoupon.type === 'percent' ? `Giảm ${newCoupon.discountPercent}% cho đơn từ ${formatCurrency(newCoupon.minOrderValue)}` : `Giảm ${formatCurrency(newCoupon.discountAmount)}`),
      isActive: true
    };

    try {
      if (await ApiClient.isServerOnline()) {
        const savedCoupon = await ApiClient.coupons.create(couponObj);
        const updated = [savedCoupon, ...coupons];
        setCoupons(updated);
        StorageService.saveCoupons(updated);
      } else {
        const updated = StorageService.addCoupon(couponObj);
        setCoupons(updated);
      }
    } catch (err) {
      console.warn('Create coupon fallback to localStorage:', err);
      const updated = StorageService.addCoupon(couponObj);
      setCoupons(updated);
    }
    setIsAddingCoupon(false);
    setNewCoupon({
      code: '',
      discountPercent: 10,
      discountAmount: 0,
      minOrderValue: 200000,
      description: '',
      type: 'percent'
    });
  };

  const handleToggleCoupon = async (couponId) => {
    try {
      if (await ApiClient.isServerOnline()) {
        const updatedCoupon = await ApiClient.coupons.toggle(couponId);
        const updated = coupons.map(coupon =>
          (coupon.id === couponId || coupon.code === couponId) ? updatedCoupon : coupon
        );
        setCoupons(updated);
        StorageService.saveCoupons(updated);
      } else {
        const updated = StorageService.toggleCouponActive(couponId);
        setCoupons(updated);
      }
    } catch (err) {
      console.warn('Toggle coupon fallback to localStorage:', err);
      const updated = StorageService.toggleCouponActive(couponId);
      setCoupons(updated);
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (confirm('Bạn có chắc chắn muốn xóa mã ưu đãi này?')) {
      try {
        if (await ApiClient.isServerOnline()) {
          await ApiClient.coupons.delete(couponId);
          const updated = coupons.filter(coupon => coupon.id !== couponId && coupon.code !== couponId);
          setCoupons(updated);
          StorageService.saveCoupons(updated);
        } else {
          const updated = StorageService.deleteCoupon(couponId);
          setCoupons(updated);
        }
      } catch (err) {
        console.warn('Delete coupon fallback to localStorage:', err);
        const updated = StorageService.deleteCoupon(couponId);
        setCoupons(updated);
      }
    }
  };

  // Save Settings
  const handleSaveSettings = (e) => {
    e.preventDefault();
    const updated = {
      ...settings,
      aiProviderExplicit: true
    };
    StorageService.saveSettings(updated);
    setSettings(updated);
    setApiKeySaved(true);
    setApiTestStatus(null);
    setTimeout(() => setApiKeySaved(false), 2500);
  };

  // Test Gemini server connectivity & live model verification
  const handleTestApiKey = async () => {
    setApiTestStatus('testing');
    const result = await AIChatEngine.testGeminiConnection();
    setApiTestStatus(result);
  };

  // Reset sample data
  const handleResetData = () => {
    if (confirm('Khôi phục toàn bộ dữ liệu mẫu ban đầu? Các đơn hàng và sản phẩm tự tạo sẽ được thiết lập lại.')) {
      const res = StorageService.resetAllData();
      setProducts(res.products);
      setOrders(res.orders);
      setCoupons(res.coupons);
      alert('Đã khôi phục dữ liệu mẫu thành công!');
    }
  };

  const handleRetryBackendConnection = async () => {
    setRetryingBackend(true);
    setShopeeError(null);
    const online = await ApiClient.isServerOnline(2);
    if (!isMountedRef.current) return;
    setShopeeServerOnline(online);
    setRetryingBackend(false);
    if (online) {
      loadScraperConfig();
      loadCookieStatus();
    } else {
      setShopeeError('Backend server chưa phản hồi (nếu dùng Render Free, server có thể đang khởi động lại mất 20–40 giây). Vui lòng thử lại.');
    }
  };

  // ====== SHOPEE SCRAPER HANDLERS ======
  const handleShopeeScrape = async () => {
    setShopeeLoading(true);
    setShopeeError(null);
    setShopeeSuccess(null);
    setShopeeResults([]);
    setShopeeSelected(new Set());
    setShopeeProgress('');
    setShopeeSessionId(null);
    setShopeeBlockedByBot(false);
    setShopeeLoginRequired(false);
    setScraperConfigFeedback(null);

    try {
      const keywords = splitScrapeInputs(shopeeKeywords);

      if (keywords.length === 0) {
        setShopeeError('Vui lòng nhập ít nhất 1 từ khóa hoặc link sản phẩm Shopee hợp lệ để cào dữ liệu.');
        setShopeeLoading(false);
        return;
      }

      const online = await ApiClient.isServerOnline(2);
      setShopeeServerOnline(online);

      if (!online) {
        setShopeeError(
          'Không thể kết nối tới Backend Scraper trên máy chủ (Render Free có thể đang thức dậy sau 20–40 giây). Hệ thống không hiển thị dữ liệu giả hay sản phẩm có sẵn trong giỏ — vui lòng đợi vài giây rồi bấm "Bắt Đầu Cào" lại.'
        );
        setShopeeLoading(false);
        return;
      }

      if (!ApiClient.auth.getToken()) {
        setShopeeError('Bạn chưa có phiên xác thực Chủ Shop trên máy chủ. Vui lòng đăng xuất và đăng nhập lại bằng tài khoản Chủ Shop để chạy trình cào.');
        setShopeeLoading(false);
        return;
      }

      const job = await ApiClient.shopee.scrape(keywords, shopeeLimit);
      const activeSessionId = job?.sessionId;
      if (!activeSessionId) {
        throw new Error('Máy chủ không khởi tạo được mã phiên cào hợp lệ.');
      }

      setShopeeSessionId(activeSessionId);
      setShopeeProgress('Đang kết nối Scraping API (Phương án B) trên máy chủ...\n');
      await pollScrapeSession(activeSessionId, keywords, shopeeLimit);
    } catch (err) {
      console.error('Shopee scrape error:', err);
      if (err?.data?.code === 'SCRAPER_CONFIG_REQUIRED') {
        setScraperConfigOpen(true);
      }
      setShopeeError(err.message || 'Lỗi kết nối — đảm bảo server backend đang chạy và đã cấu hình Scraping API (ZenRows / ScraperAPI / Crawlbase).');
      setShopeeLoading(false);
    }
  };

  const handleShopeeImport = async () => {
    if (shopeeSelected.size === 0) {
      setShopeeError('Vui lòng chọn ít nhất 1 sản phẩm để nhập vào kho.');
      return;
    }

    setShopeeImporting(true);
    setShopeeError(null);

    try {
      const selectedProducts = shopeeResults.filter((_, i) => shopeeSelected.has(i));
      const online = await ApiClient.isServerOnline(1);
      setShopeeServerOnline(online);

      if (!online) {
        setShopeeError('Máy chủ backend đang ngoại tuyến hoặc đang khởi động lại. Vui lòng kết nối lại backend trước khi nhập sản phẩm Shopee vào kho.');
        return;
      }

      if (!ApiClient.auth.getToken()) {
        setShopeeError('Bạn chưa đăng nhập tài khoản Chủ Shop trên backend để lưu sản phẩm vào CSDL máy chủ.');
        return;
      }

      const data = await ApiClient.shopee.importProducts(selectedProducts);

      const freshProducts = await ApiClient.products.getAll();
      setProducts(freshProducts);
      StorageService.saveProducts(freshProducts);

      const successMsg = data.skippedDuplicates > 0
        ? `✅ Đã nhập thành công ${data.imported} sản phẩm vào CSDL kho hàng (Trạng thái Bản Nháp)! Đã tự động bỏ qua ${data.skippedDuplicates} sản phẩm trùng lặp.`
        : `✅ Đã nhập thành công ${data.imported || selectedProducts.length} sản phẩm vào CSDL kho hàng (Trạng thái Bản Nháp)!`;

      setShopeeSuccess(successMsg);
      setShopeeSelected(new Set());
    } catch (err) {
      console.error('Shopee import error:', err);
      setShopeeError(err.message || 'Lỗi nhập sản phẩm.');
    } finally {
      setShopeeImporting(false);
    }
  };

  const toggleShopeeSelectAll = () => {
    if (shopeeSelected.size === shopeeResults.length) {
      setShopeeSelected(new Set());
    } else {
      setShopeeSelected(new Set(shopeeResults.map((_, i) => i)));
    }
  };

  const toggleShopeeSelect = (index) => {
    setShopeeSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-stone-100/60 pb-16">
      
      {/* Top Banner Bar */}
      <div className="bg-stone-900 text-white px-4 sm:px-8 py-5 border-b border-stone-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-800 text-amber-100 text-xs font-bold px-2 py-0.5 rounded uppercase">Quản trị</span>
              <h1 className="text-xl sm:text-2xl font-bold font-serif">Bảng Điều Khiển Cửa Hàng</h1>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Quản lý sản phẩm, đơn đặt hàng, voucher và cấu hình trợ lý AI cho Tiệm Nhà Nhỏ
            </p>
          </div>

          <button
            onClick={onExitAdmin}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Xem Giao Diện Khách Mua</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {!isStaff ? (
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-xs font-medium">Doanh thu tạm tính</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-stone-900">{formatCurrency(totalRevenue)}</div>
              <span className="text-[11px] text-stone-400">Từ {orders.length} đơn hàng</span>
            </div>
          ) : (
            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-xs">
              <div className="flex items-center justify-between text-amber-800 mb-2">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-700" />
                  Quyền Hạn Nhân Viên
                </span>
                <span className="text-[10px] uppercase font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">Staff</span>
              </div>
              <div className="text-sm font-bold text-stone-900 mt-1">Xử Lý & Đóng Gói Đơn</div>
              <span className="text-[11px] text-stone-500">Ghi nhận nhật ký tự động</span>
            </div>
          )}

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-medium">Tổng số đơn hàng</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-stone-900">{orders.length}</div>
            <span className="text-[11px] text-stone-400">Đơn khách đã đặt</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-medium">Sản phẩm trong kho</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-stone-900">{products.length}</div>
            <span className="text-[11px] text-stone-400">Đang hiển thị bán</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-medium">Sắp hết hàng</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-stone-900">{lowStockCount}</div>
            <span className="text-[11px] text-stone-400">&le; 15 sản phẩm</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 space-x-4 mb-6 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'orders'
                ? 'border-amber-900 text-amber-900'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Quản Lý Đơn Hàng ({orders.length})</span>
          </button>

          {!isStaff && (
            <>
              <button
                onClick={() => setActiveTab('products')}
                className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
                  activeTab === 'products'
                    ? 'border-amber-900 text-amber-900'
                    : 'border-transparent text-stone-500 hover:text-stone-700'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Quản Lý Sản Phẩm ({products.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('coupons')}
                className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
                  activeTab === 'coupons'
                    ? 'border-amber-900 text-amber-900'
                    : 'border-transparent text-stone-500 hover:text-stone-700'
                }`}
              >
                <Tag className="w-4 h-4" />
                <span>Mã Khuyến Mãi ({coupons.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('auditLogs')}
                className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
                  activeTab === 'auditLogs'
                    ? 'border-amber-900 text-amber-900'
                    : 'border-transparent text-stone-500 hover:text-stone-700'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Nhật Ký Xử Lý (Audit Logs)</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
                  activeTab === 'settings'
                    ? 'border-amber-900 text-amber-900'
                    : 'border-transparent text-stone-500 hover:text-stone-700'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Cấu Hình & AI Chatbot</span>
              </button>

              <button
                onClick={() => setActiveTab('shopeeScraper')}
                className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
                  activeTab === 'shopeeScraper'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-stone-500 hover:text-stone-700'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>🛒 Cào Shopee</span>
              </button>
            </>
          )}
        </div>

        {/* Tab Content: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Filter pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'pending', label: '⏳ Chờ xác nhận' },
                { id: 'processing', label: '📦 Đang đóng gói' },
                { id: 'shipping', label: '🚚 Đang giao hàng' },
                { id: 'delivered', label: '✅ Đã hoàn tất' },
                { id: 'cancelled', label: '❌ Đã hủy' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setOrderFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    orderFilter === f.id
                      ? 'bg-stone-900 text-white'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-stone-200 text-stone-500 text-xs">
                Không có đơn hàng nào thuộc trạng thái này.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map(order => (
                  <div 
                    key={order.id} 
                    className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs hover:border-amber-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-base font-extrabold text-amber-900">{order.id}</span>
                        <span className="text-xs text-stone-400">
                          {new Date(order.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>

                      {/* Action buttons: Status + Print */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onPrintInvoice(order)}
                          className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                          title="In phiếu đóng gói và dán hộp"
                        >
                          <Printer className="w-3.5 h-3.5 text-stone-600" />
                          <span>In Phiếu Giao</span>
                        </button>

                        <select
                          value={order.orderStatus}
                          onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                          className="text-xs font-bold px-3 py-1.5 rounded-xl border border-stone-300 bg-stone-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-700"
                        >
                          <option value="pending">⏳ Chờ xác nhận</option>
                          <option value="processing">📦 Đang đóng gói</option>
                          <option value="shipping">🚚 Đang giao hàng</option>
                          <option value="delivered">✅ Đã hoàn tất</option>
                          <option value="cancelled">❌ Đã hủy</option>
                        </select>
                      </div>
                    </div>

                    {/* Customer details & items */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-3 text-xs">
                      <div className="md:col-span-5 space-y-1 text-stone-600">
                        <p>👤 <strong>Khách hàng:</strong> {order.customer.name} - {order.customer.phone}</p>
                        <p>📍 <strong>Địa chỉ:</strong> {order.customer.address}, {order.customer.city}</p>
                        {order.customer.notes && <p>📝 <strong>Ghi chú:</strong> {order.customer.notes}</p>}
                        <p>💳 <strong>Thanh toán:</strong> <span className="uppercase font-semibold">{order.paymentMethod}</span> ({order.paymentStatus === 'paid' ? <span className="text-emerald-700 font-bold">Đã thu tiền</span> : <span className="text-amber-700 font-bold">Chưa thu tiền</span>})</p>
                        {order.trackingCode && <p>🚚 <strong>Vận đơn:</strong> {order.trackingCarrier} - <code className="font-mono">{order.trackingCode}</code></p>}
                      </div>

                      <div className="md:col-span-7 bg-stone-50 rounded-xl p-3 space-y-2">
                        <span className="font-bold text-stone-700 uppercase tracking-wider text-[10px]">Danh sách món ({order.items.length}):</span>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                              <span className="text-stone-800 line-clamp-1">
                                {it.name} <span className="text-stone-400">({it.variant})</span> x<strong>{it.quantity}</strong>
                              </span>
                              <span className="font-semibold text-stone-900 flex-shrink-0 ml-2">
                                {formatCurrency(it.price * it.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="pt-2 border-t border-stone-200 flex justify-between font-bold text-sm">
                          <span>Tổng tiền thu khách:</span>
                          <span className="text-amber-900">{formatCurrency(order.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: PRODUCTS */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  placeholder="Tìm sản phẩm theo tên..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-700"
                />
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <button
                onClick={() => setIsAddingProduct(true)}
                className="px-4 py-2 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Sản Phẩm Mới</span>
              </button>
            </div>

            {/* Edit Product Modal */}
            {editingProduct && (
              <div className="bg-white p-5 rounded-2xl border-2 border-blue-800/40 shadow-md space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <h3 className="font-bold text-sm text-stone-900">Chỉnh Sửa Sản Phẩm: {editingProduct.name}</h3>
                  <button
                    onClick={() => setEditingProduct(null)}
                    className="text-stone-400 hover:text-stone-600 text-xs"
                  >
                    Hủy
                  </button>
                </div>

                <form onSubmit={handleSaveEditedProduct} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-stone-700 font-semibold mb-1">Tên sản phẩm</label>
                    <input
                      type="text"
                      required
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-700"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Danh mục</label>
                    <select
                      value={editingProduct.category}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white"
                    >
                      <option value="fashion">Thời trang & Túi xách</option>
                      <option value="decor">Decor & Nến thơm</option>
                      <option value="coffee">Cà phê & Quà tặng</option>
                      <option value="tech">Phụ kiện công nghệ</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Giá bán (VND)</label>
                    <input
                      type="number"
                      required
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct({ ...editingProduct, price: parseInt(e.target.value, 10) })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-700"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Tồn kho</label>
                    <input
                      type="number"
                      required
                      value={editingProduct.stock}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value, 10) })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-700"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingProduct.isFlashSale || false}
                        onChange={(e) => setEditingProduct({ ...editingProduct, isFlashSale: e.target.checked })}
                        className="rounded text-rose-600 focus:ring-rose-500"
                      />
                      <span className="font-semibold text-rose-700">Gắn nhãn Flash Sale</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingProduct.status === 'draft' || Boolean(editingProduct.isDraft)}
                        onChange={(e) => setEditingProduct({
                          ...editingProduct,
                          status: e.target.checked ? 'draft' : 'active',
                          isDraft: e.target.checked
                        })}
                        className="rounded text-amber-700 focus:ring-amber-600"
                      />
                      <span className="font-semibold text-amber-800">Giữ ở Bản Nháp (ẩn khỏi storefront)</span>
                    </label>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-stone-700 font-semibold mb-1">Mô tả ngắn</label>
                    <input
                      type="text"
                      value={editingProduct.shortDesc || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, shortDesc: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200"
                    />
                  </div>

                  <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold"
                    >
                      Lưu Thay Đổi
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Add Product Modal/Card */}
            {isAddingProduct && (
              <div className="bg-white p-5 rounded-2xl border-2 border-amber-800/40 shadow-md space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <h3 className="font-bold text-sm text-stone-900">Thêm Sản Phẩm Mới Vào Gian Hàng</h3>
                  <button
                    onClick={() => setIsAddingProduct(false)}
                    className="text-stone-400 hover:text-stone-600 text-xs"
                  >
                    Hủy
                  </button>
                </div>

                <form onSubmit={handleCreateProduct} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-stone-700 font-semibold mb-1">Tên sản phẩm *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Nến Thơm Tinh Dầu Lavender"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-700"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Danh mục *</label>
                    <select
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-amber-700"
                    >
                      <option value="fashion">Thời trang & Túi xách</option>
                      <option value="decor">Decor & Nến thơm</option>
                      <option value="coffee">Cà phê & Quà tặng</option>
                      <option value="tech">Phụ kiện công nghệ</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Giá bán (VND) *</label>
                    <input
                      type="number"
                      required
                      placeholder="250000"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-700"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Giá niêm yết cũ (nếu giảm giá)</label>
                    <input
                      type="number"
                      placeholder="300000"
                      value={newProduct.originalPrice}
                      onChange={(e) => setNewProduct({ ...newProduct, originalPrice: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-700"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Số lượng tồn kho *</label>
                    <input
                      type="number"
                      required
                      placeholder="20"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-700"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-stone-700 font-semibold mb-1">Đường dẫn hình ảnh (URL)</label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={newProduct.imageUrl}
                      onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-700"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-stone-700 font-semibold mb-1">Mô tả ngắn gọn</label>
                    <input
                      type="text"
                      placeholder="Chiết xuất tự nhiên, mang lại hương thơm thư giãn..."
                      value={newProduct.shortDesc}
                      onChange={(e) => setNewProduct({ ...newProduct, shortDesc: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-700"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-stone-700 font-semibold mb-1">Từ khóa / Tags tìm kiếm cho AI Bot (cách nhau bằng dấu phẩy)</label>
                    <input
                      type="text"
                      placeholder="nến thơm, decor, quà tặng sinh nhật, thư giãn"
                      value={newProduct.tags}
                      onChange={(e) => setNewProduct({ ...newProduct, tags: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-700"
                    />
                  </div>

                  <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingProduct(false)}
                      className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-bold"
                    >
                      Lưu & Đăng Bán
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Products Table */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Sản phẩm</th>
                    <th className="p-3">Danh mục</th>
                    <th className="p-3">Giá bán</th>
                    <th className="p-3">Kho hàng</th>
                    <th className="p-3">Đánh giá</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="p-3 flex items-center gap-3">
                        <img
                          src={resolveMediaUrl(p.images?.[0])}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover bg-stone-100 flex-shrink-0"
                          onError={(e) => {
                            const fallback = p.images?.[1];
                            if (fallback && e.target.src !== fallback) e.target.src = fallback;
                            else e.target.src = '/placeholder.svg';
                          }}
                        />
                        <div>
                          <div className="font-bold text-stone-900 line-clamp-1">{p.name}</div>
                          <div className="text-[10px] text-stone-400 font-mono">{p.id}</div>
                        </div>
                      </td>
                      <td className="p-3 font-medium text-stone-600 capitalize">
                        {p.category}
                      </td>
                      <td className="p-3 font-bold text-amber-900">
                        {formatCurrency(p.price)}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                          p.stock <= 15 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {p.stock} cái
                        </span>
                      </td>
                      <td className="p-3 text-stone-600">
                        ⭐ {p.rating} ({p.reviewsCount})
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => setEditingProduct({ ...p })}
                          className="p-1.5 text-stone-400 hover:text-blue-600 transition-colors"
                          title="Sửa sản phẩm"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 transition-colors"
                          title="Xóa sản phẩm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: COUPONS */}
        {activeTab === 'coupons' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-stone-900">Quản Lý Mã Giảm Giá (Vouchers)</h3>
              <button
                onClick={() => setIsAddingCoupon(true)}
                className="px-4 py-2 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Mã Ưu Đãi Mới</span>
              </button>
            </div>

            {/* Add coupon form */}
            {isAddingCoupon && (
              <div className="bg-white p-5 rounded-2xl border-2 border-amber-800/40 shadow-md space-y-4 animate-fadeIn">
                <h4 className="font-bold text-xs text-stone-900 uppercase">Tạo mã voucher mới</h4>
                <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Mã code (Ví dụ: CHAOHE)</label>
                    <input
                      type="text"
                      required
                      value={newCoupon.code}
                      onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 uppercase font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Loại giảm giá</label>
                    <select
                      value={newCoupon.type}
                      onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white"
                    >
                      <option value="percent">Theo phần trăm (%)</option>
                      <option value="fixed">Số tiền cố định (VND)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      {newCoupon.type === 'percent' ? 'Mức giảm (%)' : 'Số tiền giảm (VND)'}
                    </label>
                    <input
                      type="number"
                      required
                      value={newCoupon.type === 'percent' ? newCoupon.discountPercent : newCoupon.discountAmount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (newCoupon.type === 'percent') {
                          setNewCoupon({ ...newCoupon, discountPercent: val });
                        } else {
                          setNewCoupon({ ...newCoupon, discountAmount: val });
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Đơn tối thiểu (VND)</label>
                    <input
                      type="number"
                      value={newCoupon.minOrderValue}
                      onChange={(e) => setNewCoupon({ ...newCoupon, minOrderValue: parseInt(e.target.value, 10) })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-stone-700 font-semibold mb-1">Mô tả ưu đãi</label>
                    <input
                      type="text"
                      placeholder="Giảm 15% cho mọi đơn hàng mùa hè"
                      value={newCoupon.description}
                      onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200"
                    />
                  </div>

                  <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingCoupon(false)}
                      className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-amber-900 text-white font-bold"
                    >
                      Lưu Mã
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Coupons list */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Mã Code</th>
                    <th className="p-3">Mức giảm</th>
                    <th className="p-3">Đơn tối thiểu</th>
                    <th className="p-3">Mô tả</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {coupons.map(c => (
                    <tr key={c.id || c.code} className="hover:bg-stone-50">
                      <td className="p-3 font-mono font-bold text-amber-900">{c.code}</td>
                      <td className="p-3 font-bold">
                        {c.discountPercent > 0 ? `${c.discountPercent}%` : formatCurrency(c.discountAmount)}
                      </td>
                      <td className="p-3 text-stone-600">{formatCurrency(c.minOrderValue || 0)}</td>
                      <td className="p-3 text-stone-600">{c.description}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleToggleCoupon(c.id || c.code)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            c.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-500'
                          }`}
                        >
                          {c.isActive !== false ? 'Đang bật' : 'Đã tắt'}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteCoupon(c.id || c.code)}
                          className="p-1 text-stone-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: SETTINGS & AI */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* AI Assistant Config Card */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-stone-900">Cấu hình Trợ lý AI Bán hàng</h3>
                  <p className="text-xs text-stone-500">API Key được lưu an toàn trên server — không bao giờ lộ ra trình duyệt</p>
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">
                {/* Mode Selector */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-2">Bộ máy xử lý AI:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => { setSettings({ ...settings, aiProvider: 'local', aiProviderExplicit: true }); setApiTestStatus(null); }}
                      className={`p-4 rounded-xl border-2 flex flex-col gap-1.5 cursor-pointer transition-all ${
                        settings.aiProvider === 'local' ? 'border-amber-900 bg-amber-50/60 shadow-sm' : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="font-bold text-stone-900 flex items-center gap-2">
                        <span>🤖</span>
                        <span>Bộ máy NLP Cục bộ</span>
                        {settings.aiProvider === 'local' && (
                          <span className="ml-auto text-[10px] px-2 py-0.5 bg-amber-900 text-white rounded-full font-semibold">Đang dùng</span>
                        )}
                      </div>
                      <p className="text-stone-500 text-[11px] leading-relaxed">
                        100% offline, phản hồi tức thì trong chế độ Cửa hàng. Tự động nhận diện ngân sách, gợi ý sản phẩm, tra cứu đơn hàng.
                      </p>
                    </div>

                    <div
                      onClick={() => { setSettings({ ...settings, aiProvider: 'gemini', aiProviderExplicit: true }); setApiTestStatus(null); }}
                      className={`p-4 rounded-xl border-2 flex flex-col gap-1.5 cursor-pointer transition-all ${
                        settings.aiProvider === 'gemini' ? 'border-amber-900 bg-amber-50/60 shadow-sm' : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="font-bold text-stone-900 flex items-center gap-2 flex-wrap">
                        <span>✨</span>
                        <span>{geminiStatus.model ? `Google Gemini (${geminiStatus.model})` : 'Google Gemini AI'}</span>
                        {settings.aiProvider === 'gemini' && (
                          <span className="ml-auto text-[10px] px-2 py-0.5 bg-amber-900 text-white rounded-full font-semibold">Đang dùng</span>
                        )}
                      </div>
                      <p className="text-stone-500 text-[11px] leading-relaxed">
                        AI tạo sinh của Google — hỗ trợ hội thoại nhiều lượt, suy luận phức tạp và cả chế độ Tổng quát, key ẩn trên server.
                      </p>
                      {geminiStatus.checked && (
                        <div className="mt-1">
                          {!geminiStatus.online ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold">Backend offline</span>
                          ) : geminiStatus.configured ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                              ✓ Đã cấu hình key ({geminiStatus.keyMasked})
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                              ⚠️ Chưa cấu hình GEMINI_API_KEY
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Assistant Scope Default */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-2">Phạm vi Trợ lý mặc định trên khung chat:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setSettings({ ...settings, assistantScope: 'store' })}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        settings.assistantScope !== 'general' ? 'border-amber-900 bg-amber-50/50' : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="font-bold text-stone-900 flex items-center justify-between">
                        <span>🛍️ Tư vấn Cửa hàng</span>
                        {settings.assistantScope !== 'general' && (
                          <span className="text-[10px] px-2 py-0.5 bg-amber-900 text-white rounded-full">Mặc định</span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1">Tập trung sản phẩm, chọn size, bán sỉ B2B, đơn hàng & chính sách shop.</p>
                    </div>
                    <div
                      onClick={() => setSettings({ ...settings, assistantScope: 'general' })}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        settings.assistantScope === 'general' ? 'border-emerald-700 bg-emerald-50/50' : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="font-bold text-stone-900 flex items-center justify-between">
                        <span>🧠 Trợ lý AI Tổng quát</span>
                        {settings.assistantScope === 'general' && (
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-700 text-white rounded-full">Mặc định</span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1">Giải đáp đa lĩnh vực phức tạp (code, toán, phân tích, đời sống...) bằng Gemini AI.</p>
                    </div>
                  </div>
                </div>

                {/* Gemini setup guide — chỉ hiện khi chọn Gemini */}
                {settings.aiProvider === 'gemini' && (
                  <div className="space-y-3">
                    {/* Hướng dẫn cấu hình .env */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2.5 text-[11px] text-blue-900">
                      <div className="font-bold text-xs flex items-center gap-2">
                        <Key className="w-4 h-4 text-blue-600 shrink-0" />
                        Trạng thái cấu hình Gemini API Key trên Server
                      </div>
                      <ol className="space-y-1.5 pl-1 list-decimal list-inside leading-relaxed">
                        <li>Lấy API Key từ Google AI Studio và đặt vào biến <code className="bg-blue-100 px-1 rounded">GEMINI_API_KEY</code> trong file <code className="bg-blue-100 px-1 rounded">.env</code> trên máy chủ</li>
                        <li>Model mặc định trên server: <code className="bg-blue-100 px-1 rounded font-semibold">{geminiStatus.model || 'gemini-3.5-flash-lite'}</code></li>
                        <li>Khởi động lại server: <code className="bg-blue-100 px-1 rounded">node server/index.js</code></li>
                      </ol>
                      <p className="text-blue-700 font-semibold">🔒 Key chỉ tồn tại trên server — không bao giờ gửi về trình duyệt người dùng.</p>
                    </div>

                    {/* Nút kiểm tra kết nối qua server */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleTestApiKey}
                        disabled={apiTestStatus === 'testing'}
                        className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold border border-stone-700 transition-all flex items-center gap-2 disabled:opacity-60"
                      >
                        {apiTestStatus === 'testing'
                          ? <><span className="animate-spin">⏳</span> Đang kiểm tra...</>
                          : <><span>🔌</span> Kiểm tra kết nối server</>
                        }
                      </button>
                      <span className="text-stone-400 text-[11px]">Gọi <code>/api/chat/status</code> &amp; <code>/api/chat/test</code> để xác nhận model thực tế</span>
                    </div>

                    {/* Test result */}
                    {apiTestStatus && apiTestStatus !== 'testing' && (
                      <div className={`flex items-start gap-2.5 p-3 rounded-xl border text-[11px] leading-relaxed ${
                        apiTestStatus.ok
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}>
                        <span className="text-base">{apiTestStatus.ok ? '✅' : '❌'}</span>
                        <div>
                          {apiTestStatus.model && <div className="font-bold mb-0.5">Model: {apiTestStatus.model}</div>}
                          <div>{apiTestStatus.message}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Save button */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    💾 Lưu Cài Đặt
                  </button>
                  {apiKeySaved && (
                    <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Đã lưu thành công!
                    </span>
                  )}
                </div>
              </form>
            </div>

            {/* Store Information Overview */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-3 text-xs">
              <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wider">Thông tin Cửa hàng</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-stone-600">
                <div>• Tên shop: <strong className="text-stone-900">{STORE_INFO.name}</strong></div>
                <div>• Hotline: <strong className="text-stone-900">{STORE_INFO.phone}</strong></div>
                <div>• Zalo hỗ trợ: <strong className="text-stone-900">{STORE_INFO.zalo}</strong></div>
                <div>• Địa chỉ: <strong className="text-stone-900">{STORE_INFO.address}</strong></div>
                <div>• Giờ làm việc: <strong className="text-stone-900">{STORE_INFO.operatingHours}</strong></div>
                <div>• Ngân hàng nhận CK: <strong className="text-stone-900">{STORE_INFO.bankAccount.bankName} - {STORE_INFO.bankAccount.accountNumber}</strong></div>
                <div>• Miễn phí vận chuyển: <strong className="text-stone-900">Từ {formatCurrency(STORE_INFO.freeshipThreshold)}</strong></div>
              </div>
            </div>

            {/* Reset Database Button */}
            <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-stone-900 text-sm">Khôi phục Dữ liệu Mẫu Ban Đầu</h4>
                <p className="text-xs text-stone-500">Tải lại danh mục sản phẩm, đơn hàng và lịch sử chat mẫu.</p>
              </div>
              <button
                onClick={handleResetData}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-rose-700 border border-stone-300 text-xs font-bold transition-all shadow-xs flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Khôi phục Mặc định</span>
              </button>
            </div>

          </div>
        )}

        {/* Tab Content: AUDIT LOGS */}
        {activeTab === 'auditLogs' && !isStaff && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-900" />
                  Nhật Ký Xử Lý Hệ Thống & Kiểm Toán (Audit Trail)
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Ghi lại đầy đủ mọi hoạt động: Nhân viên cập nhật đơn hàng, đổi trạng thái thanh toán, thêm sửa sản phẩm, đăng nhập.
                </p>
              </div>
              <button
                onClick={async () => {
                  const logs = await ApiClient.auditLogs.getAll();
                  setAuditLogs(logs);
                }}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Làm Mới Nhật Ký</span>
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-stone-200 text-stone-400 text-xs">
                Chưa có nhật ký hoạt động nào được ghi nhận hoặc máy chủ chưa phản hồi.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Thời Gian</th>
                        <th className="py-3 px-4">Người Thực Hiện</th>
                        <th className="py-3 px-4">Hành Động</th>
                        <th className="py-3 px-4">Đối Tượng</th>
                        <th className="py-3 px-4">Chi Tiết Thay Đổi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      {auditLogs.map((log) => {
                        const dateStr = new Date(log.timestamp).toLocaleString('vi-VN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        });
                        return (
                          <tr key={log.id} className="hover:bg-amber-50/30 transition-colors">
                            <td className="py-3 px-4 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                              {dateStr}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  log.userRole === 'admin' 
                                    ? 'bg-purple-100 text-purple-800' 
                                    : log.userRole === 'staff'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-stone-100 text-stone-700'
                                }`}>
                                  {log.userRole === 'admin' ? '👑 Admin' : log.userRole === 'staff' ? '🛠️ Staff' : 'User'}
                                </span>
                                <span className="font-semibold text-stone-900">{log.userName || log.userEmail}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="font-mono text-xs px-2 py-0.5 bg-stone-100 rounded text-stone-800 font-medium">
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-xs text-amber-900 font-bold whitespace-nowrap">
                              {log.target}
                            </td>
                            <td className="py-3 px-4 text-stone-600 max-w-md">
                              {typeof log.details === 'object' ? (
                                <pre className="font-mono text-[11px] bg-stone-50 p-1.5 rounded border border-stone-200 overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              ) : (
                                <span>{String(log.details || '')}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Tab Content: SHOPEE SCRAPER */}
        {activeTab === 'shopeeScraper' && (
          <div className="space-y-6">
            
            {/* Header Card */}
            <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Cào Dữ Liệu Từ Shopee</h2>
                  <p className="text-orange-100 text-sm">Tự động thu thập sản phẩm để mở rộng kho hàng & nâng cao AI Chatbot</p>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <Sparkles className="w-5 h-5 text-amber-200 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-orange-50 leading-relaxed">
                  Khi nhập sản phẩm từ Shopee vào kho, <strong>AI Chatbot sẽ tự động học</strong> thông tin sản phẩm mới và có thể tư vấn, 
                  gợi ý cho khách hàng trong nhiều tình huống phức tạp hơn.
                </p>
              </div>
            </div>

            {/* Backend Online vs Offline Banner */}
            {shopeeServerOnline === false && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Backend Scraper chưa phản hồi (Server có thể đang ngủ hoặc đang khởi động lại)</p>
                    <p className="mt-0.5 text-amber-800">
                      Hệ thống chỉ cào dữ liệu thật từ Shopee qua máy chủ backend (tuyệt đối không dùng dữ liệu giả/sản phẩm có sẵn). Nếu dùng Render Free, vui lòng đợi 20–40 giây rồi thử kết nối lại.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRetryBackendConnection}
                  disabled={retryingBackend}
                  className="px-3.5 py-2 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-60"
                >
                  {retryingBackend ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>{retryingBackend ? 'Đang kết nối...' : 'Thử kết nối lại'}</span>
                </button>
              </div>
            )}

            {shopeeServerOnline === true && (
              <div className="space-y-3">
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between gap-2 text-xs text-emerald-900">
                  <span className="font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Backend Scraper Trực Tuyến · Phương án B (Scraping API Cloud — tối ưu RAM cho Render Free)
                  </span>
                  {shopeeSessionId && (
                    <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-emerald-200">
                      Phiên: {shopeeSessionId}
                    </span>
                  )}
                </div>

                {/* Cấu Hình Scraping API Card (Phương Án B: ZenRows / ScraperAPI / Crawlbase) */}
                {(() => {
                  const isReady = Boolean(scraperConfig?.configured) && !shopeeBlockedByBot;
                  const activeProv = scraperConfig?.activeProvider;
                  const activeMeta = activeProv ? scraperConfig?.providers?.[activeProv] : null;
                  const selectedMeta = scraperConfig?.providers?.[scraperProviderInput];

                  return (
                    <div
                      className={`rounded-2xl border shadow-xs transition-all ${
                        !scraperConfig?.configured || shopeeBlockedByBot
                          ? 'bg-amber-50/80 border-amber-300'
                          : 'bg-white border-stone-200'
                      }`}
                    >
                      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2.5 text-xs">
                          <span
                            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              isReady
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            <Key className="w-4 h-4" />
                          </span>
                          <div>
                            <div className="font-bold text-stone-900 flex flex-wrap items-center gap-2">
                              <span>Scraping API (Phương án B: ZenRows / ScraperAPI / Crawlbase)</span>
                              {scraperConfigLoading ? (
                                <span className="text-[11px] font-medium text-stone-500">Đang kiểm tra...</span>
                              ) : scraperConfig?.configured ? (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    shopeeBlockedByBot
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  }`}
                                >
                                  Đang dùng: {activeProv?.toUpperCase()} ({activeMeta?.keyMasked || 'configured'})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                                  Chưa gắn API Key
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-500 mt-0.5">
                              {scraperConfig?.configured
                                ? 'Dịch vụ bên thứ 3 tự chạy JS, giải quyết token Akamai và xoay IP Việt Nam (VN) cho server.'
                                : 'Cần ít nhất 1 API Key (ZenRows, ScraperAPI hoặc Crawlbase) để vượt lỗi 403 / Akamai 90309999.'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setScraperConfigOpen((prev) => !prev)}
                          aria-expanded={scraperConfigOpen}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                            !scraperConfig?.configured || shopeeBlockedByBot
                              ? 'bg-orange-600 hover:bg-orange-700 text-white border-orange-600 shadow-xs'
                              : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                          }`}
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>{scraperConfigOpen ? 'Thu gọn' : 'Cấu hình API Key'}</span>
                          {scraperConfigOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {scraperConfigOpen && (
                        <div className="px-4 pb-4 pt-3 border-t border-stone-200/80 space-y-3 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {[
                              { id: 'zenrows', name: 'ZenRows', note: 'Khuyên dùng · JS + XHR JSON', url: 'https://www.zenrows.com/' },
                              { id: 'scraperapi', name: 'ScraperAPI', note: 'Ultra Premium + Render', url: 'https://www.scraperapi.com/' },
                              { id: 'crawlbase', name: 'Crawlbase', note: 'Dùng JavaScript Token', url: 'https://crawlbase.com/' }
                            ].map((item) => {
                              const pMeta = scraperConfig?.providers?.[item.id];
                              const active = scraperConfig?.activeProvider === item.id;
                              return (
                                <div
                                  key={item.id}
                                  className={`p-2.5 rounded-xl border text-[11px] flex flex-col justify-between gap-1 ${
                                    active
                                      ? 'bg-emerald-50/70 border-emerald-300'
                                      : 'bg-stone-50 border-stone-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-stone-900">{item.name}</span>
                                    <a
                                      href={item.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-orange-700 hover:underline inline-flex items-center gap-0.5"
                                    >
                                      <span>Lấy key</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  </div>
                                  <span className="text-stone-500">{item.note}</span>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className={`font-mono text-[10px] ${pMeta?.configured ? 'text-emerald-700 font-bold' : 'text-stone-400'}`}>
                                      {pMeta?.configured ? pMeta.keyMasked : 'Chưa cấu hình'}
                                    </span>
                                    {pMeta?.configured && pMeta?.source === 'admin_runtime' && (
                                      <button
                                        type="button"
                                        onClick={() => handleClearScraperKey(item.id)}
                                        className="text-[10px] text-rose-600 hover:underline font-medium"
                                        disabled={scraperConfigSaving}
                                      >
                                        Xóa
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <form onSubmit={handleSaveScraperConfig} className="space-y-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                              <div className="sm:col-span-4">
                                <label htmlFor="scraper-provider-select" className="block font-semibold text-stone-800 mb-1">
                                  Nhà cung cấp API:
                                </label>
                                <select
                                  id="scraper-provider-select"
                                  value={scraperProviderInput}
                                  onChange={(e) => {
                                    setScraperProviderInput(e.target.value);
                                    setScraperConfigFeedback(null);
                                  }}
                                  disabled={scraperConfigSaving}
                                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                  <option value="auto">Tự động (ZenRows → ScraperAPI → Crawlbase)</option>
                                  <option value="zenrows">ZenRows (ZENROWS_API_KEY)</option>
                                  <option value="scraperapi">ScraperAPI (SCRAPERAPI_KEY)</option>
                                  <option value="crawlbase">Crawlbase (CRAWLBASE_TOKEN)</option>
                                </select>
                              </div>

                              <div className="sm:col-span-8">
                                <label htmlFor="scraper-apikey-input" className="block font-semibold text-stone-800 mb-1">
                                  API Key / Token cho {scraperProviderInput.toUpperCase()}
                                  {scraperProviderInput === 'auto'
                                    ? ' (dùng tuần tự các key đã cấu hình)'
                                    : selectedMeta?.configured
                                      ? ` (đang có: ${selectedMeta.keyMasked})`
                                      : ''}
                                  :
                                </label>
                                <input
                                  id="scraper-apikey-input"
                                  type="password"
                                  value={scraperProviderInput === 'auto' ? '' : scraperApiKeyInput}
                                  onChange={(e) => {
                                    setScraperApiKeyInput(e.target.value);
                                    if (scraperConfigFeedback) setScraperConfigFeedback(null);
                                  }}
                                  autoComplete="off"
                                  spellCheck={false}
                                  placeholder={
                                    scraperProviderInput === 'auto'
                                      ? 'Chọn ZenRows / ScraperAPI / Crawlbase bên trái nếu muốn thêm API Key mới'
                                      : `Dán API Key mới cho ${scraperProviderInput.toUpperCase()} (để trống nếu chỉ đổi provider)`
                                  }
                                  className="w-full font-mono text-xs bg-white border border-stone-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-stone-100"
                                  disabled={scraperConfigSaving || scraperProviderInput === 'auto'}
                                />
                              </div>
                            </div>

                            {scraperConfigFeedback && (
                              <div
                                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                                  scraperConfigFeedback.ok
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-rose-50 border-rose-200 text-rose-800'
                                }`}
                              >
                                {scraperConfigFeedback.ok ? (
                                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                )}
                                <span>{scraperConfigFeedback.message}</span>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <button
                                  type="submit"
                                  disabled={
                                    scraperConfigSaving ||
                                    (scraperProviderInput === 'auto'
                                      ? !scraperConfig?.configured
                                      : !scraperApiKeyInput.trim() && !selectedMeta?.configured)
                                  }
                                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                                >
                                  {scraperConfigSaving ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      <span>Đang lưu...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Key className="w-3.5 h-3.5" />
                                      <span>Lưu Cấu Hình Scraping API</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <span className="text-[11px] text-stone-500">
                                💡 Trên Render Production, nên thêm biến <code>ZENROWS_API_KEY</code> (hoặc <code>SCRAPERAPI_KEY</code> / <code>CRAWLBASE_TOKEN</code>) vào Render Environment Variables để giữ vĩnh viễn sau mỗi lần redeploy.
                              </span>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Optional Shopee Cookie Panel (Dùng khi Shopee bắt đăng nhập /buyer/login) */}
                <div
                  className={`rounded-2xl border shadow-xs transition-all ${
                    shopeeLoginRequired
                      ? 'bg-orange-50/80 border-orange-300'
                      : 'bg-white border-stone-200'
                  }`}
                >
                  <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                      <span
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          cookieMeta?.hasCookie ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        🍪
                      </span>
                      <div>
                        <div className="font-bold text-stone-900 flex flex-wrap items-center gap-2">
                          <span>Cookie Shopee (Tùy chọn — bổ sung nếu Shopee yêu cầu đăng nhập)</span>
                          {cookieMeta?.hasCookie ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Đã lưu {cookieMeta.cookieCount} cookie{cookieMeta.hasAuthToken ? ' (có SPC)' : ''}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 text-stone-600 border border-stone-200">
                              Chưa gắn cookie
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Nếu Shopee chuyển hướng sang trang đăng nhập (/buyer/login), hãy copy header Cookie từ trình duyệt đã đăng nhập Shopee và dán tại đây.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCookiePanelOpen((prev) => !prev)}
                      aria-expanded={cookiePanelOpen}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                        shopeeLoginRequired
                          ? 'bg-orange-600 hover:bg-orange-700 text-white border-orange-600 shadow-xs'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      <span>{cookiePanelOpen ? 'Thu gọn' : 'Cập nhật Cookie'}</span>
                      {cookiePanelOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {cookiePanelOpen && (
                    <form onSubmit={handleSaveShopeeCookie} className="px-4 pb-4 pt-3 border-t border-stone-200/80 space-y-2.5 text-xs">
                      <label htmlFor="shopee-cookie-input" className="block font-semibold text-stone-800">
                        Dán chuỗi Cookie từ tab Network (Request Headers &rarr; Cookie) trên Shopee.vn:
                      </label>
                      <textarea
                        id="shopee-cookie-input"
                        rows={2}
                        value={shopeeCookieInput}
                        onChange={(e) => {
                          setShopeeCookieInput(e.target.value);
                          if (cookieFeedback) setCookieFeedback(null);
                        }}
                        spellCheck={false}
                        autoComplete="off"
                        placeholder="Ví dụ: SPC_F=...; SPC_ST=...; csrftoken=..."
                        className="w-full font-mono text-[11px] bg-white border border-stone-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                        disabled={cookieSaving}
                      />

                      {cookieFeedback && (
                        <div
                          className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                            cookieFeedback.ok
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-rose-50 border-rose-200 text-rose-800'
                          }`}
                        >
                          {cookieFeedback.ok ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          )}
                          <span>{cookieFeedback.message}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="submit"
                          disabled={cookieSaving || !shopeeCookieInput.trim()}
                          className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                        >
                          {cookieSaving ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang lưu...</span>
                            </>
                          ) : (
                            <span>Lưu Cookie Shopee</span>
                          )}
                        </button>
                        <span className="text-[11px] text-stone-500">
                          🔒 Cookie chỉ lưu tạm trên máy chủ (sẽ cần dán lại sau mỗi lần Render redeploy, hoặc thêm biến môi trường <code className="bg-stone-100 px-1 rounded">SHOPEE_COOKIE</code> trên Render để giữ vĩnh viễn).
                        </span>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Error Alert */}
            {shopeeError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800">Không có kết quả hoặc có lỗi</p>
                    <p className="text-sm text-red-700 mt-0.5">{shopeeError}</p>
                  </div>
                  <button onClick={() => setShopeeError(null)} className="ml-auto text-red-400 hover:text-red-600">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
                {!shopeeLoading && shopeeProgress && (
                  <pre className="mt-2 p-2.5 bg-stone-900 text-stone-200 rounded-xl text-[11px] font-mono max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {shopeeProgress}
                  </pre>
                )}
              </div>
            )}

            {/* Success Alert */}
            {shopeeSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Hoàn tất phiên cào trực tiếp</p>
                  <p className="text-sm text-emerald-700 mt-0.5">{shopeeSuccess}</p>
                </div>
                <button onClick={() => setShopeeSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Keywords Input Card */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6">
              <h3 className="text-base font-bold text-stone-900 mb-1 flex items-center gap-2">
                <Search className="w-4 h-4 text-orange-600" />
                Nhập Từ Khóa Hoặc Link Sản Phẩm Shopee
              </h3>
              <p className="text-xs text-stone-500 mb-4">Nhập từ khóa (phân tách bằng dấu phẩy hoặc xuống dòng) hoặc dán Link chi tiết 1 sản phẩm Shopee (ví dụ <code className="bg-stone-100 px-1 rounded">https://shopee.vn/...-i.shop.item</code> hoặc <code className="bg-stone-100 px-1 rounded">/product/shop/item</code>).</p>
              
              <textarea
                value={shopeeKeywords}
                onChange={(e) => setShopeeKeywords(e.target.value)}
                rows={3}
                className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none transition-all"
                placeholder="Ví dụ: quần nữ, áo thun nam, nến thơm hoặc link https://shopee.vn/product/123456/7890123..."
                disabled={shopeeLoading}
              />
              
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <button
                  onClick={handleShopeeScrape}
                  disabled={shopeeLoading || !shopeeKeywords.trim()}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${
                    shopeeLoading
                      ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white hover:shadow-md'
                  }`}
                >
                  {shopeeLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang cào dữ liệu...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4" />
                      <span>Bắt Đầu Cào</span>
                    </>
                  )}
                </button>

                {/* Bộ chọn số lượng sản phẩm cần cào */}
                <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
                  <span className="text-xs font-semibold text-stone-600">Số lượng cào:</span>
                  <select
                    value={shopeeLimit}
                    onChange={(e) => setShopeeLimit(Number(e.target.value))}
                    disabled={shopeeLoading}
                    className="border-none bg-transparent text-xs font-bold text-orange-600 focus:outline-none cursor-pointer"
                  >
                    <option value={10}>10 sản phẩm</option>
                    <option value={20}>20 sản phẩm</option>
                    <option value={30}>30 sản phẩm</option>
                    <option value={50}>50 sản phẩm</option>
                  </select>
                </div>

                <button
                  onClick={() => setShopeeKeywords('áo thun nam nữ, nến thơm decor phòng ngủ, cà phê arabica, tai nghe bluetooth, túi xách nữ da')}
                  disabled={shopeeLoading}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium border border-stone-300 text-stone-700 hover:bg-stone-50 transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Mặc định (5 nhóm)
                </button>

                <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                  <span className="text-xs font-semibold text-stone-500 mr-1">Gợi ý từ khóa:</span>
                  {[
                    { label: 'Quần nữ', kw: 'quần nữ' },
                    { label: 'Áo khoác', kw: 'áo khoác' },
                    { label: 'Áo thun', kw: 'áo thun' },
                    { label: 'Áo polo', kw: 'áo polo' },
                    { label: 'Quần đùi', kw: 'quần đùi' },
                    { label: 'Tất vớ', kw: 'tất' },
                    { label: 'Nến thơm', kw: 'nến thơm' },
                    { label: 'Cà phê', kw: 'cà phê' },
                    { label: 'Tai nghe', kw: 'tai nghe' }
                  ].map(chip => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setShopeeKeywords(chip.kw)}
                      className="px-2.5 py-1 text-xs rounded-lg bg-stone-100 hover:bg-orange-100 hover:text-orange-700 text-stone-700 font-medium transition-colors"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Loading Progress */}
            {shopeeLoading && (
              <div className="bg-white rounded-2xl border border-orange-200 shadow-xs p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900">Đang cào dữ liệu từ Shopee...</p>
                    <p className="text-xs text-stone-500">Quá trình này có thể mất 2-5 phút. Vui lòng không tắt trang.</p>
                  </div>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 h-full rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-orange-50 rounded-lg p-2">
                    <p className="text-xs text-orange-800 font-medium">🌐 Qua Scraping API</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-2">
                    <p className="text-xs text-amber-800 font-medium">🔍 Tìm sản phẩm</p>
                  </div>
                  <div className="bg-stone-50 rounded-lg p-2">
                    <p className="text-xs text-stone-600 font-medium">📥 Tải ảnh về</p>
                  </div>
                </div>
                {shopeeProgress && (
                  <pre className="mt-3 p-3 bg-stone-900 text-stone-200 rounded-xl text-[11px] font-mono max-h-36 overflow-y-auto whitespace-pre-wrap">
                    {shopeeProgress}
                  </pre>
                )}
              </div>
            )}

            {/* Results Grid */}
            {shopeeResults.length > 0 && (
              <div className="space-y-4">
                {/* Action Bar */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg border bg-emerald-50 text-emerald-800 border-emerald-200">
                      {`🌐 Cào trực tiếp${shopeeSessionId ? ` · ${shopeeSessionId}` : ''}`}
                    </span>
                    <button
                      onClick={toggleShopeeSelectAll}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border border-stone-300 hover:bg-stone-50 flex items-center gap-1.5 transition-all"
                    >
                      {shopeeSelected.size === shopeeResults.length ? (
                        <><CheckSquare className="w-3.5 h-3.5 text-orange-600" /> Bỏ chọn tất cả</>
                      ) : (
                        <><Square className="w-3.5 h-3.5" /> Chọn tất cả ({shopeeResults.length})</>
                      )}
                    </button>
                    
                    {shopeeSelected.size > 0 && (
                      <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg">
                        ✓ Đã chọn {shopeeSelected.size} / {shopeeResults.length} sản phẩm
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleShopeeImport}
                    disabled={shopeeSelected.size === 0 || shopeeImporting}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${
                      shopeeSelected.size === 0 || shopeeImporting
                        ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white hover:shadow-md'
                    }`}
                  >
                    {shopeeImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang nhập...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Nhập {shopeeSelected.size > 0 ? shopeeSelected.size : ''} Sản Phẩm Vào Kho</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {shopeeResults.map((product, index) => (
                    <div
                      key={index}
                      onClick={() => toggleShopeeSelect(index)}
                      className={`bg-white rounded-2xl border-2 shadow-xs overflow-hidden cursor-pointer transition-all hover:shadow-md group ${
                        shopeeSelected.has(index)
                          ? 'border-orange-500 ring-2 ring-orange-200'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      {/* Image */}
                      <div className="relative aspect-square bg-stone-100 overflow-hidden">
                        <img
                          src={resolveMediaUrl(product.images?.[0])}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            const fallback = product.images?.[1];
                            if (fallback && e.target.src !== fallback) {
                              e.target.src = fallback;
                            } else {
                              e.target.src = '/placeholder.svg';
                            }
                          }}
                        />
                        
                        {/* Selection indicator */}
                        <div className={`absolute top-3 left-3 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          shopeeSelected.has(index)
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'bg-white/80 text-stone-400 backdrop-blur-sm'
                        }`}>
                          {shopeeSelected.has(index) ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <span className="text-xs font-bold">{index + 1}</span>
                          )}
                        </div>

                        {/* Category badge */}
                        <div className="absolute top-3 right-3">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-black/50 text-white backdrop-blur-sm">
                            {product.category || 'shopee'}
                          </span>
                        </div>

                        {/* Discount badge */}
                        {product.orig && product.orig > product.price && (
                          <div className="absolute bottom-3 left-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500 text-white">
                              -{Math.round((1 - product.price / product.orig) * 100)}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <h4 className="text-sm font-semibold text-stone-900 line-clamp-2 leading-tight mb-2">
                          {product.name}
                        </h4>
                        
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-base font-extrabold text-orange-600">
                            {formatCurrency(product.price)}
                          </span>
                          {product.orig && product.orig > product.price && (
                            <span className="text-xs text-stone-400 line-through">
                              {formatCurrency(product.orig)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-stone-500 flex-wrap">
                          {product.rating && (
                            <span className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              {product.rating}
                            </span>
                          )}
                          {product.reviews > 0 && (
                            <span>{product.reviews.toLocaleString()} đánh giá</span>
                          )}
                          <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                            Kho tiệm: 0 (Cần kiểm kê)
                          </span>
                        </div>
                        
                        <div className="mt-2 flex items-center justify-between text-[10px]">
                          {product.keyword && (
                            <span className="font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                              🔍 {product.keyword}
                            </span>
                          )}
                          {product.source_url && (
                            <a 
                              href={product.source_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-orange-600 hover:underline font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Nguồn Shopee ↗
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!shopeeLoading && shopeeResults.length === 0 && !shopeeError && (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="text-lg font-bold text-stone-800 mb-2">Sẵn sàng cào dữ liệu</h3>
                <p className="text-sm text-stone-500 max-w-md mx-auto mb-4">
                  Nhập từ khóa sản phẩm bạn muốn tìm trên Shopee, sau đó nhấn "Bắt Đầu Cào" để tự động thu thập thông tin.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['Thời trang', 'Nến thơm', 'Đồ công nghệ', 'Cà phê', 'Đồ decor'].map(tag => (
                    <span key={tag} className="text-xs px-3 py-1 bg-orange-50 text-orange-700 rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Info Card */}
            <div className="bg-amber-50/60 rounded-2xl border border-amber-200 p-5">
              <h4 className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Lưu ý quan trọng
              </h4>
              <ul className="text-xs text-amber-800 space-y-1.5 leading-relaxed">
                <li>• <strong>Quy chuẩn bảo mật:</strong> Hệ thống không hardcode API Key hoặc thông tin đăng nhập trong mã nguồn; Scraping API Key được lưu an toàn qua biến môi trường (Render / .env) và luôn được che giấu khi hiển thị.</li>
                <li>• <strong>Kiểm soát dữ liệu thực tế (Zero Hallucination):</strong> Scraper không tự bịa giá gốc, không random tồn kho ảo, không gán số bán vào đánh giá.</li>
                <li>• <strong>Quy trình nhập kho an toàn:</strong> Toàn bộ sản phẩm nhập từ Shopee được lưu ở trạng thái <strong>Bản Nháp (Draft)</strong> với <strong>Tồn kho = 0</strong>, giúp chủ shop kiểm kê và điều chỉnh giá trước khi kích hoạt bán thật trên storefront.</li>
                <li>• <strong>Chống trùng lặp (Deduplication):</strong> Hệ thống tự động phát hiện và bỏ qua các sản phẩm đã có trong cơ sở dữ liệu để tránh nhập đè.</li>
              </ul>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
