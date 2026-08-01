// ═══════════════════════════════════════════════════════
//   سوقنا — سوق فلسطين في تيليجرام 🇵🇸
//   النسخة الجديدة — حسب المواصفة الكاملة
// ═══════════════════════════════════════════════════════

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) { console.error('❌ BOT_TOKEN مفقود!'); process.exit(1); }

// ── المالك الوحيد ──────────────────────────────────────
const OWNER_ID = 6668195885;
const UPGRADE_USERNAME = 'Anas_Hc';

// ── التصنيفات الثابتة للمتاجر ─────────────────────────
const FIXED_STORE_CATS = [
  { id: 'restaurant', name: '🍔 مطعم وكافيه' },
  { id: 'retail',     name: '🛍️ بيع بالتجزئة' },
  { id: 'pharmacy',   name: '💊 صيدلية' },
  { id: 'wholesale',  name: '📦 بيع بالجملة' },
  { id: 'supermarket',name: '🏪 سوبرماركت' },
  { id: 'bakery',     name: '🍞 مخبز وحلويات' },
  { id: 'workshop',   name: '🔧 ورشة وصيانة' },
];

// ── التصنيفات الثابتة للمنتجات ────────────────────────
const FIXED_PROD_CATS = [
  { id: 'clothes',     name: '👕 ملابس' },
  { id: 'electronics', name: '📱 إلكترونيات' },
  { id: 'food',        name: '🍱 أغذية ومؤن' },
  { id: 'home',        name: '🏠 المنزل والأثاث' },
  { id: 'kids',        name: '👶 أطفال وألعاب' },
  { id: 'beauty',      name: '💄 تجميل وعناية' },
  { id: 'books',       name: '📚 كتب وقرطاسية' },
  { id: 'sports',      name: '⚽ رياضة' },
  { id: 'tools',       name: '🔧 أدوات ومعدات' },
];

// ── الخدمات ─────────────────────────────────────────────
const SERVICE_TYPES = [
  { id: 'programming', name: '💻 برمجة وتقنية' },
  { id: 'design',      name: '🎨 تصميم وإبداع' },
  { id: 'maintenance', name: '🔧 صيانة وإصلاح' },
  { id: 'cleaning',    name: '🧹 نظافة ومنزل' },
  { id: 'education',   name: '📚 تعليم ودروس' },
  { id: 'photography', name: '📷 تصوير وفيديو' },
  { id: 'transport',   name: '🚚 نقل وتوصيل' },
  { id: 'sewing',      name: '🧵 خياطة وتفصيل' },
  { id: 'other_svc',   name: '📋 أخرى' },
];

// ── المدن الثابتة ─────────────────────────────────────
const FIXED_CITIES = [
  'غزة','خانيونس','رفح','جباليا','دير البلح',
  'النصيرات','بيت حانون','بيت لاهيا','المغازي','البريج',
  'رام الله','نابلس','الخليل','بيت لحم','جنين',
  'طولكرم','أريحا','القدس','قلقيلية','سلفيت',
  'يافا','حيفا','الناصرة',
];

// ── خطط الاشتراك ──────────────────────────────────────
const PLANS = {
  free:     { name: '🟢 مجاني',  badge: '',   stores: 2, products: 10, price: 0  },
  pro:      { name: '🔵 برو',    badge: '⭐', stores: 5, products: 50, price: 4  },
  business: { name: '🟣 أعمال', badge: '✅', stores: 9, products: 999,price: 10 },
};

// ═══════════════════════════════════════════════════════
// ذاكرة مؤقتة
// ═══════════════════════════════════════════════════════
class MemKV {
  constructor() { this._s = new Map(); }
  async get(k)    { const v=this._s.get(k); return v===undefined?null:JSON.parse(v); }
  async put(k,v)  { this._s.set(k,JSON.stringify(v)); }
  async delete(k) { this._s.delete(k); }
}
const kv = new MemKV();

// ═══════════════════════════════════════════════════════
// Telegram API
// ═══════════════════════════════════════════════════════
async function tg(method,body={}) {
  try {
    const r=await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
    });
    return r.json();
  } catch(e){ console.error(`tg(${method}):`,e.message); return {ok:false}; }
}
const send   = (cid,txt,ex={}) => tg('sendMessage',{chat_id:cid,text:txt,parse_mode:'HTML',...ex});
const edit   = (cid,mid,txt,ex={}) => tg('editMessageText',{chat_id:cid,message_id:mid,text:txt,parse_mode:'HTML',...ex});
const answer = (id,txt='',al=false) => tg('answerCallbackQuery',{callback_query_id:id,text:txt,show_alert:al});
const photo  = (cid,p,cap,ex={}) => tg('sendPhoto',{chat_id:cid,photo:p,caption:cap,parse_mode:'HTML',...ex});
const notify = (uid,txt) => send(uid,txt);

// ═══════════════════════════════════════════════════════
// Keyboard Helpers
// ═══════════════════════════════════════════════════════
const ik   = rows => ({inline_keyboard:rows});
const b    = (t,d) => ({text:t,callback_data:String(d).slice(0,64)});
const burl = (t,u) => ({text:t,url:u});
const back = (to='main') => b('🔙 رجوع',to);

// ═══════════════════════════════════════════════════════
// KV Helpers
// ═══════════════════════════════════════════════════════
const kget  = k    => kv.get(k);
const kset  = (k,v)=> kv.put(k,v);
const kdel  = k    => kv.delete(k);
const genId = ()   => Date.now().toString(36)+Math.random().toString(36).slice(2,5);

async function getUser(uid) {
  return await kget(`u:${uid}`) || {
    id:uid,role:'customer',adminRole:null,subscription:'free',
    savedProducts:[],savedStores:[],history:[],createdAt:Date.now()
  };
}
const saveUser = (uid,d) => kset(`u:${uid}`,d);

async function getState(uid) { return await kget(`st:${uid}`) || {}; }
const setState   = (uid,s) => kset(`st:${uid}`,s);
const clearState = uid     => kdel(`st:${uid}`);

const getProd   = id => kget(`p:${id}`);
const saveProd  = (id,d) => kset(`p:${id}`,d);
const getStore  = id => kget(`s:${id}`);
const saveStore = (id,d) => kset(`s:${id}`,d);
const getOrder  = id => kget(`o:${id}`);
const saveOrder = (id,d) => kset(`o:${id}`,d);

async function listAdd(key,id,max=500) {
  const l=await kget(key)||[];
  if(!l.includes(id)){l.push(id);await kset(key,l.slice(-max));}
}
async function listRm(key,id) {
  const l=await kget(key)||[];
  await kset(key,l.filter(x=>x!==id));
}
const getList = key => kget(key).then(v=>v||[]);

// ── صلاحيات ──────────────────────────────────────────
const isOwner = u => Number(u.id)===OWNER_ID;
const isAdmin = u => isOwner(u)||['admin','moderator'].includes(u.adminRole);
const isMod   = u => isOwner(u)||['admin','moderator'].includes(u.adminRole);

// ═══════════════════════════════════════════════════════
// تطبيع النص العربي للمطابقة الذكية
// ═══════════════════════════════════════════════════════
function normalizeAr(text) {
  return (text||'')
    .replace(/[أإآ]/g,'ا')
    .replace(/ة/g,'ه')
    .replace(/ى/g,'ي')
    .replace(/[\u064B-\u065F\u0670]/g,'') // إزالة التشكيل
    .replace(/\s+/g,' ')
    .trim();
}

// البحث الذكي عن تصنيف مشابه
async function findSimilarCat(text,listKey) {
  const norm=normalizeAr(text);
  const cats=await getList(listKey);
  return cats.find(c=>normalizeAr(c.name)===norm||normalizeAr(c.name).includes(norm)||norm.includes(normalizeAr(c.name)));
}

// البحث الذكي عن مدينة مشابهة
async function findSimilarCity(text) {
  const norm=normalizeAr(text);
  const allFixed=FIXED_CITIES.find(c=>normalizeAr(c)===norm);
  if(allFixed) return allFixed;
  const custom=await getList('cities:custom');
  return custom.find(c=>normalizeAr(c)===norm);
}

// ═══════════════════════════════════════════════════════
// نص الرئيسية
// ═══════════════════════════════════════════════════════
function mainText(u) {
  const plan=PLANS[u.subscription||'free'];
  return `🏠 <b>سوقنا</b> — سوق فلسطين في تيليجرام 🇵🇸\n\nاشتراكك: ${plan.name} ${plan.badge}`;
}

function mainKb(u) {
  const rows=[
    [b('🏪 المتاجر','stores'),       b('🛍️ السوق','market')],
    [b('🛠️ الخدمات','services'),    b('🍔 المطاعم','restaurants')],
    [b('⭐ المنتجات المميزة','featured'), b('🔥 العروض','offers')],
    [b('➕ أضف إعلان','add'),        b('👤 حسابي','account')],
    [b('🔍 بحث','search'),           b('📋 التصنيفات المتاحة','all_cats')],
  ];
  if(isAdmin(u)) rows.push([b('⚙️ لوحة الإدارة','admin')]);
  return ik(rows);
}

async function showMain(cid,mid,u) {
  const txt=mainText(u), kb=mainKb(u);
  return mid?edit(cid,mid,txt,{reply_markup:kb}):send(cid,txt,{reply_markup:kb});
}

// ═══════════════════════════════════════════════════════
// التصنيفات المتاحة
// ═══════════════════════════════════════════════════════
async function showAllCats(cid,mid) {
  const customStore=await getList('store_cats:custom');
  const customProd=await getList('prod_cats:custom');
  let txt=`📋 <b>التصنيفات المتاحة</b>\n\n`;
  txt+=`<b>🏪 تصنيفات المتاجر:</b>\n`;
  FIXED_STORE_CATS.forEach(c=>{txt+=`• ${c.name}\n`;});
  customStore.forEach(c=>{txt+=`• ${c.name} *(مضاف)*\n`;});
  txt+=`\n<b>🛍️ تصنيفات المنتجات:</b>\n`;
  FIXED_PROD_CATS.forEach(c=>{txt+=`• ${c.name}\n`;});
  customProd.forEach(c=>{txt+=`• ${c.name} *(مضاف)*\n`;});
  const kb=ik([[back()]]);
  return mid?edit(cid,mid,txt,{reply_markup:kb}):send(cid,txt,{reply_markup:kb});
}

// ═══════════════════════════════════════════════════════
// المتاجر
// ═══════════════════════════════════════════════════════
async function showStoresMenu(cid,mid) {
  const txt=`🏪 <b>المتاجر</b>\n\nاختر:`;
  const kb=ik([[b('🏪 المتاجر المتاحة','stores_list:0')],[b('➕ أنشئ متجرك','create_store')],[back()]]);
  return mid?edit(cid,mid,txt,{reply_markup:kb}):send(cid,txt,{reply_markup:kb});
}

async function showStoresList(cid,mid,page=0) {
  const PAGE=20;
  const ids=await getList('stores:all');
  if(!ids.length){
    const txt=`🏪 لا توجد متاجر بعد. كن أول من يضيف!`;
    return mid?edit(cid,mid,txt,{reply_markup:ik([[b('➕ أنشئ متجرك','create_store')],[back('stores')]])}):
               send(cid,txt,{reply_markup:ik([[b('➕ أنشئ متجرك','create_store')],[back('stores')]])});
  }
  const pageIds=ids.slice(page*PAGE,(page+1)*PAGE);
  const stores=(await Promise.all(pageIds.map(id=>getStore(id)))).filter(Boolean);
  const total=ids.length;
  let txt=`🏪 <b>المتاجر المتاحة</b> (${total})\nالصفحة ${page+1}/${Math.ceil(total/PAGE)}\n\n`;
  const rows=stores.map(s=>{
    const plan=PLANS[s.subscription||'free'];
    return [b(`${plan.badge?plan.badge+' ':''}${s.name} | ${s.city}`,`store:${s.id}`)];
  });
  const nav=[];
  if(page>0) nav.push(b('◀️ السابق',`stores_list:${page-1}`));
  if((page+1)*PAGE<total) nav.push(b('التالي ▶️',`stores_list:${page+1}`));
  if(nav.length) rows.push(nav);
  rows.push([back('stores')]);
  return mid?edit(cid,mid,txt,{reply_markup:ik(rows)}):send(cid,txt,{reply_markup:ik(rows)});
}

async function showStore(cid,storeId,uid,cbId) {
  const s=await getStore(storeId);
  if(!s){if(cbId)await answer(cbId,'⚠️ المتجر غير موجود',true);return;}
  const u=await getUser(uid);
  const plan=PLANS[s.subscription||'free'];
  const catName=getCatName(s.category,'store');
  const txt=`🏪 <b>${plan.badge?plan.badge+' ':''}${s.name}</b>\n\n`+
    `📋 ${catName}\n📍 ${s.city}\n`+
    `${s.hours?`🕐 ${s.hours}\n`:''}`+
    `📝 ${s.description||'—'}\n\n`+
    `👁️ ${s.views||0} مشاهدة`;

  // زيادة المشاهدات
  s.views=(s.views||0)+1; await saveStore(storeId,s);

  const isSaved=(u.savedStores||[]).includes(storeId);
  const rows=[];
  if(s.username) rows.push([burl('💬 تواصل مع المتجر',`https://t.me/${s.username}`)]);
  rows.push([b('📦 عرض منتجات المتجر',`store_prods:${storeId}:0`)]);
  rows.push([
    b(isSaved?'💔 إزالة من المحفوظات':`❤️ حفظ المتجر`,isSaved?`unsave_store:${storeId}`:`save_store:${storeId}`),
    b('🚩 تبليغ',`report_store_q:${storeId}`),
  ]);
  if(isAdmin(u)) rows.push([b('🗑️ حذف المتجر',`del_store_c:${storeId}`)]);
  rows.push([back('stores_list:0')]);

  if(s.cover){try{return await photo(cid,s.cover,txt,{reply_markup:ik(rows)});}catch{}}
  return send(cid,txt,{reply_markup:ik(rows)});
}

async function showStoreProducts(cid,mid,storeId,page=0) {
  const PAGE=15;
  const s=await getStore(storeId);
  if(!s) return;
  const allIds=s.products||[];
  const approved=(await Promise.all(allIds.map(id=>getProd(id)))).filter(p=>p&&p.status==='approved');
  if(!approved.length){
    const noTxt=`📦 لا توجد منتجات في هذا المتجر.`;
    const noKb=ik([[back(`store:${storeId}`)]]);
    return mid?edit(cid,mid,noTxt,{reply_markup:noKb}):send(cid,noTxt,{reply_markup:noKb});
  }
  const pageProds=approved.slice(page*PAGE,(page+1)*PAGE);
  let txt=`📦 <b>منتجات ${s.name}</b> (${approved.length})\n\n`;
  const rows=pageProds.map(p=>[b(`${p.name.slice(0,28)} | ${p.price}₪`,`prod:${p.id}`)]);
  const nav=[];
  if(page>0) nav.push(b('◀️',`store_prods:${storeId}:${page-1}`));
  if((page+1)*PAGE<approved.length) nav.push(b('▶️',`store_prods:${storeId}:${page+1}`));
  if(nav.length) rows.push(nav);
  rows.push([back(`store:${storeId}`)]);
  return mid?edit(cid,mid,txt,{reply_markup:ik(rows)}):send(cid,txt,{reply_markup:ik(rows)});
}

// ═══════════════════════════════════════════════════════
// إنشاء متجر — Flow كامل
// ═══════════════════════════════════════════════════════
async function startCreateStore(cid,mid,uid) {
  const u=await getUser(uid);
  const plan=PLANS[u.subscription||'free'];
  const myStores=await getList(`user:${uid}:stores`);
  if(myStores.length>=plan.stores){
    const txt=`⚠️ <b>وصلت للحد الأقصى!</b>\n\nخطتك تسمح بـ ${plan.stores} متاجر فقط.\nرقّ اشتراكك للمزيد!`;
    const kb=ik([[b('⭐ الاشتراك','subscription')],[back('stores')]]);
    return mid?edit(cid,mid,txt,{reply_markup:kb}):send(cid,txt,{reply_markup:kb});
  }
  await setState(uid,{step:'sc_name'});
  const txt=`🏪 <b>إنشاء متجر</b>\n\nالخطوة 1 — اكتب اسم المتجر:`;
  const kb=ik([[b('❌ إلغاء','cancel')]]);
  return mid?edit(cid,mid,txt,{reply_markup:kb}):send(cid,txt,{reply_markup:kb});
}

async function showStoreCatPicker(cid,uid) {
  const customCats=await getList('store_cats:custom');
  const rows=[];
  for(let i=0;i<FIXED_STORE_CATS.length;i+=2){
    const r=[b(FIXED_STORE_CATS[i].name,`sc_cat:${FIXED_STORE_CATS[i].id}`)];
    if(FIXED_STORE_CATS[i+1]) r.push(b(FIXED_STORE_CATS[i+1].name,`sc_cat:${FIXED_STORE_CATS[i+1].id}`));
    rows.push(r);
  }
  // Custom categories
  customCats.forEach(c=>rows.push([b(c.name,`sc_cat:custom_${c.id}`)]));
  rows.push([b('📋 أخرى (تصنيف مخصص)','sc_cat_custom')]);
  rows.push([b('❌ إلغاء','cancel')]);
  return send(cid,`اختر تصنيف المتجر:`,{reply_markup:ik(rows)});
}

// ═══════════════════════════════════════════════════════
// السوق
// ═══════════════════════════════════════════════════════
async function showMarket(cid,mid) {
  const customCats=await getList('prod_cats:custom');
  const rows=[];
  for(let i=0;i<FIXED_PROD_CATS.length;i+=2){
    const r=[b(FIXED_PROD_CATS[i].name,`mcat:${FIXED_PROD_CATS[i].id}`)];
    if(FIXED_PROD_CATS[i+1]) r.push(b(FIXED_PROD_CATS[i+1].name,`mcat:${FIXED_PROD_CATS[i+1].id}`));
    rows.push(r);
  }
  if(customCats.length) rows.push([b('📋 التصنيفات المتاحة','mcat_available')]);
  rows.push([b('➕ إضافة تصنيف','mcat_add')]);
  rows.push([back()]);
  const txt=`🛍️ <b>السوق</b>\n\nاختر التصنيف:`;
  return mid?edit(cid,mid,txt,{reply_markup:rows.length?ik(rows):ik([[back()]])}):
             send(cid,txt,{reply_markup:ik(rows)});
}

async function showMarketCustomCats(cid,mid) {
  const cats=await getList('prod_cats:custom');
  if(!cats.length){
    return mid?edit(cid,mid,'لا توجد تصنيفات مضافة بعد.',{reply_markup:ik([[back('market')]])}):
               send(cid,'لا توجد تصنيفات مضافة.',{reply_markup:ik([[back('market')]])});
  }
  const rows=cats.map(c=>[b(c.name,`mcat:custom_${c.id}`)]);
  rows.push([back('market')]);
  return mid?edit(cid,mid,`📋 <b>التصنيفات المتاحة</b>:`,{reply_markup:ik(rows)}):
             send(cid,`📋 <b>التصنيفات المتاحة</b>:`,{reply_markup:ik(rows)});
}

async function showMarketCat(cid,mid,catKey,uid) {
  const catName=getCatName(catKey,'prod');
  const ids=await getList(`pcat:${catKey}`);
  const approved=(await Promise.all(ids.slice(0,15).map(id=>getProd(id)))).filter(p=>p&&p.status==='approved');
  let txt=`${catName}\n\n${approved.length?`${approved.length} منتج`:'لا توجد منتجات بعد.'}`;
  const rows=approved.map(p=>[b(`${p.name.slice(0,28)} | ${p.price}₪`,`prod:${p.id}`)]);
  rows.push([b('➕ أضف منتج',`add_to_cat:${catKey}`), back('market')]);
  return mid?edit(cid,mid,txt,{reply_markup:ik(rows)}):send(cid,txt,{reply_markup:ik(rows)});
}

// ═══════════════════════════════════════════════════════
// إضافة منتج — Flow كامل (7 خطوات)
// ═══════════════════════════════════════════════════════
async function startAddProduct(cid,mid,uid,catKey=null) {
  const u=await getUser(uid);
  const plan=PLANS[u.subscription||'free'];
  const myProds=await getList(`user:${uid}:prods`);
  if(myProds.length>=plan.products){
    const txt=`⚠️ وصلت لحد الإعلانات (${plan.products}) في خطتك.\nرقّ للمزيد!`;
    const kb=ik([[b('⭐ الاشتراك','subscription')],[back()]]);
    return mid?edit(cid,mid,txt,{reply_markup:kb}):send(cid,txt,{reply_markup:kb});
  }
  await setState(uid,{step:'ap_condition',catKey});
  const txt=`➕ <b>إضافة منتج</b>\n\n📍 الخطوة 1/7 — حالة المنتج؟`;
  const kb=ik([[b('✨ جديد','ap_cond:new'),b('♻️ مستعمل','ap_cond:used'),b('⚠️ معيب','ap_cond:damaged')],[b('❌ إلغاء','cancel')]]);
  return mid?edit(cid,mid,txt,{reply_markup:kb}):send(cid,txt,{reply_markup:kb});
}

// ═══════════════════════════════════════════════════════
// عرض المنتج
// ═══════════════════════════════════════════════════════
async function showProduct(cid,prodId,uid,cbId) {
  const p=await getProd(prodId);
  if(!p){if(cbId)await answer(cbId,'⚠️ المنتج غير موجود',true);return;}
  p.views=(p.views||0)+1; await saveProd(prodId,p);
  const u=await getUser(uid);
  u.history=[prodId,...(u.history||[]).filter(x=>x!==prodId)].slice(0,20);
  await saveUser(uid,u);

  const store=p.storeId?await getStore(p.storeId):null;
  const cond={new:'✨ جديد',used:'♻️ مستعمل',damaged:'⚠️ معيب'}[p.condition]||'';
  const txt=`📦 <b>${p.name}</b>\n\n`+
    `💰 <b>${p.price} ₪</b>\n`+
    `${store?`🏪 ${store.name}\n`:''}`+
    `📍 ${p.city}\n`+
    `${cond}\n`+
    `👁️ ${p.views||0} مشاهدة\n\n`+
    `📝 ${(p.description||'').slice(0,200)}`;

  const isSaved=(u.savedProducts||[]).includes(prodId);
  const isOwner_=p.sellerId===uid;
  const rows=[];
  if(p.sellerUsername) rows.push([burl('💬 تواصل مع البائع',`https://t.me/${p.sellerUsername}`)]);
  rows.push([
    b(isSaved?'💔 إزالة':'❤️ حفظ',isSaved?`unsave_prod:${prodId}`:`save_prod:${prodId}`),
    b('🔗 مشاركة',`share_prod:${prodId}`),
  ]);
  if(store) rows.push([b('🏪 عرض المتجر',`store:${store.id}`)]);
  if(!isOwner_&&p.status==='approved') rows.push([b('🛒 طلب المنتج',`order:${prodId}`)]);
  if(isOwner_) rows.push([b('✏️ تعديل',`edit_prod:${prodId}`),b('🗑️ حذف',`del_prod_c:${prodId}`)]);
  rows.push([b('🚩 تبليغ',`report_prod_q:${prodId}`), back(`mcat:${p.catKey||p.category}`)]);

  if(p.photos?.length){
    try{return await photo(cid,p.photos[0],txt,{reply_markup:ik(rows)});}catch{}
  }
  return send(cid,txt,{reply_markup:ik(rows)});
}

// ═══════════════════════════════════════════════════════
// الخدمات
// ═══════════════════════════════════════════════════════
async function showServices(cid,mid) {
  const rows=[];
  for(let i=0;i<SERVICE_TYPES.length;i+=2){
    const r=[b(SERVICE_TYPES[i].name,`svc:${SERVICE_TYPES[i].id}`)];
    if(SERVICE_TYPES[i+1]) r.push(b(SERVICE_TYPES[i+1].name,`svc:${SERVICE_TYPES[i+1].id}`));
    rows.push(r);
  }
  rows.push([back()]);
  const txt=`🛠️ <b>الخدمات</b>\n\nاختر نوع الخدمة:`;
  return mid?edit(cid,mid,txt,{reply_markup:ik(rows)}):send(cid,txt,{reply_markup:ik(rows)});
}

async function showServiceType(cid,mid,typeId,uid) {
  const label=SERVICE_TYPES.find(s=>s.id===typeId)?.name||typeId;
  const ids=await getList(`svc:${typeId}`);
  const svcs=(await Promise.all(ids.slice(0,15).map(id=>getProd(id)))).filter(p=>p&&p.status==='approved');
  let txt=`${label}\n\n${svcs.length?`${svcs.length} خدمة`:'لا توجد خدمات بعد.'}`;
  const rows=svcs.map(s=>[b(`${s.name.slice(0,28)} | ${s.price}₪`,`prod:${s.id}`)]);
  rows.push([b('➕ أضف خدمتك',`add_svc:${typeId}`), back('services')]);
  return mid?edit(cid,mid,txt,{reply_markup:ik(rows)}):send(cid,txt,{reply_markup:ik(rows)});
}

// ═══════════════════════════════════════════════════════
// المطاعم
// ═══════════════════════════════════════════════════════
async function showRestaurants(cid,mid) {
  const ids=await getList('restaurants:all');
  if(!ids.length){
    const txt=`🍔 <b>المطاعم</b>\n\nلا توجد مطاعم بعد.`;
    return mid?edit(cid,mid,txt,{reply_markup:ik([[b('➕ أضف مطعمك','create_restaurant')],[back()]])}):
               send(cid,txt,{reply_markup:ik([[b('➕ أضف مطعمك','create_restaurant')],[back()]])});
  }
  const stores=(await Promise.all(ids.slice(0,20).map(id=>getStore(id)))).filter(Boolean);
  const txt=`🍔 <b>المطاعم</b> — ${ids.length}\n\n`;
  const rows=stores.map(s=>[b(`🍽️ ${s.name.slice(0,28)} | ${s.city}`,`store:${s.id}`)]);
  rows.push([b('➕ أضف مطعمك','create_restaurant'), back()]);
  return mid?edit(cid,mid,txt,{reply_markup:ik(rows)}):send(cid,txt,{reply_markup:ik(rows)});
}

// ═══════════════════════════════════════════════════════
// المنتجات المميزة (للإدارة فقط)
// ═══════════════════════════════════════════════════════
async function showFeatured(cid,mid,uid) {
  const u=await getUser(uid);
  const ids=await getList('featured');
  const prods=(await Promise.all(ids.slice(0,10).map(id=>getProd(id)))).filter(p=>p&&p.status==='approved');
  let txt=`⭐ <b>المنتجات المميزة</b>\n\n`;
  if(!prods.length) txt+='لا توجد منتجات مميزة حالياً.';
  const rows=prods.map(p=>[b(`⭐ ${p.name.slice(0,28)} | ${p.price}₪`,`prod:${p.id}`)]);
  rows.push([back()]);
  return mid?edit(cid,mid,txt,{reply_markup:ik(rows)}):send(cid,txt,{reply_markup:ik(rows)});
}

// ═══════════════════════════════════════════════════════
// العروض (للإدارة فقط)
// ═══════════════════════════════════════════════════════
async function showOffers(cid,mid,uid) {
  const ids=await getList('offers:all');
  const prods=(await Promise.all(ids.slice(0,10).map(id=>getProd(id)))).filter(p=>p&&p.status==='approved');
  let txt=`🔥 <b>العروض</b>\n\n`;
  if(!prods.length) txt+='لا توجد عروض حالياً.';
  const rows=prods.map(p=>[b(`🔥 ${p.name.slice(0,28)} | ${p.price}₪`,`prod:${p.id}`)]);
  rows.push([back()]);
  return mid?edit(cid,mid,txt,{reply_markup:ik(rows)}):send(cid,txt,{reply_markup:ik(rows)});
}

// ═══════════════════════════════════════════════════════
// البحث
// ═══════════════════════════════════════════════════════
async function startSearch(cid,mid,uid) {
  await setState(uid,{step:'search'});
  const txt=`🔍 <b>البحث</b>\n\nاكتب اسم المنتج أو المتجر أو المدينة:`;
  const kb=ik([[b('❌ إلغاء','cancel')]]);
  return mid?edit(cid,mid,txt,{reply_markup:kb}):send(cid,txt,{reply_markup:kb});
}

async function doSearch(cid,q) {
  const ql=normalizeAr(q);
  if(ql.length<2) return send(cid,'⚠️ أدخل على الأقل كلمتين.');
  const ids=await getList('products:all');
  const all=(await Promise.all(ids.slice(0,300).map(id=>getProd(id)))).filter(p=>p&&p.status==='approved');
  const res=all.filter(p=>
    normalizeAr(p.name).includes(ql)||
    normalizeAr(p.description||'').includes(ql)||
    normalizeAr(p.city||'').includes(ql)
  ).slice(0,10);
  if(!res.length) return send(cid,`🔍 لا نتائج لـ "<b>${q}</b>"`,{reply_markup:ik([[b('🔍 بحث جديد','search'),b('🏠 رئيسية','main')]])});
  let txt=`🔍 نتائج "<b>${q}</b>" — ${res.length} نتيجة\n\n`;
  const rows=res.map(p=>[b(`${p.name.slice(0,28)} | ${p.price}₪`,`prod:${p.id}`)]);
  rows.push([b('🔍 بحث جديد','search'), b('🏠 رئيسية','main')]);
  return send(cid,txt,{reply_markup:ik(rows)});
}

// ═══════════════════════════════════════════════════════
// حسابي (6 نوافذ)
// ═══════════════════════════════════════════════════════
async function showAccount(cid,mid,uid) {
  const u=await getUser(uid);
  const plan=PLANS[u.subscription||'free'];
  const myProds=await getList(`user:${uid}:prods`);
  const myOrders=await getList(`user:${uid}:orders`);
  const myStores=await getList(`user:${uid}:stores`);
  const txt=`👤 <b>حسابي</b>\n\n`+
    `🆔 ${uid}\n`+
    `⭐ ${plan.name} ${plan.badge}\n`+
    `🏪 متاجري: ${myStores.length}/${plan.stores}\n`+
    `📦 إعلاناتي: ${myProds.length}/${plan.products}\n`+
    `🛒 طلباتي: ${myOrders.length}\n`+
    `❤️ المحفوظات: ${((u.savedProducts||[]).length+(u.savedStores||[]).length)}`;
  const rows=[
    [b('🛒 طلباتي','my_orders'),     b('📦 إعلاناتي','my_listings')],
    [b('👁️ آخر المشاهدات','history'), b('❤️ المحفوظات','favorites')],
    [b('⭐ الاشتراك','subscription'),  b('🏪 متجري','my_store')],
    [back()],
  ];
  return mid?edit(cid,mid,txt,{reply_markup:ik(rows)}):send(cid,txt,{reply_markup:ik(rows)});
}

// ── المحفوظات (متجر + منتج منفصلين) ────────────────────
async function showFavorites(cid,mid,uid) {
  const txt=`❤️ <b>المحفوظات</b>\n\nاختر:`;
  const kb=ik([[b('🏪 محفوظ متجر','fav_stores'),b('📦 محفوظ منتج','fav_prods')],[back('account')]]);
  return mid?edit(cid,mid,txt,{reply_markup:kb}):send(cid,txt,{reply_markup:kb});
}

async function showFavStores(cid,mid,uid) {
  const u=await getUser(uid);
  const ids=u.savedStores||[];
  if(!ids.length){
    const txt=`🏪 <b>المتاجر المحفوظة</b>\n\nلم تحفظ أي متاجر بعد.`;
    return mid?edit(cid,mid,txt,{reply_markup:ik([[back('favorites')]])}):send(cid,txt,{reply_markup:ik([[back('favorites')]])});
  }
  const stores=(await Promise.all(ids.slice(0,10).map(id=>getStore(id)))).filter(Boolean);
  const rows=stores.map(s=>[b(`🏪 ${s.name.slice(0,28)} | ${s.city}`,`store:${s.id}`)]);
  rows.push([back('favorites')]);
  return mid?edit(cid,mid,`🏪 <b>المتاجر المحفوظة</b> (${ids.length})`,{reply_markup:ik(rows)}):
             send(cid,`🏪 <b>المتاجر المحفوظة</b> (${ids.length})`,{reply_markup:ik(rows)});
}

async function showFavProds(cid,mid,uid) {
  const u=await getUser(uid);
  const ids=u.savedProducts||[];
  if(!ids.length){
    const txt=`📦 <b>المنتجات المحفوظة</b>\n\nلم تحفظ أي منتجات بعد.`;
    return mid?edit(cid,mid,txt,{reply_markup:ik([[back('favorites')]])}):send(cid,txt,{reply_markup:ik([[back('favorites')]])});
  }
  const prods=(await Promise.all(ids.slice(0,10).map(id=>getProd(id)))).filter(Boolean);
  const rows=prods.map(p=>[b(`📦 ${p.name.slice(0,28)} | ${p.price}₪`,`prod:${p.id}`)]);
  rows.push([back('favorites')]);
  return mid?edit(cid,mid,`📦 <b>المنتجات المحفوظة</b> (${ids.length})`,{reply_markup:ik(rows)}):
             send(cid,`📦 <b>المنتجات المحفوظة</b> (${ids.length})`,{reply_markup:ik(rows)});
}

// ── الاشتراك ──────────────────────────────────────────
async function showSubscription(cid,mid,uid) {
  const u=await getUser(uid);
  const cur=PLANS[u.subscription||'free'];
  // نص قابل للتعديل من المالك
  const customText=await kget('sub:template')||
    `🟢 <b>مجاني</b> — ${PLANS.free.stores} متاجر، ${PLANS.free.products} منتجات — مجاناً\n\n`+
    `🔵 <b>برو</b> — ${PLANS.pro.stores} متاجر، ${PLANS.pro.products} منتجاً — ${PLANS.pro.price}$/شهر\n`+
    `   • ظهور أفضل ⭐\n\n`+
    `🟣 <b>أعمال</b> — ${PLANS.business.stores} متاجر، غير محدود — ${PLANS.business.price}$/شهر\n`+
    `   • شارة توثيق ✅\n   • أولوية في البحث`;

  const txt=`⭐ <b>الاشتراك</b>\n\naشتراكك: ${cur.name} ${cur.badge}\n\n${customText}`;
  const rows=[[burl('💬 تواصل للترقية',`https://t.me/${UPGRADE_USERNAME}`)]];
  if(Number(uid)===OWNER_ID) rows.push([b('✏️ تغيير هذه الكليشة','edit_sub_template')]);
  rows.push([back('account')]);
  return mid?edit(cid,mid,txt,{reply_markup:ik(rows)}):send(cid,txt,{reply_markup:ik(rows)});
}

// ── آخر المشاهدات ─────────────────────────────────────
async function showHistory(cid,mid,uid) {
  const u=await getUser(uid);
  const ids=u.history||[];
  if(!ids.length){
    return mid?edit(cid,mid,`👁️ <b>آخر المشاهدات</b>\n\nلم تشاهد أي منتجات بعد.`,{reply_markup:ik([[back('account')]])}):
               send(cid,`👁️ <b>آخر المشاهدات</b>\n\nلم تشاهد أي منتجات بعد.`,{reply_markup:ik([[back('account')]])});
  }
  const prods=(await Promise.all(ids.slice(0,10).map(id=>getProd(id)))).filter(Boolean);
  const rows=prods.map(p=>[b(`${p.name.slice(0,28)} | ${p.price}₪`,`prod:${p.id}`)]);
  rows.push([back('account')]);
  return mid?edit(cid,mid,`👁️ <b>آخر المشاهدات</b> (${ids.length})`,{reply_markup:ik(rows)}):
             send(cid,`👁️ <b>آخر المشاهدات</b> (${ids.length})`,{reply_markup:ik(rows)});
}

// ── إعلاناتي ─────────────────────────────────────────
async function showMyListings(cid,mid,uid,page=0) {
  const PAGE=8;
  const ids=await getList(`user:${uid}:prods`);
  if(!ids.length){
    return mid?edit(cid,mid,`📦 <b>إعلاناتي</b>\n\nلم تضف أي إعلانات بعد.`,{reply_markup:ik([[b('➕ أضف','add')],[back('account')]])}):
               send(cid,`📦 <b>إعلاناتي</b>\n\nلم تضف أي إعلانات بعد.`,{reply_markup:ik([[b('➕ أضف','add')],[back('account')]])});
  }
  const prods=(await Promise.all(ids.slice(page*PAGE,(page+1)*PAGE).map(id=>getProd(id)))).filter(Boolean);
  const si={pending:'⏳',approved:'✅',rejected:'❌'};
  let txt=`📦 <b>إعلاناتي</b> (${ids.length})\n\n`;
  const rows=prods.map(p=>{
    txt+=`${si[p.status]||'?'} ${p.name} — ${p.price}₪\n`;
    return [b(`${p.name.slice(0,22)}`,`prod:${p.id}`),b('🗑️',`del_prod_c:${p.id}`)];
  });
  const nav=[];
  if(page>0) nav.push(b('◀️',`my_listings:${page-1}`));
  if((page+1)*PAGE<ids.length) nav.push(b('▶️',`my_listings:${page+1}`));
  if(nav.length) rows.push(nav);
  rows.push([back('account')]);
  return mid?edit(cid,mid,txt,{reply_markup:ik(rows)}):send(cid,txt,{reply_markup:ik(rows)});
}

// ── طلباتي ───────────────────────────────────────────
async function showMyOrders(cid,mid,uid,page=0) {
  const PAGE=8;
  const ids=await getList(`user:${uid}:orders`);
  if(!ids.length){
    return mid?edit(cid,mid,`🛒 <b>طلباتي</b>\n\nلا توجد طلبات بعد.`,{reply_markup:ik([[back('account')]])}):
               send(cid,`🛒 <b>طلباتي</b>\n\nلا توجد طلبات بعد.`,{reply_markup:ik([[back('account')]])});
  }
  const orders=(await Promise.all(ids.slice(page*PAGE,(page+1)*PAGE).map(id=>getOrder(id)))).filter(Boolean);
  const si={pending:'⏳',accepted:'✅',completed:'🎉',rejected:'❌',cancelled:'🚫'};
  let txt=`🛒 <b>طلباتي</b> (${ids.length})\n\n`;
  const rows=orders.map(o=>{
    txt+=`${si[o.status]} ${o.productName} — ${o.totalPrice}₪\n`;
    return [b(`${si[o.status]} ${o.productName.slice(0,25)}`,`order_view:${o.id}`)];
  });
  const nav=[];
  if(page>0) nav.push(b('◀️',`my_orders:${page-1}`));
  if((page+1)*PAGE<ids.length) nav.push(b('▶️',`my_orders:${page+1}`));
  if(nav.length) rows.push(nav);
  rows.push([back('account')]);
  return mid?edit(cid,mid,txt,{reply_markup:ik(rows)}):send(cid,txt,{reply_markup:ik(rows)});
}

async function showOrderDetail(cid,mid,orderId,uid) {
  const o=await getOrder(orderId);
  if(!o) return;
  const si={pending:'⏳ انتظار',accepted:'✅ مقبول',completed:'🎉 مكتمل',rejected:'❌ مرفوض',cancelled:'🚫 ملغي'};
  const isBuyer=o.buyerId===uid,isSeller=o.sellerId===uid;
  const txt=`🛒 <b>تفاصيل الطلب</b>\n\n📦 ${o.productName}\n💰 ${o.totalPrice}₪\nالحالة: ${si[o.status]}\n📅 ${new Date(o.createdAt).toLocaleDateString('ar')}`;
  const rows=[];
  if(isBuyer&&o.status==='pending') rows.push([b('🚫 إلغاء',`order_cancel:${orderId}`)]);
  if(isSeller){
    if(o.status==='pending') rows.push([b('✅ قبول',`order_accept:${orderId}`),b('❌ رفض',`order_reject:${orderId}`)]);
    if(o.status==='accepted') rows.push([b('🎉 إتمام',`order_complete:${orderId}`)]);
  }
  rows.push([back(isBuyer?'my_orders':'seller_orders')]);
  return mid?edit(cid,mid,txt,{reply_markup:ik(rows)}):send(cid,txt,{reply_markup:ik(rows)});
}

async function placeOrder(cid,prodId,uid,cbId) {
  const p=await getProd(prodId);
  if(!p||p.status!=='approved'){await answer(cbId,'⚠️ المنتج غير متاح',true);return;}
  if(p.sellerId===uid){await answer(cbId,'⚠️ لا يمكنك طلب منتجك',true);return;}
  const u=await getUser(uid);
  const orderId=genId();
  const order={id:orderId,productId:prodId,productName:p.name,
    buyerId:uid,buyerName:u.firstName||'عميل',
    sellerId:p.sellerId,totalPrice:p.price,
    status:'pending',createdAt:Date.now()};
  await saveOrder(orderId,order);
  await listAdd(`user:${uid}:orders`,orderId);
  await listAdd(`seller:${p.sellerId}:orders`,orderId);
  await notify(p.sellerId,`🛒 <b>طلب جديد!</b>\n\n📦 ${p.name}\n💰 ${p.price}₪\n👤 ${u.firstName||''} ${u.username?'@'+u.username:''}`);
  return send(cid,`🎉 <b>تم إرسال طلبك!</b>\n\n📦 ${p.name}\n💰 ${p.price}₪\n\nسيتواصل معك البائع قريباً.`,{reply_markup:ik([[b('🛒 طلباتي','my_orders'),b('🏠 رئيسية','main')]])});
}

// ── متجري ─────────────────────────────────────────────
async function showMyStore(cid,mid,uid) {
  const myStores=await getList(`user:${uid}:stores`);
  if(!myStores.length){
    const txt=`🏪 <b>متجري</b>\n\nلا يوجد لديك متجر بعد.`;
    const kb=ik([[b('🏪 أنشئ متجرك','create_store')],[back('account')]]);
    return mid?edit(cid,mid,txt,{reply_markup:kb}):send(cid,txt,{reply_markup:kb});
  }
  // إذا كان لديه أكثر من متجر، يختار
  if(myStores.length===1){
    return showMyStoreDetail(cid,mid,uid,myStores[0]);
  }
  const stores=(await Promise.all(myStores.map(id=>getStore(id)))).filter(Boolean);
  const rows=stores.map(s=>[b(`🏪 ${s.name}`,`my_store_sel:${s.id}`)]);
  rows.push([b('➕ أنشئ متجراً آخر','create_store'),back('account')]);
  return mid?edit(cid,mid,`🏪 <b>متاجري</b> (${myStores.length})`,{reply_markup:ik(rows)}):
             send(cid,`🏪 <b>متاجري</b> (${myStores.length})`,{reply_markup:ik(rows)});
}

async function showMyStoreDetail(cid,mid,uid,storeId) {
  const s=await getStore(storeId);
  if(!s) return;
  const plan=PLANS[s.subscription||'free'];
  const prods=await getList(`user:${uid}:prods`);
  const txt=`🏪 <b>${plan.badge?plan.badge+' ':''}${s.name}</b>\n\n`+
    `📦 منتجاتي: ${prods.length}/${plan.products}\n`+
    `📍 ${s.city} | ${getCatName(s.category,'store')}\n`+
    `${s.hours?`🕐 ${s.hours}\n`:''}`+
    `📝 ${s.description||'—'}`;
  const rows=[
    [b('➕ أضف منتج','add'),           b('📦 إعلاناتي','my_listings')],
    [b('📋 الطلبات الواردة','seller_orders'), b('📊 الإحصائيات',`store_stats:${storeId}`)],
    [b('✏️ تعديل المتجر',`edit_store:${storeId}`)],
    [b('👁️ عرض كصفحة',`store:${storeId}`), back('account')],
  ];
  return mid?edit(cid,mid,txt,{reply_markup:ik(rows)}):send(cid,txt,{reply_markup:ik(rows)});
}

async function showSellerOrders(cid,mid,uid) {
  const ids=await getList(`seller:${uid}:orders`);
  if(!ids.length){
    return mid?edit(cid,mid,`📋 <b>الطلبات الواردة</b>\n\nلا توجد طلبات.`,{reply_markup:ik([[back('my_store')]])}):
               send(cid,`📋 لا توجد طلبات.`,{reply_markup:ik([[back('my_store')]])});
  }
  const orders=(await Promise.all(ids.slice(0,10).map(id=>getOrder(id)))).filter(Boolean);
  const si={pending:'⏳',accepted:'✅',completed:'🎉',rejected:'❌',cancelled:'🚫'};
  let txt=`📋 <b>الطلبات الواردة</b> (${ids.length})\n\n`;
  const rows=orders.map(o=>[b(`${si[o.status]} ${o.productName.slice(0,25)} — ${o.totalPrice}₪`,`order_view:${o.id}`)]);
  rows.push([back('my_store')]);
  return mid?edit(cid,mid,txt,{reply_markup:ik(rows)}):send(cid,txt,{reply_markup:ik(rows)});
}

async function showStoreStats(cid,mid,uid,storeId) {
  const prods=(await Promise.all((await getList(`user:${uid}:prods`)).map(id=>getProd(id)))).filter(Boolean);
  const totalV=prods.reduce((s,p)=>s+(p.views||0),0);
  const totalS=prods.reduce((s,p)=>s+(p.saves||0),0);
  const orders=await getList(`seller:${uid}:orders`);
  const txt=`📊 <b>الإحصائيات</b>\n\n`+
    `📦 المنتجات: ${prods.length}\n`+
    `👁️ المشاهدات: ${totalV}\n`+
    `❤️ الحفظ: ${totalS}\n`+
    `🛒 الطلبات: ${orders.length}`;
  const skb=ik([[back(`my_store_sel:${storeId}`)]]);
  return mid?edit(cid,mid,txt,{reply_markup:skb}):send(cid,txt,{reply_markup:skb});
}

// ═══════════════════════════════════════════════════════
// التبليغات
// ═══════════════════════════════════════════════════════
async function sendReport(type,itemId,itemName,reporterUid,reporterName,reporterUsername) {
  const rid=genId();
  await kset(`rep:${rid}`,{id:rid,type,itemId,itemName,reporterId:reporterUid,createdAt:Date.now()});
  await listAdd('reports:all',rid);
  // إرسال للمالك وكل الأدمنية
  const admins=await getList('admins:list');
  const msg=`🚩 <b>بلاغ جديد!</b>\n\n`+
    `النوع: ${type==='store'?'متجر':'منتج'}\n`+
    `الاسم: ${itemName}\n`+
    `المبلغ: ${reporterName} ${reporterUsername?'@'+reporterUsername:''}\n`+
    `الأيدي: <code>${reporterUid}</code>`;
  await notify(OWNER_ID,msg);
  for(const aid of admins){
    try{await notify(aid,msg);}catch{}
  }
}

// ═══════════════════════════════════════════════════════
// لوحة الإدارة
// ═══════════════════════════════════════════════════════
async function showAdmin(cid,mid,u) {
  const [totalP,totalS,totalR,pending]=await Promise.all([
    getList('products:all').then(l=>l.length),
    getList('stores:all').then(l=>l.length),
    getList('reports:all').then(l=>l.length),
    getList('pending:products').then(l=>l.length),
  ]);
  const txt=`⚙️ <b>لوحة الإدارة</b>\n\n`+
    `📦 المنتجات: ${totalP} | ⏳ انتظار: ${pending}\n`+
    `🏪 المتاجر: ${totalS}\n`+
    `🚩 البلاغات: ${totalR}\n\n`+
    `مستواك: ${isOwner(u)?'👑 مالك':u.adminRole==='admin'?'🔴 مدير':'🟡 مشرف'}`;
  const rows=[
    [b('⏳ موافقة المنتجات','admin_pending:0'), b('🚩 البلاغات','admin_reports')],
    [b('⭐ المميزة','admin_featured'),            b('🔥 العروض','admin_offers')],
    [b('📋 إدارة التصنيفات','admin_cats')],
  ];
  if(isOwner(u)||u.adminRole==='admin'){
    rows.push([b('👥 المشرفين','admin_mods'),b('⭐ الاشتراكات','admin_subs')]);
  }
  rows.push([back()]);
  return mid?edit(cid,mid,txt,{reply_markup:ik(rows)}):send(cid,txt,{reply_markup:ik(rows)});
}

async function showAdminPending(cid,mid,page=0) {
  const PAGE=5;
  const ids=await getList('pending:products');
  if(!ids.length){
    return mid?edit(cid,mid,`⏳ لا توجد منتجات تنتظر الموافقة ✅`,{reply_markup:ik([[back('admin')]])}):
               send(cid,`⏳ لا توجد منتجات تنتظر الموافقة ✅`,{reply_markup:ik([[back('admin')]])});
  }
  const pageIds=ids.slice(page*PAGE,(page+1)*PAGE);
  const prods=(await Promise.all(pageIds.map(id=>getProd(id)))).filter(Boolean);
  let txt=`⏳ <b>تنتظر الموافقة</b> (${ids.length})\n\n`;
  const rows=[];
  for(const p of prods){
    txt+=`📦 <b>${p.name}</b>\n💰 ${p.price}₪ | ${getCatName(p.catKey||p.category,'prod')} | ${p.city}\n👤 ${p.sellerName}\n\n`;
    rows.push([b('✅ قبول',`approve:${p.id}`),b('❌ رفض',`reject:${p.id}`),b(p.name.slice(0,12),`prod:${p.id}`)]);
  }
  const nav=[];
  if(page>0) nav.push(b('◀️',`admin_pending:${page-1}`));
  if((page+1)*PAGE<ids.length) nav.push(b('▶️',`admin_pending:${page+1}`));
  if(nav.length) rows.push(nav);
  rows.push([back('admin')]);
  return mid?edit(cid,mid,txt,{reply_markup:ik(rows)}):send(cid,txt,{reply_markup:ik(rows)});
}

async function approveProduct(prodId,approved,adminId) {
  const p=await getProd(prodId);
  if(!p) return false;
  p.status=approved?'approved':'rejected';
  p.reviewedBy=adminId; p.reviewedAt=Date.now();
  await saveProd(prodId,p);
  await listRm('pending:products',prodId);
  if(approved){
    await listAdd('products:all',prodId);
    await listAdd(`pcat:${p.catKey||p.category}`,prodId);
    if(p.isService) await listAdd(`svc:${p.serviceType}`,prodId);
    await notify(p.sellerId,`✅ <b>تمت الموافقة على إعلانك!</b>\n\n📦 ${p.name} أصبح مرئياً للجميع 🎉`);
  } else {
    await notify(p.sellerId,`❌ <b>تم رفض إعلانك</b>\n\n📦 ${p.name}\n\nتواصل مع الإدارة.`);
  }
  return true;
}

async function showAdminReports(cid,mid) {
  const ids=await getList('reports:all');
  if(!ids.length){
    return mid?edit(cid,mid,`🚩 لا توجد بلاغات.`,{reply_markup:ik([[back('admin')]])}):
               send(cid,`🚩 لا توجد بلاغات.`,{reply_markup:ik([[back('admin')]])});
  }
  const reps=(await Promise.all(ids.slice(0,8).map(id=>kget(`rep:${id}`)))).filter(Boolean);
  let txt=`🚩 <b>البلاغات</b> (${ids.length})\n\n`;
  const rows=reps.map(r=>{
    txt+=`• ${r.type==='store'?'متجر':'منتج'}: ${r.itemName||r.itemId.slice(0,10)}\n`;
    return [
      b('✅ حل',`resolve_rep:${r.id}`),
      b(`عرض`,r.type==='store'?`store:${r.itemId}`:`prod:${r.itemId}`),
    ];
  });
  rows.push([back('admin')]);
  return mid?edit(cid,mid,txt,{reply_markup:ik(rows)}):send(cid,txt,{reply_markup:ik(rows)});
}

async function showAdminFeatured(cid,mid) {
  const ids=await getList('featured');
  const prods=(await Promise.all(ids.slice(0,8).map(id=>getProd(id)))).filter(Boolean);
  let txt=`⭐ <b>المنتجات المميزة</b> (${ids.length})\n\n`;
  const rows=prods.map(p=>[b('🗑️ إزالة',`unfeat:${p.id}`),b(p.name.slice(0,24),`prod:${p.id}`)]);
  rows.push([b('➕ أضف مميزة','do_feature'),back('admin')]);
  return mid?edit(cid,mid,txt,{reply_markup:ik(rows)}):send(cid,txt,{reply_markup:ik(rows)});
}

async function showAdminOffers(cid,mid) {
  const ids=await getList('offers:all');
  const prods=(await Promise.all(ids.slice(0,8).map(id=>getProd(id)))).filter(Boolean);
  let txt=`🔥 <b>العروض</b> (${ids.length})\n\n`;
  const rows=prods.map(p=>[b('🗑️ إزالة',`unoffer:${p.id}`),b(p.name.slice(0,24),`prod:${p.id}`)]);
  rows.push([b('➕ أضف عرض','do_offer'),back('admin')]);
  return mid?edit(cid,mid,txt,{reply_markup:ik(rows)}):send(cid,txt,{reply_markup:ik(rows)});
}

async function showAdminCats(cid,mid) {
  const customStore=await getList('store_cats:custom');
  const customProd=await getList('prod_cats:custom');
  let txt=`📋 <b>إدارة التصنيفات المخصصة</b>\n\n`;
  txt+=`<b>🏪 تصنيفات المتاجر المضافة:</b>\n`;
  if(!customStore.length) txt+='لا توجد\n';
  customStore.forEach(c=>{txt+=`• ${c.name}\n`;});
  txt+=`\n<b>🛍️ تصنيفات المنتجات المضافة:</b>\n`;
  if(!customProd.length) txt+='لا توجد\n';
  customProd.forEach(c=>{txt+=`• ${c.name}\n`;});
  const rows=[];
  customStore.forEach(c=>rows.push([b(`🗑️ حذف: ${c.name.slice(0,20)}`,`admin_del_scat:${c.id}`)]));
  customProd.forEach(c=>rows.push([b(`🗑️ حذف: ${c.name.slice(0,20)}`,`admin_del_pcat:${c.id}`)]));
  rows.push([back('admin')]);
  return mid?edit(cid,mid,txt,{reply_markup:ik(rows)}):send(cid,txt,{reply_markup:ik(rows)});
}

// ═══════════════════════════════════════════════════════
// Helper — اسم التصنيف
// ═══════════════════════════════════════════════════════
function getCatName(catKey,type) {
  if(type==='store'){
    const fixed=FIXED_STORE_CATS.find(c=>c.id===catKey);
    if(fixed) return fixed.name;
    // custom
    return catKey||'أخرى';
  } else {
    const fixed=FIXED_PROD_CATS.find(c=>c.id===catKey);
    if(fixed) return fixed.name;
    const svc=SERVICE_TYPES.find(s=>s.id===catKey);
    if(svc) return svc.name;
    return catKey||'أخرى';
  }
}

// ═══════════════════════════════════════════════════════
// Callback Handler
// ═══════════════════════════════════════════════════════
async function onCallback(update) {
  const cb=update.callback_query;
  const cid=cb.message.chat.id;
  const mid=cb.message.message_id;
  const uid=cb.from.id;
  const data=cb.data;
  await answer(cb.id);

  const u=await getUser(uid);
  if(u.firstName!==cb.from.first_name||u.username!==cb.from.username){
    u.firstName=cb.from.first_name; u.username=cb.from.username;
    await saveUser(uid,u);
  }

  // ── الرئيسية ──────────────────────────────────────────
  if(data==='main')        return showMain(cid,mid,u);
  if(data==='stores')      return showStoresMenu(cid,mid);
  if(data==='market')      return showMarket(cid,mid);
  if(data==='services')    return showServices(cid,mid);
  if(data==='restaurants') return showRestaurants(cid,mid);
  if(data==='featured')    return showFeatured(cid,mid,uid);
  if(data==='offers')      return showOffers(cid,mid,uid);
  if(data==='add')         return startAddProduct(cid,mid,uid);
  if(data==='account')     return showAccount(cid,mid,uid);
  if(data==='search')      return startSearch(cid,mid,uid);
  if(data==='all_cats')    return showAllCats(cid,mid);
  if(data==='create_store')return startCreateStore(cid,mid,uid);
  if(data==='create_restaurant') return startCreateStore(cid,mid,uid);
  if(data==='my_listings') return showMyListings(cid,mid,uid);
  if(data==='my_orders')   return showMyOrders(cid,mid,uid);
  if(data==='history')     return showHistory(cid,mid,uid);
  if(data==='favorites')   return showFavorites(cid,mid,uid);
  if(data==='fav_stores')  return showFavStores(cid,mid,uid);
  if(data==='fav_prods')   return showFavProds(cid,mid,uid);
  if(data==='subscription')return showSubscription(cid,mid,uid);
  if(data==='my_store')    return showMyStore(cid,mid,uid);
  if(data==='seller_orders') return showSellerOrders(cid,mid,uid);
  if(data==='mcat_available') return showMarketCustomCats(cid,mid);
  if(data==='noop')        return;
  if(data==='cancel'){await clearState(uid);return showMain(cid,mid,u);}

  // ── Paginated ─────────────────────────────────────────
  if(data.startsWith('stores_list:')) return showStoresList(cid,mid,parseInt(data.split(':')[1])||0);
  if(data.startsWith('my_listings:')) return showMyListings(cid,mid,uid,parseInt(data.split(':')[1])||0);
  if(data.startsWith('my_orders:'))   return showMyOrders(cid,mid,uid,parseInt(data.split(':')[1])||0);
  if(data.startsWith('admin_pending:')) {
    if(!isMod(u)) return answer(cb.id,'⛔',true);
    return showAdminPending(cid,mid,parseInt(data.split(':')[1])||0);
  }

  // ── متجر ─────────────────────────────────────────────
  if(data.startsWith('store:')&&!data.includes('_prods')) return showStore(cid,data.split(':')[1],uid,cb.id);
  if(data.startsWith('store_prods:')){
    const [,sid,p]=data.split(':');
    return showStoreProducts(cid,mid,sid,parseInt(p||0));
  }
  if(data.startsWith('my_store_sel:')) return showMyStoreDetail(cid,mid,uid,data.split(':')[1]);

  // ── حفظ/إلغاء متجر ───────────────────────────────────
  if(data.startsWith('save_store:')){
    const sid=data.split(':')[1];
    const pu=await getUser(uid);
    pu.savedStores=[sid,...(pu.savedStores||[]).filter(x=>x!==sid)];
    await saveUser(uid,pu);
    return answer(cb.id,'❤️ تم حفظ المتجر!');
  }
  if(data.startsWith('unsave_store:')){
    const sid=data.split(':')[1];
    const pu=await getUser(uid);
    pu.savedStores=(pu.savedStores||[]).filter(x=>x!==sid);
    await saveUser(uid,pu);
    return answer(cb.id,'💔 تمت إزالة المتجر من المحفوظات');
  }

  // ── حذف متجر (إدارة) ─────────────────────────────────
  if(data.startsWith('del_store_c:')){
    if(!isAdmin(u)) return answer(cb.id,'⛔',true);
    const sid=data.split(':')[1];
    const s=await getStore(sid);
    if(!s) return;
    const txt=`⚠️ هل أنت متأكد من حذف متجر "<b>${s.name}</b>"؟`;
    return edit(cid,mid,txt,{reply_markup:ik([[b('✅ نعم، احذف',`del_store:${sid}`),b('❌ لا',`store:${sid}`)]])});
  }
  if(data.startsWith('del_store:')){
    if(!isAdmin(u)) return answer(cb.id,'⛔',true);
    const sid=data.split(':')[1];
    const s=await getStore(sid);
    if(s){
      await kdel(`s:${sid}`);
      await listRm('stores:all',sid);
      await listRm('restaurants:all',sid);
      await listRm(`user:${s.ownerId}:stores`,sid);
      await notify(s.ownerId,`⚠️ تم حذف متجرك "<b>${s.name}</b>" من قبل الإدارة.`);
      await answer(cb.id,'✅ تم الحذف');
    }
    return showStoresList(cid,mid,0);
  }

  // ── تبليغ عن متجر ────────────────────────────────────
  if(data.startsWith('report_store_q:')){
    const sid=data.split(':')[1];
    const s=await getStore(sid);
    return edit(cid,mid,`🚩 هل أنت متأكد من التبليغ عن متجر "<b>${s?.name||sid}</b>"؟`,{
      reply_markup:ik([[b('✅ نعم، أبلّغ',`report_store:${sid}`),b('❌ لا',`store:${sid}`)]])
    });
  }
  if(data.startsWith('report_store:')){
    const sid=data.split(':')[1];
    const s=await getStore(sid);
    await sendReport('store',sid,s?.name||sid,uid,u.firstName||'',u.username||'');
    return answer(cb.id,'🚩 تم إرسال البلاغ للإدارة',true);
  }

  // ── تبليغ عن منتج ────────────────────────────────────
  if(data.startsWith('report_prod_q:')){
    const pid=data.split(':')[1];
    const p=await getProd(pid);
    return edit(cid,mid,`🚩 هل أنت متأكد من التبليغ عن "<b>${p?.name||pid}</b>"؟`,{
      reply_markup:ik([[b('✅ نعم، أبلّغ',`report_prod:${pid}`),b('❌ لا',`prod:${pid}`)]])
    });
  }
  if(data.startsWith('report_prod:')){
    const pid=data.split(':')[1];
    const p=await getProd(pid);
    await sendReport('prod',pid,p?.name||pid,uid,u.firstName||'',u.username||'');
    return answer(cb.id,'🚩 تم إرسال البلاغ للإدارة',true);
  }

  // ── تصنيفات السوق ────────────────────────────────────
  if(data.startsWith('mcat:')){
    const catKey=data.slice(5);
    return showMarketCat(cid,mid,catKey,uid);
  }
  if(data==='mcat_add'){
    await setState(uid,{step:'add_prod_cat'});
    return edit(cid,mid,`➕ <b>إضافة تصنيف للمنتجات</b>\n\nاكتب اسم التصنيف:`,{reply_markup:ik([[b('❌ إلغاء','cancel')]])});
  }
  if(data.startsWith('add_to_cat:')){
    const catKey=data.slice(11);
    return startAddProduct(cid,mid,uid,catKey);
  }

  // ── تصنيف متجر (إنشاء) ───────────────────────────────
  if(data.startsWith('sc_cat:')){
    const catId=data.slice(7);
    const st=await getState(uid);
    await setState(uid,{...st,step:'sc_hours',category:catId});
    return send(cid,`✅ التصنيف محدد\n\nاكتب ساعات العمل (مثال: 9ص–11م) أو اضغط تخطى:`,{
      reply_markup:ik([[b('⏭️ تخطى','sc_skip_hours')],[b('❌ إلغاء','cancel')]])
    });
  }
  if(data==='sc_cat_custom'){
    const st=await getState(uid);
    await setState(uid,{...st,step:'sc_custom_cat'});
    return send(cid,`📋 ضع تصنيفاً لمتجرك (اكتبه):`,{reply_markup:ik([[b('❌ إلغاء','cancel')]])});
  }
  if(data==='sc_skip_hours'||data==='sc_do_city'){
    const st=await getState(uid);
    await setState(uid,{...st,step:'sc_city',hours:st.hours||'—'});
    const cityRows=buildCityPicker('sc_city');
    return send(cid,'📍 اختر مدينة المتجر:',{reply_markup:ik(cityRows)});
  }
  if(data.startsWith('sc_city:')){
    const city=data.slice(8);
    if(city==='other'){
      await setState(uid,{...await getState(uid),step:'sc_custom_city'});
      return send(cid,'📍 اكتب اسم مدينتك:',{reply_markup:ik([[b('❌ إلغاء','cancel')]])});
    }
    return finalizeStore(cid,mid,uid,city);
  }

  // ── إضافة منتج flow ───────────────────────────────────
  if(data.startsWith('ap_cond:')){
    const cond=data.split(':')[1];
    const st=await getState(uid);
    await setState(uid,{...st,step:'ap_photos',condition:cond});
    return send(cid,`✅ الحالة: ${cond==='new'?'جديد':cond==='used'?'مستعمل':'معيب'}\n\n📍 الخطوة 2/7 — أرسل صور المنتج (حتى 5):`,{
      reply_markup:ik([[b('⏭️ تخطى الصور','ap_skip_photos')],[b('❌ إلغاء','cancel')]])
    });
  }
  if(data==='ap_skip_photos'||data==='ap_next_name'){
    const st=await getState(uid);
    await setState(uid,{...st,step:'ap_name',photos:st.photos||[]});
    return send(cid,`📍 الخطوة 3/7 — اكتب اسم المنتج:`,{reply_markup:ik([[b('❌ إلغاء','cancel')]])});
  }

  // city picker for product
  if(data.startsWith('ap_city:')){
    const city=data.slice(8);
    if(city==='other'){
      await setState(uid,{...await getState(uid),step:'ap_custom_city'});
      return send(cid,'📍 اكتب اسم مدينتك:',{reply_markup:ik([[b('❌ إلغاء','cancel')]])});
    }
    return showProductConfirm(cid,mid,uid,city);
  }
  if(data==='ap_publish') return finalizeProduct(cid,mid,uid);

  // ── خدمة ─────────────────────────────────────────────
  if(data.startsWith('svc:')){
    const tid=data.slice(4);
    return showServiceType(cid,mid,tid,uid);
  }
  if(data.startsWith('add_svc:')){
    const tid=data.slice(8);
    await setState(uid,{step:'ap_condition',isService:true,serviceType:tid,catKey:tid});
    return send(cid,`🛠️ <b>إضافة خدمة</b>\n\nالخطوة 1/7 — حالة الخدمة؟`,{
      reply_markup:ik([[b('✨ جديدة','ap_cond:new'),b('♻️ مستعملة','ap_cond:used')],[b('❌ إلغاء','cancel')]])
    });
  }

  // ── منتج ─────────────────────────────────────────────
  if(data.startsWith('prod:')) return showProduct(cid,data.split(':')[1],uid,cb.id);

  // ── حفظ/إلغاء منتج ───────────────────────────────────
  if(data.startsWith('save_prod:')){
    const pid=data.split(':')[1];
    const pu=await getUser(uid);
    pu.savedProducts=[pid,...(pu.savedProducts||[]).filter(x=>x!==pid)];
    const prod=await getProd(pid);
    if(prod){prod.saves=(prod.saves||0)+1;await saveProd(pid,prod);}
    await saveUser(uid,pu);
    return answer(cb.id,'❤️ تم الحفظ!');
  }
  if(data.startsWith('unsave_prod:')){
    const pid=data.split(':')[1];
    const pu=await getUser(uid);
    pu.savedProducts=(pu.savedProducts||[]).filter(x=>x!==pid);
    await saveUser(uid,pu);
    return answer(cb.id,'💔 تمت الإزالة');
  }
  if(data.startsWith('share_prod:')){
    return answer(cb.id,`🔗 t.me/Soqna_bot?start=p_${data.split(':')[1]}`,true);
  }
  if(data.startsWith('del_prod_c:')){
    const pid=data.split(':')[1];
    const p=await getProd(pid);
    return edit(cid,mid,`⚠️ هل تريد حذف "<b>${p?.name||pid}</b>"؟`,{
      reply_markup:ik([[b('✅ نعم احذف',`del_prod:${pid}`),b('❌ لا','my_listings')]])
    });
  }
  if(data.startsWith('del_prod:')){
    const pid=data.split(':')[1];
    const prod=await getProd(pid);
    if(prod&&(prod.sellerId===uid||isAdmin(u))){
      await kdel(`p:${pid}`);
      await listRm('products:all',pid);
      await listRm(`pcat:${prod.catKey||prod.category}`,pid);
      await listRm(`user:${prod.sellerId}:prods`,pid);
      await listRm('pending:products',pid);
      await listRm('featured',pid);
      await listRm('offers:all',pid);
      if(prod.isService) await listRm(`svc:${prod.serviceType}`,pid);
      if(isAdmin(u)&&prod.sellerId!==uid)
        await notify(prod.sellerId,`⚠️ تم حذف إعلانك "<b>${prod.name}</b>" من قبل الإدارة.`);
    }
    return showMyListings(cid,mid,uid);
  }

  // ── الطلبات ───────────────────────────────────────────
  if(data.startsWith('order:'))         return placeOrder(cid,data.split(':')[1],uid,cb.id);
  if(data.startsWith('order_view:'))    return showOrderDetail(cid,mid,data.split(':')[1],uid);
  if(data.startsWith('order_cancel:')){
    const oid=data.split(':')[1],o=await getOrder(oid);
    if(o&&o.buyerId===uid&&o.status==='pending'){o.status='cancelled';await saveOrder(oid,o);await notify(o.sellerId,`🚫 تم إلغاء الطلب: <b>${o.productName}</b>.`);}
    return showMyOrders(cid,mid,uid);
  }
  if(data.startsWith('order_accept:')){
    const oid=data.split(':')[1],o=await getOrder(oid);
    if(o&&o.sellerId===uid&&o.status==='pending'){o.status='accepted';await saveOrder(oid,o);await notify(o.buyerId,`✅ تم قبول طلبك: <b>${o.productName}</b>!`);}
    return showOrderDetail(cid,mid,oid,uid);
  }
  if(data.startsWith('order_reject:')){
    const oid=data.split(':')[1],o=await getOrder(oid);
    if(o&&o.sellerId===uid&&o.status==='pending'){o.status='rejected';await saveOrder(oid,o);await notify(o.buyerId,`❌ تم رفض طلبك: <b>${o.productName}</b>.`);}
    return showOrderDetail(cid,mid,oid,uid);
  }
  if(data.startsWith('order_complete:')){
    const oid=data.split(':')[1],o=await getOrder(oid);
    if(o&&o.sellerId===uid&&o.status==='accepted'){o.status='completed';await saveOrder(oid,o);await notify(o.buyerId,`🎉 اكتمل طلبك: <b>${o.productName}</b>!`);}
    return showOrderDetail(cid,mid,oid,uid);
  }

  // ── إحصائيات ─────────────────────────────────────────
  if(data.startsWith('store_stats:')) return showStoreStats(cid,mid,uid,data.split(':')[1]);

  // ── إدارة ────────────────────────────────────────────
  if(data==='admin'){
    if(!isAdmin(u)) return answer(cb.id,'⛔ غير مصرح',true);
    return showAdmin(cid,mid,u);
  }
  if(data==='admin_reports')  {if(!isMod(u))return;return showAdminReports(cid,mid);}
  if(data==='admin_featured') {if(!isAdmin(u))return;return showAdminFeatured(cid,mid);}
  if(data==='admin_offers')   {if(!isAdmin(u))return;return showAdminOffers(cid,mid);}
  if(data==='admin_cats')     {if(!isAdmin(u))return;return showAdminCats(cid,mid);}
  if(data==='admin_mods')     {
    if(!isOwner(u)&&u.adminRole!=='admin') return;
    const txt=`👥 <b>إدارة المشرفين</b>\n\n/setmod [أيدي] [admin|moderator|remove]`;
    return edit(cid,mid,txt,{reply_markup:ik([[back('admin')]])});
  }
  if(data==='admin_subs'){
    if(!isOwner(u)&&u.adminRole!=='admin') return;
    const txt=`⭐ <b>إدارة الاشتراكات</b>\n\n/setsub [أيدي] [free|pro|business]`;
    return edit(cid,mid,txt,{reply_markup:ik([[back('admin')]])});
  }

  if(data.startsWith('approve:')){
    if(!isMod(u)) return answer(cb.id,'⛔',true);
    const ok=await approveProduct(data.split(':')[1],true,uid);
    await answer(cb.id,ok?'✅ تمت الموافقة':'⚠️ خطأ');
    return showAdminPending(cid,mid,0);
  }
  if(data.startsWith('reject:')){
    if(!isMod(u)) return answer(cb.id,'⛔',true);
    await approveProduct(data.split(':')[1],false,uid);
    await answer(cb.id,'❌ تم الرفض');
    return showAdminPending(cid,mid,0);
  }
  if(data.startsWith('resolve_rep:')){
    if(!isMod(u)) return;
    const rid=data.split(':')[1];
    await listRm('reports:all',rid); await kdel(`rep:${rid}`);
    await answer(cb.id,'✅ تم حل البلاغ');
    return showAdminReports(cid,mid);
  }

  // المميزة والعروض
  if(data==='do_feature'){
    if(!isAdmin(u)) return;
    await setState(uid,{step:'featuring'});
    return edit(cid,mid,'⭐ أرسل معرف المنتج (ID) لتمييزه:',{reply_markup:ik([[b('❌ إلغاء','cancel')]])});
  }
  if(data.startsWith('unfeat:')){
    if(!isAdmin(u)) return;
    await listRm('featured',data.split(':')[1]);
    await answer(cb.id,'✅ تمت الإزالة');
    return showAdminFeatured(cid,mid);
  }
  if(data==='do_offer'){
    if(!isAdmin(u)) return;
    await setState(uid,{step:'offering'});
    return edit(cid,mid,'🔥 أرسل معرف المنتج (ID) لإضافته للعروض:',{reply_markup:ik([[b('❌ إلغاء','cancel')]])});
  }
  if(data.startsWith('unoffer:')){
    if(!isAdmin(u)) return;
    await listRm('offers:all',data.split(':')[1]);
    await answer(cb.id,'✅ تمت الإزالة');
    return showAdminOffers(cid,mid);
  }

  // حذف تصنيف مخصص
  if(data.startsWith('admin_del_scat:')){
    if(!isAdmin(u)) return;
    const catId=data.slice(15);
    const cats=await getList('store_cats:custom');
    const cat=cats.find(c=>c.id===catId);
    await kset('store_cats:custom',cats.filter(c=>c.id!==catId));
    await answer(cb.id,`✅ تم حذف التصنيف: ${cat?.name||catId}`);
    return showAdminCats(cid,mid);
  }
  if(data.startsWith('admin_del_pcat:')){
    if(!isAdmin(u)) return;
    const catId=data.slice(15);
    const cats=await getList('prod_cats:custom');
    const cat=cats.find(c=>c.id===catId);
    await kset('prod_cats:custom',cats.filter(c=>c.id!==catId));
    await answer(cb.id,`✅ تم حذف التصنيف: ${cat?.name||catId}`);
    return showAdminCats(cid,mid);
  }

  // تعديل الاشتراك template
  if(data==='edit_sub_template'){
    if(!isOwner(u)) return answer(cb.id,'⛔',true);
    await setState(uid,{step:'edit_sub_tmpl'});
    return send(cid,'✏️ اكتب النص الجديد لصفحة الاشتراك:',{reply_markup:ik([[b('❌ إلغاء','cancel')]])});
  }

  // تعديل متجر
  if(data.startsWith('edit_store:')){
    const sid=data.slice(11);
    await setState(uid,{step:'edit_store_desc',storeId:sid});
    return send(cid,'✏️ اكتب الوصف الجديد للمتجر:',{reply_markup:ik([[b('❌ إلغاء','cancel')]])});
  }
}

// ═══════════════════════════════════════════════════════
// Helpers للـ flows
// ═══════════════════════════════════════════════════════
function buildCityPicker(prefix) {
  const rows=[];
  for(let i=0;i<FIXED_CITIES.length;i+=3)
    rows.push(FIXED_CITIES.slice(i,i+3).map(c=>b(c,`${prefix}:${c}`)));
  rows.push([b('📍 أخرى',`${prefix}:other`)]);
  rows.push([b('❌ إلغاء','cancel')]);
  return rows;
}

async function showProductConfirm(cid,mid,uid,city) {
  const st=await getState(uid);
  if(!st.name||st.price===undefined) return;
  await setState(uid,{...st,step:'ap_confirm',city});
  const cond={new:'✨ جديد',used:'♻️ مستعمل',damaged:'⚠️ معيب'}[st.condition]||'—';
  const txt=`📋 <b>مراجعة الإعلان</b>\n\n`+
    `📦 ${st.name}\n📝 ${(st.description||'').slice(0,80)}\n`+
    `💰 ${st.price} ₪\n${cond}\n📍 ${city}\n`+
    `🖼️ ${(st.photos||[]).length} صور\n\n`+
    `هل تريد النشر؟\n<i>يحتاج موافقة الإدارة</i>`;
  return send(cid,txt,{reply_markup:ik([[b('✅ نشر','ap_publish'),b('❌ إلغاء','cancel')]])});
}

async function finalizeProduct(cid,mid,uid) {
  const st=await getState(uid);
  if(!st.name) return;
  const pu=await getUser(uid);
  const prodId=genId();
  const catKey=st.catKey||st.category||'other';
  const prod={
    id:prodId,catKey,category:catKey,
    isService:!!st.isService,serviceType:st.serviceType||null,
    condition:st.condition,name:st.name,description:st.description,
    price:parseFloat(st.price),city:st.city||'',
    photos:st.photos||[],
    sellerName:pu.firstName||'بائع',sellerUsername:pu.username||null,
    sellerId:uid,storeId:null,
    status:'pending',views:0,saves:0,createdAt:Date.now(),
  };
  // ربط بمتجر إذا كان لديه
  const myStores=await getList(`user:${uid}:stores`);
  if(myStores.length){
    prod.storeId=myStores[0];
    const s=await getStore(myStores[0]);
    if(s){s.products=[prodId,...(s.products||[])];await saveStore(myStores[0],s);}
  }
  await saveProd(prodId,prod);
  await listAdd('pending:products',prodId);
  await listAdd(`user:${uid}:prods`,prodId);
  await clearState(uid);
  // إشعار الإدارة
  await notify(OWNER_ID,`⏳ <b>منتج جديد بانتظار الموافقة</b>\n\n📦 ${prod.name}\n💰 ${prod.price}₪\n👤 ${prod.sellerName}\n🆔 ${uid}`);
  const admins=await getList('admins:list');
  for(const aid of admins){try{await notify(aid,`⏳ منتج جديد: ${prod.name}`);}catch{}}
  return send(cid,`✅ <b>تم إرسال إعلانك!</b>\n\n📦 ${prod.name}\n\nسيظهر بعد موافقة الإدارة ⏳`,{
    reply_markup:ik([[b('📦 إعلاناتي','my_listings')],[b('➕ إضافة آخر','add')],[b('🏠 رئيسية','main')]])
  });
}

async function finalizeStore(cid,mid,uid,city) {
  const st=await getState(uid);
  const pu=await getUser(uid);
  const storeId=genId();
  const isRest=st.storeType==='restaurant'||st.category==='restaurant';
  const store={
    id:storeId,type:isRest?'restaurant':'store',
    name:st.name,description:st.desc||'—',
    category:st.category||'other',city,
    hours:st.hours||'—',username:pu.username,
    products:[],subscription:pu.subscription||'free',
    ownerId:uid,createdAt:Date.now(),
  };
  await saveStore(storeId,store);
  await listAdd('stores:all',storeId);
  if(isRest) await listAdd('restaurants:all',storeId);
  await listAdd(`user:${uid}:stores`,storeId);
  await clearState(uid);
  return send(cid,`🎉 <b>تم إنشاء ${isRest?'مطعمك':'متجرك'} بنجاح!</b>\n\n🏪 ${store.name}\n📍 ${city}`,{
    reply_markup:ik([[b('🏪 عرض المتجر',`store:${storeId}`)],[b('➕ أضف منتجاً','add')],[b('🏠 رئيسية','main')]])
  });
}

// ═══════════════════════════════════════════════════════
// Message Handler
// ═══════════════════════════════════════════════════════
async function onMessage(update) {
  const msg=update.message;
  if(!msg) return;
  const cid=msg.chat.id, uid=msg.from.id, txt=msg.text||'';

  const u=await getUser(uid);
  if(u.firstName!==msg.from.first_name||u.username!==msg.from.username){
    u.firstName=msg.from.first_name; u.username=msg.from.username;
    await saveUser(uid,u);
  }

  // /start
  if(txt.startsWith('/start')){
    await clearState(uid);
    const param=txt.split(' ')[1];
    if(param?.startsWith('p_')){await showMain(cid,null,u);return showProduct(cid,param.slice(2),uid,null);}
    return showMain(cid,null,u);
  }

  // /myid للجميع
  if(txt==='/myid'||txt.startsWith('/myid')){
    return send(cid,`🆔 معرفك: <code>${uid}</code>`);
  }

  // أوامر الإدارة
  if(isAdmin(u)){
    if(txt.startsWith('/setsub ')){
      const [,tid,plan]=txt.split(' ');
      if(tid&&PLANS[plan]){
        const tu=await getUser(tid);tu.subscription=plan;await saveUser(tid,tu);
        const myStores=await getList(`user:${tid}:stores`);
        for(const sid of myStores){const s=await getStore(sid);if(s){s.subscription=plan;await saveStore(sid,s);}}
        try{await notify(parseInt(tid),`🎉 تم ترقية اشتراكك إلى ${PLANS[plan].name} ${PLANS[plan].badge}`);}catch{}
        return send(cid,`✅ تم تعيين اشتراك ${tid} إلى ${PLANS[plan].name}`);
      }
      return send(cid,'⚠️ /setsub [أيدي] [free|pro|business]');
    }
    if(txt.startsWith('/setmod ')){
      const [,tid,role]=txt.split(' ');
      if(tid){
        const tu=await getUser(tid);
        tu.adminRole=role==='remove'?null:(['admin','moderator'].includes(role)?role:null);
        await saveUser(tid,tu);
        // تحديث قائمة الأدمنية
        if(tu.adminRole){
          await listAdd('admins:list',parseInt(tid));
          await notify(parseInt(tid),`✅ تم تعيينك كـ ${tu.adminRole==='admin'?'مدير':'مشرف'} في سوقنا 🏪`);
        } else {
          await listRm('admins:list',parseInt(tid));
        }
        return send(cid,'✅ تم');
      }
    }
    if(txt.startsWith('/stats')){
      const [p,s,r,pend]=await Promise.all([
        getList('products:all').then(l=>l.length),
        getList('stores:all').then(l=>l.length),
        getList('reports:all').then(l=>l.length),
        getList('pending:products').then(l=>l.length),
      ]);
      return send(cid,`📊 <b>سوقنا — الإحصائيات</b>\n\n📦 المنتجات: ${p} (⏳ ${pend})\n🏪 المتاجر: ${s}\n🚩 البلاغات: ${r}`);
    }
    if(txt.startsWith('/broadcast ')){
      const msg2=txt.slice(11);
      const users=await getList('users:all');
      let sent=0;
      for(const uid2 of users){try{await notify(uid2,`📢 ${msg2}`);sent++;}catch{}}
      return send(cid,`📢 تم الإرسال لـ ${sent} مستخدم.`);
    }
    if(txt.startsWith('/addoffer ')){
      const pid=txt.slice(10).trim();
      const p=await getProd(pid);
      if(p&&p.status==='approved'){await listAdd('offers:all',pid);return send(cid,`🔥 تم إضافة: ${p.name}`);}
      return send(cid,'⚠️ لم يُعثر على المنتج.');
    }
    if(txt.startsWith('/addfeat ')){
      const pid=txt.slice(9).trim();
      const p=await getProd(pid);
      if(p&&p.status==='approved'){await listAdd('featured',pid);return send(cid,`⭐ تم تمييز: ${p.name}`);}
      return send(cid,'⚠️ لم يُعثر على المنتج.');
    }
  }

  // State machine
  const st=await getState(uid);
  if(!st?.step) return showMain(cid,null,u);

  // ── صور المنتج ────────────────────────────────────────
  if(st.step==='ap_photos'&&msg.photo){
    const photos=st.photos||[];
    if(photos.length<5){
      photos.push(msg.photo[msg.photo.length-1].file_id);
      await setState(uid,{...st,photos});
      if(photos.length===5){
        await setState(uid,{...st,photos,step:'ap_name'});
        return send(cid,'✅ تم استلام 5 صور!\n\n📍 الخطوة 3/7 — اكتب اسم المنتج:',{reply_markup:ik([[b('❌ إلغاء','cancel')]])});
      }
      return send(cid,`✅ صورة ${photos.length}/5 — أرسل المزيد أو:`,{
        reply_markup:ik([[b('✅ التالي','ap_next_name')],[b('❌ إلغاء','cancel')]])
      });
    }
    return;
  }

  // ── بحث ──────────────────────────────────────────────
  if(st.step==='search'){await clearState(uid);return doSearch(cid,txt);}

  // ── تمييز/عروض (إدارة) ───────────────────────────────
  if(st.step==='featuring'&&isAdmin(u)){
    await clearState(uid);
    const p=await getProd(txt.trim());
    if(p&&p.status==='approved'){await listAdd('featured',p.id,50);return send(cid,`⭐ تم تمييز: <b>${p.name}</b>`,{reply_markup:ik([[b('🔙 الإدارة','admin')]])});}
    return send(cid,'⚠️ لم يُعثر على المنتج أو لم تتم الموافقة عليه.');
  }
  if(st.step==='offering'&&isAdmin(u)){
    await clearState(uid);
    const p=await getProd(txt.trim());
    if(p&&p.status==='approved'){await listAdd('offers:all',p.id,50);return send(cid,`🔥 تم إضافة: <b>${p.name}</b>`,{reply_markup:ik([[b('🔙 الإدارة','admin')]])});}
    return send(cid,'⚠️ لم يُعثر على المنتج.');
  }

  // ── نص template الاشتراك ─────────────────────────────
  if(st.step==='edit_sub_tmpl'&&isOwner(u)){
    await kset('sub:template',txt);
    await clearState(uid);
    return send(cid,'✅ تم تحديث نص صفحة الاشتراك.',{reply_markup:ik([[b('🏠 رئيسية','main')]])});
  }

  // ── إضافة تصنيف للمنتجات ─────────────────────────────
  if(st.step==='add_prod_cat'){
    await clearState(uid);
    const norm=normalizeAr(txt);
    // تحقق من التشابه
    const existing=[...FIXED_PROD_CATS,...await getList('prod_cats:custom')];
    const similar=existing.find(c=>normalizeAr(c.name)===norm||normalizeAr(c.name).includes(norm));
    if(similar){
      return send(cid,`⚠️ هذا التصنيف موجود بالفعل: <b>${similar.name}</b>\n\nسيضاف منتجك فيه.`,{reply_markup:ik([[b('🛍️ السوق','market')]])});
    }
    if(txt.length>25) return send(cid,'⚠️ اسم التصنيف طويل جداً (أقصاه 25 حرف):');
    const catId=genId();
    const cats=await getList('prod_cats:custom');
    cats.push({id:catId,name:txt});
    await kset('prod_cats:custom',cats);
    return send(cid,`✅ تم إضافة تصنيف "<b>${txt}</b>" للسوق!`,{reply_markup:ik([[b('🛍️ السوق','market')]])});
  }

  // ── تصنيف مخصص للمتجر ────────────────────────────────
  if(st.step==='sc_custom_cat'){
    const norm=normalizeAr(txt);
    const existing=[...FIXED_STORE_CATS,...await getList('store_cats:custom')];
    const similar=existing.find(c=>normalizeAr(c.name)===norm||normalizeAr(c.name).includes(norm));
    let catId;
    if(similar){
      await send(cid,`⚠️ تم إضافة التصنيف هذا سابقاً — سيضاف متجرك فيه: <b>${similar.name}</b>`);
      catId=similar.id||similar.id;
    } else {
      if(txt.length>25) return send(cid,'⚠️ اسم التصنيف طويل جداً (أقصاه 25 حرف):');
      catId=`custom_${genId()}`;
      const cats=await getList('store_cats:custom');
      cats.push({id:catId,name:txt});
      await kset('store_cats:custom',cats);
    }
    await setState(uid,{...st,step:'sc_hours',category:catId});
    return send(cid,`✅ التصنيف: <b>${txt}</b>\n\nاكتب ساعات العمل أو تخطى:`,{
      reply_markup:ik([[b('⏭️ تخطى','sc_skip_hours')],[b('❌ إلغاء','cancel')]])
    });
  }

  // ── مدينة مخصصة (متجر) ───────────────────────────────
  if(st.step==='sc_custom_city'){
    const found=await findSimilarCity(txt);
    if(found){
      await send(cid,`✅ هذه فعلاً موجودة — تم إضافتها إلى المدينة: <b>${found}</b>`);
      return finalizeStore(cid,null,uid,found);
    }
    // مدينة جديدة
    await listAdd('cities:custom',txt);
    return finalizeStore(cid,null,uid,txt);
  }

  // ── مدينة مخصصة (منتج) ───────────────────────────────
  if(st.step==='ap_custom_city'){
    const found=await findSimilarCity(txt);
    if(found){
      await send(cid,`✅ هذه فعلاً موجودة: <b>${found}</b>`);
      return showProductConfirm(cid,null,uid,found);
    }
    await listAdd('cities:custom',txt);
    return showProductConfirm(cid,null,uid,txt);
  }

  // ── خطوات إنشاء المتجر ────────────────────────────────
  if(st.step==='sc_name'){
    await setState(uid,{...st,step:'sc_desc',name:txt});
    return send(cid,`✅ الاسم: <b>${txt}</b>\n\nاكتب وصف المتجر:`,{
      reply_markup:ik([[b('⏭️ تخطى','sc_skip_desc')],[b('❌ إلغاء','cancel')]])
    });
  }
  if(st.step==='sc_desc'){
    await setState(uid,{...st,step:'sc_category',desc:txt});
    return showStoreCatPicker(cid,uid);
  }
  if(st.step==='sc_skip_desc_txt'||data==='sc_skip_desc'){
    const st2=await getState(uid);
    await setState(uid,{...st2,step:'sc_category',desc:'—'});
    return showStoreCatPicker(cid,uid);
  }
  if(st.step==='sc_hours'){
    await setState(uid,{...st,step:'sc_city',hours:txt});
    const cityRows=buildCityPicker('sc_city');
    return send(cid,'📍 اختر مدينة المتجر:',{reply_markup:ik(cityRows)});
  }

  // ── خطوات إضافة منتج ─────────────────────────────────
  if(st.step==='ap_name'){
    await setState(uid,{...st,step:'ap_description',name:txt});
    return send(cid,`✅ الاسم: <b>${txt}</b>\n\n📍 الخطوة 4/7 — اكتب وصف المنتج:`,{reply_markup:ik([[b('❌ إلغاء','cancel')]])});
  }
  if(st.step==='ap_description'){
    await setState(uid,{...st,step:'ap_price',description:txt});
    return send(cid,`✅ الوصف حُفظ\n\n📍 الخطوة 5/7 — اكتب السعر بالشيكل (₪):`,{reply_markup:ik([[b('❌ إلغاء','cancel')]])});
  }
  if(st.step==='ap_price'){
    const price=parseFloat(txt.replace(/[^\d.]/g,''));
    if(isNaN(price)||price<0) return send(cid,'⚠️ أدخل رقماً صحيحاً للسعر:');
    await setState(uid,{...st,step:'ap_city',price});
    const cityRows=buildCityPicker('ap_city');
    return send(cid,`✅ السعر: <b>${price} ₪</b>\n\n📍 الخطوة 6/7 — اختر المدينة:`,{reply_markup:ik(cityRows)});
  }

  // ── تعديل وصف المتجر ─────────────────────────────────
  if(st.step==='edit_store_desc'){
    const s=await getStore(st.storeId);
    if(s){const myStores=await getList(`user:${uid}:stores`);if(myStores.includes(st.storeId)||isAdmin(u)){s.description=txt;await saveStore(st.storeId,s);}}
    await clearState(uid);
    return send(cid,'✅ تم تحديث وصف المتجر.',{reply_markup:ik([[b('🏪 متجري','my_store')]])});
  }

  return showMain(cid,null,u);
}

// تسجيل المستخدمين لـ broadcast
async function registerUser(uid) {
  await listAdd('users:all',uid,10000);
}

// ═══════════════════════════════════════════════════════
// Long Polling
// ═══════════════════════════════════════════════════════
async function processUpdate(update) {
  try {
    if(update.message?.from) await registerUser(update.message.from.id);
    if(update.callback_query?.from) await registerUser(update.callback_query.from.id);
    if(update.callback_query) await onCallback(update);
    else if(update.message) await onMessage(update);
  } catch(e) {
    console.error('❌ خطأ:', e.message, e.stack?.split('\n')[1]||'');
  }
}

async function startPolling() {
  await tg('deleteWebhook',{drop_pending_updates:false});
  let offset=0;
  console.log('✅ سوقنا — النسخة الجديدة تعمل! 🇵🇸');
  console.log('📡 يستقبل الرسائل...\n');
  while(true){
    try{
      const res=await tg('getUpdates',{offset,timeout:30,limit:100,allowed_updates:['message','callback_query']});
      if(res.ok&&res.result?.length){
        for(const upd of res.result){
          offset=upd.update_id+1;
          processUpdate(upd);
        }
      }
    } catch(e){
      console.error('polling error:',e.message);
      await new Promise(r=>setTimeout(r,3000));
    }
  }
}

startPolling();
