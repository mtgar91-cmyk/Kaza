// ═══════════════════════════════════════════════════════
//   سوقنا — "Shopify غزة داخل Telegram"
//   @Soqna_bot | Cloudflare Worker
//   النسخة 2.0 — نظام تجارة إلكترونية متكامل
// ═══════════════════════════════════════════════════════

// ── الملاك ──────────────────────────────────────────────
const OWNER_IDS = [7993787672, 8417636756];

// ── التصنيفات ────────────────────────────────────────────
const CATEGORIES = [
  { id: 'electronics', name: '📱 إلكترونيات' },
  { id: 'clothes',     name: '👕 ملابس' },
  { id: 'home',        name: '🏠 المنزل والأثاث' },
  { id: 'food',        name: '🍱 أغذية ومؤن' },
  { id: 'beauty',      name: '💄 تجميل وعناية' },
  { id: 'kids',        name: '👶 أطفال وألعاب' },
  { id: 'sports',      name: '⚽ رياضة' },
  { id: 'books',       name: '📚 كتب وقرطاسية' },
  { id: 'tools',       name: '🔧 أدوات ومعدات' },
  { id: 'other',       name: '📦 أخرى' },
];

const SERVICE_TYPES = [
  { id: 'programming',  name: '💻 برمجة وتقنية' },
  { id: 'design',       name: '🎨 تصميم وإبداع' },
  { id: 'maintenance',  name: '🔧 صيانة وإصلاح' },
  { id: 'cleaning',     name: '🧹 نظافة ومنزل' },
  { id: 'education',    name: '📚 تعليم ودروس' },
  { id: 'photography',  name: '📷 تصوير وفيديو' },
  { id: 'transport',    name: '🚚 نقل وتوصيل' },
  { id: 'sewing',       name: '🧵 خياطة وتفصيل' },
];

const STORE_CATEGORIES = [
  { id: 'retail',      name: '🛍️ بيع بالتجزئة' },
  { id: 'restaurant',  name: '🍔 مطعم وكافيه' },
  { id: 'wholesale',   name: '📦 بيع بالجملة' },
  { id: 'pharmacy',    name: '💊 صيدلية' },
  { id: 'bakery',      name: '🍞 مخبز وحلويات' },
  { id: 'supermarket', name: '🏪 سوبرماركت' },
  { id: 'workshop',    name: '🔧 ورشة وصيانة' },
  { id: 'other',       name: '📋 أخرى' },
];

// ── مدن فلسطين (غزة أولاً) ───────────────────────────────
const CITIES = [
  // غزة
  'غزة', 'خانيونس', 'رفح', 'جباليا', 'دير البلح',
  'النصيرات', 'بيت حانون', 'بيت لاهيا', 'المغازي', 'البريج',
  // الضفة الغربية
  'رام الله', 'نابلس', 'الخليل', 'بيت لحم', 'جنين',
  'طولكرم', 'أريحا', 'القدس', 'قلقيلية', 'سلفيت',
  // داخل الخط الأخضر
  'يافا', 'حيفا', 'الناصرة', 'أخرى',
];

// ── خطط الاشتراك ──────────────────────────────────────────
const PLANS = {
  free:     { name: '🟢 مجاني',  badge: '',   products: 5,   price: 0,   label: 'مجاناً' },
  pro:      { name: '🔵 برو',    badge: '⭐', products: 30,  price: 4,   label: '4$/شهر' },
  business: { name: '🟣 أعمال', badge: '✅', products: 999, price: 10,  label: '10$/شهر' },
};

// ── حالات الطلب ───────────────────────────────────────────
const ORDER_STATUS = {
  pending:   { name: '⏳ قيد الانتظار', next: ['accepted', 'rejected'] },
  accepted:  { name: '✅ مقبول',        next: ['completed'] },
  completed: { name: '🎉 مكتمل',        next: [] },
  rejected:  { name: '❌ مرفوض',        next: [] },
  cancelled: { name: '🚫 ملغي',         next: [] },
};

// ── الأدوار الإدارية ──────────────────────────────────────
const ADMIN_ROLES = { owner: 4, admin: 3, moderator: 2 };

// ═══════════════════════════════════════════════════════
// Telegram API
// ═══════════════════════════════════════════════════════

async function tg(token, method, body) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return r.json();
  } catch { return { ok: false }; }
}

const send   = (T, cid, txt, ex={}) => tg(T,'sendMessage',{chat_id:cid,text:txt,parse_mode:'HTML',...ex});
const edit   = (T, cid, mid, txt, ex={}) => tg(T,'editMessageText',{chat_id:cid,message_id:mid,text:txt,parse_mode:'HTML',...ex});
const answer = (T, id, txt='', al=false) => tg(T,'answerCallbackQuery',{callback_query_id:id,text:txt,show_alert:al});
const photo  = (T, cid, p, cap, ex={}) => tg(T,'sendPhoto',{chat_id:cid,photo:p,caption:cap,parse_mode:'HTML',...ex});
const notify = (T, uid, txt) => send(T, uid, txt);

// ═══════════════════════════════════════════════════════
// Keyboard Helpers
// ═══════════════════════════════════════════════════════

const ik   = rows => ({ inline_keyboard: rows });
const b    = (t,d) => ({ text:t, callback_data: String(d).slice(0,64) });
const burl = (t,u) => ({ text:t, url:u });
const back = (to='main') => b('🔙 رجوع',to);

// ═══════════════════════════════════════════════════════
// KV Helpers
// ═══════════════════════════════════════════════════════

const kget  = (kv,k)    => kv.get(k,'json');
const kset  = (kv,k,v)  => kv.put(k,JSON.stringify(v));
const kdel  = (kv,k)    => kv.delete(k);
const genId = ()         => Date.now().toString(36)+Math.random().toString(36).slice(2,5);

async function getUser(kv, uid) {
  return await kget(kv,`u:${uid}`) || {
    id:uid, role:'customer', adminRole:null,
    subscription:'free', favorites:[], history:[],
    createdAt:Date.now(),
  };
}
const saveUser = (kv,uid,d) => kset(kv,`u:${uid}`,d);

async function getState(kv,uid)    { return await kget(kv,`st:${uid}`) || {}; }
const setState  = (kv,uid,s) => kset(kv,`st:${uid}`,s);
const clearState= (kv,uid)   => kdel(kv,`st:${uid}`);

const getProd   = (kv,id) => kget(kv,`p:${id}`);
const saveProd  = (kv,id,d) => kset(kv,`p:${id}`,d);
const getStore  = (kv,id) => kget(kv,`s:${id}`);
const saveStore = (kv,id,d) => kset(kv,`s:${id}`,d);
const getOrder  = (kv,id) => kget(kv,`o:${id}`);
const saveOrder = (kv,id,d) => kset(kv,`o:${id}`,d);

async function listAdd(kv,key,id,max=300) {
  const l = await kget(kv,key) || [];
  if (!l.includes(id)) { l.unshift(id); await kset(kv,key,l.slice(0,max)); }
}
async function listRm(kv,key,id) {
  const l = await kget(kv,key) || [];
  await kset(kv,key,l.filter(x=>x!==id));
}
const getList = (kv,key) => kget(kv,key).then(v=>v||[]);

// ── صلاحيات الإدارة ──────────────────────────────────────
function getAdminLevel(user) {
  if (OWNER_IDS.includes(user.id)) return 4;
  return ADMIN_ROLES[user.adminRole] || 0;
}
const isAdmin = (u) => getAdminLevel(u) >= 2;
const isMod   = (u) => getAdminLevel(u) >= 2;
const isOwner = (u) => getAdminLevel(u) >= 4;

// ═══════════════════════════════════════════════════════
// Text Builders
// ═══════════════════════════════════════════════════════

function catLabel(id)  { return CATEGORIES.find(c=>c.id===id)?.name  || id; }
function svcLabel(id)  { return SERVICE_TYPES.find(s=>s.id===id)?.name || id; }
function cityIcon(c)   { return ['غزة','خانيونس','رفح','جباليا','دير البلح'].includes(c) ? '🇵🇸' : '📍'; }

function mainText(u) {
  const plan = PLANS[u.subscription||'free'];
  return `🏠 <b>سوقنا</b> — Shopify فلسطين في تيليجرام 🇵🇸\n\n` +
    `اشتراكك: ${plan.name} ${plan.badge}\n` +
    `──────────────────────`;
}

function productCard(p, storeName='') {
  const cond = {new:'✨ جديد', used:'♻️ مستعمل', damaged:'⚠️ معيب'}[p.condition] || p.condition;
  const stars = p.rating ? '⭐'.repeat(Math.round(p.rating)) + ` ${p.rating.toFixed(1)}` : '';
  return `📦 <b>${p.name}</b>\n\n` +
    `💰 <b>${p.price} ₪</b>${p.originalPrice && p.originalPrice > p.price ? `  <s>${p.originalPrice} ₪</s>` : ''}\n` +
    `${storeName ? `🏪 ${storeName}\n` : ''}` +
    `${cityIcon(p.city)} ${p.city}\n` +
    `${cond}${stars ? '  ' + stars : ''}\n` +
    `👁️ ${p.views||0} مشاهدة\n\n` +
    `📝 ${p.description?.slice(0,120)}${p.description?.length>120?'...':''}`;
}

function storeCard(s) {
  const plan = PLANS[s.subscription||'free'];
  const badge = plan.badge ? plan.badge + ' ' : '';
  const rating = s.rating ? `⭐ ${s.rating.toFixed(1)}` : '';
  return `🏪 <b>${badge}${s.name}</b>\n\n` +
    `📋 ${STORE_CATEGORIES.find(c=>c.id===s.category)?.name||''}\n` +
    `${cityIcon(s.city)} ${s.city}\n` +
    `${rating}\n` +
    `📝 ${s.description?.slice(0,100)||'—'}`;
}

// ═══════════════════════════════════════════════════════
// الصفحة الرئيسية
// ═══════════════════════════════════════════════════════

function mainKb(u) {
  const rows = [
    [b('🛍️ السوق','market'),      b('🏪 المتاجر','stores')],
    [b('🍔 المطاعم','restaurants'), b('🛠️ الخدمات','services')],
    [b('🔥 العروض','offers'),      b('⭐ المميزة','featured')],
    [b('👤 حسابي','account'),      b('➕ أضف إعلان','add')],
    [b('🔍 بحث','search')],
  ];
  if (isAdmin(u)) rows.push([b('⚙️ لوحة الإدارة','admin')]);
  return ik(rows);
}

async function showMain(T,cid,mid,u,kv) {
  const txt = mainText(u);
  const kb  = mainKb(u);
  return mid ? edit(T,cid,mid,txt,{reply_markup:kb}) : send(T,cid,txt,{reply_markup:kb});
}

// ═══════════════════════════════════════════════════════
// السوق
// ═══════════════════════════════════════════════════════

function marketKb() {
  const rows = [];
  for (let i=0;i<CATEGORIES.length;i+=2) {
    const r = [b(CATEGORIES[i].name,`cat:${CATEGORIES[i].id}`)];
    if (CATEGORIES[i+1]) r.push(b(CATEGORIES[i+1].name,`cat:${CATEGORIES[i+1].id}`));
    rows.push(r);
  }
  rows.push([b('🔍 بحث في السوق','search'), back()]);
  return ik(rows);
}

async function showMarket(T,cid,mid) {
  const txt = `🛍️ <b>السوق</b>\n\nاختر التصنيف:`;
  return mid ? edit(T,cid,mid,txt,{reply_markup:marketKb()}) : send(T,cid,txt,{reply_markup:marketKb()});
}

async function showCategory(T,cid,mid,kv,catId,page=0) {
  const PAGE=6;
  const allIds = await getList(kv,`cat:${catId}`);
  const ids    = allIds.slice(page*PAGE,(page+1)*PAGE);

  if (!allIds.length) {
    const kb = ik([[b('➕ أضف منتجاً','add')],[back('market')]]);
    const txt = `${catLabel(catId)}\n\nلا توجد منتجات بعد. كن أول من يضيف! 🚀`;
    return mid ? edit(T,cid,mid,txt,{reply_markup:kb}) : send(T,cid,txt,{reply_markup:kb});
  }

  const prods = (await Promise.all(ids.map(id=>getProd(kv,id)))).filter(Boolean);
  let txt = `${catLabel(catId)} — ${allIds.length} منتج\n\n`;
  const rows = prods.map(p => {
    const disc = p.originalPrice>p.price?` 🔥`:'';
    return [b(`${p.name.slice(0,26)}${disc} | ${p.price}₪`,`prod:${p.id}`)];
  });

  // Pagination
  const nav=[];
  if(page>0) nav.push(b('◀️',`cat:${catId}:${page-1}`));
  nav.push(b(`${page+1}/${Math.ceil(allIds.length/PAGE)}`,'noop'));
  if((page+1)*PAGE<allIds.length) nav.push(b('▶️',`cat:${catId}:${page+1}`));
  rows.push(nav);
  rows.push([b('⚙️ فلتر',`filter:${catId}`), back('market')]);

  return mid ? edit(T,cid,mid,txt,{reply_markup:ik(rows)}) : send(T,cid,txt,{reply_markup:ik(rows)});
}

async function showProduct(T,cid,kv,prodId,uid,cbId) {
  const p = await getProd(kv,prodId);
  if(!p) { if(cbId) await answer(T,cbId,'⚠️ المنتج غير موجود',true); return; }

  // Views++
  p.views=(p.views||0)+1;
  await saveProd(kv,prodId,p);

  // History
  const u=await getUser(kv,uid);
  u.history=[prodId,...(u.history||[]).filter(x=>x!==prodId)].slice(0,20);
  await saveUser(kv,uid,u);

  // Store name
  const store = p.storeId ? await getStore(kv,p.storeId) : null;

  const txt = productCard(p, store?.name||'');
  const isFav = (u.favorites||[]).includes(prodId);
  const isOwner_ = p.sellerId===uid;

  const rows=[];
  if(p.sellerUsername) {
    rows.push([burl('💬 تواصل مع البائع',`https://t.me/${p.sellerUsername}`)]);
  }
  rows.push([
    b(isFav?'💔 إزالة من المحفوظات':`❤️ حفظ`,isFav?`unfav:${prodId}`:`fav:${prodId}`),
    b('🔗 مشاركة',`share:${prodId}`),
  ]);
  if(p.storeId) rows.push([b('🏪 عرض المتجر',`store:${p.storeId}`)]);

  // Order button for customers
  if(!isOwner_&&p.status==='approved') {
    rows.push([b('🛒 طلب المنتج',`order:${prodId}`)]);
  }
  if(isOwner_) {
    rows.push([b('✏️ تعديل',`editprod:${prodId}`), b('🗑️ حذف',`delprod_c:${prodId}`)]);
  }
  rows.push([b('🚩 تبليغ',`report:prod:${prodId}`), back(`cat:${p.category}`)]);

  // Show with photo if available
  if(p.photos?.length) {
    try { return await photo(T,cid,p.photos[0],txt,{reply_markup:ik(rows)}); } catch {}
  }
  return send(T,cid,txt,{reply_markup:ik(rows)});
}

// فلتر
async function showFilter(T,cid,mid,kv,catId) {
  const txt = `⚙️ <b>فلتر</b> — ${catLabel(catId)}\n\nاختر ترتيب العرض:`;
  const rows = [
    [b('🆕 الأحدث',`filt:${catId}:newest`), b('💰 الأرخص',`filt:${catId}:cheapest`)],
    [b('💎 الأغلى',`filt:${catId}:expensive`), b('✨ جديد فقط',`filt:${catId}:new`)],
    [b('♻️ مستعمل',`filt:${catId}:used`)],
    [back(`cat:${catId}`)],
  ];
  return mid ? edit(T,cid,mid,txt,{reply_markup:ik(rows)}) : send(T,cid,txt,{reply_markup:ik(rows)});
}

async function showFiltered(T,cid,mid,kv,catId,filtType) {
  const ids=await getList(kv,`cat:${catId}`);
  let prods=(await Promise.all(ids.slice(0,120).map(id=>getProd(kv,id)))).filter(p=>p&&p.status==='approved');
  if(filtType==='cheapest')  prods.sort((a,b)=>a.price-b.price);
  else if(filtType==='expensive') prods.sort((a,b)=>b.price-a.price);
  else if(filtType==='new')  prods=prods.filter(p=>p.condition==='new');
  else if(filtType==='used') prods=prods.filter(p=>p.condition==='used');
  prods=prods.slice(0,8);

  if(!prods.length) {
    const txt='لا توجد نتائج.';
    return mid?edit(T,cid,mid,txt,{reply_markup:ik([[back(`cat:${catId}`)]])}):send(T,cid,txt,{reply_markup:ik([[back(`cat:${catId}`)]])});
  }
  let txt=`${catLabel(catId)} — فلتر\n\n`;
  const rows=prods.map(p=>{
    txt+=`• ${p.name} — ${p.price}₪\n`;
    return [b(`${p.name.slice(0,28)} | ${p.price}₪`,`prod:${p.id}`)];
  });
  rows.push([back(`cat:${catId}`)]);
  return mid?edit(T,cid,mid,txt,{reply_markup:ik(rows)}):send(T,cid,txt,{reply_markup:ik(rows)});
}

// ═══════════════════════════════════════════════════════
// المتاجر
// ═══════════════════════════════════════════════════════

async function showStores(T,cid,mid,kv,page=0) {
  const PAGE=8;
  const ids=await getList(kv,'stores:all');
  const sIds=ids.slice(page*PAGE,(page+1)*PAGE);

  if(!ids.length) {
    const txt=`🏪 <b>المتاجر</b>\n\nلا توجد متاجر بعد.`;
    const kb=ik([[b('🏪 أنشئ متجرك','create_store')],[back()]]);
    return mid?edit(T,cid,mid,txt,{reply_markup:kb}):send(T,cid,txt,{reply_markup:kb});
  }

  const stores=(await Promise.all(sIds.map(id=>getStore(kv,id)))).filter(Boolean);
  let txt=`🏪 <b>المتاجر</b> — ${ids.length} متجر\n\n`;
  const rows=stores.map(s=>{
    const plan=PLANS[s.subscription||'free'];
    return [b(`${plan.badge?plan.badge+' ':''}${s.name.slice(0,28)} | ${s.city}`,`store:${s.id}`)];
  });
  const nav=[];
  if(page>0) nav.push(b('◀️',`stores:${page-1}`));
  if((page+1)*PAGE<ids.length) nav.push(b('▶️',`stores:${page+1}`));
  if(nav.length) rows.push(nav);
  rows.push([b('🏪 أنشئ متجرك','create_store'), back()]);
  return mid?edit(T,cid,mid,txt,{reply_markup:ik(rows)}):send(T,cid,txt,{reply_markup:ik(rows)});
}

async function showStore(T,cid,kv,storeId,uid,cbId) {
  const s=await getStore(kv,storeId);
  if(!s){if(cbId)await answer(T,cbId,'⚠️ المتجر غير موجود',true);return;}

  const prods=(await Promise.all((s.products||[]).slice(0,5).map(id=>getProd(kv,id)))).filter(p=>p&&p.status==='approved');
  const plan=PLANS[s.subscription||'free'];

  let txt=`🏪 <b>${plan.badge?plan.badge+' ':''}${s.name}</b>\n\n` +
    `${STORE_CATEGORIES.find(c=>c.id===s.category)?.name||''}\n` +
    `${cityIcon(s.city)} ${s.city}\n` +
    `🕐 ${s.hours||'—'}\n` +
    `${s.rating?`⭐ ${s.rating.toFixed(1)}\n`:''}\n` +
    `📝 ${s.description||'—'}\n\n`;

  if(prods.length) {
    txt+=`<b>المنتجات:</b>\n`;
    prods.forEach(p=>{txt+=`• ${p.name} — ${p.price}₪\n`;});
  }

  const rows=[];
  if(s.username) rows.push([burl('💬 تواصل مع المتجر',`https://t.me/${s.username}`)]);
  if(prods.length) prods.forEach(p=>rows.push([b(`📦 ${p.name.slice(0,30)}`,`prod:${p.id}`)]));
  rows.push([b('📊 كل منتجات المتجر',`store_prods:${storeId}:0`)]);
  rows.push([b('🚩 تبليغ',`report:store:${storeId}`), back('stores')]);

  if(s.cover) { try{return await photo(T,cid,s.cover,txt,{reply_markup:ik(rows)});}catch{} }
  return send(T,cid,txt,{reply_markup:ik(rows)});
}

async function showStoreProducts(T,cid,mid,kv,storeId,page=0) {
  const PAGE=8;
  const s=await getStore(kv,storeId);
  if(!s) return;
  const ids=(s.products||[]);
  const prods=(await Promise.all(ids.slice(page*PAGE,(page+1)*PAGE).map(id=>getProd(kv,id)))).filter(p=>p&&p.status==='approved');

  let txt=`🏪 ${s.name} — المنتجات\n\n`;
  const rows=prods.map(p=>[b(`${p.name.slice(0,28)} | ${p.price}₪`,`prod:${p.id}`)]);
  const nav=[];
  if(page>0) nav.push(b('◀️',`store_prods:${storeId}:${page-1}`));
  if((page+1)*PAGE<ids.length) nav.push(b('▶️',`store_prods:${storeId}:${page+1}`));
  if(nav.length) rows.push(nav);
  rows.push([back(`store:${storeId}`)]);
  return mid?edit(T,cid,mid,txt,{reply_markup:ik(rows)}):send(T,cid,txt,{reply_markup:ik(rows)});
}

// ═══════════════════════════════════════════════════════
// المطاعم
// ═══════════════════════════════════════════════════════

async function showRestaurants(T,cid,mid,kv) {
  const ids=await getList(kv,'restaurants:all');
  if(!ids.length) {
    const txt=`🍔 <b>المطاعم</b>\n\nلا توجد مطاعم بعد.`;
    const kb=ik([[b('🍔 أضف مطعمك','create_restaurant')],[back()]]);
    return mid?edit(T,cid,mid,txt,{reply_markup:kb}):send(T,cid,txt,{reply_markup:kb});
  }
  const stores=(await Promise.all(ids.slice(0,10).map(id=>getStore(kv,id)))).filter(s=>s&&s.type==='restaurant');
  let txt=`🍔 <b>المطاعم</b> — ${ids.length} مطعم\n\n`;
  const rows=stores.map(s=>[b(`🍽️ ${s.name.slice(0,28)} | ${s.city}`,`store:${s.id}`)]);
  rows.push([b('🍔 أضف مطعمك','create_restaurant'), back()]);
  return mid?edit(T,cid,mid,txt,{reply_markup:ik(rows)}):send(T,cid,txt,{reply_markup:ik(rows)});
}

// ═══════════════════════════════════════════════════════
// الخدمات
// ═══════════════════════════════════════════════════════

async function showServices(T,cid,mid,kv) {
  const rows=[];
  for(let i=0;i<SERVICE_TYPES.length;i+=2) {
    const r=[b(SERVICE_TYPES[i].name,`svc:${SERVICE_TYPES[i].id}`)];
    if(SERVICE_TYPES[i+1]) r.push(b(SERVICE_TYPES[i+1].name,`svc:${SERVICE_TYPES[i+1].id}`));
    rows.push(r);
  }
  rows.push([back()]);
  const txt=`🛠️ <b>الخدمات</b>\n\nاختر نوع الخدمة:`;
  return mid?edit(T,cid,mid,txt,{reply_markup:ik(rows)}):send(T,cid,txt,{reply_markup:ik(rows)});
}

async function showServiceType(T,cid,mid,kv,typeId) {
  const ids=await getList(kv,`svc:${typeId}`);
  const label=svcLabel(typeId);

  if(!ids.length) {
    const txt=`${label}\n\nلا توجد خدمات بعد.`;
    const kb=ik([[b('➕ أضف خدمتك',`add_svc_t:${typeId}`)],[back('services')]]);
    return mid?edit(T,cid,mid,txt,{reply_markup:kb}):send(T,cid,txt,{reply_markup:kb});
  }

  const svcs=(await Promise.all(ids.slice(0,8).map(id=>getProd(kv,id)))).filter(p=>p&&p.status==='approved');
  let txt=`${label} — ${ids.length} خدمة\n\n`;
  const rows=svcs.map(s=>[b(`🛠️ ${s.name.slice(0,26)} | ${s.price}₪`,`prod:${s.id}`)]);
  rows.push([b('➕ أضف خدمتك',`add_svc_t:${typeId}`), back('services')]);
  return mid?edit(T,cid,mid,txt,{reply_markup:ik(rows)}):send(T,cid,txt,{reply_markup:ik(rows)});
}

// ═══════════════════════════════════════════════════════
// العروض والمميزة
// ═══════════════════════════════════════════════════════

async function showOffers(T,cid,mid,kv) {
  const ids=await getList(kv,'products:all');
  const all=(await Promise.all(ids.slice(0,100).map(id=>getProd(kv,id)))).filter(p=>p&&p.status==='approved'&&p.originalPrice>p.price);
  const txt=`🔥 <b>العروض والتخفيضات</b>\n\n${all.length?'':' لا توجد عروض حالياً.'}`;
  const rows=all.slice(0,8).map(p=>[b(`🔥 ${p.name.slice(0,22)} | ${p.price}₪ ← ${p.originalPrice}₪`,`prod:${p.id}`)]);
  rows.push([back()]);
  return mid?edit(T,cid,mid,txt,{reply_markup:ik(rows)}):send(T,cid,txt,{reply_markup:ik(rows)});
}

async function showFeatured(T,cid,mid,kv) {
  const ids=await getList(kv,'featured');
  const prods=(await Promise.all(ids.slice(0,8).map(id=>getProd(kv,id)))).filter(p=>p&&p.status==='approved');
  let txt=`⭐ <b>المنتجات المميزة</b>\n\n`;
  const rows=prods.map(p=>[b(`⭐ ${p.name.slice(0,28)} | ${p.price}₪`,`prod:${p.id}`)]);
  if(!prods.length) txt+='لا توجد منتجات مميزة حالياً.';
  rows.push([back()]);
  return mid?edit(T,cid,mid,txt,{reply_markup:ik(rows)}):send(T,cid,txt,{reply_markup:ik(rows)});
}

// ═══════════════════════════════════════════════════════
// البحث
// ═══════════════════════════════════════════════════════

async function startSearch(T,cid,mid,kv,uid) {
  await setState(kv,uid,{step:'search'});
  const txt=`🔍 <b>البحث</b>\n\nاكتب اسم المنتج أو المتجر أو المدينة:`;
  const kb=ik([[b('❌ إلغاء','cancel')]]);
  return mid?edit(T,cid,mid,txt,{reply_markup:kb}):send(T,cid,txt,{reply_markup:kb});
}

async function doSearch(T,cid,kv,q) {
  const ql=q.toLowerCase().trim();
  if(ql.length<2) return send(T,cid,'⚠️ أدخل على الأقل كلمتين.');
  const ids=await getList(kv,'products:all');
  const all=(await Promise.all(ids.slice(0,300).map(id=>getProd(kv,id)))).filter(p=>p&&p.status==='approved');
  const res=all.filter(p=>
    p.name?.toLowerCase().includes(ql)||
    p.description?.toLowerCase().includes(ql)||
    p.city?.toLowerCase().includes(ql)
  ).slice(0,8);

  if(!res.length) return send(T,cid,`🔍 لا نتائج لـ "<b>${q}</b>"`,{reply_markup:ik([[b('🔍 بحث جديد','search'),b('🏠 رئيسية','main')]])});
  let txt=`🔍 نتائج "<b>${q}</b>" — ${res.length} نتيجة\n\n`;
  const rows=res.map(p=>[b(`${p.name.slice(0,28)} | ${p.price}₪`,`prod:${p.id}`)]);
  rows.push([b('🔍 بحث جديد','search'), b('🏠 رئيسية','main')]);
  return send(T,cid,txt,{reply_markup:ik(rows)});
}

// ═══════════════════════════════════════════════════════
// حسابي
// ═══════════════════════════════════════════════════════

async function showAccount(T,cid,mid,kv,uid) {
  const u=await getUser(kv,uid);
  const plan=PLANS[u.subscription||'free'];
  const myProds=await getList(kv,`user:${uid}:prods`);
  const myOrders=await getList(kv,`user:${uid}:orders`);
  const store=u.storeId?await getStore(kv,u.storeId):null;

  const txt=`👤 <b>حسابي</b>\n\n` +
    `🆔 ${uid}\n` +
    `⭐ ${plan.name} ${plan.badge}\n` +
    `📦 إعلاناتي: ${myProds.length}\n` +
    `🛒 طلباتي: ${myOrders.length}\n` +
    `🏪 متجري: ${store?store.name:'—'}\n` +
    `❤️ المحفوظات: ${(u.favorites||[]).length}`;

  const rows=[
    [b('📦 إعلاناتي','my_listings'), b('🛒 طلباتي','my_orders')],
    [b('❤️ المحفوظات','favorites'), b('👁️ آخر المشاهدات','history')],
    [b('🏪 متجري','my_store'), b('⭐ الاشتراك','subscription')],
    [back()],
  ];
  return mid?edit(T,cid,mid,txt,{reply_markup:ik(rows)}):send(T,cid,txt,{reply_markup:ik(rows)});
}

async function showMyListings(T,cid,mid,kv,uid,page=0) {
  const PAGE=8;
  const ids=await getList(kv,`user:${uid}:prods`);
  if(!ids.length) {
    const txt=`📦 <b>إعلاناتي</b>\n\nلم تضف أي إعلانات بعد.`;
    const kb=ik([[b('➕ أضف إعلان','add')],[back('account')]]);
    return mid?edit(T,cid,mid,txt,{reply_markup:kb}):send(T,cid,txt,{reply_markup:kb});
  }
  const prods=(await Promise.all(ids.slice(page*PAGE,(page+1)*PAGE).map(id=>getProd(kv,id)))).filter(Boolean);
  const statusIcon={pending:'⏳',approved:'✅',rejected:'❌'};
  let txt=`📦 <b>إعلاناتي</b> (${ids.length})\n\n`;
  const rows=prods.map(p=>{
    txt+=`${statusIcon[p.status]||'?'} ${p.name} — ${p.price}₪\n`;
    return [
      b(`${p.name.slice(0,22)}`,`prod:${p.id}`),
      b('✏️',`editprod:${p.id}`),
      b('🗑️',`delprod_c:${p.id}`),
    ];
  });
  const nav=[];
  if(page>0) nav.push(b('◀️',`my_listings:${page-1}`));
  if((page+1)*PAGE<ids.length) nav.push(b('▶️',`my_listings:${page+1}`));
  if(nav.length) rows.push(nav);
  rows.push([back('account')]);
  return mid?edit(T,cid,mid,txt,{reply_markup:ik(rows)}):send(T,cid,txt,{reply_markup:ik(rows)});
}

async function showFavorites(T,cid,mid,kv,uid) {
  const u=await getUser(kv,uid);
  const ids=u.favorites||[];
  if(!ids.length){
    const txt=`❤️ <b>المحفوظات</b>\n\nلم تحفظ أي منتجات بعد.`;
    const kb=ik([[b('🛍️ تصفح السوق','market')],[back('account')]]);
    return mid?edit(T,cid,mid,txt,{reply_markup:kb}):send(T,cid,txt,{reply_markup:kb});
  }
  const prods=(await Promise.all(ids.slice(0,8).map(id=>getProd(kv,id)))).filter(Boolean);
  let txt=`❤️ <b>المحفوظات</b> (${ids.length})\n\n`;
  const rows=prods.map(p=>[b(`${p.name.slice(0,28)} | ${p.price}₪`,`prod:${p.id}`)]);
  rows.push([back('account')]);
  return mid?edit(T,cid,mid,txt,{reply_markup:ik(rows)}):send(T,cid,txt,{reply_markup:ik(rows)});
}

async function showHistory(T,cid,mid,kv,uid) {
  const u=await getUser(kv,uid);
  const ids=u.history||[];
  if(!ids.length){
    const txt=`👁️ <b>آخر المشاهدات</b>\n\nلم تشاهد أي منتجات بعد.`;
    const kb=ik([[b('🛍️ تصفح السوق','market')],[back('account')]]);
    return mid?edit(T,cid,mid,txt,{reply_markup:kb}):send(T,cid,txt,{reply_markup:kb});
  }
  const prods=(await Promise.all(ids.slice(0,8).map(id=>getProd(kv,id)))).filter(Boolean);
  let txt=`👁️ <b>آخر المشاهدات</b>\n\n`;
  const rows=prods.map(p=>[b(`${p.name.slice(0,28)} | ${p.price}₪`,`prod:${p.id}`)]);
  rows.push([back('account')]);
  return mid?edit(T,cid,mid,txt,{reply_markup:ik(rows)}):send(T,cid,txt,{reply_markup:ik(rows)});
}

async function showSubscription(T,cid,mid,kv,uid) {
  const u=await getUser(kv,uid);
  const cur=PLANS[u.subscription||'free'];
  const myProds=await getList(kv,`user:${uid}:prods`);
  const txt=`⭐ <b>الاشتراك</b>\n\n` +
    `اشتراكك: ${cur.name} ${cur.badge}\n` +
    `إعلاناتك: ${myProds.length} / ${cur.products}\n\n` +
    `🟢 <b>مجاني</b> — ${PLANS.free.products} منتجات — مجاناً\n\n` +
    `🔵 <b>برو</b> — ${PLANS.pro.products} منتجاً — ${PLANS.pro.label}\n` +
    `   • ظهور أفضل ⭐\n   • إحصائيات متقدمة\n\n` +
    `🟣 <b>أعمال</b> — غير محدود — ${PLANS.business.label}\n` +
    `   • شارة توثيق ✅\n   • أولوية في البحث\n   • متجر احترافي\n   • إحصائيات كاملة\n\n` +
    `للترقية تواصل مع الإدارة:`;
  const rows=[
    [burl('💬 تواصل للترقية','https://t.me/me')],
    [back('account')],
  ];
  return mid?edit(T,cid,mid,txt,{reply_markup:ik(rows)}):send(T,cid,txt,{reply_markup:ik(rows)});
}

// ═══════════════════════════════════════════════════════
// الطلبات
// ═══════════════════════════════════════════════════════

async function showMyOrders(T,cid,mid,kv,uid,page=0) {
  const PAGE=6;
  const ids=await getList(kv,`user:${uid}:orders`);
  if(!ids.length){
    const txt=`🛒 <b>طلباتي</b>\n\nلا توجد طلبات بعد.`;
    const kb=ik([[b('🛍️ تصفح السوق','market')],[back('account')]]);
    return mid?edit(T,cid,mid,txt,{reply_markup:kb}):send(T,cid,txt,{reply_markup:kb});
  }
  const orders=(await Promise.all(ids.slice(page*PAGE,(page+1)*PAGE).map(id=>getOrder(kv,id)))).filter(Boolean);
  const statusIcons={pending:'⏳',accepted:'✅',completed:'🎉',rejected:'❌',cancelled:'🚫'};
  let txt=`🛒 <b>طلباتي</b> (${ids.length})\n\n`;
  const rows=orders.map(o=>{
    txt+=`${statusIcons[o.status]||'?'} ${o.productName} — ${o.totalPrice}₪\n`;
    return [b(`${statusIcons[o.status]} ${o.productName.slice(0,25)}`,`order_view:${o.id}`)];
  });
  const nav=[];
  if(page>0) nav.push(b('◀️',`my_orders:${page-1}`));
  if((page+1)*PAGE<ids.length) nav.push(b('▶️',`my_orders:${page+1}`));
  if(nav.length) rows.push(nav);
  rows.push([back('account')]);
  return mid?edit(T,cid,mid,txt,{reply_markup:ik(rows)}):send(T,cid,txt,{reply_markup:ik(rows)});
}

async function showOrder(T,cid,mid,kv,orderId,uid) {
  const o=await getOrder(kv,orderId);
  if(!o) return;
  const statuses={pending:'⏳ قيد الانتظار',accepted:'✅ مقبول',completed:'🎉 مكتمل',rejected:'❌ مرفوض',cancelled:'🚫 ملغي'};
  const isBuyer=o.buyerId===uid;
  const isSeller=o.sellerId===uid;

  const txt=`🛒 <b>تفاصيل الطلب</b>\n\n` +
    `📦 ${o.productName}\n` +
    `💰 ${o.totalPrice}₪\n` +
    `الحالة: ${statuses[o.status]||o.status}\n` +
    `${o.notes?`📝 ${o.notes}\n`:''}\n` +
    `📅 ${new Date(o.createdAt).toLocaleDateString('ar')}`;

  const rows=[];
  if(isBuyer&&o.status==='pending') rows.push([b('🚫 إلغاء الطلب',`order_cancel:${orderId}`)]);
  if(isSeller) {
    if(o.status==='pending') rows.push([b('✅ قبول',`order_accept:${orderId}`), b('❌ رفض',`order_reject:${orderId}`)]);
    if(o.status==='accepted') rows.push([b('🎉 إتمام الطلب',`order_complete:${orderId}`)]);
  }
  rows.push([back(isBuyer?'my_orders':'seller_orders')]);
  return mid?edit(T,cid,mid,txt,{reply_markup:ik(rows)}):send(T,cid,txt,{reply_markup:ik(rows)});
}

async function showSellerOrders(T,cid,mid,kv,uid) {
  const ids=await getList(kv,`seller:${uid}:orders`);
  if(!ids.length){
    const txt=`📋 <b>طلبات متجري</b>\n\nلا توجد طلبات واردة.`;
    const kb=ik([[back('account')]]);
    return mid?edit(T,cid,mid,txt,{reply_markup:kb}):send(T,cid,txt,{reply_markup:kb});
  }
  const orders=(await Promise.all(ids.slice(0,8).map(id=>getOrder(kv,id)))).filter(Boolean);
  const statusIcons={pending:'⏳',accepted:'✅',completed:'🎉',rejected:'❌',cancelled:'🚫'};
  let txt=`📋 <b>طلبات متجري</b> (${ids.length})\n\n`;
  const rows=orders.map(o=>[b(`${statusIcons[o.status]} ${o.productName.slice(0,25)} — ${o.totalPrice}₪`,`order_view:${o.id}`)]);
  rows.push([back('account')]);
  return mid?edit(T,cid,mid,txt,{reply_markup:ik(rows)}):send(T,cid,txt,{reply_markup:ik(rows)});
}

async function placeOrder(T,cid,kv,prodId,uid,cbId) {
  const p=await getProd(kv,prodId);
  if(!p||p.status!=='approved'){await answer(T,cbId,'⚠️ المنتج غير متاح',true);return;}
  if(p.sellerId===uid){await answer(T,cbId,'⚠️ لا يمكنك طلب منتجك',true);return;}

  const u=await getUser(kv,uid);
  const orderId=genId();
  const order={
    id:orderId, productId:prodId, productName:p.name,
    storeId:p.storeId, buyerId:uid, buyerName:u.firstName||'عميل',
    sellerId:p.sellerId, totalPrice:p.price,
    status:'pending', createdAt:Date.now(),
  };

  await saveOrder(kv,orderId,order);
  await listAdd(kv,`user:${uid}:orders`,orderId);
  await listAdd(kv,`seller:${p.sellerId}:orders`,orderId);

  // إشعار البائع
  const sellerNotif=`🛒 <b>طلب جديد!</b>\n\n` +
    `📦 ${p.name}\n💰 ${p.price}₪\n` +
    `👤 العميل: ${u.firstName||''} ${u.username?'@'+u.username:''}`;
  await notify(T,p.sellerId,sellerNotif);

  const txt=`🎉 <b>تم إرسال طلبك!</b>\n\n📦 ${p.name}\n💰 ${p.price}₪\n\nسيتواصل معك البائع قريباً.`;
  const kb=ik([[b('🛒 طلباتي','my_orders'), b('🏠 رئيسية','main')]]);
  return send(T,cid,txt,{reply_markup:kb});
}

// ═══════════════════════════════════════════════════════
// متجري (صفحة المتجر الشخصي)
// ═══════════════════════════════════════════════════════

async function showMyStore(T,cid,mid,kv,uid) {
  const u=await getUser(kv,uid);
  if(!u.storeId){
    const txt=`🏪 <b>متجري</b>\n\nلا يوجد لديك متجر بعد.`;
    const kb=ik([[b('🏪 أنشئ متجرك','create_store')],[back('account')]]);
    return mid?edit(T,cid,mid,txt,{reply_markup:kb}):send(T,cid,txt,{reply_markup:kb});
  }
  const s=await getStore(kv,u.storeId);
  if(!s){u.storeId=null;await saveUser(kv,uid,u);return showMyStore(T,cid,mid,kv,uid);}

  const prods=await getList(kv,`user:${uid}:prods`);
  const plan=PLANS[s.subscription||'free'];
  const txt=`🏪 <b>${plan.badge?plan.badge+' ':''}${s.name}</b>\n\n` +
    `📦 منتجاتي: ${prods.length} / ${plan.products}\n` +
    `🏙️ ${s.city}  |  ${STORE_CATEGORIES.find(c=>c.id===s.category)?.name||''}\n` +
    `🕐 ${s.hours||'—'}\n\n` +
    `📝 ${s.description||'—'}`;

  const rows=[
    [b('➕ أضف منتج','add'), b('📦 إعلاناتي','my_listings')],
    [b('📋 الطلبات الواردة','seller_orders'), b('📊 الإحصائيات',`stats:${u.storeId}`)],
    [b('✏️ تعديل المتجر',`edit_store:${u.storeId}`)],
    [b('👁️ عرض كصفحة',`store:${u.storeId}`), back('account')],
  ];
  return mid?edit(T,cid,mid,txt,{reply_markup:ik(rows)}):send(T,cid,txt,{reply_markup:ik(rows)});
}

async function showStoreStats(T,cid,mid,kv,uid,storeId) {
  const ids=await getList(kv,`user:${uid}:prods`);
  const prods=(await Promise.all(ids.map(id=>getProd(kv,id)))).filter(Boolean);
  const totalViews=prods.reduce((s,p)=>s+(p.views||0),0);
  const totalSaves=prods.reduce((s,p)=>s+(p.saves||0),0);
  const orders=await getList(kv,`seller:${uid}:orders`);

  const txt=`📊 <b>إحصائياتي</b>\n\n` +
    `📦 عدد المنتجات: ${prods.length}\n` +
    `👁️ إجمالي المشاهدات: ${totalViews}\n` +
    `❤️ إجمالي الحفظ: ${totalSaves}\n` +
    `🛒 إجمالي الطلبات: ${orders.length}`;
  const kb=ik([[back('my_store')]]);
  return mid?edit(T,cid,mid,txt,{reply_markup:kb}):send(T,cid,txt,{reply_markup:kb});
}

// ═══════════════════════════════════════════════════════
// إضافة إعلان — Flow
// ═══════════════════════════════════════════════════════

async function startAdd(T,cid,mid,kv,uid) {
  const u=await getUser(kv,uid);
  const plan=PLANS[u.subscription||'free'];
  const myProds=await getList(kv,`user:${uid}:prods`);

  if(myProds.length>=plan.products){
    const txt=`⚠️ <b>وصلت للحد الأقصى!</b>\n\nباقتك تسمح بـ ${plan.products} إعلانات.\nرقّ اشتراكك للمزيد!`;
    const kb=ik([[b('⭐ ترقية الاشتراك','subscription')],[back()]]);
    return mid?edit(T,cid,mid,txt,{reply_markup:kb}):send(T,cid,txt,{reply_markup:kb});
  }

  // Check if seller has username
  const u2=await getUser(kv,uid);
  if(!u2.username){
    const txt=`⚠️ <b>يجب أن يكون لديك اسم مستخدم في تيليجرام!</b>\n\nاذهب إلى: الإعدادات → تعديل الملف الشخصي → اسم المستخدم\n\nثم عد وجرب مجدداً.`;
    const kb=ik([[back()]]);
    return mid?edit(T,cid,mid,txt,{reply_markup:kb}):send(T,cid,txt,{reply_markup:kb});
  }

  await setState(kv,uid,{step:'add_type'});
  const txt=`➕ <b>إضافة إعلان</b>\n\nماذا تريد أن تضيف؟`;
  const rows=[
    [b('📦 منتج للبيع','add_t:product')],
    [b('🛠️ خدمة','add_t:service')],
    [b('❌ إلغاء','cancel')],
  ];
  return mid?edit(T,cid,mid,txt,{reply_markup:ik(rows)}):send(T,cid,txt,{reply_markup:ik(rows)});
}

// ═══════════════════════════════════════════════════════
// إنشاء متجر — Flow
// ═══════════════════════════════════════════════════════

async function startCreateStore(T,cid,mid,kv,uid,type='store') {
  const u=await getUser(kv,uid);
  if(u.storeId&&type==='store'){
    return showMyStore(T,cid,mid,kv,uid);
  }
  if(!u.username){
    const txt=`⚠️ تحتاج إلى اسم مستخدم في تيليجرام لإنشاء متجر.\nاذهب إلى إعدادات تيليجرام → اسم المستخدم`;
    const kb=ik([[back()]]);
    return mid?edit(T,cid,mid,txt,{reply_markup:kb}):send(T,cid,txt,{reply_markup:kb});
  }

  await setState(kv,uid,{step:'store_name',storeType:type});
  const icon=type==='restaurant'?'🍔':'🏪';
  const txt=`${icon} <b>إنشاء ${type==='restaurant'?'مطعم':'متجر'}</b>\n\nالخطوة 1/4 — اكتب الاسم:`;
  const kb=ik([[b('❌ إلغاء','cancel')]]);
  return mid?edit(T,cid,mid,txt,{reply_markup:kb}):send(T,cid,txt,{reply_markup:kb});
}

// ═══════════════════════════════════════════════════════
// لوحة الإدارة
// ═══════════════════════════════════════════════════════

async function showAdmin(T,cid,mid,kv,u) {
  const [totalP,totalS,totalR]=await Promise.all([
    getList(kv,'products:all').then(l=>l.length),
    getList(kv,'stores:all').then(l=>l.length),
    getList(kv,'reports:all').then(l=>l.length),
  ]);
  const pending=(await getList(kv,'pending:products')).length;

  const txt=`⚙️ <b>لوحة الإدارة</b>\n\n` +
    `📦 المنتجات: ${totalP} | ⏳ انتظار: ${pending}\n` +
    `🏪 المتاجر: ${totalS}\n` +
    `🚩 البلاغات: ${totalR}\n\n` +
    `مستواك: ${isOwner(u)?'👑 مالك':getAdminLevel(u)>=3?'🔴 مدير':'🟡 مشرف'}`;

  const rows=[
    [b('⏳ موافقة المنتجات',`ap:pending:0`), b('📦 كل المنتجات','admin_prods')],
    [b('🏪 المتاجر','admin_stores'), b('🚩 البلاغات','admin_reports')],
    [b('⭐ منتجات مميزة','admin_featured'), b('📊 إحصائيات','admin_stats')],
  ];
  if(isOwner(u)||getAdminLevel(u)>=3) {
    rows.push([b('👥 إدارة المشرفين','admin_mods'), b('⭐ الاشتراكات','admin_subs')]);
  }
  rows.push([back()]);
  return mid?edit(T,cid,mid,txt,{reply_markup:ik(rows)}):send(T,cid,txt,{reply_markup:ik(rows)});
}

async function showPendingProducts(T,cid,mid,kv,page=0) {
  const PAGE=5;
  const ids=await getList(kv,'pending:products');
  const pIds=ids.slice(page*PAGE,(page+1)*PAGE);
  if(!ids.length){
    const txt=`⏳ <b>موافقة المنتجات</b>\n\nلا توجد منتجات تنتظر الموافقة ✅`;
    const kb=ik([[back('admin')]]);
    return mid?edit(T,cid,mid,txt,{reply_markup:kb}):send(T,cid,txt,{reply_markup:kb});
  }
  const prods=(await Promise.all(pIds.map(id=>getProd(kv,id)))).filter(Boolean);
  let txt=`⏳ <b>تنتظر الموافقة</b> (${ids.length})\n\n`;
  const rows=[];
  for(const p of prods){
    txt+=`📦 <b>${p.name}</b>\n💰 ${p.price}₪ | ${catLabel(p.category)} | ${p.city}\n👤 ${p.sellerName}\n\n`;
    rows.push([
      b(`✅ قبول`,`approve:${p.id}`),
      b(`❌ رفض`,`reject:${p.id}`),
      b(`${p.name.slice(0,15)}`,`prod:${p.id}`),
    ]);
  }
  const nav=[];
  if(page>0) nav.push(b('◀️',`ap:pending:${page-1}`));
  if((page+1)*PAGE<ids.length) nav.push(b('▶️',`ap:pending:${page+1}`));
  if(nav.length) rows.push(nav);
  rows.push([back('admin')]);
  return mid?edit(T,cid,mid,txt,{reply_markup:ik(rows)}):send(T,cid,txt,{reply_markup:ik(rows)});
}

async function approveProduct(T,kv,prodId,approved,adminId) {
  const p=await getProd(kv,prodId);
  if(!p) return false;
  p.status=approved?'approved':'rejected';
  p.reviewedBy=adminId;
  p.reviewedAt=Date.now();
  await saveProd(kv,prodId,p);
  await listRm(kv,'pending:products',prodId);
  if(approved) {
    await listAdd(kv,'products:all',prodId);
    await listAdd(kv,`cat:${p.category}`,prodId);
    if(p.isService) await listAdd(kv,`svc:${p.serviceType}`,prodId);
    await notify(T,p.sellerId,`✅ <b>تمت الموافقة على إعلانك!</b>\n\n📦 ${p.name} أصبح مرئياً للجميع الآن 🎉`);
  } else {
    await notify(T,p.sellerId,`❌ <b>تم رفض إعلانك</b>\n\n📦 ${p.name}\n\nتواصل مع الإدارة لمعرفة السبب.`);
  }
  return true;
}

async function showAdminReports(T,cid,mid,kv) {
  const ids=await getList(kv,'reports:all');
  if(!ids.length){
    const txt=`🚩 <b>البلاغات</b>\n\nلا توجد بلاغات.`;
    return mid?edit(T,cid,mid,txt,{reply_markup:ik([[back('admin')]])}):send(T,cid,txt,{reply_markup:ik([[back('admin')]])});
  }
  const reports=(await Promise.all(ids.slice(0,8).map(id=>kget(kv,`rep:${id}`)))).filter(Boolean);
  let txt=`🚩 <b>البلاغات</b> (${ids.length})\n\n`;
  const rows=reports.map(r=>{
    txt+=`• ${r.type} — ${r.reason||'بدون سبب'}\n`;
    return [
      b('🗑️ حذف البلاغ',`resolve_rep:${r.id}`),
      b(`${r.type}:${r.itemId.slice(0,8)}`,`${r.type==='prod'?'prod':'store'}:${r.itemId}`),
    ];
  });
  rows.push([back('admin')]);
  return mid?edit(T,cid,mid,txt,{reply_markup:ik(rows)}):send(T,cid,txt,{reply_markup:ik(rows)});
}

async function showAdminStats(T,cid,mid,kv) {
  const [p,s,r,rep,feat]=await Promise.all([
    getList(kv,'products:all').then(l=>l.length),
    getList(kv,'stores:all').then(l=>l.length),
    getList(kv,'restaurants:all').then(l=>l.length),
    getList(kv,'reports:all').then(l=>l.length),
    getList(kv,'featured').then(l=>l.length),
  ]);
  const txt=`📊 <b>إحصائيات المنصة</b>\n\n` +
    `📦 المنتجات: ${p}\n` +
    `🏪 المتاجر: ${s}\n` +
    `🍔 المطاعم: ${r}\n` +
    `⭐ المميزة: ${feat}\n` +
    `🚩 البلاغات: ${rep}`;
  const kb=ik([[back('admin')]]);
  return mid?edit(T,cid,mid,txt,{reply_markup:kb}):send(T,cid,txt,{reply_markup:kb});
}

async function showAdminModPanel(T,cid,mid,kv) {
  const txt=`👥 <b>إدارة المشرفين</b>\n\nأرسل: /setmod [معرف المستخدم] [admin|moderator|remove]\n\nمثال:\n/setmod 123456789 moderator`;
  const kb=ik([[back('admin')]]);
  return mid?edit(T,cid,mid,txt,{reply_markup:kb}):send(T,cid,txt,{reply_markup:kb});
}

async function showAdminSubs(T,cid,mid,kv) {
  const txt=`⭐ <b>إدارة الاشتراكات</b>\n\nأرسل: /setsub [معرف المستخدم] [free|pro|business]`;
  const kb=ik([[back('admin')]]);
  return mid?edit(T,cid,mid,txt,{reply_markup:kb}):send(T,cid,txt,{reply_markup:kb});
}

async function showAdminFeatured(T,cid,mid,kv) {
  const ids=await getList(kv,'featured');
  const prods=(await Promise.all(ids.slice(0,8).map(id=>getProd(kv,id)))).filter(Boolean);
  let txt=`⭐ <b>المنتجات المميزة</b> (${ids.length})\n\n`;
  const rows=prods.map(p=>[b(`🗑️ إزالة`,`unfeat:${p.id}`), b(p.name.slice(0,28),`prod:${p.id}`)]);
  rows.push([b('➕ تمييز منتج','do_feature'), back('admin')]);
  return mid?edit(T,cid,mid,txt,{reply_markup:ik(rows)}):send(T,cid,txt,{reply_markup:ik(rows)});
}

// ═══════════════════════════════════════════════════════
// معالج الـ Callbacks
// ═══════════════════════════════════════════════════════

async function onCallback(env,update) {
  const {T,kv}=env._c;
  const cb=update.callback_query;
  const cid=cb.message.chat.id;
  const mid=cb.message.message_id;
  const uid=cb.from.id;
  const data=cb.data;

  await answer(T,cb.id);

  const u=await getUser(kv,uid);
  // Update user info
  if(u.firstName!==cb.from.first_name||u.username!==cb.from.username){
    u.firstName=cb.from.first_name;
    u.username=cb.from.username;
    await saveUser(kv,uid,u);
  }

  // ── نافيجيشن أساسي ──────────────────────────────────
  if(data==='main')        return showMain(T,cid,mid,u,kv);
  if(data==='market')      return showMarket(T,cid,mid);
  if(data==='stores')      return showStores(T,cid,mid,kv);
  if(data==='restaurants') return showRestaurants(T,cid,mid,kv);
  if(data==='services')    return showServices(T,cid,mid,kv);
  if(data==='offers')      return showOffers(T,cid,mid,kv);
  if(data==='featured')    return showFeatured(T,cid,mid,kv);
  if(data==='account')     return showAccount(T,cid,mid,kv,uid);
  if(data==='add')         return startAdd(T,cid,mid,kv,uid);
  if(data==='search')      return startSearch(T,cid,mid,kv,uid);
  if(data==='my_listings') return showMyListings(T,cid,mid,kv,uid);
  if(data==='my_orders')   return showMyOrders(T,cid,mid,kv,uid);
  if(data==='favorites')   return showFavorites(T,cid,mid,kv,uid);
  if(data==='history')     return showHistory(T,cid,mid,kv,uid);
  if(data==='my_store')    return showMyStore(T,cid,mid,kv,uid);
  if(data==='subscription')return showSubscription(T,cid,mid,kv,uid);
  if(data==='create_store')return startCreateStore(T,cid,mid,kv,uid,'store');
  if(data==='create_restaurant') return startCreateStore(T,cid,mid,kv,uid,'restaurant');
  if(data==='seller_orders') return showSellerOrders(T,cid,mid,kv,uid);
  if(data==='noop')        return;

  if(data==='cancel') {
    await clearState(kv,uid);
    return showMain(T,cid,mid,u,kv);
  }

  // ── Paginated ─────────────────────────────────────────
  if(data.startsWith('stores:'))      return showStores(T,cid,mid,kv,parseInt(data.split(':')[1])||0);
  if(data.startsWith('my_listings:')) return showMyListings(T,cid,mid,kv,uid,parseInt(data.split(':')[1])||0);
  if(data.startsWith('my_orders:'))   return showMyOrders(T,cid,mid,kv,uid,parseInt(data.split(':')[1])||0);

  // ── Category ──────────────────────────────────────────
  if(data.startsWith('cat:')) {
    const [,catId,p]=data.split(':');
    return showCategory(T,cid,mid,kv,catId,parseInt(p||0));
  }
  if(data.startsWith('filter:')) return showFilter(T,cid,mid,kv,data.split(':')[1]);
  if(data.startsWith('filt:')) {
    const [,catId,type]=data.split(':');
    return showFiltered(T,cid,mid,kv,catId,type);
  }

  // ── Product ───────────────────────────────────────────
  if(data.startsWith('prod:')) return showProduct(T,cid,kv,data.split(':')[1],uid,cb.id);

  if(data.startsWith('fav:')) {
    const pid=data.split(':')[1];
    const pu=await getUser(kv,uid);
    pu.favorites=[pid,...(pu.favorites||[]).filter(x=>x!==pid)];
    const prod=await getProd(kv,pid);
    if(prod){prod.saves=(prod.saves||0)+1;await saveProd(kv,pid,prod);}
    await saveUser(kv,uid,pu);
    return answer(T,cb.id,'❤️ تم الحفظ!');
  }
  if(data.startsWith('unfav:')) {
    const pid=data.split(':')[1];
    const pu=await getUser(kv,uid);
    pu.favorites=(pu.favorites||[]).filter(x=>x!==pid);
    await saveUser(kv,uid,pu);
    return answer(T,cb.id,'💔 تم الإزالة');
  }
  if(data.startsWith('share:')) {
    const pid=data.split(':')[1];
    return answer(T,cb.id,`🔗 رابط المنتج:\nt.me/Soqna_bot?start=p_${pid}`,true);
  }
  if(data.startsWith('delprod_c:')) {
    const pid=data.split(':')[1];
    const txt=`⚠️ هل أنت متأكد من حذف هذا الإعلان؟\nلا يمكن التراجع عن هذا الإجراء.`;
    return edit(T,cid,mid,txt,{reply_markup:ik([[b('✅ نعم، احذف',`delprod:${pid}`), b('❌ لا','my_listings')]])});
  }
  if(data.startsWith('delprod:')) {
    const pid=data.split(':')[1];
    const prod=await getProd(kv,pid);
    if(prod&&(prod.sellerId===uid||isAdmin(u))){
      await kdel(kv,`p:${pid}`);
      await listRm(kv,'products:all',pid);
      await listRm(kv,`cat:${prod.category}`,pid);
      await listRm(kv,`user:${prod.sellerId}:prods`,pid);
      await listRm(kv,'pending:products',pid);
      await listRm(kv,'featured',pid);
      if(prod.isService) await listRm(kv,`svc:${prod.serviceType}`,pid);
      if(isAdmin(u)&&prod.sellerId!==uid)
        await notify(T,prod.sellerId,`⚠️ تم حذف إعلانك "<b>${prod.name}</b>" من قبل الإدارة.`);
    }
    return showMyListings(T,cid,mid,kv,uid);
  }

  // ── Store ─────────────────────────────────────────────
  if(data.startsWith('store:')&&!data.includes('_prods')) return showStore(T,cid,kv,data.split(':')[1],uid,cb.id);
  if(data.startsWith('store_prods:')) {
    const [,sid,p]=data.split(':');
    return showStoreProducts(T,cid,mid,kv,sid,parseInt(p||0));
  }

  // ── Service ───────────────────────────────────────────
  if(data.startsWith('svc:')&&!data.includes('add_svc')) return showServiceType(T,cid,mid,kv,data.split(':')[1]);
  if(data.startsWith('add_svc_t:')) {
    await setState(kv,uid,{step:'add_name',isService:true,serviceType:data.split(':')[1]});
    return send(T,cid,`🛠️ <b>إضافة خدمة</b>\n\nاكتب اسم الخدمة:`,{reply_markup:ik([[b('❌ إلغاء','cancel')]])});
  }

  // ── Order ─────────────────────────────────────────────
  if(data.startsWith('order:')) return placeOrder(T,cid,kv,data.split(':')[1],uid,cb.id);
  if(data.startsWith('order_view:')) return showOrder(T,cid,mid,kv,data.split(':')[1],uid);
  if(data.startsWith('order_cancel:')) {
    const oid=data.split(':')[1];
    const o=await getOrder(kv,oid);
    if(o&&o.buyerId===uid&&o.status==='pending'){
      o.status='cancelled';await saveOrder(kv,oid,o);
      await notify(T,o.sellerId,`🚫 تم إلغاء الطلب للمنتج <b>${o.productName}</b>.`);
    }
    return showMyOrders(T,cid,mid,kv,uid);
  }
  if(data.startsWith('order_accept:')) {
    const oid=data.split(':')[1];
    const o=await getOrder(kv,oid);
    if(o&&o.sellerId===uid&&o.status==='pending'){
      o.status='accepted';await saveOrder(kv,oid,o);
      await notify(T,o.buyerId,`✅ تم قبول طلبك للمنتج <b>${o.productName}</b>!\nسيتواصل معك البائع قريباً.`);
    }
    return showOrder(T,cid,mid,kv,oid,uid);
  }
  if(data.startsWith('order_reject:')) {
    const oid=data.split(':')[1];
    const o=await getOrder(kv,oid);
    if(o&&o.sellerId===uid&&o.status==='pending'){
      o.status='rejected';await saveOrder(kv,oid,o);
      await notify(T,o.buyerId,`❌ تم رفض طلبك للمنتج <b>${o.productName}</b>.`);
    }
    return showOrder(T,cid,mid,kv,oid,uid);
  }
  if(data.startsWith('order_complete:')) {
    const oid=data.split(':')[1];
    const o=await getOrder(kv,oid);
    if(o&&o.sellerId===uid&&o.status==='accepted'){
      o.status='completed';await saveOrder(kv,oid,o);
      await notify(T,o.buyerId,`🎉 تم إتمام طلبك للمنتج <b>${o.productName}</b> بنجاح!`);
    }
    return showOrder(T,cid,mid,kv,oid,uid);
  }

  // ── Stats ─────────────────────────────────────────────
  if(data.startsWith('stats:')) return showStoreStats(T,cid,mid,kv,uid,data.split(':')[1]);

  // ── Report ────────────────────────────────────────────
  if(data.startsWith('report:')) {
    const [,type,itemId]=data.split(':');
    const rid=genId();
    await kset(kv,`rep:${rid}`,{id:rid,type,itemId,reporterId:uid,createdAt:Date.now()});
    await listAdd(kv,'reports:all',rid);
    return answer(T,cb.id,'🚩 تم إرسال البلاغ للإدارة',true);
  }

  // ── Add listing flow callbacks ─────────────────────────
  if(data.startsWith('add_t:')) {
    const type=data.split(':')[1];
    if(type==='product'){
      await setState(kv,uid,{step:'add_category'});
      const rows=[];
      for(let i=0;i<CATEGORIES.length;i+=2){
        const r=[b(CATEGORIES[i].name,`a_c:${CATEGORIES[i].id}`)];
        if(CATEGORIES[i+1]) r.push(b(CATEGORIES[i+1].name,`a_c:${CATEGORIES[i+1].id}`));
        rows.push(r);
      }
      rows.push([b('❌ إلغاء','cancel')]);
      return edit(T,cid,mid,`📦 <b>إضافة منتج</b>\n\n📍 الخطوة 1/7 — اختر التصنيف:`,{reply_markup:ik(rows)});
    } else {
      // service
      const rows=[];
      for(let i=0;i<SERVICE_TYPES.length;i+=2){
        const r=[b(SERVICE_TYPES[i].name,`a_st:${SERVICE_TYPES[i].id}`)];
        if(SERVICE_TYPES[i+1]) r.push(b(SERVICE_TYPES[i+1].name,`a_st:${SERVICE_TYPES[i+1].id}`));
        rows.push(r);
      }
      rows.push([b('❌ إلغاء','cancel')]);
      await setState(kv,uid,{step:'add_svc_type',isService:true});
      return edit(T,cid,mid,`🛠️ <b>إضافة خدمة</b>\n\nاختر نوع الخدمة:`,{reply_markup:ik(rows)});
    }
  }
  if(data.startsWith('a_c:')) { // pick category
    const catId=data.split(':')[1];
    const st=await getState(kv,uid);
    await setState(kv,uid,{...st,step:'add_condition',category:catId});
    return edit(T,cid,mid,`✅ ${catLabel(catId)}\n\n📍 الخطوة 2/7 — حالة المنتج؟`,{
      reply_markup:ik([[b('✨ جديد','a_cd:new'),b('♻️ مستعمل','a_cd:used'),b('⚠️ معيب','a_cd:damaged')],[b('❌ إلغاء','cancel')]])
    });
  }
  if(data.startsWith('a_cd:')) { // pick condition
    const cond=data.split(':')[1];
    const st=await getState(kv,uid);
    await setState(kv,uid,{...st,step:'add_photos',condition:cond});
    return edit(T,cid,mid,`✅ الحالة محددة\n\n📍 الخطوة 3/7 — أرسل صور المنتج (حتى 5)\nأو اضغط تخطى:`,{
      reply_markup:ik([[b('⏭️ تخطى الصور','a_skip_photos')],[b('❌ إلغاء','cancel')]])
    });
  }
  if(data==='a_skip_photos'||data==='a_next_name') {
    const st=await getState(kv,uid);
    await setState(kv,uid,{...st,step:'add_name',photos:st.photos||[]});
    return send(T,cid,`📍 الخطوة 4/7 — اكتب اسم المنتج:`,{reply_markup:ik([[b('❌ إلغاء','cancel')]])});
  }
  if(data.startsWith('a_st:')) { // service type pick
    const typeId=data.split(':')[1];
    const st=await getState(kv,uid);
    await setState(kv,uid,{...st,step:'add_name',serviceType:typeId,isService:true,category:'other'});
    return edit(T,cid,mid,`✅ ${svcLabel(typeId)}\n\nاكتب اسم الخدمة:`,{reply_markup:ik([[b('❌ إلغاء','cancel')]])});
  }
  if(data.startsWith('a_city:')) { // pick city
    const city=data.split(':').slice(1).join(':');
    const st=await getState(kv,uid);
    if(!st.name||!st.price) return;
    await setState(kv,uid,{...st,step:'confirm',city});
    const cond_={new:'✨ جديد',used:'♻️ مستعمل',damaged:'⚠️ معيب'}[st.condition]||'—';
    const txt=`📋 <b>مراجعة الإعلان</b>\n\n` +
      `${st.isService?`🛠️ ${svcLabel(st.serviceType)}`:`📂 ${catLabel(st.category)}`}\n` +
      `📦 ${st.name}\n` +
      `📝 ${st.description?.slice(0,60)||'—'}\n` +
      `💰 ${st.price} ₪\n` +
      `${st.isService?'':cond_+'\n'}` +
      `📍 ${city}\n` +
      `🖼️ ${(st.photos||[]).length} صور\n\n` +
      `هل تريد نشر الإعلان؟\n<i>ملاحظة: يحتاج لموافقة الإدارة قبل الظهور</i>`;
    return send(T,cid,txt,{reply_markup:ik([[b('✅ نشر','a_publish'),b('❌ إلغاء','cancel')]])});
  }
  if(data==='a_publish') {
    const st=await getState(kv,uid);
    if(!st.name) return;
    const pu=await getUser(kv,uid);
    const prodId=genId();
    const prod={
      id:prodId,
      category:st.category,
      isService:!!st.isService,
      serviceType:st.serviceType||null,
      condition:st.condition,
      name:st.name,
      description:st.description,
      price:parseFloat(st.price),
      originalPrice:null,
      city:st.city,
      photos:st.photos||[],
      sellerName:pu.firstName||'بائع',
      sellerUsername:pu.username||null,
      sellerId:uid,
      storeId:pu.storeId||null,
      status:'pending', // يحتاج موافقة
      views:0, saves:0,
      createdAt:Date.now(),
    };
    await saveProd(kv,prodId,prod);
    await listAdd(kv,'pending:products',prodId);
    await listAdd(kv,`user:${uid}:prods`,prodId);

    // Add to store products list
    if(pu.storeId){
      const st2=await getStore(kv,pu.storeId);
      if(st2){st2.products=[prodId,...(st2.products||[])];await saveStore(kv,pu.storeId,st2);}
    }
    await clearState(kv,uid);

    // Notify admins
    for(const oid of OWNER_IDS){
      await notify(T,oid,`⏳ <b>منتج جديد بانتظار الموافقة</b>\n\n📦 ${prod.name}\n💰 ${prod.price}₪\n👤 ${prod.sellerName}`);
    }

    return edit(T,cid,mid,`✅ <b>تم إرسال إعلانك!</b>\n\n📦 ${prod.name}\n\nسيظهر بعد موافقة الإدارة ⏳`,{
      reply_markup:ik([[b('📦 إعلاناتي','my_listings')],[b('➕ إضافة آخر','add')],[b('🏠 رئيسية','main')]])
    });
  }

  // ── Store creation city pick ───────────────────────────
  if(data.startsWith('s_city:')) {
    const city=data.split(':').slice(1).join(':');
    const st=await getState(kv,uid);
    const storeId=genId();
    const pu=await getUser(kv,uid);
    const isRest=st.storeType==='restaurant';
    const store={
      id:storeId, type:isRest?'restaurant':'store',
      name:st.name, description:st.desc||'—',
      category:st.category||'retail', city, hours:st.hours||'—',
      username:pu.username,
      products:[], subscription:pu.subscription||'free',
      ownerId:uid, createdAt:Date.now(),
    };
    await saveStore(kv,storeId,store);
    await listAdd(kv,'stores:all',storeId);
    if(isRest) await listAdd(kv,'restaurants:all',storeId);
    pu.storeId=storeId;
    await saveUser(kv,uid,pu);
    await clearState(kv,uid);
    return edit(T,cid,mid,`🎉 <b>تم إنشاء ${isRest?'مطعمك':'متجرك'} بنجاح!</b>\n\n🏪 ${store.name}\n📍 ${city}`,{
      reply_markup:ik([[b('🏪 عرض المتجر',`store:${storeId}`)],[b('➕ أضف منتجاً','add')],[b('🏠 رئيسية','main')]])
    });
  }

  // ── Store category pick ────────────────────────────────
  if(data.startsWith('s_cat:')) {
    const catId=data.split(':')[1];
    const st=await getState(kv,uid);
    await setState(kv,uid,{...st,step:'store_hours',category:catId});
    return send(T,cid,`✅ التصنيف محدد\n\nاكتب ساعات العمل (مثال: 9ص–11م) أو اضغط تخطى:`,{
      reply_markup:ik([[b('⏭️ تخطى','s_skip_hours')],[b('❌ إلغاء','cancel')]])
    });
  }
  if(data==='s_skip_hours'||data==='s_do_city') {
    const st=await getState(kv,uid);
    await setState(kv,uid,{...st,step:'store_city',hours:st.hours||'—'});
    const cityRows=[];
    for(let i=0;i<CITIES.length;i+=3) cityRows.push(CITIES.slice(i,i+3).map(c=>b(c,`s_city:${c}`)));
    cityRows.push([b('❌ إلغاء','cancel')]);
    return send(T,cid,`📍 اختر مدينة المتجر:`,{reply_markup:ik(cityRows)});
  }

  // ── Admin ─────────────────────────────────────────────
  if(data==='admin') {
    if(!isAdmin(u)) return answer(T,cb.id,'⛔ غير مصرح',true);
    return showAdmin(T,cid,mid,kv,u);
  }
  if(!isAdmin(u)&&['admin_prods','admin_stores','admin_reports','admin_stats','admin_mods','admin_subs','admin_featured'].includes(data))
    return answer(T,cb.id,'⛔ غير مصرح',true);

  if(data.startsWith('ap:pending:')) {
    if(!isMod(u)) return answer(T,cb.id,'⛔ غير مصرح',true);
    return showPendingProducts(T,cid,mid,kv,parseInt(data.split(':')[2])||0);
  }
  if(data.startsWith('approve:')) {
    if(!isMod(u)) return answer(T,cb.id,'⛔ غير مصرح',true);
    const pid=data.split(':')[1];
    const ok=await approveProduct(T,kv,pid,true,uid);
    await answer(T,cb.id,ok?'✅ تمت الموافقة':'⚠️ خطأ');
    return showPendingProducts(T,cid,mid,kv,0);
  }
  if(data.startsWith('reject:')) {
    if(!isMod(u)) return answer(T,cb.id,'⛔ غير مصرح',true);
    const pid=data.split(':')[1];
    await approveProduct(T,kv,pid,false,uid);
    await answer(T,cb.id,'❌ تم الرفض');
    return showPendingProducts(T,cid,mid,kv,0);
  }
  if(data==='admin_reports')  return isMod(u)?showAdminReports(T,cid,mid,kv):null;
  if(data==='admin_stats')    return isAdmin(u)?showAdminStats(T,cid,mid,kv):null;
  if(data==='admin_mods')     return isOwner(u)||getAdminLevel(u)>=3?showAdminModPanel(T,cid,mid,kv):null;
  if(data==='admin_subs')     return isOwner(u)||getAdminLevel(u)>=3?showAdminSubs(T,cid,mid,kv):null;
  if(data==='admin_featured') return isAdmin(u)?showAdminFeatured(T,cid,mid,kv):null;

  if(data==='do_feature') {
    if(!isAdmin(u)) return;
    await setState(kv,uid,{step:'featuring'});
    return edit(T,cid,mid,'⭐ أرسل معرف المنتج (ID) لتمييزه:',{reply_markup:ik([[b('❌ إلغاء','cancel')]])});
  }
  if(data.startsWith('unfeat:')) {
    if(!isAdmin(u)) return;
    await listRm(kv,'featured',data.split(':')[1]);
    await answer(T,cb.id,'✅ تمت الإزالة');
    return showAdminFeatured(T,cid,mid,kv);
  }
  if(data.startsWith('resolve_rep:')) {
    if(!isMod(u)) return;
    const rid=data.split(':')[1];
    await listRm(kv,'reports:all',rid);
    await kdel(kv,`rep:${rid}`);
    await answer(T,cb.id,'✅ تم حل البلاغ');
    return showAdminReports(T,cid,mid,kv);
  }
  if(data.startsWith('set_sub:')) {
    const [,targetId,plan]=data.split(':');
    if(PLANS[plan]){
      const tu=await getUser(kv,targetId);tu.subscription=plan;await saveUser(kv,targetId,tu);
      if(tu.storeId){const ts=await getStore(kv,tu.storeId);if(ts){ts.subscription=plan;await saveStore(kv,tu.storeId,ts);}}
      await notify(T,targetId,`🎉 تم ترقية اشتراكك إلى ${PLANS[plan].name} ${PLANS[plan].badge}`);
      await answer(T,cb.id,'✅ تم');
    }
    return showAdmin(T,cid,mid,kv,u);
  }

  // edit store page
  if(data.startsWith('edit_store:')) {
    await setState(kv,uid,{step:'edit_store_desc',storeId:data.split(':')[1]});
    return send(T,cid,'✏️ اكتب الوصف الجديد للمتجر (أو /skip للتخطى):',{reply_markup:ik([[b('❌ إلغاء','cancel')]])});
  }
}

// ═══════════════════════════════════════════════════════
// معالج الرسائل
// ═══════════════════════════════════════════════════════

async function onMessage(env,update) {
  const {T,kv}=env._c;
  const msg=update.message;
  const cid=msg.chat.id;
  const uid=msg.from.id;
  const txt=msg.text||'';

  const u=await getUser(kv,uid);
  if(u.firstName!==msg.from.first_name||u.username!==msg.from.username){
    u.firstName=msg.from.first_name;
    u.username=msg.from.username;
    await saveUser(kv,uid,u);
  }

  // /start
  if(txt.startsWith('/start')) {
    await clearState(kv,uid);
    const param=txt.split(' ')[1];
    if(param?.startsWith('p_')) {
      await showMain(T,cid,null,u,kv);
      return showProduct(T,cid,kv,param.slice(2),uid,null);
    }
    return showMain(T,cid,null,u,kv);
  }

  // Admin commands
  if(isAdmin(u)) {
    if(txt.startsWith('/setsub ')) {
      const [,tid,plan]=txt.split(' ');
      if(tid&&PLANS[plan]){
        const tu=await getUser(kv,tid);tu.subscription=plan;await saveUser(kv,tid,tu);
        if(tu.storeId){const ts=await getStore(kv,tu.storeId);if(ts){ts.subscription=plan;await saveStore(kv,tu.storeId,ts);}}
        try{await notify(T,tid,`🎉 تم ترقية اشتراكك إلى ${PLANS[plan].name} ${PLANS[plan].badge}`);}catch{}
        return send(T,cid,`✅ تم تعيين اشتراك ${tid} إلى ${PLANS[plan].name}`);
      }
      return send(T,cid,'⚠️ /setsub [معرف] [free|pro|business]');
    }
    if(txt.startsWith('/setmod ')) {
      const [,tid,role]=txt.split(' ');
      if(tid){
        const tu=await getUser(kv,tid);
        tu.adminRole=role==='remove'?null:(ADMIN_ROLES[role]?role:null);
        await saveUser(kv,tid,tu);
        if(tu.adminRole) await notify(T,tid,`✅ تم تعيينك كـ ${tu.adminRole==='admin'?'مدير':'مشرف'} في سوقنا.`);
        return send(T,cid,`✅ تم`);
      }
    }
    if(txt.startsWith('/stats')) {
      const [p,s,r,rep]=await Promise.all([
        getList(kv,'products:all').then(l=>l.length),
        getList(kv,'stores:all').then(l=>l.length),
        getList(kv,'restaurants:all').then(l=>l.length),
        getList(kv,'reports:all').then(l=>l.length),
      ]);
      return send(T,cid,`📊 <b>سوقنا — الإحصائيات</b>\n\n📦 المنتجات: ${p}\n🏪 المتاجر: ${s}\n🍔 المطاعم: ${r}\n🚩 البلاغات: ${rep}`);
    }
    if(txt.startsWith('/broadcast ')) {
      const msg2=txt.slice(11);
      return send(T,cid,`📢 <b>تم إرسال الإشعار الجماعي</b>\n\n${msg2}\n\n<i>ملاحظة: الإرسال الجماعي الفعلي يحتاج قائمة المستخدمين.</i>`);
    }
  }

  // State machine
  const st=await getState(kv,uid);
  if(!st?.step) return showMain(T,cid,null,u,kv);

  // ── صور المنتج ────────────────────────────────────────
  if(st.step==='add_photos'&&msg.photo) {
    const photos=st.photos||[];
    if(photos.length<5){
      photos.push(msg.photo[msg.photo.length-1].file_id);
      await setState(kv,uid,{...st,photos});
      return send(T,cid,`✅ صورة ${photos.length}/5\nأرسل المزيد أو اضغط التالي:`,{
        reply_markup:ik([[b('✅ التالي','a_next_name')],[b('❌ إلغاء','cancel')]])
      });
    }
    return;
  }

  // ── بحث ──────────────────────────────────────────────
  if(st.step==='search'){
    await clearState(kv,uid);
    return doSearch(T,cid,kv,txt);
  }

  // ── تمييز منتج (إدارة) ───────────────────────────────
  if(st.step==='featuring'&&isAdmin(u)){
    await clearState(kv,uid);
    const prod=await getProd(kv,txt.trim());
    if(prod&&prod.status==='approved'){
      await listAdd(kv,'featured',prod.id,50);
      return send(T,cid,`⭐ تم تمييز: <b>${prod.name}</b>`,{reply_markup:ik([[b('🔙 لوحة الإدارة','admin')]])});
    }
    return send(T,cid,'⚠️ لم يُعثر على المنتج أو لم تتم الموافقة عليه بعد.');
  }

  // ── إضافة منتج — خطوات النص ──────────────────────────
  if(st.step==='add_name') {
    await setState(kv,uid,{...st,step:'add_description',name:txt});
    return send(T,cid,`✅ الاسم: <b>${txt}</b>\n\n📍 الخطوة 5/7 — اكتب وصف المنتج:`,{reply_markup:ik([[b('❌ إلغاء','cancel')]])});
  }
  if(st.step==='add_description') {
    await setState(kv,uid,{...st,step:'add_price',description:txt});
    return send(T,cid,`✅ الوصف حُفظ\n\n📍 الخطوة 6/7 — اكتب السعر بالشيكل (₪):`,{reply_markup:ik([[b('❌ إلغاء','cancel')]])});
  }
  if(st.step==='add_price') {
    const price=parseFloat(txt);
    if(isNaN(price)||price<0) return send(T,cid,'⚠️ أدخل رقماً صحيحاً للسعر:');
    await setState(kv,uid,{...st,step:'add_city',price});
    const cityRows=[];
    for(let i=0;i<CITIES.length;i+=3) cityRows.push(CITIES.slice(i,i+3).map(c=>b(c,`a_city:${c}`)));
    cityRows.push([b('❌ إلغاء','cancel')]);
    return send(T,cid,`✅ السعر: <b>${price} ₪</b>\n\n📍 الخطوة 7/7 — اختر المدينة:`,{reply_markup:ik(cityRows)});
  }

  // ── إنشاء متجر — خطوات النص ──────────────────────────
  if(st.step==='store_name') {
    await setState(kv,uid,{...st,step:'store_desc',name:txt});
    return send(T,cid,`✅ الاسم: <b>${txt}</b>\n\nاكتب وصف المتجر:`,{reply_markup:ik([[b('⏭️ تخطى','s_skip_desc')],[b('❌ إلغاء','cancel')]])});
  }
  if(st.step==='store_desc') {
    await setState(kv,uid,{...st,step:'store_category',desc:txt});
    const rows=[];
    for(let i=0;i<STORE_CATEGORIES.length;i+=2){
      const r=[b(STORE_CATEGORIES[i].name,`s_cat:${STORE_CATEGORIES[i].id}`)];
      if(STORE_CATEGORIES[i+1]) r.push(b(STORE_CATEGORIES[i+1].name,`s_cat:${STORE_CATEGORIES[i+1].id}`));
      rows.push(r);
    }
    rows.push([b('❌ إلغاء','cancel')]);
    return send(T,cid,'اختر تصنيف المتجر:',{reply_markup:ik(rows)});
  }
  if(st.step==='store_hours') {
    await setState(kv,uid,{...st,step:'store_city',hours:txt});
    const cityRows=[];
    for(let i=0;i<CITIES.length;i+=3) cityRows.push(CITIES.slice(i,i+3).map(c=>b(c,`s_city:${c}`)));
    cityRows.push([b('❌ إلغاء','cancel')]);
    return send(T,cid,'اختر مدينة المتجر:',{reply_markup:ik(cityRows)});
  }

  // ── تعديل وصف المتجر ─────────────────────────────────
  if(st.step==='edit_store_desc') {
    const storeId=st.storeId;
    const s=await getStore(kv,storeId);
    if(s&&s.ownerId===uid){s.description=txt;await saveStore(kv,storeId,s);}
    await clearState(kv,uid);
    return send(T,cid,'✅ تم تحديث وصف المتجر.',{reply_markup:ik([[b('🏪 متجري','my_store')]])});
  }

  // default
  return showMain(T,cid,null,u,kv);
}

// Callback for skip desc store
async function handleSkipStoreDesc(T,cid,kv,uid) {
  const st=await getState(kv,uid);
  await setState(kv,uid,{...st,step:'store_category',desc:'—'});
  const rows=[];
  for(let i=0;i<STORE_CATEGORIES.length;i+=2){
    const r=[b(STORE_CATEGORIES[i].name,`s_cat:${STORE_CATEGORIES[i].id}`)];
    if(STORE_CATEGORIES[i+1]) r.push(b(STORE_CATEGORIES[i+1].name,`s_cat:${STORE_CATEGORIES[i+1].id}`));
    rows.push(r);
  }
  rows.push([b('❌ إلغاء','cancel')]);
  return send(T,cid,'اختر تصنيف المتجر:',{reply_markup:ik(rows)});
}

// ═══════════════════════════════════════════════════════
// Main Export
// ═══════════════════════════════════════════════════════

export default {
  async fetch(request,env) {
    if(request.method==='GET')
      return new Response('🇵🇸 سوقنا — Shopify فلسطين في Telegram ✅',{headers:{'Content-Type':'text/plain;charset=utf-8'}});

    const T=env.BOT_TOKEN;
    const kv=env.DB;
    if(!T) return new Response('❌ BOT_TOKEN missing',{status:500});
    if(!kv) return new Response('❌ KV (DB) not bound',{status:500});

    let update;
    try{update=await request.json();}catch{return new Response('Bad JSON',{status:400});}

    env._c={T,kv};

    try {
      if(update.callback_query) {
        const data=update.callback_query.data;
        const cid=update.callback_query.message.chat.id;
        const uid=update.callback_query.from.id;

        if(data==='s_skip_desc') {
          await answer(T,update.callback_query.id);
          await handleSkipStoreDesc(T,cid,kv,uid);
        } else {
          await onCallback(env,update);
        }
      } else if(update.message) {
        await onMessage(env,update);
      }
    } catch(e) {
      console.error('Error:',e?.message||e);
    }

    return new Response('ok',{status:200});
  },
};
