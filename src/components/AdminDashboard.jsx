import React, { useState, useEffect } from 'react';
import { 
  Package, ShoppingCart, DollarSign, AlertTriangle, Plus, Trash2, Edit, 
  CheckCircle, Clock, Truck, XCircle, Search, Sparkles, RefreshCw, Key, Store, ArrowLeft, Printer, Tag, ToggleLeft, ToggleRight, History, Shield, User, Globe, Download, Loader2, CheckSquare, Square, Star
} from 'lucide-react';
import { formatCurrency, AIChatEngine } from '../services/aiChatEngine';
import { StorageService } from '../services/storage';
import { ApiClient } from '../services/api';
import { CATEGORIES, STORE_INFO } from '../data/initialData';

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
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [apiTestStatus, setApiTestStatus] = useState(null); // null | 'testing' | { ok, message }
  const [showApiKey, setShowApiKey] = useState(false);

  // Shopee Scraper state
  const [shopeeKeywords, setShopeeKeywords] = useState('áo khoác');
  const [shopeeLimit, setShopeeLimit] = useState(20);
  const [shopeeLoading, setShopeeLoading] = useState(false);
  const [shopeeResults, setShopeeResults] = useState([]);
  const [shopeeSelected, setShopeeSelected] = useState(new Set());
  const [shopeeImporting, setShopeeImporting] = useState(false);
  const [shopeeError, setShopeeError] = useState(null);
  const [shopeeSuccess, setShopeeSuccess] = useState(null);

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
        .then(data => setAuditLogs(data))
        .catch(err => console.warn('Fetch audit logs error:', err));
    }
    if (activeTab === 'shopeeScraper' && shopeeResults.length === 0) {
      ApiClient.shopee.getStatus()
        .then(data => {
          if (Array.isArray(data.results) && data.results.length > 0) {
            setShopeeResults(data.results);
            setShopeeSuccess(`Đã nạp sẵn ${data.results.length} sản phẩm thật từ Shopee.`);
          }
        })
        .catch(err => console.warn('Fetch shopee status error:', err));
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
    StorageService.saveSettings(settings);
    setApiKeySaved(true);
    setApiTestStatus(null);
    setTimeout(() => setApiKeySaved(false), 2500);
  };

  // Test Gemini API Key
  const handleTestApiKey = async () => {
    if (!settings.apiKey?.trim()) {
      setApiTestStatus({ ok: false, message: 'Vui lòng nhập API Key trước khi kiểm tra.' });
      return;
    }
    setApiTestStatus('testing');
    const result = await AIChatEngine.testGeminiKey(settings.apiKey.trim());
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

  // ====== SHOPEE SCRAPER HANDLERS ======
  const handleShopeeScrape = async () => {
    setShopeeLoading(true);
    setShopeeError(null);
    setShopeeSuccess(null);
    setShopeeResults([]);
    setShopeeSelected(new Set());
    
    try {
      const keywords = shopeeKeywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);
      
      if (keywords.length === 0) {
        setShopeeError('Vui lòng nhập ít nhất 1 từ khóa để tìm kiếm và cào dữ liệu.');
        setShopeeLoading(false);
        return;
      }

      if (!(await ApiClient.isServerOnline())) {
        // Trên Vercel Cloud (Static): Lọc chính xác theo đúng từ khóa người dùng yêu cầu
        const status = await ApiClient.shopee.getStatus();
        const allItems = status.results || [];
        if (allItems.length > 0) {
          const kwLower = keywords.map(k => k.toLowerCase().trim());
          const matched = allItems.filter(item => {
            const name = (item.name || '').toLowerCase();
            const cat = (item.category || '').toLowerCase();
            const kw = (item.keyword || '').toLowerCase();
            return kwLower.some(q => name.includes(q) || cat.includes(q) || kw.includes(q));
          });
          const filtered = (matched.length > 0 ? matched : allItems).slice(0, shopeeLimit);
          setShopeeResults(filtered);
          setShopeeSuccess(`⚡ Chế độ Cloud 24/7 (Vercel): Đã tìm thấy ${filtered.length} sản phẩm thật từ Shopee theo từ khóa: "${keywords.join(', ')}"!`);
        } else {
          setShopeeError('Không có dữ liệu sản phẩm Shopee phù hợp.');
        }
        setShopeeLoading(false);
        return;
      }

      const data = await ApiClient.shopee.scrape(keywords, shopeeLimit);
      // Xử lý an toàn tuyệt đối mảng dữ liệu (tránh lỗi crash .map() khi API trả về Object)
      let products = Array.isArray(data.products)
        ? data.products
        : (Array.isArray(data.results)
            ? data.results
            : (Array.isArray(data) ? data : []));
      
      if (products.length === 0) {
        // Fallback nạp theo từ khóa nếu Shopee hạn chế IP tạm thời
        const status = await ApiClient.shopee.getStatus();
        const allItems = status.results || [];
        const kwLower = keywords.map(k => k.toLowerCase().trim());
        const matched = allItems.filter(item => {
          const name = (item.name || '').toLowerCase();
          const cat = (item.category || '').toLowerCase();
          const kw = (item.keyword || '').toLowerCase();
          return kwLower.some(q => name.includes(q) || cat.includes(q) || kw.includes(q));
        });
        products = (matched.length > 0 ? matched : allItems).slice(0, shopeeLimit);
      }

      if (products.length === 0) {
        setShopeeError('Không nhận được sản phẩm từ Shopee trong phiên cào này. Vui lòng bấm cào lại sau 3-5 giây.');
      } else {
        setShopeeResults(products);
        setShopeeSuccess(`🎉 Đã cào & tìm thấy ${products.length} sản phẩm thật từ Shopee theo từ khóa: "${keywords.join(', ')}"!`);
      }
    } catch (err) {
      console.error('Shopee scrape error:', err);
      setShopeeError(err.message || 'Lỗi kết nối — đảm bảo server backend đang chạy và Python đã cài đặt.');
    } finally {
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

      if (!(await ApiClient.isServerOnline())) {
        // Fallback lưu trực tiếp vào StorageService trên Vercel Cloud
        const currentProducts = StorageService.getProducts();
        const existingShopeeIds = new Set(
          currentProducts.map(p => p.shopee_id || p.shopeeId).filter(Boolean)
        );
        let importedCount = 0;
        let skipped = 0;
        const newItems = [];
        
        for (const item of selectedProducts) {
          if (item.shopee_id && existingShopeeIds.has(item.shopee_id)) {
            skipped++;
            continue;
          }
          const draft = {
            id: `sp-shopee-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: item.name || 'Sản phẩm Shopee',
            category: item.category || 'fashion',
            price: Number(item.price) || 0,
            originalPrice: item.orig ? Number(item.orig) : null,
            stock: 0,
            stockNeedsReview: true,
            status: 'draft',
            images: Array.isArray(item.images) && item.images.length > 0 ? item.images : ['/placeholder.svg'],
            rating: item.rating || 5.0,
            reviewsCount: item.reviews || 0,
            soldCount: item.sold || 0,
            shopeeId: item.shopee_id,
            sourceUrl: item.source_url
          };
          newItems.push(draft);
          existingShopeeIds.add(item.shopee_id);
          importedCount++;
        }
        
        const updatedList = [...currentProducts, ...newItems];
        StorageService.saveProducts(updatedList);
        setProducts(updatedList);
        setShopeeSuccess(`✅ Đã nhập thành công ${importedCount} sản phẩm vào kho hàng (Bản Nháp)! Đã bỏ qua ${skipped} sản phẩm trùng.`);
        setShopeeSelected(new Set());
        setShopeeImporting(false);
        return;
      }

      const data = await ApiClient.shopee.importProducts(selectedProducts);
      
      // Refresh product list
      if (await ApiClient.isServerOnline()) {
        const freshProducts = await ApiClient.products.getAll();
        setProducts(freshProducts);
        StorageService.saveProducts(freshProducts);
      }
      
      const successMsg = data.skippedDuplicates > 0
        ? `✅ Đã nhập thành công ${data.imported} sản phẩm vào kho hàng (Trạng thái Bản Nháp)! Đã tự động bỏ qua ${data.skippedDuplicates} sản phẩm trùng lặp.`
        : `✅ Đã nhập thành công ${data.imported || selectedProducts.length} sản phẩm vào kho hàng (Trạng thái Bản Nháp)!`;

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

                  <div className="flex items-center gap-2 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingProduct.isFlashSale || false}
                        onChange={(e) => setEditingProduct({ ...editingProduct, isFlashSale: e.target.checked })}
                        className="rounded text-rose-600 focus:ring-rose-500"
                      />
                      <span className="font-semibold text-rose-700">Gắn nhãn Flash Sale</span>
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
                        <img src={p.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover bg-stone-100 flex-shrink-0" />
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
                  <label className="block font-semibold text-stone-700 mb-2">Chế độ AI:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => { setSettings({ ...settings, aiProvider: 'local' }); setApiTestStatus(null); }}
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
                        100% offline, phản hồi tức thì, không mất phí. Tự động nhận diện ngân sách, gợi ý sản phẩm, tra cứu đơn hàng.
                      </p>
                    </div>

                    <div
                      onClick={() => { setSettings({ ...settings, aiProvider: 'gemini' }); setApiTestStatus(null); }}
                      className={`p-4 rounded-xl border-2 flex flex-col gap-1.5 cursor-pointer transition-all ${
                        settings.aiProvider === 'gemini' ? 'border-amber-900 bg-amber-50/60 shadow-sm' : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="font-bold text-stone-900 flex items-center gap-2">
                        <span>✨</span>
                        <span>Google Gemini 2.5 Flash</span>
                        {settings.aiProvider === 'gemini' && (
                          <span className="ml-auto text-[10px] px-2 py-0.5 bg-amber-900 text-white rounded-full font-semibold">Đang dùng</span>
                        )}
                      </div>
                      <p className="text-stone-500 text-[11px] leading-relaxed">
                        AI tạo sinh mới nhất của Google — hiểu ngữ cảnh sâu, tư vấn tự nhiên hơn, key ẩn hoàn toàn trên server.
                      </p>
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
                        Cách cấu hình Gemini API Key (1 lần duy nhất)
                      </div>
                      <ol className="space-y-1.5 pl-1 list-decimal list-inside leading-relaxed">
                        <li>Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-blue-700">aistudio.google.com/app/apikey</a> → Đăng nhập Google → Bấm <strong>"Create API Key"</strong></li>
                        <li>Copy key (dạng <code className="bg-blue-100 px-1 rounded">AIzaSy...</code>)</li>
                        <li>Mở file <code className="bg-blue-100 px-1 rounded">.env</code> trong thư mục gốc dự án</li>
                        <li>Thay dòng <code className="bg-blue-100 px-1 rounded">GEMINI_API_KEY=your_gemini_api_key_here</code> bằng key thật</li>
                        <li>Khởi động lại server: <code className="bg-blue-100 px-1 rounded">node server/index.js</code></li>
                      </ol>
                      <div className="mt-2 p-2 bg-white border border-blue-200 rounded-lg font-mono text-[10px] text-stone-700 leading-relaxed">
                        <span className="text-stone-400"># File: .env</span><br/>
                        GEMINI_API_KEY=<span className="text-amber-700">AIzaSyXXXXXXXXXXXXXXXXXX</span><br/>
                        PORT=5000
                      </div>
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
                      <span className="text-stone-400 text-[11px]">Gọi <code>/api/chat/status</code> để xác nhận</span>
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

            {/* Error Alert */}
            {shopeeError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Lỗi</p>
                  <p className="text-sm text-red-700 mt-0.5">{shopeeError}</p>
                </div>
                <button onClick={() => setShopeeError(null)} className="ml-auto text-red-400 hover:text-red-600">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Success Alert */}
            {shopeeSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Thành công</p>
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
                Nhập Từ Khóa Tìm Kiếm
              </h3>
              <p className="text-xs text-stone-500 mb-4">Nhập các từ khóa sản phẩm cần cào, phân tách bằng dấu phẩy. Mỗi từ khóa sẽ tìm ~10 sản phẩm.</p>
              
              <textarea
                value={shopeeKeywords}
                onChange={(e) => setShopeeKeywords(e.target.value)}
                rows={3}
                className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none transition-all"
                placeholder="Ví dụ: áo thun nam, nến thơm, cà phê arabica, tai nghe bluetooth..."
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
                    <p className="text-xs text-orange-800 font-medium">🌐 Truy cập Shopee</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-2">
                    <p className="text-xs text-amber-800 font-medium">🔍 Tìm sản phẩm</p>
                  </div>
                  <div className="bg-stone-50 rounded-lg p-2">
                    <p className="text-xs text-stone-600 font-medium">📥 Tải ảnh về</p>
                  </div>
                </div>
              </div>
            )}

            {/* Results Grid */}
            {shopeeResults.length > 0 && (
              <div className="space-y-4">
                {/* Action Bar */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
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
                          src={product.images?.[0] || '/placeholder.svg'}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            e.target.src = '/placeholder.svg';
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
                <li>• <strong>Quy chuẩn bảo mật:</strong> Hệ thống không hardcode thông tin đăng nhập, không lưu cookie tài khoản cá nhân, tuân thủ an toàn mạng.</li>
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
