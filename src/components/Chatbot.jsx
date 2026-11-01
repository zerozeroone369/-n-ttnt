import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, X, Sparkles, ShoppingBag, Eye, RotateCcw, ChevronDown, Check, 
  MessageSquare, Flame, Gift, Package, Truck, Tag, Phone, ExternalLink, Ruler, 
  ArrowRight, Settings, Key, Compass, ShoppingCart, ShieldCheck, HeartHandshake, 
  CheckCircle2, AlertCircle, Plus, Minus, QrCode, CreditCard, ChevronRight, User, MapPin, Star
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  AIChatEngine, formatCurrency, NEED_ANALYSIS_STEPS, 
    NeedAnalysisEngine, OrderingAssistantEngine, CustomerCareEngine, isProductInStock 
} from '../services/aiChatEngine.js';
import { StorageService } from '../services/storage.js';
import { STORE_INFO } from '../data/initialData.js';

export default function Chatbot({
  isOpen,
  setIsOpen,
  products,
  orders,
  onSelectProduct,
  onAddToCart,
  onApplyCoupon,
  onOpenOrdersModal,
  currentUser,
  onOrderSuccess,
  onOpenCheckout,
  initialQuery
}) {
  const [messages, setMessages] = useState(() => StorageService.getChatHistory());
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [addedProductId, setAddedProductId] = useState(null);
  const [appliedCouponCode, setAppliedCouponCode] = useState(null);

  // Pillar 1: Need Analysis Quiz State
  const [quizState, setQuizState] = useState({
    isActive: false,
    stepIndex: 0,
    answers: { purpose: null, recipient: null, budget: null, style: null }
  });

  // Pillar 2: In-Chat Order Drafts State (keyed by message ID)
  const [orderDrafts, setOrderDrafts] = useState({});
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Pillar 3: Warranty claim prompt state
  const [warrantySuccess, setWarrantySuccess] = useState('');
  
  // Settings & Gemini Config Panel
  const [showConfig, setShowConfig] = useState(false);
  const [chatSettings, setChatSettings] = useState(() => StorageService.getSettings());
  const [apiKeyInput, setApiKeyInput] = useState(() => StorageService.getSettings().apiKey || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, showConfig]);

  // Handle external query
  useEffect(() => {
    if (initialQuery) {
      setIsOpen(true);
      handleSendMessage(initialQuery);
    }
  }, [initialQuery]);

  // Save chat history
  useEffect(() => {
    StorageService.saveChatHistory(messages);
  }, [messages]);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputText).trim();
    if (!query || isTyping) return;

    // 1. Add user message
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // 2. Process with AI Engine
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));

      const response = await AIChatEngine.processMessage(query, products, orders, currentUser);
      const botMsgId = `bot-${Date.now()}`;

      const botMsg = {
        id: botMsgId,
        sender: 'bot',
        text: response.text,
        products: response.products || [],
        vouchers: response.vouchers || [],
        actionType: response.actionType || 'standard',
        curatedProducts: response.curatedProducts || [],
        order: response.order || null,
        actionContact: response.actionContact || false,
        timestamp: new Date().toISOString()
      };

      if (response.draftOrder) {
        setOrderDrafts((prev) => ({
          ...prev,
          [botMsgId]: {
            ...response.draftOrder,
            customer: {
              name: currentUser?.name || response.draftOrder.customer.name || '',
              phone: currentUser?.phone || response.draftOrder.customer.phone || '',
              address: currentUser?.address || response.draftOrder.customer.address || '',
              city: currentUser?.city || 'Hà Nội'
            }
          }
        }));
      }

      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: 'Dạ xin lỗi bạn, đường truyền của em đang bị gián đoạn chút xíu. Bạn thử gửi lại tin nhắn giúp em nhé!',
          products: [],
          vouchers: [],
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Pillar 1 Handler: Start Need Analysis Quiz
  const startNeedQuiz = () => {
    setQuizState({
      isActive: true,
      stepIndex: 0,
      answers: { purpose: null, recipient: null, budget: null, style: null }
    });
    scrollToBottom();
  };

  const handleSelectQuizOption = (stepId, option) => {
    const updatedAnswers = {
      ...quizState.answers,
      [stepId]: option.id
    };

    if (quizState.stepIndex < NEED_ANALYSIS_STEPS.length - 1) {
      setQuizState({
        ...quizState,
        stepIndex: quizState.stepIndex + 1,
        answers: updatedAnswers
      });
    } else {
      // Completed all 4 steps -> Analyze & curate
      const result = NeedAnalysisEngine.analyze(updatedAnswers, products);
      setQuizState({
        isActive: false,
        stepIndex: 0,
        answers: updatedAnswers
      });

      const botMsgId = `bot-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          sender: 'user',
          text: `Đã hoàn thành khảo sát nhu cầu (${option.label})`,
          timestamp: new Date().toISOString()
        },
        {
          id: botMsgId,
          sender: 'bot',
          text: `🎯 **Kết Quả Phân Tích Nhu Cầu & Gu Thẩm Mỹ Cá Nhân:**\n\n` +
                `• **Hồ sơ phong cách:** **${result.personaTitle}**\n` +
                `• *${result.personaDesc}*\n\n` +
                `Tiệm đã chấm điểm tương thích (% Match) và tuyển chọn **${result.curatedProducts.length} sản phẩm phù hợp nhất** dành riêng cho bạn bên dưới:`,
          actionType: 'need_analysis',
          curatedProducts: result.curatedProducts,
          products: result.curatedProducts,
          timestamp: new Date().toISOString()
        }
      ]);
    }
  };

  // Pillar 2 Handler: In-Chat Direct Ordering
  const handleStartInChatOrder = (product) => {
    const target = product || products[0];
    if (!isProductInStock(target)) {
      setOrderError('Sản phẩm này hiện đã hết hàng, bạn vui lòng chọn sản phẩm khác.');
      return;
    }
    const draft = OrderingAssistantEngine.buildOrderDraft(
      target, 
      target.variants?.colors?.[0] || 'Mặc định', 
      1, 
      currentUser || {}
    );
    const msgId = `bot-${Date.now()}`;

    setOrderDrafts((prev) => ({
      ...prev,
      [msgId]: draft
    }));

    setMessages((prev) => [
      ...prev,
      {
        id: msgId,
        sender: 'bot',
        text: `⚡ **Thẻ Đơn Hàng Đang Tạo Trực Tiếp Trong Chat:**\n\n` +
              `Bạn có thể kiểm tra sản phẩm, chọn size, áp dụng mã ưu đãi và bấm nút **"Xác Nhận Đặt Hàng Ngay"** ngay trên thẻ bên dưới:`,
        actionType: 'order_draft',
        draftOrder: draft,
        products: [target],
        timestamp: new Date().toISOString()
      }
    ]);
  };

  const handleUpdateDraftQty = (msgId, delta) => {
    setOrderDrafts((prev) => {
      const current = prev[msgId];
      if (!current) return prev;
      const stock = Number(products.find(product => product.id === current.items[0].id)?.stock || 0);
      if (stock <= 0) {
        setOrderError('Sản phẩm đã hết hàng, không thể tiếp tục chỉnh số lượng.');
        return prev;
      }
      const newQty = Math.min(Math.max(1, current.items[0].quantity + delta), stock);
      if (delta > 0 && current.items[0].quantity >= stock) {
        setOrderError('Số lượng đã đạt tồn kho hiện tại của sản phẩm.');
      }
      const unitPrice = current.items[0].price;
      const subtotal = unitPrice * newQty;
      const isFreeship = subtotal >= STORE_INFO.freeshipThreshold;
      const shippingFee = isFreeship ? 0 : STORE_INFO.standardShippingFee;

      let discount = 0;
      if (current.appliedCoupon) {
        if (current.appliedCoupon.type === 'percent') {
          discount = Math.round((subtotal * current.appliedCoupon.discountPercent) / 100);
        } else if (current.appliedCoupon.discountAmount) {
          discount = current.appliedCoupon.discountAmount;
        }
      }

      const total = Math.max(0, subtotal - discount + shippingFee);

      return {
        ...prev,
        [msgId]: {
          ...current,
          items: [{ ...current.items[0], quantity: newQty }],
          subtotal,
          shippingFee,
          discount,
          total
        }
      };
    });
  };

  const handleUpdateDraftVariant = (msgId, newVariant) => {
    setOrderDrafts((prev) => {
      const current = prev[msgId];
      if (!current) return prev;
      return {
        ...prev,
        [msgId]: {
          ...current,
          items: [{ ...current.items[0], variant: newVariant }]
        }
      };
    });
  };

  const handleUpdateDraftCustomer = (msgId, field, value) => {
    setOrderDrafts((prev) => {
      const current = prev[msgId];
      if (!current) return prev;
      return {
        ...prev,
        [msgId]: {
          ...current,
          customer: {
            ...current.customer,
            [field]: value
          }
        }
      };
    });
  };

  const handleUpdateDraftPayment = (msgId, method) => {
    setOrderDrafts((prev) => {
      const current = prev[msgId];
      if (!current) return prev;
      return {
        ...prev,
        [msgId]: {
          ...current,
          paymentMethod: method
        }
      };
    });
  };

  const handleApplyDraftVoucher = (msgId, coupon) => {
    setOrderDrafts((prev) => {
      const current = prev[msgId];
      if (!current) return prev;

      let discount = 0;
      if (coupon.type === 'percent') {
        discount = Math.round((current.subtotal * coupon.discountPercent) / 100);
      } else if (coupon.discountAmount) {
        discount = coupon.discountAmount;
      }

      const total = Math.max(0, current.subtotal - discount + current.shippingFee);

      return {
        ...prev,
        [msgId]: {
          ...current,
          appliedCoupon: coupon,
          discount,
          total
        }
      };
    });
  };

  const handleConfirmInChatOrder = async (msgId) => {
    const draft = orderDrafts[msgId];
    if (!draft) return;

    const draftItem = draft.items[0];
    const currentProduct = products.find(product => product.id === draftItem.id);
    const availableStock = Number(currentProduct?.stock || 0);
    if (!isProductInStock(currentProduct) || draftItem.quantity < 1 || draftItem.quantity > availableStock) {
      setOrderError('Sản phẩm không đủ tồn kho cho số lượng đã chọn. Vui lòng giảm số lượng hoặc chọn sản phẩm khác.');
      return;
    }

    if (!draft.customer.name.trim()) {
      setOrderError('Vui lòng nhập Họ tên người nhận hàng.');
      return;
    }

    if (!draft.customer.phone.trim() || !/(?:0|\+84)\d{8,10}/.test(draft.customer.phone.trim())) {
      setOrderError('Vui lòng nhập Số điện thoại hợp lệ (10 số).');
      return;
    }

    if (!draft.customer.address.trim()) {
      setOrderError('Vui lòng nhập Địa chỉ nhận hàng cụ thể.');
      return;
    }

    setOrderError('');
    setIsPlacingOrder(true);

    try {
      const newOrder = {
        id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toISOString(),
        customer: {
          name: draft.customer.name.trim(),
          phone: draft.customer.phone.trim(),
          address: draft.customer.address.trim(),
          city: draft.customer.city || 'Hà Nội'
        },
        items: draft.items,
        subtotal: draft.subtotal,
        shippingFee: draft.shippingFee,
        discount: draft.discount || 0,
        total: draft.total,
        paymentMethod: draft.paymentMethod,
        paymentStatus: draft.paymentMethod === 'vietqr' ? 'paid' : 'pending',
        orderStatus: 'pending',
        trackingCarrier: 'GHTK - Giao Hàng Tiết Kiệm',
        trackingCode: `GHTK${Math.floor(10000000 + Math.random() * 90000000)}`,
        timeline: [
          {
            status: 'pending',
            time: new Date().toISOString(),
            note: 'Đơn hàng được khởi tạo thành công từ Trợ Lý AI Chatbot'
          }
        ]
      };

      if (onOrderSuccess) {
        await onOrderSuccess(newOrder);
      }

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Clear draft state for this message
      setOrderDrafts((prev) => {
        const copy = { ...prev };
        delete copy[msgId];
        return copy;
      });

      // Append confirmation message
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: `🎉 **ĐẶT HÀNG THÀNH CÔNG! ĐƠN HÀNG #${newOrder.id}**\n\n` +
                `Cảm ơn bạn **${newOrder.customer.name}** đã tin tưởng đặt mua tại Tiệm Nhà Nhỏ! 🌿\n\n` +
                `• **Mã đơn hàng:** \`${newOrder.id}\`\n` +
                `• **Tổng thanh toán:** **${formatCurrency(newOrder.total)}**\n` +
                `• **Phương thức:** ${newOrder.paymentMethod === 'vietqr' ? '📱 Quét mã VietQR chuyển khoản (MB Bank)' : '💵 Thanh toán COD khi nhận hàng'}\n` +
                `• **Địa chỉ nhận:** ${newOrder.customer.address}, ${newOrder.customer.city}\n\n` +
                `Đơn hàng đã được lưu trữ bền vững vào hệ thống máy chủ và chuyển sang bộ phận đóng gói. Bạn có thể theo dõi hành trình thời gian thực ngay bên dưới nhé! 👇`,
          actionType: 'order_tracking',
          order: newOrder,
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (err) {
      console.error("Order error:", err);
      setOrderError('Có lỗi xảy ra khi tạo đơn hàng, vui lòng thử lại.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleDoorstepExchangeRequest = (orderId) => {
    setWarrantySuccess(`✓ Đã tiếp nhận yêu cầu đổi trả 1 đổi 1 tận nhà cho đơn ${orderId || ''}! Chuyên viên CSKH của Tiệm sẽ gọi điện xác nhận trong 5 phút.`);
    setTimeout(() => setWarrantySuccess(''), 5000);
  };

  const handleQuickChip = (chipText) => {
    handleSendMessage(chipText);
  };

  const handleResetChat = () => {
    const initial = StorageService.resetAllData().chat;
    setMessages(initial);
    setQuizState({ isActive: false, stepIndex: 0, answers: {} });
    setOrderDrafts({});
  };

  const handleAddFromChat = (product) => {
    if (!isProductInStock(product)) {
      setOrderError('Sản phẩm này hiện đã hết hàng, không thể thêm vào giỏ.');
      return;
    }
    onAddToCart(product, 1, product.variants?.colors?.[0] || 'Mặc định');
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1500);
  };

  const handleApplyVoucherFromChat = (voucher) => {
    onApplyCoupon(voucher);
    setAppliedCouponCode(voucher.code);
    setTimeout(() => setAppliedCouponCode(null), 2000);
  };

  const handleSaveAISettings = (e) => {
    e.preventDefault();
    const updated = {
      ...chatSettings,
      apiKey: apiKeyInput.trim()
    };
    StorageService.saveSettings(updated);
    setChatSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setShowConfig(false);
    }, 1500);
  };

  // Helper to format bot markdown text
  const renderFormattedText = (text) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let formattedLine = line;
      const parts = [];
      let lastIdx = 0;

      const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
      let match;

      while ((match = tokenRegex.exec(line)) !== null) {
        if (match.index > lastIdx) {
          parts.push(line.substring(lastIdx, match.index));
        }
        const token = match[0];
        if (token.startsWith('**')) {
          parts.push(
            <strong key={`${idx}-${match.index}`} className="font-bold text-stone-900">
              {token.slice(2, -2)}
            </strong>
          );
        } else if (token.startsWith('`')) {
          parts.push(
            <code key={`${idx}-${match.index}`} className="bg-stone-200/80 text-amber-900 px-1 py-0.5 rounded font-mono text-[11px]">
              {token.slice(1, -1)}
            </code>
          );
        }
        lastIdx = tokenRegex.lastIndex;
      }

      if (lastIdx < line.length) {
        parts.push(line.substring(lastIdx));
      }

      return (
        <p key={idx} className={`leading-relaxed ${line === '' ? 'h-2' : ''}`}>
          {parts.length > 0 ? parts : line}
        </p>
      );
    });
  };

  const latestOrder = orders.length > 0 ? orders[0] : null;

  return (
    <>
      {/* Floating Launcher Trigger */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-3">
          {/* Greeting Bubble */}
          <div 
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl border border-stone-200 text-xs text-stone-700 cursor-pointer hover:border-amber-400 hover:shadow-2xl transition-all group"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Cần tư vấn size áo, quà tặng hay kiểm tra đơn hàng? Em hỗ trợ ngay nhé! 🌿</span>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-stone-900 via-amber-900 to-amber-800 text-white flex items-center justify-center shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all group"
            title="Mở Trợ lý Bán hàng & CSKH AI"
          >
            <Bot className="w-7 h-7 text-amber-100 group-hover:rotate-12 transition-transform" />
            <span className="absolute top-0 right-0 -mr-0.5 -mt-0.5 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
          </button>
        </div>
      )}

      {/* Floating Chat Box Window */}
      {isOpen && (
        <div className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[440px] h-[620px] max-h-[88vh] z-50 bg-white rounded-3xl shadow-2xl border border-stone-200/90 flex flex-col overflow-hidden animate-slideUp">
          
          {/* Header */}
          <div className="bg-stone-900 text-white px-4 py-3.5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-amber-800 flex items-center justify-center text-amber-100 shadow-md">
                  <Bot className="w-5 h-5" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-stone-900" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-stone-100">
                    Trợ Lý AI Tiệm Nhà Nhỏ
                  </h3>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 font-semibold px-1.5 py-0.2 rounded border border-emerald-700">
                    {chatSettings.aiProvider === 'gemini' ? 'Gemini AI' : 'AI Cục Bộ'}
                  </span>
                </div>
                <p className="text-[11px] text-stone-400">Cố vấn kinh doanh, bán sỉ & sản phẩm chuyên sâu</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  showConfig ? 'bg-amber-800 text-white' : 'text-stone-400 hover:text-white hover:bg-stone-800'
                }`}
                title="Cài đặt AI Engine (Gemini / Local)"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetChat}
                className="w-7 h-7 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 flex items-center justify-center transition-colors"
                title="Làm mới đoạn chat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 flex items-center justify-center transition-colors"
                title="Thu nhỏ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Collapsible AI Config Banner */}
          {showConfig && (
            <div className="bg-stone-800 text-stone-200 p-3.5 border-b border-stone-700 text-xs space-y-2.5 animate-fadeIn flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Chế độ hoạt động của Chatbot AI
                </span>
                <button onClick={() => setShowConfig(false)} className="text-stone-400 hover:text-white text-xs">✕</button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const updated = { ...chatSettings, aiProvider: 'local' };
                    StorageService.saveSettings(updated);
                    setChatSettings(updated);
                    setSavedSuccess(true);
                    setTimeout(() => setSavedSuccess(false), 1500);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-semibold text-[11px] border transition-all ${
                    chatSettings.aiProvider === 'local'
                      ? 'bg-amber-700 text-white border-amber-600'
                      : 'bg-stone-900/60 text-stone-400 border-stone-700 hover:text-stone-200'
                  }`}
                >
                  ⚡ AI Cục Bộ (Tức thì)
                </button>
                <button
                  onClick={() => {
                    const updated = { ...chatSettings, aiProvider: 'gemini' };
                    StorageService.saveSettings(updated);
                    setChatSettings(updated);
                    setSavedSuccess(true);
                    setTimeout(() => setSavedSuccess(false), 1500);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-semibold text-[11px] border transition-all ${
                    chatSettings.aiProvider === 'gemini'
                      ? 'bg-amber-700 text-white border-amber-600'
                      : 'bg-stone-900/60 text-stone-400 border-stone-700 hover:text-stone-200'
                  }`}
                >
                  ✨ Google Gemini AI
                </button>
              </div>

              {chatSettings.aiProvider === 'gemini' && (
                <div className="p-2.5 bg-stone-900 rounded-lg border border-stone-700 text-[11px] text-stone-300 space-y-1">
                  <p>🔒 <strong className="text-amber-300">API Key được giấu hoàn toàn trên server</strong> — không lộ ra trình duyệt.</p>
                  <p className="text-stone-500">Model: <span className="text-emerald-400 font-mono">gemini-3.6-flash</span> · Key: <span className="text-emerald-400 font-mono">AQ.Ab8R...</span></p>
                </div>
              )}

              {savedSuccess && <span className="text-emerald-400 text-[11px] font-bold block">✓ Đã lưu cài đặt!</span>}

              <p className="text-[10px] text-stone-400 leading-tight">
                🛡️ Bot chỉ hỗ trợ tư vấn kinh doanh & sản phẩm — tự động từ chối các chủ đề ngoại lai.
              </p>
            </div>
          )}

          {/* Quick Action 3-Pillar Navigation Bar */}
          <div className="bg-stone-100/95 px-3 py-2 border-b border-stone-200/90 flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-shrink-0">
            <button
              onClick={startNeedQuiz}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-white text-[11px] font-bold shadow-xs whitespace-nowrap transition-all"
            >
              <Compass className="w-3.5 h-3.5 text-amber-200" />
              <span>🎯 Khảo Sát Nhu Cầu</span>
            </button>

            <button
              onClick={() => handleStartInChatOrder(products[0])}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold border border-amber-300 whitespace-nowrap transition-all"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-amber-800" />
              <span>⚡ Đặt Hàng Trong Chat</span>
            </button>

            <button
              onClick={() => handleSendMessage(latestOrder ? `Kiểm tra tiến độ đơn hàng ${latestOrder.id}` : "Tra cứu tình trạng đơn hàng và chính sách bảo hành")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 text-[11px] font-bold border border-blue-200 whitespace-nowrap transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
              <span>🛡️ Chăm Sóc & Đơn Hàng</span>
            </button>

            <button
              onClick={() => handleQuickChip("Chính sách mua sỉ, chiết khấu số lượng lớn và hóa đơn VAT cho doanh nghiệp")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-900 text-white text-[11px] font-bold hover:bg-stone-800 whitespace-nowrap transition-all"
            >
              💼 Bán sỉ B2B
            </button>

            <button
              onClick={() => handleQuickChip("Có mã giảm giá hoặc voucher gì không shop?")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-stone-200 text-stone-700 text-[11px] font-medium border border-stone-200 shadow-2xs whitespace-nowrap transition-all"
            >
              <Tag className="w-3 h-3 text-purple-600" /> Voucher
            </button>
          </div>

          {/* Chat Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/50 text-xs">
            
            {/* Pillar 1: Active Need Analysis Wizard floating card */}
            {quizState.isActive && (
              <div className="bg-gradient-to-br from-stone-900 to-amber-950 text-white p-4 rounded-2xl shadow-xl space-y-3 border border-amber-800/80 animate-slideDown mb-3">
                <div className="flex items-center justify-between pb-1 border-b border-amber-800/60">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
                    <Compass className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
                    <span>Khảo Sát Nhu Cầu (Bước {quizState.stepIndex + 1}/4)</span>
                  </div>
                  <button
                    onClick={() => setQuizState({ isActive: false, stepIndex: 0, answers: {} })}
                    className="text-amber-300 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded hover:bg-white/10"
                  >
                    ✕ Hủy
                  </button>
                </div>

                <div>
                  <div className="text-xs font-bold text-white mb-0.5">{NEED_ANALYSIS_STEPS[quizState.stepIndex].title}</div>
                  <div className="text-[11px] text-amber-200/70">{NEED_ANALYSIS_STEPS[quizState.stepIndex].subtitle}</div>
                </div>

                <div className="grid grid-cols-1 gap-1.5 pt-1">
                  {NEED_ANALYSIS_STEPS[quizState.stepIndex].options.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectQuizOption(NEED_ANALYSIS_STEPS[quizState.stepIndex].id, opt)}
                      className="text-left p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-amber-400/20 text-xs transition-all flex flex-col hover:border-amber-300 hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <span className="font-bold text-amber-100 flex items-center justify-between">
                        <span>{opt.label}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-amber-300 opacity-60" />
                      </span>
                      <span className="text-[10px] text-stone-300 mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Warranty Success Alert */}
            {warrantySuccess && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-sm animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{warrantySuccess}</span>
              </div>
            )}

            {messages.map((msg) => {
              const isBot = msg.sender === 'bot';
              const draft = orderDrafts[msg.id];

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}
                >
                  <div
                    className={`max-w-[92%] p-3.5 rounded-2xl shadow-sm text-xs ${
                      isBot
                        ? 'bg-white border border-stone-200/90 text-stone-800 rounded-tl-sm'
                        : 'bg-stone-900 text-white rounded-tr-sm shadow-stone-900/10'
                    }`}
                  >
                    {isBot ? renderFormattedText(msg.text) : <p className="leading-relaxed">{msg.text}</p>}

                    {/* PILLAR 1: CURATED PRODUCTS FROM NEED ANALYSIS */}
                    {msg.curatedProducts && msg.curatedProducts.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-stone-200 space-y-2">
                        <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          Sản phẩm tương thích cao theo phân tích AI:
                        </div>
                        <div className="space-y-2">
                          {msg.curatedProducts.map(p => (
                            <div key={p.id} className="bg-amber-50/40 hover:bg-amber-50/80 p-2.5 rounded-xl border border-amber-200 flex flex-col gap-2 transition-all">
                              <div className="flex items-center gap-3">
                                <img src={p.images[0]} alt={p.name} className="w-14 h-14 rounded-lg object-cover bg-white flex-shrink-0 border border-stone-200" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <h4 className="font-bold text-stone-900 text-xs truncate">{p.name}</h4>
                                    {p.matchScore && (
                                      <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded whitespace-nowrap">
                                        🎯 {p.matchScore}% Phù hợp
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-amber-900 font-extrabold text-xs mt-0.5">{formatCurrency(p.price)}</div>
                                  {p.matchReason && (
                                    <p className="text-[10px] text-stone-500 italic mt-0.5 line-clamp-1">{p.matchReason}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pt-1 border-t border-amber-100 justify-end">
                                <button
                                  onClick={() => onSelectProduct(p)}
                                  className="text-[10px] text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold"
                                >
                                  <Eye className="w-3 h-3" /> Xem chi tiết
                                </button>
                                <button
                                  onClick={() => handleStartInChatOrder(p)}
                                  className="text-[10px] bg-amber-900 hover:bg-amber-800 text-white px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold shadow-xs transition-all"
                                >
                                  <ShoppingCart className="w-3 h-3" /> ⚡ Đặt ngay trong chat
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PILLAR 2: IN-CHAT DIRECT ORDER FORM */}
                    {draft && (
                      <div className="mt-3 pt-3 border-t border-stone-200 space-y-3 bg-stone-50 p-3 rounded-xl border border-amber-200/80">
                        <div className="flex items-center justify-between pb-1 border-b border-stone-200">
                          <span className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                            <ShoppingCart className="w-4 h-4 text-amber-900" />
                            Đơn Hàng Trực Tiếp Trong Chat
                          </span>
                          <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded border border-amber-200">
                            Khởi tạo nhanh 1-Click
                          </span>
                        </div>

                        {draft.items.map((item, idx) => (
                          <div key={idx} className="flex gap-2.5 items-center">
                            <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover bg-white border border-stone-200 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-stone-900 text-xs truncate">{item.name}</div>
                              <div className="text-amber-900 font-extrabold text-xs">{formatCurrency(item.price)}</div>
                              
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center border border-stone-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                                  <button
                                    onClick={() => handleUpdateDraftQty(msg.id, -1)}
                                    className="w-5 h-5 flex items-center justify-center hover:bg-stone-100 text-stone-700 font-bold"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="px-2 text-xs font-bold text-stone-900">{item.quantity}</span>
                                  <button
                                    onClick={() => handleUpdateDraftQty(msg.id, 1)}
                                    className="w-5 h-5 flex items-center justify-center hover:bg-stone-100 text-stone-700 font-bold"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                                <span className="text-[10px] text-stone-400">({item.variant})</span>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Price summary */}
                        <div className="bg-white p-2.5 rounded-lg border border-stone-200 text-[11px] space-y-1">
                          <div className="flex justify-between text-stone-600">
                            <span>Tạm tính:</span>
                            <span className="font-semibold">{formatCurrency(draft.subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-stone-600">
                            <span>Phí vận chuyển:</span>
                            <span>
                              {draft.shippingFee === 0 ? (
                                <strong className="text-emerald-700">Miễn phí (Freeship)</strong>
                              ) : (
                                formatCurrency(draft.shippingFee)
                              )}
                            </span>
                          </div>
                          {draft.discount > 0 && (
                            <div className="flex justify-between text-emerald-700 font-bold">
                              <span>Voucher giảm giá:</span>
                              <span>-{formatCurrency(draft.discount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-stone-900 font-extrabold text-xs pt-1 border-t border-stone-100">
                            <span>Tổng thanh toán:</span>
                            <span className="text-amber-900 text-sm">{formatCurrency(draft.total)}</span>
                          </div>
                        </div>

                        {/* Quick Vouchers */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-stone-500 font-bold">Mã giảm:</span>
                          {StorageService.getCoupons().filter(c => c.isActive !== false).map(c => (
                            <button
                              key={c.code}
                              onClick={() => handleApplyDraftVoucher(msg.id, c)}
                              className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold transition-all ${
                                draft.appliedCoupon?.code === c.code
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-amber-50'
                              }`}
                            >
                              {c.code}
                            </button>
                          ))}
                        </div>

                        {/* Recipient Form */}
                        <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-stone-200 text-xs">
                          <div className="font-bold text-[11px] text-stone-700 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-stone-500" />
                            <span>Thông Tin Nhận Hàng</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <input
                              type="text"
                              placeholder="Họ và tên *"
                              value={draft.customer.name}
                              onChange={(e) => handleUpdateDraftCustomer(msg.id, 'name', e.target.value)}
                              className="px-2 py-1.5 rounded-lg border border-stone-200 text-[11px] focus:ring-1 focus:ring-amber-700 focus:outline-none"
                            />
                            <input
                              type="tel"
                              placeholder="Số điện thoại *"
                              value={draft.customer.phone}
                              onChange={(e) => handleUpdateDraftCustomer(msg.id, 'phone', e.target.value)}
                              className="px-2 py-1.5 rounded-lg border border-stone-200 text-[11px] focus:ring-1 focus:ring-amber-700 focus:outline-none"
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="Địa chỉ giao hàng cụ thể *"
                            value={draft.customer.address}
                            onChange={(e) => handleUpdateDraftCustomer(msg.id, 'address', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-stone-200 text-[11px] focus:ring-1 focus:ring-amber-700 focus:outline-none"
                          />
                        </div>

                        {/* Payment Method Selector */}
                        <div className="space-y-1 text-xs">
                          <div className="font-bold text-[11px] text-stone-700">Hình thức thanh toán:</div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateDraftPayment(msg.id, 'cod')}
                              className={`p-2 rounded-xl border text-left flex items-center gap-1.5 text-[11px] transition-all ${
                                draft.paymentMethod === 'cod'
                                  ? 'border-amber-900 bg-amber-50 text-amber-900 font-bold shadow-2xs'
                                  : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                              }`}
                            >
                              <Truck className="w-3.5 h-3.5 text-amber-800" />
                              <span>COD Tiền mặt</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateDraftPayment(msg.id, 'vietqr')}
                              className={`p-2 rounded-xl border text-left flex items-center gap-1.5 text-[11px] transition-all ${
                                draft.paymentMethod === 'vietqr'
                                  ? 'border-amber-900 bg-amber-50 text-amber-900 font-bold shadow-2xs'
                                  : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                              }`}
                            >
                              <QrCode className="w-3.5 h-3.5 text-blue-700" />
                              <span>VietQR (MB Bank)</span>
                            </button>
                          </div>
                        </div>

                        {orderError && (
                          <div className="text-[11px] text-rose-700 font-bold bg-rose-50 p-2 rounded-lg border border-rose-200">
                            ⚠️ {orderError}
                          </div>
                        )}

                        <button
                          onClick={() => handleConfirmInChatOrder(msg.id)}
                          disabled={isPlacingOrder}
                          className="w-full py-2.5 px-3 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {isPlacingOrder ? (
                            <span>Đang khởi tạo đơn hàng...</span>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Xác Nhận Đặt Hàng Ngay ({formatCurrency(draft.total)})</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* PILLAR 3: CUSTOMER CARE & ORDER TRACKING STEPPER */}
                    {msg.order && (
                      <div className="mt-3 pt-3 border-t border-stone-200 space-y-3 bg-stone-50/80 p-3 rounded-xl border border-stone-200">
                        <div className="flex items-center justify-between pb-1 border-b border-stone-200">
                          <span className="font-mono font-extrabold text-amber-900 text-xs flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-amber-800" />
                            Đơn hàng: {msg.order.id}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-amber-100 text-amber-900 border border-amber-300">
                            {AIChatEngine.getStatusLabel(msg.order.orderStatus)}
                          </span>
                        </div>

                        {/* 4-Step Stepper */}
                        <div className="py-2">
                          <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                            {[
                              { id: 'pending', label: '1. Chờ duyệt' },
                              { id: 'processing', label: '2. Đóng gói' },
                              { id: 'shipping', label: '3. Đang giao' },
                              { id: 'delivered', label: '4. Hoàn tất' }
                            ].map((step, sIdx) => {
                              const statusOrder = ['pending', 'processing', 'shipping', 'delivered'];
                              const currentIdx = statusOrder.indexOf(msg.order.orderStatus);
                              const isCompleted = currentIdx >= sIdx;
                              const isCurrent = currentIdx === sIdx;

                              return (
                                <div key={step.id} className="flex flex-col items-center">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] mb-1 transition-all ${
                                    isCompleted 
                                      ? 'bg-emerald-600 text-white shadow-xs' 
                                      : 'bg-stone-200 text-stone-500'
                                  }`}>
                                    {isCompleted ? '✓' : sIdx + 1}
                                  </div>
                                  <span className={`font-semibold ${isCurrent ? 'text-amber-900 font-bold' : isCompleted ? 'text-stone-700' : 'text-stone-400'}`}>
                                    {step.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="bg-white p-2.5 rounded-lg border border-stone-200 text-[11px] space-y-1">
                          <div className="text-stone-700">• Người nhận: <strong className="text-stone-900">{msg.order.customer?.name} - {msg.order.customer?.phone}</strong></div>
                          <div className="text-stone-700">• Địa chỉ: <strong className="text-stone-900">{msg.order.customer?.address}, {msg.order.customer?.city}</strong></div>
                          <div className="text-stone-700">• Vận chuyển: <strong className="text-stone-900">{msg.order.trackingCarrier}</strong> ({msg.order.trackingCode})</div>
                          {msg.order.handledBy && (
                            <div className="text-stone-700">• Người xử lý: <strong className="text-amber-900">{msg.order.handledBy}</strong></div>
                          )}
                        </div>

                        {/* Customer Care Guarantee & Action */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <button
                            onClick={() => handleDoorstepExchangeRequest(msg.order.id)}
                            className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                          >
                            <RotateCcw className="w-3 h-3 text-rose-600" />
                            <span>Yêu Cầu Đổi Trả 1-1 Tận Nhà</span>
                          </button>

                          {onOpenOrdersModal && (
                            <button
                              onClick={() => {
                                setIsOpen(false);
                                onOpenOrdersModal();
                              }}
                              className="px-3 py-1.5 bg-amber-900 hover:bg-amber-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shadow-xs"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Xem Lịch Sử Đơn</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Standard Interactive Product Cards */}
                    {(!msg.curatedProducts || msg.curatedProducts.length === 0) && msg.products && msg.products.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
                        <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                          Sản phẩm gợi ý cho bạn:
                        </div>
                        <div className="space-y-2">
                          {msg.products.map((p) => {
                            const isJustAdded = addedProductId === p.id;
                            return (
                              <div
                                key={p.id}
                                className="bg-stone-50 hover:bg-stone-100/80 p-2.5 rounded-xl border border-stone-200/80 flex items-center gap-3 transition-colors"
                              >
                                <img
                                  src={p.images[0]}
                                  alt={p.name}
                                  className="w-14 h-14 rounded-lg object-cover bg-white flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-stone-900 text-xs truncate">
                                    {p.name}
                                  </h4>
                                  <div className="text-amber-900 font-extrabold text-xs mt-0.5">
                                    {formatCurrency(p.price)}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <button
                                      onClick={() => onSelectProduct(p)}
                                      className="text-[10px] text-stone-600 hover:text-stone-900 bg-white border border-stone-200 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium"
                                    >
                                      <Eye className="w-3 h-3" /> Xem
                                    </button>
                                    <button
                                      onClick={() => handleAddFromChat(p)}
                                      className={`text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 font-bold transition-all ${
                                        isJustAdded
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-amber-900 text-white hover:bg-amber-800'
                                      }`}
                                    >
                                      {isJustAdded ? (
                                        <>
                                          <Check className="w-3 h-3" /> Đã thêm!
                                        </>
                                      ) : (
                                        <>
                                          <ShoppingBag className="w-3 h-3" /> Thêm vào giỏ
                                        </>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => handleStartInChatOrder(p)}
                                      className="text-[10px] px-2 py-0.5 rounded-md bg-stone-900 text-white hover:bg-stone-800 font-bold transition-all flex items-center gap-1"
                                      title="Đặt hàng nhanh trực tiếp trong chat"
                                    >
                                      ⚡ Đặt ngay
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Interactive Voucher Cards */}
                    {msg.vouchers && msg.vouchers.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
                        <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                          Mã ưu đãi có thể dùng ngay:
                        </div>
                        <div className="space-y-1.5">
                          {msg.vouchers.map((v) => {
                            const isApplied = appliedCouponCode === v.code;
                            return (
                              <div
                                key={v.code}
                                className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-xl flex items-center justify-between gap-2"
                              >
                                <div>
                                  <div className="font-mono font-bold text-amber-900 text-xs flex items-center gap-1">
                                    <Tag className="w-3 h-3" /> {v.code}
                                  </div>
                                  <div className="text-[10px] text-stone-600">{v.description}</div>
                                </div>
                                <button
                                  onClick={() => handleApplyVoucherFromChat(v)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                                    isApplied
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-amber-900 text-white hover:bg-amber-800'
                                  }`}
                                >
                                  {isApplied ? (
                                    <>
                                      <Check className="w-3 h-3" /> Đã áp dụng
                                    </>
                                  ) : (
                                    'Áp dụng ngay'
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {msg.actionContact && (
                      <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap gap-2">
                        {onOpenOrdersModal && (
                          <button
                            onClick={() => {
                              setIsOpen(false);
                              onOpenOrdersModal();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-xs transition-all"
                          >
                            <Package className="w-3.5 h-3.5 text-amber-200" />
                            <span>Mở Bản Đồ Tiến Trình Đơn</span>
                          </button>
                        )}
                        <a
                          href={`tel:${STORE_INFO.phone}`}
                          className="px-3 py-1.5 rounded-xl bg-stone-900 text-white text-[11px] font-bold flex items-center gap-1.5 hover:bg-stone-800"
                        >
                          <Phone className="w-3 h-3 text-amber-300" />
                          <span>Gọi Hotline: {STORE_INFO.phone}</span>
                        </a>
                        <a
                          href={`https://zalo.me/${STORE_INFO.zalo}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-[11px] font-bold flex items-center gap-1.5 hover:bg-blue-700"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Mở Zalo Tiệm</span>
                        </a>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] text-stone-400 mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-center gap-1.5 bg-white border border-stone-200 p-3 rounded-2xl w-20 rounded-tl-sm shadow-sm">
                <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 bg-white border-t border-stone-200 flex-shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Hỏi đơn hàng, tư vấn size, quà tặng, ship..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-stone-100 border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isTyping}
                className="w-10 h-10 rounded-2xl bg-stone-900 text-white flex items-center justify-center hover:bg-amber-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      )}
    </>
  );
}
