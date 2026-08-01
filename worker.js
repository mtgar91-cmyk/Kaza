// ================================================
// 🇵🇸 سوق فلسطين - بوت تيليجرام على Cloudflare Workers
// ================================================

const BOT_TOKEN = '8656873565:AAEQZw4-hbfvDPTTSNkadeuijDRx47__AJQ';
const OWNER_ID = 6668195885;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ==================== معالج الطلبات الرئيسي ====================
export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('🇵🇸 سوق فلسطين يعمل!', { status: 200 });
    }
    try {
      const update = await request.json();
      await handleUpdate(update, env);
    } catch (e) {
      console.error('خطأ:', e);
    }
    return new Response('OK', { status: 200 });
  }
};

// ==================== KV Helper ====================
async function kvGet(env, key) {
  const val = await env.DB.get(key, 'json');
  return val;
}
async function kvSet(env, key, value) {
  await env.DB.put(key, JSON.stringify(value));
}
async function kvDel(env, key) {
  await env.DB.delete(key);
}
async function kvGetText(env, key) {
  return await env.DB.get(key, 'text');
}
async function kvSetText(env, key, value) {
  await env.DB.put(key, value);
}

// ==================== Telegram API ====================
async function callAPI(method, params) {
  const res = await fetch(`${API_BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return res.json();
}

async function sendMessage(chatId, text, extra = {}) {
  return callAPI('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra });
}

async function editMessage(chatId, messageId, text, extra = {}) {
  return callAPI('editMessageText', { chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML', ...extra });
}

async function answerCallback(callbackQueryId, text = '') {
  return callAPI('answerCallbackQuery', { callback_query_id: callbackQueryId, text });
}

async function sendPhoto(chatId, photo, caption, extra = {}) {
  return callAPI('sendPhoto', { chat_id: chatId, photo, caption, parse_mode: 'HTML', ...extra });
}

// ==================== معالج التحديثات ====================
async function handleUpdate(update, env) {
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query, env);
  } else if (update.message) {
    await handleMessage(update.message, env);
  }
}

// ==================== الحالة ====================
async function getState(env, userId) {
  return await kvGet(env, `state:${userId}`) || { step: null, data: {} };
}
async function setState(env, userId, state) {
  await kvSet(env, `state:${userId}`, state);
}
async function clearState(env, userId) {
  await kvDel(env, `state:${userId}`);
}

// ==================== المستخدم ====================
async function getUser(env, userId) {
  return await kvGet(env, `user:${userId}`) || { id: userId, stores: [], saved_stores: [], saved_products: [], products: [], ads: [], premium: false };
}
async function saveUser(env, user) {
  await kvSet(env, `user:${user.id}`, user);
}

// ==================== ID Generator ====================
async function genId(env, prefix) {
  const counter = (await kvGet(env, `counter:${prefix}`) || 0) + 1;
  await kvSet(env, `counter:${prefix}`, counter);
  return `${prefix}_${counter}_${Date.now()}`;
}

// ==================== المتاجر ====================
async function getAllStores(env) {
  return await kvGet(env, 'all_stores') || [];
}
async function saveAllStores(env, stores) {
  await kvSet(env, 'all_stores', stores);
}
async function getStore(env, storeId) {
  return await kvGet(env, `store:${storeId}`);
}
async function saveStore(env, store) {
  await kvSet(env, `store:${store.id}`, store);
}
async function deleteStore(env, storeId) {
  const stores = await getAllStores(env);
  const updated = stores.filter(id => id !== storeId);
  await saveAllStores(env, updated);
  await kvDel(env, `store:${storeId}`);
}

// ==================== المنتجات ====================
async function getAllProducts(env) {
  return await kvGet(env, 'all_products') || [];
}
async function getProduct(env, productId) {
  return await kvGet(env, `product:${productId}`);
}
async function saveProduct(env, product) {
  await kvSet(env, `product:${product.id}`, product);
}
async function deleteProduct(env, productId) {
  const products = await getAllProducts(env);
  const updated = products.filter(id => id !== productId);
  await kvSet(env, 'all_products', updated);
  await kvDel(env, `product:${productId}`);
}

// ==================== تصانيف السوق ====================
async function getMarketCategories(env) {
  const custom = await kvGet(env, 'market_categories') || [];
  const base = ['👗 ملابس', '📱 إلكترونيات', '🛒 أغذية ومؤن', '🏠 المنزل والأثاث', '🧸 أطفال وألعاب', '💄 تجميل وعناية', '📚 كتب وقرطاسية', '⚽ رياضة', '🔧 أدوات ومعدات'];
  return [...base, ...custom];
}
async function addMarketCategory(env, category) {
  const custom = await kvGet(env, 'market_categories') || [];
  custom.push(category);
  await kvSet(env, 'market_categories', custom);
}
async function removeMarketCategory(env, category) {
  const custom = await kvGet(env, 'market_categories') || [];
  const base = ['👗 ملابس', '📱 إلكترونيات', '🛒 أغذية ومؤن', '🏠 المنزل والأثاث', '🧸 أطفال وألعاب', '💄 تجميل وعناية', '📚 كتب وقرطاسية', '⚽ رياضة', '🔧 أدوات ومعدات'];
  if (base.includes(category)) return false;
  const updated = custom.filter(c => c !== category);
  await kvSet(env, 'market_categories', updated);
  return true;
}

// ==================== تصانيف المتاجر ====================
const BASE_STORE_CATS = ['🍽️ مطعم وكافيه', '🛍️ بيع بالتجزئة', '💊 صيدلية', '📦 بيع بالجملة', '🏪 سوبر ماركت', '🥐 مخبز وحلويات', '🔩 ورشة وصيانة'];
async function getStoreCategories(env) {
  const custom = await kvGet(env, 'store_categories') || [];
  return [...BASE_STORE_CATS, ...custom];
}
async function addStoreCategory(env, category) {
  const custom = await kvGet(env, 'store_categories') || [];
  custom.push(category);
  await kvSet(env, 'store_categories', custom);
}

// ==================== المشرفون ====================
async function getAdmins(env) {
  return await kvGet(env, 'admins') || [];
}
async function isAdmin(env, userId) {
  if (userId === OWNER_ID) return true;
  const admins = await getAdmins(env);
  return admins.includes(userId);
}

// ==================== التطبيع العربي للتصانيف ====================
function normalizeArabic(text) {
  return text
    .trim()
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ةه]/g, 'ه')
    .replace(/[يىئ]/g, 'ي')
    .replace(/[ؤو]/g, 'و')
    .replace(/[\u0610-\u061A\u064B-\u065F]/g, '') // تشكيل
    .replace(/\s+/g, ' ')
    .toLowerCase();
}
function categoriesMatch(a, b) {
  return normalizeArabic(a) === normalizeArabic(b);
}
async function findMatchingCategory(env, type, input) {
  const cats = type === 'market' ? await getMarketCategories(env) : await getStoreCategories(env);
  for (const cat of cats) {
    const cleanCat = cat.replace(/^[\p{Emoji}\s]+/u, '').trim();
    if (categoriesMatch(cleanCat, input) || categoriesMatch(cat, input)) {
      return cat;
    }
  }
  return null;
}

// ==================== المدن الفلسطينية ====================
// مرتبة كما في الصورة بصفوف 3×3
const CITIES = [
  'رفح', 'خانيونس', 'غزة',
  'النصيرات', 'دير البلح', 'جباليا',
  'المغازي', 'بيت لاهيا', 'بيت حانون',
  'نابلس', 'رام الله', 'البريج',
  'جنين', 'بيت لحم', 'الخليل',
  'القدس', 'أريحا', 'طولكرم',
  'يافا', 'سلفيت', 'قلقيلية',
  'الناصرة', 'حيفا'
];

// ==================== لوحة المفاتيح الرئيسية ====================
function mainKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🏪 المتاجر', callback_data: 'menu_stores' },
        { text: '🛒 السوق', callback_data: 'menu_market' }
      ],
      [
        { text: '🔧 الخدمات', callback_data: 'menu_services' },
        { text: '🍽️ المطاعم', callback_data: 'menu_restaurants' }
      ],
      [
        { text: '⭐ المنتجات المميزة', callback_data: 'menu_featured' },
        { text: '🎁 العروض', callback_data: 'menu_offers' }
      ],
      [
        { text: '📢 أضف إعلان', callback_data: 'menu_addad' },
        { text: '👤 حسابي', callback_data: 'menu_account' }
      ],
      [
        { text: '🔍 بحث', callback_data: 'menu_search' },
        { text: '🗂️ التصانيف المتاحة', callback_data: 'menu_all_cats' }
      ]
    ]
  };
}

function backToMainBtn() {
  return [[{ text: '🏠 القائمة الرئيسية', callback_data: 'main_menu' }]];
}

// ==================== معالج الرسائل ====================
async function handleMessage(msg, env) {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const text = msg.text || '';
  const state = await getState(env, userId);

  // أمر البداية
  if (text === '/start') {
    await clearState(env, userId);
    return sendMessage(chatId,
      `🇵🇸 <b>أهلاً وسهلاً في سوق فلسطين!</b>\n\n` +
      `🌿 منصتك التجارية الأولى لدعم الاقتصاد الفلسطيني\n\n` +
      `اختر من القائمة أدناه:`,
      { reply_markup: mainKeyboard() }
    );
  }

  // أمر الأدمن
  if (text === '/admin') {
    const admin = await isAdmin(env, userId);
    if (!admin) return sendMessage(chatId, '❌ ليس لديك صلاحية للوصول إلى لوحة التحكم.');
    return showAdminPanel(chatId, env);
  }

  // معالجة حالات المحادثة
  if (state.step) {
    await handleConversationStep(msg, state, env);
    return;
  }

  // رسالة عادية بدون حالة
  sendMessage(chatId, '👋 اضغط /start للبدء أو اختر من القائمة.', { reply_markup: mainKeyboard() });
}

// ==================== معالج Callback ====================
async function handleCallbackQuery(cq, env) {
  const userId = cq.from.id;
  const chatId = cq.message.chat.id;
  const msgId = cq.message.message_id;
  const data = cq.data;

  await answerCallback(cq.id);

  // زر فاصل (لا يفعل شيئاً)
  if (data === 'noop') return;

  // القائمة الرئيسية
  if (data === 'main_menu') {
    await clearState(env, userId);
    return editMessage(chatId, msgId,
      `🇵🇸 <b>سوق فلسطين</b>\n\nاختر من القائمة أدناه:`,
      { reply_markup: mainKeyboard() }
    );
  }

  // ===== المتاجر =====
  if (data === 'menu_stores') return showStoresMenu(chatId, msgId, env);
  if (data === 'stores_available') return showAvailableStores(chatId, msgId, env, 0);
  if (data.startsWith('stores_page_')) {
    const page = parseInt(data.split('_')[2]);
    return showAvailableStores(chatId, msgId, env, page);
  }
  if (data === 'stores_create') return startCreateStore(chatId, msgId, userId, env);
  if (data.startsWith('store_view_')) {
    const storeId = data.replace('store_view_', '');
    return showStoreDetail(chatId, msgId, storeId, userId, env);
  }
  if (data.startsWith('store_products_')) {
    const storeId = data.replace('store_products_', '');
    return showStoreProducts(chatId, msgId, storeId, env, 0);
  }
  if (data.startsWith('store_prods_page_')) {
    const [, , , storeId, page] = data.split('_');
    return showStoreProducts(chatId, msgId, storeId, env, parseInt(page));
  }
  if (data.startsWith('store_report_')) {
    const storeId = data.replace('store_report_', '');
    return showReportConfirm(chatId, msgId, storeId, 'store');
  }
  if (data.startsWith('store_report_confirm_')) {
    const storeId = data.replace('store_report_confirm_', '');
    return handleStoreReport(chatId, msgId, storeId, userId, cq.from, env);
  }
  if (data.startsWith('store_delete_')) {
    const storeId = data.replace('store_delete_', '');
    return showDeleteStoreConfirm(chatId, msgId, storeId, userId, env);
  }
  if (data.startsWith('store_delete_confirm_')) {
    const storeId = data.replace('store_delete_confirm_', '');
    return handleDeleteStore(chatId, msgId, storeId, userId, env);
  }
  if (data.startsWith('store_save_')) {
    const storeId = data.replace('store_save_', '');
    return handleSaveStore(chatId, msgId, storeId, userId, env);
  }
  if (data.startsWith('store_edit_')) {
    const storeId = data.replace('store_edit_', '');
    return startEditStore(chatId, msgId, storeId, userId, env);
  }
  if (data.startsWith('store_stats_')) {
    const storeId = data.replace('store_stats_', '');
    return showStoreStats(chatId, msgId, storeId, userId, env);
  }
  if (data.startsWith('store_addproduct_')) {
    const storeId = data.replace('store_addproduct_', '');
    return startAddProduct(chatId, msgId, userId, storeId, 'market', env);
  }

  // تصانيف المتاجر
  if (data.startsWith('storecat_select_')) {
    const cat = data.replace('storecat_select_', '');
    const state = await getState(env, userId);
    if (state.step === 'store_category') {
      state.data.category = cat;
      state.step = null;
      const storeId = await genId(env, 'store');
      const store = {
        id: storeId,
        ownerId: userId,
        ownerUsername: state.data.ownerUsername,
        name: state.data.name,
        description: state.data.description,
        category: cat,
        products: [],
        views: 0,
        createdAt: Date.now()
      };
      await saveStore(env, store);
      const allStores = await getAllStores(env);
      allStores.push(storeId);
      await saveAllStores(env, allStores);
      const user = await getUser(env, userId);
      user.stores = user.stores || [];
      user.stores.push(storeId);
      await saveUser(env, user);
      await clearState(env, userId);
      return sendMessage(chatId,
        `✅ <b>تم إنشاء متجرك بنجاح!</b>\n\n` +
        `🏪 <b>الاسم:</b> ${store.name}\n` +
        `📝 <b>الوصف:</b> ${store.description}\n` +
        `🗂️ <b>التصنيف:</b> ${cat}\n\n` +
        `يمكنك إدارة متجرك من قسم <b>حسابي ← متجري</b> 🎉`,
        { reply_markup: { inline_keyboard: backToMainBtn() } }
      );
    }
  }

  // ===== السوق =====
  if (data === 'menu_market') return showMarketMenu(chatId, msgId, env);
  if (data.startsWith('market_cat_')) {
    const cat = data.replace('market_cat_', '');
    return showProductsByCategory(chatId, msgId, cat, env, 0);
  }
  if (data.startsWith('market_cat_page_')) {
    const parts = data.split('|');
    const cat = parts[0].replace('market_cat_page_', '');
    const page = parseInt(parts[1]);
    return showProductsByCategory(chatId, msgId, cat, env, page);
  }
  if (data === 'market_add_cat') return startAddMarketCategory(chatId, msgId, userId, env);
  if (data === 'menu_all_cats') return showAllCategories(chatId, msgId, env);

  // ===== المنتج =====
  if (data.startsWith('product_view_')) {
    const productId = data.replace('product_view_', '');
    return showProductDetail(chatId, msgId, productId, userId, env);
  }
  if (data.startsWith('product_save_')) {
    const productId = data.replace('product_save_', '');
    return handleSaveProduct(chatId, msgId, productId, userId, env);
  }
  if (data.startsWith('product_report_')) {
    const productId = data.replace('product_report_', '');
    return showReportConfirm(chatId, msgId, productId, 'product');
  }
  if (data.startsWith('product_report_confirm_')) {
    const productId = data.replace('product_report_confirm_', '');
    return handleProductReport(chatId, msgId, productId, userId, cq.from, env);
  }
  if (data.startsWith('product_delete_')) {
    const productId = data.replace('product_delete_', '');
    return showDeleteProductConfirm(chatId, msgId, productId, userId, env);
  }
  if (data.startsWith('product_delete_confirm_')) {
    const productId = data.replace('product_delete_confirm_', '');
    return handleDeleteProduct(chatId, msgId, productId, userId, env);
  }

  // حالة الضغط على: ملابس/إلكترونيات... إلخ أثناء إضافة منتج
  if (data.startsWith('prodcat_select_')) {
    const cat = data.replace('prodcat_select_', '');
    const state = await getState(env, userId);
    if (state.step === 'product_category') {
      state.data.category = cat;
      state.step = 'product_condition';
      await setState(env, userId, state);
      return sendMessage(chatId,
        `🗂️ <b>التصنيف:</b> ${cat}\n\nالخطوة 1 — حالة المنتج:`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '✨ جديد', callback_data: 'prodcond_جديد' }, { text: '🔄 مستعمل', callback_data: 'prodcond_مستعمل' }, { text: '⚠️ معيب', callback_data: 'prodcond_معيب' }],
              [{ text: '🔙 رجوع', callback_data: 'main_menu' }]
            ]
          }
        }
      );
    }
  }

  // حالة المنتج
  if (data.startsWith('prodcond_')) {
    const condition = data.replace('prodcond_', '');
    const state = await getState(env, userId);
    if (state.step === 'product_condition') {
      state.data.condition = condition;
      state.step = 'product_photos';
      await setState(env, userId, state);
      return sendMessage(chatId,
        `✅ <b>الحالة:</b> ${condition}\n\nالخطوة 2 — أرسل صوراً للمنتج:\n(يمكنك إرسال حتى 5 صور)`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '⏭️ تخطى الصور', callback_data: 'prodskip_photos' }],
              [{ text: '🔙 رجوع', callback_data: 'main_menu' }]
            ]
          }
        }
      );
    }
  }

  if (data === 'prodskip_photos') {
    const state = await getState(env, userId);
    if (state.step === 'product_photos') {
      state.data.photos = [];
      state.step = 'product_name';
      await setState(env, userId, state);
      return sendMessage(chatId, `📝 الخطوة 3 — اكتب <b>اسم المنتج</b>:`);
    }
  }

  // المدن
  if (data.startsWith('city_select_')) {
    const city = data.replace('city_select_', '');
    const state = await getState(env, userId);
    if (state.step === 'product_city') {
      state.data.city = city;
      state.step = 'product_confirm';
      await setState(env, userId, state);
      return showProductConfirm(chatId, state.data, userId, env);
    }
  }
  if (data === 'city_other') {
    const state = await getState(env, userId);
    state.step = 'product_city_other';
    await setState(env, userId, state);
    return sendMessage(chatId, `🏙️ اكتب اسم مدينتك:`);
  }
  if (data === 'product_publish') {
    const state = await getState(env, userId);
    if (state.step === 'product_confirm') {
      return handlePublishProduct(chatId, userId, state.data, env);
    }
  }
  if (data === 'product_cancel_publish') {
    await clearState(env, userId);
    return sendMessage(chatId, '❌ تم إلغاء نشر المنتج.', { reply_markup: { inline_keyboard: backToMainBtn() } });
  }

  // ===== الخدمات =====
  if (data === 'menu_services') return showServicesMenu(chatId, msgId, env);
  if (data.startsWith('service_cat_page_')) {
    const parts = data.replace('service_cat_page_', '').split('|');
    const cat = parts[0];
    const page = parseInt(parts[1]);
    return showServicesByCategory(chatId, msgId, cat, env, page);
  }
  if (data.startsWith('service_add_')) {
    const cat = data.replace('service_add_', '');
    return startAddServiceInCategory(chatId, msgId, userId, cat, env);
  }
  if (data.startsWith('service_cat_')) {
    const cat = data.replace('service_cat_', '');
    return showServicesByCategory(chatId, msgId, cat, env, 0);
  }

  // ===== المطاعم =====
  if (data === 'menu_restaurants') return showRestaurantsMenu(chatId, msgId, env);

  // ===== المميزة ==
  if (data === 'menu_featured') return showFeaturedProducts(chatId, msgId, env);

  // ===== العروض =====
  if (data === 'menu_offers') return showOffers(chatId, msgId, env);

  // ===== إضافة إعلان =====
  if (data === 'menu_addad') return startAddAd(chatId, msgId, userId, env);

  // ===== حسابي =====
  if (data === 'menu_account') return showAccountMenu(chatId, msgId, userId, env);
  if (data === 'account_orders') return showMyOrders(chatId, msgId, userId, env);
  if (data === 'account_ads') return showMyAds(chatId, msgId, userId, env);
  if (data === 'account_saved') return showSavedMenu(chatId, msgId, userId, env);
  if (data === 'account_saved_stores') return showSavedStores(chatId, msgId, userId, env, 0);
  if (data === 'account_saved_products') return showSavedProducts(chatId, msgId, userId, env, 0);
  if (data === 'account_subscription') return showSubscription(chatId, msgId, userId, env);
  if (data === 'account_mystore') return showMyStores(chatId, msgId, userId, env);
  if (data.startsWith('mystore_manage_')) {
    const storeId = data.replace('mystore_manage_', '');
    return showMyStoreManage(chatId, msgId, storeId, userId, env);
  }

  // ===== بحث =====
  if (data === 'menu_search') return startSearch(chatId, msgId, userId, env);

  // ===== الأدمن =====
  if (data === 'admin_panel') return showAdminPanel(chatId, env, msgId);
  if (data === 'admin_reports') return showAdminReports(chatId, msgId, env);
  if (data.startsWith('admin_report_delete_store_')) {
    const storeId = data.replace('admin_report_delete_store_', '');
    await deleteStore(env, storeId);
    return editMessage(chatId, msgId, '✅ تم حذف المتجر المُبلَّغ عنه.', { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'admin_reports' }]] } });
  }
  if (data === 'admin_admins') return showAdminAdmins(chatId, msgId, env);
  if (data === 'admin_add_admin') return startAddAdmin(chatId, msgId, userId, env);
  if (data === 'admin_subscriptions') return showAdminSubscriptions(chatId, msgId, env);
  if (data === 'admin_add_subscriber') return startAddSubscriber(chatId, msgId, userId, env);
  if (data === 'admin_featured') return showAdminFeatured(chatId, msgId, env);
  if (data === 'admin_add_featured') return startAddFeatured(chatId, msgId, userId, env);
  if (data === 'admin_offers_manage') return showAdminOffers(chatId, msgId, env);
  if (data === 'admin_add_offer') return startAddOffer(chatId, msgId, userId, env);
  if (data === 'admin_change_sub_text') return startChangeSubText(chatId, msgId, userId, env);

  // تصنيفات الأدمن
  if (data.startsWith('admin_cat_view_')) {
    const cat = data.replace('admin_cat_view_', '');
    return showAdminCategoryDetail(chatId, msgId, cat, env);
  }
  if (data.startsWith('admin_cat_delete_')) {
    const cat = data.replace('admin_cat_delete_', '');
    return showAdminCatDeleteConfirm(chatId, msgId, cat, env);
  }
  if (data.startsWith('admin_cat_delete_confirm_')) {
    const cat = data.replace('admin_cat_delete_confirm_', '');
    return handleAdminDeleteCategory(chatId, msgId, cat, env);
  }
  if (data.startsWith('admin_cat_move_to_')) {
    const parts = data.replace('admin_cat_move_to_', '').split('|');
    const fromCat = parts[0];
    const toCat = parts[1];
    return handleMoveCategoryProducts(chatId, msgId, fromCat, toCat, env);
  }
  if (data.startsWith('admin_cat_move_select_')) {
    const fromCat = data.replace('admin_cat_move_select_', '');
    return showCatMoveTargets(chatId, msgId, fromCat, env);
  }
}

// ==================== معالج خطوات المحادثة ====================
async function handleConversationStep(msg, state, env) {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const text = msg.text || '';
  const photo = msg.photo;

  switch (state.step) {
    // ===== إنشاء متجر =====
    case 'store_name':
      if (!text || text.length < 2) return sendMessage(chatId, '❌ الاسم قصير جداً، حاول مرة أخرى:');
      state.data.name = text;
      state.data.ownerUsername = msg.from.username ? '@' + msg.from.username : msg.from.first_name;
      state.step = 'store_description';
      await setState(env, userId, state);
      return sendMessage(chatId, `✅ <b>الاسم:</b> ${text}\n\nالآن اكتب <b>وصف المتجر</b>:`);

    case 'store_description':
      if (!text || text.length < 5) return sendMessage(chatId, '❌ الوصف قصير جداً، اكتب وصفاً أوضح:');
      state.data.description = text;
      state.step = 'store_category';
      await setState(env, userId, state);
      return showStoreCategorySelection(chatId, env);

    // ===== إضافة منتج =====
    case 'product_photos':
      if (photo) {
        state.data.photos = state.data.photos || [];
        const fileId = photo[photo.length - 1].file_id;
        state.data.photos.push(fileId);
        if (state.data.photos.length >= 5) {
          state.step = 'product_name';
          await setState(env, userId, state);
          return sendMessage(chatId, `✅ تم حفظ ${state.data.photos.length} صور.\n\nاكتب <b>اسم المنتج</b>:`);
        }
        await setState(env, userId, state);
        return sendMessage(chatId, `📸 تم حفظ الصورة (${state.data.photos.length}/5). أرسل المزيد أو اضغط تخطى.`, {
          reply_markup: { inline_keyboard: [[{ text: '⏭️ تخطى والمتابعة', callback_data: 'prodskip_photos' }]] }
        });
      }
      return sendMessage(chatId, '📸 أرسل صورة أو اضغط تخطى.', {
        reply_markup: { inline_keyboard: [[{ text: '⏭️ تخطى الصور', callback_data: 'prodskip_photos' }]] }
      });

    case 'product_name':
      if (!text || text.length < 2) return sendMessage(chatId, '❌ اكتب اسماً صحيحاً للمنتج:');
      state.data.name = text;
      state.step = 'product_description';
      await setState(env, userId, state);
      return sendMessage(chatId, `✅ <b>الاسم:</b> ${text}\n\naكتب <b>وصف المنتج</b>:`);

    case 'product_description':
      if (!text || text.length < 5) return sendMessage(chatId, '❌ الوصف قصير، أضف تفاصيل أكثر:');
      state.data.description = text;
      state.step = 'product_price';
      await setState(env, userId, state);
      return sendMessage(chatId, `✅ <b>الوصف:</b> ${text}\n\nاكتب <b>السعر بالشيكل (₪)</b>:\n(أرسل رقماً فقط)`);

    case 'product_price':
      const price = parseFloat(text);
      if (isNaN(price) || price < 0) return sendMessage(chatId, '❌ أدخل رقماً صحيحاً للسعر:');
      state.data.price = price;
      state.step = 'product_city';
      await setState(env, userId, state);
      return showCitySelection(chatId);

    case 'product_city_other': {
      const existing = CITIES.find(c => categoriesMatch(c.replace(/^[\p{Emoji}\s]+/u, '').trim(), text));
      if (existing) {
        state.data.city = existing;
        await sendMessage(chatId, `✅ هذه المدينة موجودة بالفعل، تمت إضافتها: ${existing}`);
      } else {
        state.data.city = text;
      }
      state.step = 'product_confirm';
      await setState(env, userId, state);
      return showProductConfirm(chatId, state.data, userId, env);
    }

    // ===== بحث =====
    case 'search_query': {
      await clearState(env, userId);
      return handleSearch(chatId, text, env);
    }

    // ===== إضافة إعلان =====
    case 'add_ad_text': {
      state.data.adText = text;
      state.step = 'add_ad_confirm';
      await setState(env, userId, state);
      return sendMessage(chatId,
        `📢 <b>نص الإعلان:</b>\n${text}\n\nهل تريد نشره؟`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ نشر', callback_data: 'ad_publish_confirm' }, { text: '❌ إلغاء', callback_data: 'main_menu' }]
            ]
          }
        }
      );
    }

    // ===== إضافة مشرف =====
    case 'admin_add_admin_id': {
      const adminId = parseInt(text);
      if (isNaN(adminId)) return sendMessage(chatId, '❌ أدخل ID صحيح (أرقام فقط):');
      const admins = await getAdmins(env);
      if (!admins.includes(adminId)) {
        admins.push(adminId);
        await kvSet(env, 'admins', admins);
      }
      await clearState(env, userId);
      return sendMessage(chatId, `✅ تم إضافة المشرف <code>${adminId}</code> بنجاح!`, { reply_markup: { inline_keyboard: [[{ text: '🔙 لوحة التحكم', callback_data: 'admin_panel' }]] } });
    }

    // ===== إضافة مشترك =====
    case 'admin_add_subscriber_id': {
      const subId = parseInt(text);
      if (isNaN(subId)) return sendMessage(chatId, '❌ أدخل ID صحيح:');
      const user = await getUser(env, subId);
      user.premium = true;
      await saveUser(env, user);
      await clearState(env, userId);
      return sendMessage(chatId, `✅ تم ترقية المستخدم <code>${subId}</code> إلى الخطة المميزة!`, { reply_markup: { inline_keyboard: [[{ text: '🔙 لوحة التحكم', callback_data: 'admin_panel' }]] } });
    }

    // ===== إضافة منتج مميز =====
    case 'admin_add_featured_id': {
      const featured = await kvGet(env, 'featured_products') || [];
      if (!featured.includes(text)) {
        featured.push(text);
        await kvSet(env, 'featured_products', featured);
      }
      await clearState(env, userId);
      return sendMessage(chatId, `⭐ تم إضافة المنتج المميز!`, { reply_markup: { inline_keyboard: [[{ text: '🔙 لوحة التحكم', callback_data: 'admin_panel' }]] } });
    }

    // ===== إضافة عرض =====
    case 'admin_add_offer_text': {
      const offers = await kvGet(env, 'offers') || [];
      offers.push({ text: text, createdAt: Date.now(), id: Date.now().toString() });
      await kvSet(env, 'offers', offers);
      await clearState(env, userId);
      return sendMessage(chatId, `🎁 تم نشر العرض بنجاح!`, { reply_markup: { inline_keyboard: [[{ text: '🔙 لوحة التحكم', callback_data: 'admin_panel' }]] } });
    }

    // ===== تغيير نص الاشتراك =====
    case 'admin_change_sub_text': {
      await kvSetText(env, 'subscription_text', text);
      await clearState(env, userId);
      return sendMessage(chatId, `✅ تم تحديث نص الاشتراك!`, { reply_markup: { inline_keyboard: [[{ text: '🔙 لوحة التحكم', callback_data: 'admin_panel' }]] } });
    }

    // ===== إضافة تصنيف سوق =====
    case 'market_add_category': {
      const existing = await findMatchingCategory(env, 'market', text);
      if (existing) {
        await clearState(env, userId);
        return sendMessage(chatId, `⚠️ هذا التصنيف موجود بالفعل: <b>${existing}</b>\n\nتم إضافة منتجك ضمنه.`, { reply_markup: { inline_keyboard: backToMainBtn() } });
      }
      await addMarketCategory(env, text);
      await clearState(env, userId);
      return sendMessage(chatId, `✅ تمت إضافة التصنيف <b>${text}</b> للسوق!`, { reply_markup: { inline_keyboard: backToMainBtn() } });
    }

    // ===== تعديل اسم المتجر =====
    case 'store_edit_name': {
      const store = await getStore(env, state.data.storeId);
      if (!store || store.ownerId !== userId) {
        await clearState(env, userId);
        return sendMessage(chatId, '❌ لا يمكن تعديل هذا المتجر.');
      }
      store.name = text;
      await saveStore(env, store);
      await clearState(env, userId);
      return sendMessage(chatId, `✅ تم تحديث اسم المتجر إلى: <b>${text}</b>`, { reply_markup: { inline_keyboard: backToMainBtn() } });
    }
    case 'store_edit_desc': {
      const store = await getStore(env, state.data.storeId);
      if (!store || store.ownerId !== userId) {
        await clearState(env, userId);
        return sendMessage(chatId, '❌ لا يمكن تعديل هذا المتجر.');
      }
      store.description = text;
      await saveStore(env, store);
      await clearState(env, userId);
      return sendMessage(chatId, `✅ تم تحديث وصف المتجر!`, { reply_markup: { inline_keyboard: backToMainBtn() } });
    }
  }

  // callback_query في handleCallbackQuery
  if (state.step === 'add_ad_confirm') {
    if (text === 'نشر') {
      const user = await getUser(env, userId);
      user.ads = user.ads || [];
      user.ads.push({ text: state.data.adText, createdAt: Date.now() });
      await saveUser(env, user);
      await clearState(env, userId);
      return sendMessage(chatId, `✅ تم نشر إعلانك!`, { reply_markup: { inline_keyboard: backToMainBtn() } });
    }
  }
}

// ==================== واجهة المتاجر ====================
async function showStoresMenu(chatId, msgId, env) {
  return editMessage(chatId, msgId,
    `🏪 <b>المتاجر</b>\n\nاستعرض المتاجر المتاحة أو أنشئ متجرك الخاص!`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🏬 المتاجر المتاحة', callback_data: 'stores_available' }],
          [{ text: '➕ أنشئ متجرك', callback_data: 'stores_create' }],
          [{ text: '🏠 القائمة الرئيسية', callback_data: 'main_menu' }]
        ]
      }
    }
  );
}

async function showAvailableStores(chatId, msgId, env, page) {
  const allStoreIds = await getAllStores(env);
  const pageSize = 20;
  const start = page * pageSize;
  const pageIds = allStoreIds.slice(start, start + pageSize);

  if (allStoreIds.length === 0) {
    return editMessage(chatId, msgId,
      `🏪 <b>المتاجر المتاحة</b>\n\n😔 لا توجد متاجر بعد. كن أول من يضيف متجره!`,
      { reply_markup: { inline_keyboard: [[{ text: '➕ أنشئ متجرك', callback_data: 'stores_create' }], ...backToMainBtn()] } }
    );
  }

  const buttons = [];
  for (const storeId of pageIds) {
    const store = await getStore(env, storeId);
    if (store) buttons.push([{ text: `🏪 ${store.name} | ${store.category}`, callback_data: `store_view_${store.id}` }]);
  }

  const nav = [];
  if (page > 0) nav.push({ text: '⬅️ السابق', callback_data: `stores_page_${page - 1}` });
  if (start + pageSize < allStoreIds.length) nav.push({ text: 'التالي ➡️', callback_data: `stores_page_${page + 1}` });
  if (nav.length > 0) buttons.push(nav);
  buttons.push([{ text: '🔙 رجوع', callback_data: 'menu_stores' }]);

  return editMessage(chatId, msgId,
    `🏬 <b>المتاجر المتاحة</b> (${allStoreIds.length} متجر)\nالصفحة ${page + 1}:`,
    { reply_markup: { inline_keyboard: buttons } }
  );
}

async function showStoreDetail(chatId, msgId, storeId, userId, env) {
  const store = await getStore(env, storeId);
  if (!store) return editMessage(chatId, msgId, '❌ المتجر غير موجود.');

  store.views = (store.views || 0) + 1;
  await saveStore(env, store);

  const admin = await isAdmin(env, userId);
  const isOwner = store.ownerId === userId;

  const text =
    `🏪 <b>${store.name}</b>\n\n` +
    `📝 ${store.description}\n\n` +
    `🗂️ <b>التصنيف:</b> ${store.category}\n` +
    `👀 <b>المشاهدات:</b> ${store.views}\n` +
    `📅 <b>تاريخ الإنشاء:</b> ${new Date(store.createdAt).toLocaleDateString('ar-PS')}`;

  const buttons = [
    [{ text: '💬 تواصل مع المتجر', url: `tg://user?id=${store.ownerId}` }],
    [{ text: '🛍️ عرض منتجات المتجر', callback_data: `store_products_${storeId}` }],
    [{ text: '🔖 حفظ المتجر', callback_data: `store_save_${storeId}` }],
    [{ text: '🚨 تبليغ', callback_data: `store_report_${storeId}` }]
  ];
  if (admin || isOwner) {
    buttons.push([{ text: '🗑️ حذف المتجر', callback_data: `store_delete_${storeId}` }]);
  }
  buttons.push([{ text: '🔙 رجوع', callback_data: 'stores_available' }]);

  return editMessage(chatId, msgId, text, { reply_markup: { inline_keyboard: buttons } });
}

async function startCreateStore(chatId, msgId, userId, env) {
  const user = await getUser(env, userId);
  const userStores = user.stores || [];
  const maxStores = user.premium ? 999 : 2;
  if (userStores.length >= maxStores) {
    return editMessage(chatId, msgId,
      `⚠️ <b>لقد وصلت للحد الأقصى من المتاجر!</b>\n\nالخطة المجانية تسمح بـ 2 متاجر فقط.\n\nللحصول على مزيد من المتاجر، اشترك في الخطة المميزة ✨`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '⭐ الاشتراك المميز', callback_data: 'account_subscription' }],
            [{ text: '🔙 رجوع', callback_data: 'menu_stores' }]
          ]
        }
      }
    );
  }
  await setState(env, userId, { step: 'store_name', data: {} });
  return editMessage(chatId, msgId,
    `🏪 <b>إنشاء متجر</b>\n\n` +
    `مرحباً! دعنا ننشئ متجرك خطوة بخطوة.\n\n` +
    `<b>الخطوة 1 — اكتب اسم المتجر:</b>`
  );
}

async function showStoreCategorySelection(chatId, env) {
  const cats = await getStoreCategories(env);
  const buttons = cats.map(cat => [{ text: cat, callback_data: `storecat_select_${cat}` }]);
  buttons.push([{ text: '🔤 أخرى (حدد بنفسك)', callback_data: 'storecat_select_🏷️ أخرى' }]);
  return sendMessage(chatId,
    `🗂️ <b>اختر تصنيف المتجر:</b>`,
    { reply_markup: { inline_keyboard: buttons } }
  );
}

async function showStoreProducts(chatId, msgId, storeId, env, page) {
  const store = await getStore(env, storeId);
  if (!store) return editMessage(chatId, msgId, '❌ المتجر غير موجود.');
  const allProducts = await getAllProducts(env);
  const storeProducts = [];
  for (const pId of allProducts) {
    const p = await getProduct(env, pId);
    if (p && p.storeId === storeId) storeProducts.push(p);
  }
  if (storeProducts.length === 0) {
    return editMessage(chatId, msgId, `🛍️ <b>منتجات ${store.name}</b>\n\n😔 لا توجد منتجات في هذا المتجر بعد.`, { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: `store_view_${storeId}` }]] } });
  }
  const pageSize = 20;
  const start = page * pageSize;
  const pageProds = storeProducts.slice(start, start + pageSize);
  const buttons = pageProds.map(p => [{ text: `🛍️ ${p.name} — ${p.price}₪`, callback_data: `product_view_${p.id}` }]);
  const nav = [];
  if (page > 0) nav.push({ text: '⬅️ السابق', callback_data: `store_prods_page_${storeId}_${page - 1}` });
  if (start + pageSize < storeProducts.length) nav.push({ text: 'التالي ➡️', callback_data: `store_prods_page_${storeId}_${page + 1}` });
  if (nav.length > 0) buttons.push(nav);
  buttons.push([{ text: '🔙 رجوع', callback_data: `store_view_${storeId}` }]);
  return editMessage(chatId, msgId, `🛍️ <b>منتجات ${store.name}</b> (${storeProducts.length} منتج):`, { reply_markup: { inline_keyboard: buttons } });
}

async function showReportConfirm(chatId, msgId, itemId, type) {
  const typeText = type === 'store' ? 'المتجر' : 'المنتج';
  return editMessage(chatId, msgId,
    `🚨 <b>هل أنت متأكد من التبليغ عن هذا ${typeText}؟</b>`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ نعم', callback_data: `${type}_report_confirm_${itemId}` },
            { text: '❌ لا', callback_data: type === 'store' ? `store_view_${itemId}` : `product_view_${itemId}` }
          ]
        ]
      }
    }
  );
}

async function handleStoreReport(chatId, msgId, storeId, userId, from, env) {
  const store = await getStore(env, storeId);
  if (!store) return editMessage(chatId, msgId, '❌ المتجر غير موجود.');
  const reports = await kvGet(env, 'reports') || [];
  reports.push({
    type: 'store',
    itemId: storeId,
    storeName: store.name,
    storeInfo: store,
    reporterId: userId,
    reporterUsername: from.username ? '@' + from.username : from.first_name,
    createdAt: Date.now()
  });
  await kvSet(env, 'reports', reports);
  const reportMsg =
    `🚨 <b>بلاغ جديد عن متجر!</b>\n\n` +
    `🏪 <b>المتجر:</b> ${store.name}\n` +
    `🆔 <b>ID المتجر:</b> <code>${storeId}</code>\n` +
    `👤 <b>المُبلِّغ:</b> ${from.username ? '@' + from.username : from.first_name}\n` +
    `🆔 <b>ID المُبلِّغ:</b> <code>${userId}</code>\n` +
    `📅 <b>الوقت:</b> ${new Date().toLocaleString('ar-PS')}`;
  await sendMessage(OWNER_ID, reportMsg, {
    reply_markup: { inline_keyboard: [[{ text: '🗑️ حذف المتجر', callback_data: `store_delete_${storeId}` }]] }
  });
  return editMessage(chatId, msgId, '✅ <b>تم إرسال بلاغك بنجاح!</b>\n\nشكراً على حرصك على جودة المنصة 🙏', { reply_markup: { inline_keyboard: backToMainBtn() } });
}

async function showDeleteStoreConfirm(chatId, msgId, storeId, userId, env) {
  const admin = await isAdmin(env, userId);
  const store = await getStore(env, storeId);
  if (!store) return editMessage(chatId, msgId, '❌ المتجر غير موجود.');
  if (!admin && store.ownerId !== userId) return editMessage(chatId, msgId, '❌ ليس لديك صلاحية لحذف هذا المتجر.');
  return editMessage(chatId, msgId,
    `🗑️ <b>هل أنت متأكد من حذف المتجر "${store.name}"؟</b>\n\n⚠️ سيتم حذف جميع بيانات المتجر نهائياً!`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ نعم، احذف', callback_data: `store_delete_confirm_${storeId}` },
            { text: '❌ لا', callback_data: `store_view_${storeId}` }
          ]
        ]
      }
    }
  );
}

async function handleDeleteStore(chatId, msgId, storeId, userId, env) {
  const admin = await isAdmin(env, userId);
  const store = await getStore(env, storeId);
  if (!store) return editMessage(chatId, msgId, '❌ المتجر غير موجود.');
  if (!admin && store.ownerId !== userId) return editMessage(chatId, msgId, '❌ ليس لديك صلاحية.');
  await deleteStore(env, storeId);
  const owner = await getUser(env, store.ownerId);
  owner.stores = (owner.stores || []).filter(id => id !== storeId);
  await saveUser(env, owner);
  return editMessage(chatId, msgId, `✅ <b>تم حذف المتجر "${store.name}" بنجاح!</b>`, { reply_markup: { inline_keyboard: backToMainBtn() } });
}

async function handleSaveStore(chatId, msgId, storeId, userId, env) {
  const user = await getUser(env, userId);
  user.saved_stores = user.saved_stores || [];
  if (user.saved_stores.includes(storeId)) {
    user.saved_stores = user.saved_stores.filter(id => id !== storeId);
    await saveUser(env, user);
    return editMessage(chatId, msgId, '🔖 تم إزالة المتجر من المحفوظات.', { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: `store_view_${storeId}` }]] } });
  }
  user.saved_stores.push(storeId);
  await saveUser(env, user);
  return editMessage(chatId, msgId, '✅ تم حفظ المتجر في محفوظاتك! 🔖', { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: `store_view_${storeId}` }]] } });
}

async function startEditStore(chatId, msgId, storeId, userId, env) {
  const store = await getStore(env, storeId);
  if (!store || store.ownerId !== userId) return editMessage(chatId, msgId, '❌ ليس لديك صلاحية تعديل هذا المتجر.');
  return editMessage(chatId, msgId,
    `✏️ <b>تعديل المتجر: ${store.name}</b>\n\nماذا تريد تعديله؟`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✏️ تعديل الاسم', callback_data: `store_edit_name_${storeId}` }],
          [{ text: '📝 تعديل الوصف', callback_data: `store_edit_desc_${storeId}` }],
          [{ text: '🔙 رجوع', callback_data: `mystore_manage_${storeId}` }]
        ]
      }
    }
  );
}

async function showStoreStats(chatId, msgId, storeId, userId, env) {
  const store = await getStore(env, storeId);
  if (!store || store.ownerId !== userId) return editMessage(chatId, msgId, '❌ ليس لديك صلاحية.');
  const allProducts = await getAllProducts(env);
  let storeProductCount = 0;
  for (const pId of allProducts) {
    const p = await getProduct(env, pId);
    if (p && p.storeId === storeId) storeProductCount++;
  }
  return editMessage(chatId, msgId,
    `📊 <b>إحصائيات متجرك: ${store.name}</b>\n\n` +
    `👀 <b>إجمالي المشاهدات:</b> ${store.views || 0}\n` +
    `🛍️ <b>عدد المنتجات:</b> ${storeProductCount}\n` +
    `📅 <b>تاريخ الإنشاء:</b> ${new Date(store.createdAt).toLocaleDateString('ar-PS')}`,
    { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: `mystore_manage_${storeId}` }]] } }
  );
}

// ==================== واجهة السوق ====================
async function showMarketMenu(chatId, msgId, env) {
  const cats = await getMarketCategories(env);
  const buttons = cats.map(cat => [{ text: cat, callback_data: `market_cat_${cat}` }]);
  buttons.push([{ text: '🗂️ التصنيفات المتاحة', callback_data: 'menu_all_cats' }]);
  buttons.push([{ text: '➕ إضافة تصنيف', callback_data: 'market_add_cat' }]);
  buttons.push([{ text: '🏠 القائمة الرئيسية', callback_data: 'main_menu' }]);
  return editMessage(chatId, msgId, `🛒 <b>السوق</b>\n\nاختر تصنيفاً:`, { reply_markup: { inline_keyboard: buttons } });
}

async function showProductsByCategory(chatId, msgId, cat, env, page) {
  const allProducts = await getAllProducts(env);
  const catProducts = [];
  for (const pId of allProducts) {
    const p = await getProduct(env, pId);
    if (p && p.category === cat && p.type !== 'service') catProducts.push(p);
  }
  if (catProducts.length === 0) {
    return editMessage(chatId, msgId,
      `${cat}\n\n😔 لا توجد منتجات في هذا التصنيف بعد.\n\nكن أول من يضيف منتجاً! 🎉`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ إضافة منتج', callback_data: `prodcat_select_${cat}` }],
            [{ text: '🔙 رجوع', callback_data: 'menu_market' }]
          ]
        }
      }
    );
  }
  const pageSize = 20;
  const start = page * pageSize;
  const pageProds = catProducts.slice(start, start + pageSize);
  const buttons = [
    [{ text: '➕ إضافة منتج', callback_data: `prodcat_select_${cat}` }],
    ...pageProds.map(p => [{ text: `🛍️ ${p.name} — ${p.price}₪ | ${p.condition}`, callback_data: `product_view_${p.id}` }])
  ];
  const nav = [];
  if (page > 0) nav.push({ text: '⬅️ السابق', callback_data: `market_cat_page_${cat}|${page - 1}` });
  if (start + pageSize < catProducts.length) nav.push({ text: 'التالي ➡️', callback_data: `market_cat_page_${cat}|${page + 1}` });
  if (nav.length > 0) buttons.push(nav);
  buttons.push([{ text: '🔙 رجوع', callback_data: 'menu_market' }]);
  return editMessage(chatId, msgId, `${cat} (${catProducts.length} منتج) — الصفحة ${page + 1}:`, { reply_markup: { inline_keyboard: buttons } });
}

async function startAddMarketCategory(chatId, msgId, userId, env) {
  await setState(env, userId, { step: 'market_add_category', data: {} });
  return editMessage(chatId, msgId,
    `➕ <b>إضافة تصنيف جديد</b>\n\nاكتب اسم التصنيف الجديد:`,
    { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'menu_market' }]] } }
  );
}

async function showAllCategories(chatId, msgId, env) {
  const marketCats = await getMarketCategories(env);
  const storeCats  = await getStoreCategories(env);
  const customServiceCats = await kvGet(env, 'service_categories_custom') || [];
  const allServiceCats = [...SERVICE_CATS_FLAT, ...customServiceCats];

  // بناء نوافذ السوق — صفان متوازيان
  const marketRows = [];
  for (let i = 0; i < marketCats.length; i += 2) {
    const row = marketCats.slice(i, i + 2).map(cat => ({
      text: cat,
      callback_data: `market_cat_${cat}`
    }));
    marketRows.push(row);
  }

  // نوافذ الخدمات — صفان متوازيان
  const serviceRows = SERVICE_CATS.map(pair =>
    pair.map(cat => ({ text: cat, callback_data: `service_cat_${cat}` }))
  );
  for (const cat of customServiceCats) {
    serviceRows.push([{ text: cat, callback_data: `service_cat_${cat}` }]);
  }

  // نوافذ المتاجر — صف واحد لكل تصنيف
  const storeRows = storeCats.map(cat => ([{
    text: cat,
    callback_data: `storecat_select_${cat}`
  }]));

  const buttons = [
    ...marketRows,
    [{ text: '─────── 🏪 تصانيف المتاجر ───────', callback_data: 'noop' }],
    ...storeRows,
    [{ text: '─────── 🔧 تصانيف الخدمات ───────', callback_data: 'noop' }],
    ...serviceRows,
    [{ text: '🏠 القائمة الرئيسية', callback_data: 'main_menu' }]
  ];

  return editMessage(chatId, msgId,
    `🗂️ <b>التصانيف المتاحة</b>\n\n🛒 <b>السوق (${marketCats.length})</b>  •  🏪 <b>المتاجر (${storeCats.length})</b>  •  🔧 <b>الخدمات (${allServiceCats.length})</b>`,
    { reply_markup: { inline_keyboard: buttons } }
  );
}

// ==================== تفاصيل المنتج ====================
async function startAddProduct(chatId, msgId, userId, storeId, type, env) {
  let cats;
  let buttonRows;
  if (type === 'service') {
    const customServiceCats = await kvGet(env, 'service_categories_custom') || [];
    // خدمات: صفان متوازيان كما في نافذة الخدمات
    buttonRows = SERVICE_CATS.map(pair =>
      pair.map(cat => ({ text: cat, callback_data: `prodcat_select_${cat}` }))
    );
    for (const cat of customServiceCats) {
      buttonRows.push([{ text: cat, callback_data: `prodcat_select_${cat}` }]);
    }
  } else {
    cats = await getMarketCategories(env);
    // سوق: صف واحد لكل تصنيف
    buttonRows = cats.map(cat => [{ text: cat, callback_data: `prodcat_select_${cat}` }]);
  }
  buttonRows.push([{ text: '↩️ رجوع', callback_data: 'main_menu' }]);
  await setState(env, userId, { step: 'product_category', data: { storeId, type: type || 'market' } });
  const msg = `🗂️ <b>اختر تصنيف ${type === 'service' ? 'الخدمة' : 'المنتج'}:</b>`;
  if (msgId) return editMessage(chatId, msgId, msg, { reply_markup: { inline_keyboard: buttonRows } });
  return sendMessage(chatId, msg, { reply_markup: { inline_keyboard: buttonRows } });
}

// ==================== إضافة خدمة في تصنيف محدد ====================
async function startAddServiceInCategory(chatId, msgId, userId, cat, env) {
  await setState(env, userId, { step: 'product_condition', data: { category: cat, type: 'service' } });
  return editMessage(chatId, msgId,
    `🗂️ <b>التصنيف:</b> ${cat}\n\nالخطوة 1 — حالة الخدمة:`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✨ جديدة', callback_data: 'prodcond_جديدة' }, { text: '🔄 متاحة', callback_data: 'prodcond_متاحة' }],
          [{ text: '↩️ رجوع', callback_data: 'menu_services' }]
        ]
      }
    }
  );
}

async function showProductDetail(chatId, msgId, productId, userId, env) {
  const product = await getProduct(env, productId);
  if (!product) return editMessage(chatId, msgId, '❌ المنتج غير موجود أو تم حذفه.');
  const admin = await isAdmin(env, userId);
  const isOwner = product.ownerId === userId;

  const text =
    `🛍️ <b>${product.name}</b>\n\n` +
    `📝 ${product.description}\n\n` +
    `💰 <b>السعر:</b> ${product.price}₪\n` +
    `📦 <b>الحالة:</b> ${product.condition}\n` +
    `🏙️ <b>المدينة:</b> ${product.city}\n` +
    `🗂️ <b>التصنيف:</b> ${product.category}\n` +
    `📅 <b>تاريخ النشر:</b> ${new Date(product.createdAt).toLocaleDateString('ar-PS')}`;

  const buttons = [
    [{ text: '💬 تواصل مع البائع', url: `tg://user?id=${product.ownerId}` }],
    [{ text: '🔖 حفظ المنتج', callback_data: `product_save_${productId}` }],
    [{ text: '🚨 تبليغ', callback_data: `product_report_${productId}` }]
  ];
  if (product.storeId) buttons.push([{ text: `🏪 زيارة المتجر`, callback_data: `store_view_${product.storeId}` }]);
  if (admin || isOwner) buttons.push([{ text: '🗑️ حذف المنتج', callback_data: `product_delete_${productId}` }]);
  buttons.push([{ text: '🔙 رجوع', callback_data: 'menu_market' }]);

  if (product.photos && product.photos.length > 0) {
    return callAPI('editMessageMedia', {
      chat_id: chatId, message_id: msgId,
      media: { type: 'photo', media: product.photos[0], caption: text, parse_mode: 'HTML' },
      reply_markup: { inline_keyboard: buttons }
    }).catch(() => editMessage(chatId, msgId, text, { reply_markup: { inline_keyboard: buttons } }));
  }
  return editMessage(chatId, msgId, text, { reply_markup: { inline_keyboard: buttons } });
}

async function handleSaveProduct(chatId, msgId, productId, userId, env) {
  const user = await getUser(env, userId);
  user.saved_products = user.saved_products || [];
  if (user.saved_products.includes(productId)) {
    user.saved_products = user.saved_products.filter(id => id !== productId);
    await saveUser(env, user);
    return editMessage(chatId, msgId, '🔖 تم إزالة المنتج من المحفوظات.', { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: `product_view_${productId}` }]] } });
  }
  user.saved_products.push(productId);
  await saveUser(env, user);
  return editMessage(chatId, msgId, '✅ تم حفظ المنتج في محفوظاتك! 🔖', { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: `product_view_${productId}` }]] } });
}

async function handleProductReport(chatId, msgId, productId, userId, from, env) {
  const product = await getProduct(env, productId);
  if (!product) return editMessage(chatId, msgId, '❌ المنتج غير موجود.');
  const reports = await kvGet(env, 'reports') || [];
  reports.push({ type: 'product', itemId: productId, productName: product.name, reporterId: userId, reporterUsername: from.username ? '@' + from.username : from.first_name, createdAt: Date.now() });
  await kvSet(env, 'reports', reports);
  await sendMessage(OWNER_ID,
    `🚨 <b>بلاغ عن منتج!</b>\n🛍️ <b>المنتج:</b> ${product.name}\n🆔 <code>${productId}</code>\n👤 المُبلِّغ: ${from.username ? '@' + from.username : from.first_name} (<code>${userId}</code>)`,
    { reply_markup: { inline_keyboard: [[{ text: '🗑️ حذف المنتج', callback_data: `product_delete_${productId}` }]] } }
  );
  return editMessage(chatId, msgId, '✅ <b>تم إرسال بلاغك بنجاح!</b> شكراً على حرصك 🙏', { reply_markup: { inline_keyboard: backToMainBtn() } });
}

async function showDeleteProductConfirm(chatId, msgId, productId, userId, env) {
  const admin = await isAdmin(env, userId);
  const product = await getProduct(env, productId);
  if (!product) return editMessage(chatId, msgId, '❌ المنتج غير موجود.');
  if (!admin && product.ownerId !== userId) return editMessage(chatId, msgId, '❌ ليس لديك صلاحية.');
  return editMessage(chatId, msgId,
    `🗑️ <b>هل أنت متأكد من حذف المنتج "${product.name}"؟</b>`,
    { reply_markup: { inline_keyboard: [[{ text: '✅ نعم', callback_data: `product_delete_confirm_${productId}` }, { text: '❌ لا', callback_data: `product_view_${productId}` }]] } }
  );
}

async function handleDeleteProduct(chatId, msgId, productId, userId, env) {
  const admin = await isAdmin(env, userId);
  const product = await getProduct(env, productId);
  if (!product) return editMessage(chatId, msgId, '❌ المنتج غير موجود.');
  if (!admin && product.ownerId !== userId) return editMessage(chatId, msgId, '❌ ليس لديك صلاحية.');
  await deleteProduct(env, productId);
  if (product.storeId) {
    const store = await getStore(env, product.storeId);
    if (store) {
      store.products = (store.products || []).filter(id => id !== productId);
      await saveStore(env, store);
    }
  }
  const owner = await getUser(env, product.ownerId);
  owner.products = (owner.products || []).filter(id => id !== productId);
  await saveUser(env, owner);
  return editMessage(chatId, msgId, `✅ تم حذف المنتج "${product.name}" بنجاح!`, { reply_markup: { inline_keyboard: backToMainBtn() } });
}

// ==================== اختيار المدينة ====================
// المدن بصفوف 3×3 كما في الصورة
async function showCitySelection(chatId) {
  const buttons = [];
  for (let i = 0; i < CITIES.length; i += 3) {
    const row = CITIES.slice(i, i + 3).map(city => ({
      text: city,
      callback_data: `city_select_${city}`
    }));
    buttons.push(row);
  }
  // صف "أخرى" وحده
  buttons.push([{ text: '🔤 أخرى', callback_data: 'city_other' }]);
  // زر إلغاء
  buttons.push([{ text: '❌ إلغاء', callback_data: 'product_cancel_publish' }]);
  return sendMessage(chatId,
    `📍 <b>الخطوة 7/7 — اختر المدينة:</b>`,
    { reply_markup: { inline_keyboard: buttons } }
  );
}

// ==================== تأكيد نشر المنتج ====================
async function showProductConfirm(chatId, data, userId, env) {
  const text =
    `📋 <b>مراجعة المنتج قبل النشر:</b>\n\n` +
    `🛍️ <b>الاسم:</b> ${data.name}\n` +
    `📝 <b>الوصف:</b> ${data.description}\n` +
    `💰 <b>السعر:</b> ${data.price}₪\n` +
    `📦 <b>الحالة:</b> ${data.condition}\n` +
    `🏙️ <b>المدينة:</b> ${data.city}\n` +
    `🗂️ <b>التصنيف:</b> ${data.category}\n` +
    `📸 <b>الصور:</b> ${data.photos && data.photos.length > 0 ? data.photos.length + ' صور' : 'بدون صور'}`;
  return sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚀 نشر المنتج', callback_data: 'product_publish' }, { text: '❌ إلغاء', callback_data: 'product_cancel_publish' }]
      ]
    }
  });
}

async function handlePublishProduct(chatId, userId, data, env) {
  const productId = await genId(env, 'product');
  const product = {
    id: productId,
    ownerId: userId,
    storeId: data.storeId || null,
    name: data.name,
    description: data.description,
    price: data.price,
    condition: data.condition,
    city: data.city,
    category: data.category,
    photos: data.photos || [],
    type: data.type || 'market',
    createdAt: Date.now()
  };
  await saveProduct(env, product);
  const allProducts = await getAllProducts(env);
  allProducts.push(productId);
  await kvSet(env, 'all_products', allProducts);
  const user = await getUser(env, userId);
  user.products = user.products || [];
  user.products.push(productId);
  await saveUser(env, user);
  if (data.storeId) {
    const store = await getStore(env, data.storeId);
    if (store) {
      store.products = store.products || [];
      store.products.push(productId);
      await saveStore(env, store);
    }
  }
  await clearState(env, userId);
  return sendMessage(chatId,
    `🎉 <b>تم نشر منتجك بنجاح!</b>\n\n` +
    `🛍️ <b>${product.name}</b> — ${product.price}₪\n` +
    `🗂️ ${product.category} | 🏙️ ${product.city}\n\n` +
    `يمكنك إدارة منتجاتك من <b>حسابي ← إعلاناتي</b> ✅`,
    { reply_markup: { inline_keyboard: backToMainBtn() } }
  );
}

// ==================== الخدمات ====================
// تصانيف الخدمات كما في الصورة — صفين متوازيين
const SERVICE_CATS = [
  ['🎨 تصميم وإبداع',    '💻 برمجة وتقنية'],
  ['🧹 نظافة ومنزل',     '🔧 صيانة وإصلاح'],
  ['📸 تصوير وفيديو',    '📚 تعليم ودروس'],
  ['🚚 نقل وتوصيل',      '🧵 خياطة وتفصيل']
];
const SERVICE_CATS_FLAT = SERVICE_CATS.flat();

async function showServicesMenu(chatId, msgId, env) {
  const customServiceCats = await kvGet(env, 'service_categories_custom') || [];
  const allServiceCats = [...SERVICE_CATS_FLAT, ...customServiceCats];

  // الثمانية الأساسية صفين متوازيين
  const buttons = SERVICE_CATS.map(pair =>
    pair.map(cat => ({ text: cat, callback_data: `service_cat_${cat}` }))
  );
  // أي تصانيف مخصصة مضافة
  for (const cat of customServiceCats) {
    buttons.push([{ text: cat, callback_data: `service_cat_${cat}` }]);
  }
  buttons.push([{ text: '↩️ رجوع', callback_data: 'main_menu' }]);

  return editMessage(chatId, msgId,
    `🔧 <b>الخدمات</b>\n\nاختر نوع الخدمة:`,
    { reply_markup: { inline_keyboard: buttons } }
  );
}

async function showServicesByCategory(chatId, msgId, cat, env, page) {
  const allProducts = await getAllProducts(env);
  const services = [];
  for (const pId of allProducts) {
    const p = await getProduct(env, pId);
    if (p && p.type === 'service' && p.category === cat) services.push(p);
  }
  if (services.length === 0) {
    return editMessage(chatId, msgId,
      `${cat}\n\n😔 لا توجد خدمات في هذا التصنيف بعد.\n\nكن أول من يضيف خدمته! 🎉`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ أضف خدمتك', callback_data: `service_add_${cat}` }],
            [{ text: '↩️ رجوع', callback_data: 'menu_services' }]
          ]
        }
      }
    );
  }
  const pageSize = 20;
  const start = page * pageSize;
  const pageServices = services.slice(start, start + pageSize);
  const buttons = [
    [{ text: '➕ أضف خدمتك', callback_data: `service_add_${cat}` }],
    ...pageServices.map(s => [{ text: `${s.name} — ${s.price}₪`, callback_data: `product_view_${s.id}` }])
  ];
  const nav = [];
  if (page > 0) nav.push({ text: '⬅️ السابق', callback_data: `service_cat_page_${cat}|${page - 1}` });
  if (start + pageSize < services.length) nav.push({ text: 'التالي ➡️', callback_data: `service_cat_page_${cat}|${page + 1}` });
  if (nav.length > 0) buttons.push(nav);
  buttons.push([{ text: '↩️ رجوع', callback_data: 'menu_services' }]);
  return editMessage(chatId, msgId, `${cat} (${services.length} خدمة) — ص ${page + 1}:`, { reply_markup: { inline_keyboard: buttons } });
}

// ==================== المطاعم ====================
async function showRestaurantsMenu(chatId, msgId, env) {
  const allStoreIds = await getAllStores(env);
  const restaurants = [];
  for (const storeId of allStoreIds) {
    const store = await getStore(env, storeId);
    if (store && store.category && (store.category.includes('مطعم') || store.category.includes('كافيه'))) {
      restaurants.push(store);
    }
  }
  if (restaurants.length === 0) {
    return editMessage(chatId, msgId,
      `🍽️ <b>المطاعم</b>\n\n😔 لا توجد مطاعم مسجلة بعد.`,
      { reply_markup: { inline_keyboard: [[{ text: '➕ أضف مطعمك', callback_data: 'stores_create' }], ...backToMainBtn()] } }
    );
  }
  const buttons = restaurants.map(r => [{ text: `🍽️ ${r.name}`, callback_data: `store_view_${r.id}` }]);
  buttons.push([{ text: '🏠 القائمة الرئيسية', callback_data: 'main_menu' }]);
  return editMessage(chatId, msgId, `🍽️ <b>المطاعم والمقاهي</b> (${restaurants.length}):`, { reply_markup: { inline_keyboard: buttons } });
}

// ==================== المنتجات المميزة ====================
async function showFeaturedProducts(chatId, msgId, env) {
  const featuredIds = await kvGet(env, 'featured_products') || [];
  if (featuredIds.length === 0) {
    return editMessage(chatId, msgId,
      `⭐ <b>المنتجات المميزة</b>\n\n😔 لا توجد منتجات مميزة بعد.`,
      { reply_markup: { inline_keyboard: backToMainBtn() } }
    );
  }
  const buttons = [];
  for (const pId of featuredIds) {
    const p = await getProduct(env, pId);
    if (p) buttons.push([{ text: `⭐ ${p.name} — ${p.price}₪`, callback_data: `product_view_${p.id}` }]);
  }
  buttons.push([{ text: '🏠 القائمة الرئيسية', callback_data: 'main_menu' }]);
  return editMessage(chatId, msgId, `⭐ <b>المنتجات المميزة</b>:`, { reply_markup: { inline_keyboard: buttons } });
}

// ==================== العروض ====================
async function showOffers(chatId, msgId, env) {
  const offers = await kvGet(env, 'offers') || [];
  if (offers.length === 0) {
    return editMessage(chatId, msgId,
      `🎁 <b>العروض</b>\n\n😔 لا توجد عروض متاحة حالياً. ترقبوا! 🔔`,
      { reply_markup: { inline_keyboard: backToMainBtn() } }
    );
  }
  let text = `🎁 <b>العروض الحالية:</b>\n\n`;
  offers.forEach((offer, i) => {
    text += `${i + 1}. ${offer.text}\n\n`;
  });
  return editMessage(chatId, msgId, text, { reply_markup: { inline_keyboard: backToMainBtn() } });
}

// ==================== إضافة إعلان ====================
async function startAddAd(chatId, msgId, userId, env) {
  await setState(env, userId, { step: 'add_ad_text', data: {} });
  return editMessage(chatId, msgId,
    `📢 <b>إضافة إعلان</b>\n\nاكتب نص إعلانك وسيظهر في قسم إعلاناتي:`,
    { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'main_menu' }]] } }
  );
}

// ==================== حسابي ====================
async function showAccountMenu(chatId, msgId, userId, env) {
  const user = await getUser(env, userId);
  return editMessage(chatId, msgId,
    `👤 <b>حسابي</b>\n\n` +
    `🆔 <b>معرفك:</b> <code>${userId}</code>\n` +
    `⭐ <b>الخطة:</b> ${user.premium ? '✨ مميزة' : '🆓 مجانية'}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📦 طلباتي', callback_data: 'account_orders' }],
          [{ text: '📢 إعلاناتي', callback_data: 'account_ads' }],
          [{ text: '🔖 المحفوظات', callback_data: 'account_saved' }],
          [{ text: '⭐ الاشتراك', callback_data: 'account_subscription' }],
          [{ text: '🏪 متجري', callback_data: 'account_mystore' }],
          [{ text: '🏠 القائمة الرئيسية', callback_data: 'main_menu' }]
        ]
      }
    }
  );
}

async function showMyOrders(chatId, msgId, userId, env) {
  return editMessage(chatId, msgId,
    `📦 <b>طلباتي</b>\n\nسيتم تطوير هذه الخاصية قريباً. 🚀`,
    { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'menu_account' }]] } }
  );
}

async function showMyAds(chatId, msgId, userId, env) {
  const user = await getUser(env, userId);
  const userProductIds = user.products || [];
  if (userProductIds.length === 0) {
    return editMessage(chatId, msgId,
      `📢 <b>إعلاناتي</b>\n\n😔 لم تضف أي إعلانات بعد.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ أضف منتجاً', callback_data: 'menu_market' }],
            [{ text: '🔙 رجوع', callback_data: 'menu_account' }]
          ]
        }
      }
    );
  }
  const buttons = [];
  for (const pId of userProductIds) {
    const p = await getProduct(env, pId);
    if (p) buttons.push([{ text: `🛍️ ${p.name} — ${p.price}₪`, callback_data: `product_view_${p.id}` }]);
  }
  buttons.push([{ text: '🔙 رجوع', callback_data: 'menu_account' }]);
  return editMessage(chatId, msgId, `📢 <b>إعلاناتي</b> (${userProductIds.length} إعلان):`, { reply_markup: { inline_keyboard: buttons } });
}

async function showSavedMenu(chatId, msgId, userId, env) {
  return editMessage(chatId, msgId,
    `🔖 <b>المحفوظات</b>\n\nاختر نوع المحفوظات:`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🏪 المتاجر المحفوظة', callback_data: 'account_saved_stores' }],
          [{ text: '🛍️ المنتجات المحفوظة', callback_data: 'account_saved_products' }],
          [{ text: '🔙 رجوع', callback_data: 'menu_account' }]
        ]
      }
    }
  );
}

async function showSavedStores(chatId, msgId, userId, env, page) {
  const user = await getUser(env, userId);
  const savedIds = user.saved_stores || [];
  if (savedIds.length === 0) {
    return editMessage(chatId, msgId, `🏪 <b>المتاجر المحفوظة</b>\n\n😔 لم تحفظ أي متاجر بعد.`, { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'account_saved' }]] } });
  }
  const buttons = [];
  for (const storeId of savedIds) {
    const store = await getStore(env, storeId);
    if (store) buttons.push([{ text: `🏪 ${store.name}`, callback_data: `store_view_${store.id}` }]);
  }
  buttons.push([{ text: '🔙 رجوع', callback_data: 'account_saved' }]);
  return editMessage(chatId, msgId, `🏪 <b>المتاجر المحفوظة</b> (${savedIds.length}):`, { reply_markup: { inline_keyboard: buttons } });
}

async function showSavedProducts(chatId, msgId, userId, env, page) {
  const user = await getUser(env, userId);
  const savedIds = user.saved_products || [];
  if (savedIds.length === 0) {
    return editMessage(chatId, msgId, `🛍️ <b>المنتجات المحفوظة</b>\n\n😔 لم تحفظ أي منتجات بعد.`, { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'account_saved' }]] } });
  }
  const buttons = [];
  for (const pId of savedIds) {
    const p = await getProduct(env, pId);
    if (p) buttons.push([{ text: `🛍️ ${p.name} — ${p.price}₪`, callback_data: `product_view_${p.id}` }]);
  }
  buttons.push([{ text: '🔙 رجوع', callback_data: 'account_saved' }]);
  return editMessage(chatId, msgId, `🛍️ <b>المنتجات المحفوظة</b> (${savedIds.length}):`, { reply_markup: { inline_keyboard: buttons } });
}

async function showSubscription(chatId, msgId, userId, env) {
  const admin = await isAdmin(env, userId);
  const customText = await kvGetText(env, 'subscription_text') ||
    `✨ <b>الاشتراك المميز</b>\n\n🌟 مزايا الخطة المميزة:\n• إضافة أكثر من متجرين\n• منتجات مميزة في الصفحة الرئيسية\n• أولوية في نتائج البحث\n• شارة مميزة على متجرك\n\nللاشتراك والترقية تواصل معنا! 🚀`;

  const buttons = [
    [{ text: '💬 تواصل للترقية', url: 'https://t.me/Anas_Hc' }],
    [{ text: '🔙 رجوع', callback_data: 'menu_account' }]
  ];
  if (admin) buttons.splice(1, 0, [{ text: '✏️ تغيير النص', callback_data: 'admin_change_sub_text' }]);
  return editMessage(chatId, msgId, customText, { reply_markup: { inline_keyboard: buttons } });
}

async function showMyStores(chatId, msgId, userId, env) {
  const user = await getUser(env, userId);
  const storeIds = user.stores || [];
  if (storeIds.length === 0) {
    return editMessage(chatId, msgId,
      `🏪 <b>متجري</b>\n\n😔 لم تنشئ أي متجر بعد.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ أنشئ متجرك الآن', callback_data: 'stores_create' }],
            [{ text: '🔙 رجوع', callback_data: 'menu_account' }]
          ]
        }
      }
    );
  }
  const buttons = [];
  for (const storeId of storeIds) {
    const store = await getStore(env, storeId);
    if (store) buttons.push([{ text: `🏪 ${store.name}`, callback_data: `mystore_manage_${store.id}` }]);
  }
  buttons.push([{ text: '🔙 رجوع', callback_data: 'menu_account' }]);
  return editMessage(chatId, msgId, `🏪 <b>متاجري</b> (${storeIds.length} متجر):`, { reply_markup: { inline_keyboard: buttons } });
}

async function showMyStoreManage(chatId, msgId, storeId, userId, env) {
  const store = await getStore(env, storeId);
  if (!store || store.ownerId !== userId) return editMessage(chatId, msgId, '❌ ليس لديك صلاحية.');
  return editMessage(chatId, msgId,
    `🏪 <b>إدارة المتجر: ${store.name}</b>`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ إضافة منتج', callback_data: `store_addproduct_${storeId}` }],
          [{ text: '🛍️ عرض المنتجات', callback_data: `store_products_${storeId}` }],
          [{ text: '✏️ تعديل المتجر', callback_data: `store_edit_${storeId}` }],
          [{ text: '📊 الإحصائيات', callback_data: `store_stats_${storeId}` }],
          [{ text: '🗑️ حذف المتجر', callback_data: `store_delete_${storeId}` }],
          [{ text: '🔙 رجوع', callback_data: 'account_mystore' }]
        ]
      }
    }
  );
}

// ==================== البحث ====================
async function startSearch(chatId, msgId, userId, env) {
  await setState(env, userId, { step: 'search_query', data: {} });
  return editMessage(chatId, msgId,
    `🔍 <b>البحث</b>\n\nاكتب ما تبحث عنه (اسم منتج، متجر، مدينة...):`,
    { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'main_menu' }]] } }
  );
}

async function handleSearch(chatId, query, env) {
  const q = query.toLowerCase();
  const allStoreIds = await getAllStores(env);
  const allProductIds = await getAllProducts(env);
  const results = [];

  for (const storeId of allStoreIds) {
    const store = await getStore(env, storeId);
    if (store && (store.name.toLowerCase().includes(q) || store.description.toLowerCase().includes(q) || store.category.toLowerCase().includes(q))) {
      results.push({ type: 'store', item: store });
    }
  }
  for (const pId of allProductIds) {
    const p = await getProduct(env, pId);
    if (p && (p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.city.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))) {
      results.push({ type: 'product', item: p });
    }
  }

  if (results.length === 0) {
    return sendMessage(chatId,
      `🔍 <b>نتائج البحث عن: "${query}"</b>\n\n😔 لا توجد نتائج مطابقة. جرب كلمات أخرى.`,
      { reply_markup: { inline_keyboard: backToMainBtn() } }
    );
  }

  const buttons = results.slice(0, 20).map(r => {
    if (r.type === 'store') return [{ text: `🏪 ${r.item.name} (متجر)`, callback_data: `store_view_${r.item.id}` }];
    return [{ text: `🛍️ ${r.item.name} — ${r.item.price}₪`, callback_data: `product_view_${r.item.id}` }];
  });
  buttons.push([{ text: '🏠 القائمة الرئيسية', callback_data: 'main_menu' }]);
  return sendMessage(chatId,
    `🔍 <b>نتائج البحث عن: "${query}"</b>\n(${results.length} نتيجة):`,
    { reply_markup: { inline_keyboard: buttons } }
  );
}

// ==================== لوحة الأدمن ====================
async function showAdminPanel(chatId, env, msgId = null) {
  const text = `🛡️ <b>لوحة التحكم — سوق فلسطين</b>\n\nمرحباً بك أيها المالك! 👑`;
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚨 البلاغات', callback_data: 'admin_reports' }],
        [{ text: '👮 إدارة المشرفين', callback_data: 'admin_admins' }],
        [{ text: '⭐ الاشتراكات', callback_data: 'admin_subscriptions' }],
        [{ text: '✨ المنتجات المميزة', callback_data: 'admin_featured' }],
        [{ text: '🎁 إدارة العروض', callback_data: 'admin_offers_manage' }],
        [{ text: '🏠 القائمة الرئيسية', callback_data: 'main_menu' }]
      ]
    }
  };
  if (msgId) return editMessage(chatId, msgId, text, keyboard);
  return sendMessage(chatId, text, keyboard);
}

async function showAdminReports(chatId, msgId, env) {
  const reports = await kvGet(env, 'reports') || [];
  if (reports.length === 0) {
    return editMessage(chatId, msgId, `🚨 <b>البلاغات</b>\n\n✅ لا توجد بلاغات حالياً.`, { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'admin_panel' }]] } });
  }
  let text = `🚨 <b>البلاغات الواردة (${reports.length}):</b>\n\n`;
  const buttons = [];
  for (const r of reports.slice(-10)) {
    text += `• ${r.type === 'store' ? '🏪 متجر' : '🛍️ منتج'}: <b>${r.storeName || r.productName || r.itemId}</b>\n  👤 المُبلِّغ: ${r.reporterUsername}\n\n`;
    if (r.type === 'store') {
      buttons.push([{ text: `🗑️ حذف متجر: ${r.storeName || r.itemId}`, callback_data: `admin_report_delete_store_${r.itemId}` }]);
    }
  }
  buttons.push([{ text: '🔙 رجوع', callback_data: 'admin_panel' }]);
  return editMessage(chatId, msgId, text, { reply_markup: { inline_keyboard: buttons } });
}

async function showAdminAdmins(chatId, msgId, env) {
  const admins = await getAdmins(env);
  const text = `👮 <b>إدارة المشرفين</b>\n\n` +
    (admins.length > 0 ? `المشرفون الحاليون:\n${admins.map(id => `• <code>${id}</code>`).join('\n')}` : 'لا يوجد مشرفون مضافون بعد.');
  return editMessage(chatId, msgId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '➕ إضافة مشرف', callback_data: 'admin_add_admin' }],
        [{ text: '🔙 رجوع', callback_data: 'admin_panel' }]
      ]
    }
  });
}

async function startAddAdmin(chatId, msgId, userId, env) {
  await setState(env, userId, { step: 'admin_add_admin_id', data: {} });
  return editMessage(chatId, msgId,
    `👮 <b>إضافة مشرف جديد</b>\n\nأرسل الـ ID الخاص بالمشرف (أرقام فقط):`,
    { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'admin_panel' }]] } }
  );
}

async function showAdminSubscriptions(chatId, msgId, env) {
  return editMessage(chatId, msgId,
    `⭐ <b>إدارة الاشتراكات</b>\n\nأضف مشتركاً جديداً بإدخال ID المستخدم:`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ إضافة مشترك', callback_data: 'admin_add_subscriber' }],
          [{ text: '✏️ تغيير نص الاشتراك', callback_data: 'admin_change_sub_text' }],
          [{ text: '🔙 رجوع', callback_data: 'admin_panel' }]
        ]
      }
    }
  );
}

async function startAddSubscriber(chatId, msgId, userId, env) {
  await setState(env, userId, { step: 'admin_add_subscriber_id', data: {} });
  return editMessage(chatId, msgId,
    `⭐ <b>إضافة مشترك مميز</b>\n\nأرسل ID المستخدم:`,
    { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'admin_panel' }]] } }
  );
}

async function showAdminFeatured(chatId, msgId, env) {
  const featuredIds = await kvGet(env, 'featured_products') || [];
  return editMessage(chatId, msgId,
    `⭐ <b>المنتجات المميزة</b>\n\nعدد المنتجات المميزة: ${featuredIds.length}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ إضافة منتج مميز', callback_data: 'admin_add_featured' }],
          [{ text: '🔙 رجوع', callback_data: 'admin_panel' }]
        ]
      }
    }
  );
}

async function startAddFeatured(chatId, msgId, userId, env) {
  await setState(env, userId, { step: 'admin_add_featured_id', data: {} });
  return editMessage(chatId, msgId,
    `⭐ <b>إضافة منتج مميز</b>\n\nأرسل ID المنتج:`,
    { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'admin_panel' }]] } }
  );
}

async function showAdminOffers(chatId, msgId, env) {
  const offers = await kvGet(env, 'offers') || [];
  return editMessage(chatId, msgId,
    `🎁 <b>إدارة العروض</b>\n\nعدد العروض الحالية: ${offers.length}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ إضافة عرض', callback_data: 'admin_add_offer' }],
          [{ text: '🔙 رجوع', callback_data: 'admin_panel' }]
        ]
      }
    }
  );
}

async function startAddOffer(chatId, msgId, userId, env) {
  await setState(env, userId, { step: 'admin_add_offer_text', data: {} });
  return editMessage(chatId, msgId,
    `🎁 <b>إضافة عرض جديد</b>\n\naكتب نص العرض:`,
    { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'admin_panel' }]] } }
  );
}

async function startChangeSubText(chatId, msgId, userId, env) {
  await setState(env, userId, { step: 'admin_change_sub_text', data: {} });
  return editMessage(chatId, msgId,
    `✏️ <b>تغيير نص صفحة الاشتراك</b>\n\nاكتب النص الجديد (يدعم HTML):`,
    { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'admin_panel' }]] } }
  );
}

async function showAdminCategoryDetail(chatId, msgId, cat, env) {
  const admin = await isAdmin(env, OWNER_ID);
  const allProducts = await getAllProducts(env);
  const catProds = [];
  for (const pId of allProducts) {
    const p = await getProduct(env, pId);
    if (p && p.category === cat) catProds.push(p);
  }
  const buttons = catProds.slice(0, 20).map(p => [{ text: `🛍️ ${p.name}`, callback_data: `product_view_${p.id}` }]);
  buttons.push([{ text: '🗑️ حذف هذا التصنيف', callback_data: `admin_cat_delete_${cat}` }]);
  buttons.push([{ text: '🔙 رجوع', callback_data: 'menu_all_cats' }]);
  return editMessage(chatId, msgId,
    `🗂️ <b>التصنيف: ${cat}</b>\n\nعدد المنتجات: ${catProds.length}`,
    { reply_markup: { inline_keyboard: buttons } }
  );
}

async function showAdminCatDeleteConfirm(chatId, msgId, cat, env) {
  return editMessage(chatId, msgId,
    `⚠️ <b>حذف التصنيف: ${cat}</b>\n\nهل تريد نقل المنتجات إلى تصنيف آخر أم حذفها؟`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 نقل إلى تصنيف آخر', callback_data: `admin_cat_move_select_${cat}` }],
          [{ text: '❌ لا', callback_data: `admin_cat_view_${cat}` }]
        ]
      }
    }
  );
}

async function showCatMoveTargets(chatId, msgId, fromCat, env) {
  const cats = await getMarketCategories(env);
  const buttons = cats.filter(c => c !== fromCat).map(cat => [{
    text: cat,
    callback_data: `admin_cat_move_to_${fromCat}|${cat}`
  }]);
  buttons.push([{ text: '🔙 رجوع', callback_data: `admin_cat_view_${fromCat}` }]);
  return editMessage(chatId, msgId, `🔄 اختر التصنيف الهدف:`, { reply_markup: { inline_keyboard: buttons } });
}

async function handleMoveCategoryProducts(chatId, msgId, fromCat, toCat, env) {
  const allProducts = await getAllProducts(env);
  let moved = 0;
  for (const pId of allProducts) {
    const p = await getProduct(env, pId);
    if (p && p.category === fromCat) {
      p.category = toCat;
      await saveProduct(env, p);
      moved++;
    }
  }
  await removeMarketCategory(env, fromCat);
  return editMessage(chatId, msgId,
    `✅ <b>تم نقل ${moved} منتج من "${fromCat}" إلى "${toCat}" وحذف التصنيف القديم.</b>`,
    { reply_markup: { inline_keyboard: [[{ text: '🔙 لوحة التحكم', callback_data: 'admin_panel' }]] } }
  );
}

async function handleAdminDeleteCategory(chatId, msgId, cat, env) {
  await removeMarketCategory(env, cat);
  return editMessage(chatId, msgId,
    `✅ تم حذف التصنيف "${cat}".`,
    { reply_markup: { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'admin_panel' }]] } }
  );
}
