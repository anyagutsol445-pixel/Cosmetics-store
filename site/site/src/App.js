import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import Catalog from './components/Catalog.jsx';
import ProductPage from './components/ProductPage.jsx';
import Cart from './components/Cart.jsx';
import Checkout from './components/Checkout.jsx';
import Profile from './components/Profile.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import AdminOrders from './components/AdminOrders.jsx';
import AdminPromo from './components/AdminPromo.jsx';
import AdminUsers from './components/AdminUsers.jsx';
import SalesPage from './components/SalesPage.jsx';
import ComparePage from './components/ComparePage.jsx';
import SupportPage from './components/SupportPage.jsx';
import SupportTicket from './components/SupportTicket.jsx';
import OrderPage from './components/OrderPage.jsx';
import Toast from './components/Toast.jsx';

const API = 'http://localhost:5000';
const STAFF = ['admin','manager'];
const CAN_MANAGE = ['admin','manager'];

const ProtectedRoute = ({ user, allowed, children }) => {
    if (!user || !(allowed||['admin']).includes(user.role)) return <Navigate to="/" replace />;
    return children;
};
function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => { window.scrollTo(0,0); }, [pathname]);
    return null;
}

function NavSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const navigate = useNavigate();
    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    useEffect(() => {
        if (query.length < 2) { setResults([]); return; }
        const t = setTimeout(() => {
            fetch(API + '/api/products?search=' + encodeURIComponent(query))
                .then(r => r.json()).then(d => { setResults(Array.isArray(d) ? d.slice(0,6) : []); setOpen(true); }).catch(() => {});
        }, 260);
        return () => clearTimeout(t);
    }, [query]);
    const pick = (id) => { setQuery(''); setResults([]); setOpen(false); navigate('/product/'+id); };
    const go = (e) => { e.preventDefault(); if (query.trim()) { setOpen(false); navigate('/?search='+encodeURIComponent(query)); setQuery(''); } };
    return (
        <div className="nav-search-wrap" ref={ref}>
            <form onSubmit={go} className="nav-search-form">
                <input type="text" placeholder="Пошук товарів..." value={query}
                    onChange={e => setQuery(e.target.value)} onFocus={() => results.length && setOpen(true)} />
                <button type="submit">🔍</button>
            </form>
            {open && results.length > 0 && (
                <div className="nav-search-dropdown">
                    {results.map(p => {
                        const sale = p.discount_price && new Date(p.discount_expiry) > new Date();
                        return (
                            <div key={p.id} className="nav-search-item" onClick={() => pick(p.id)}>
                                <div className="nav-search-img">
                                    {p.image_url ? <img src={API+p.image_url} alt={p.title}/> : <span>🌸</span>}
                                </div>
                                <div>
                                    <div className="nav-search-title">{p.title}</div>
                                    <div className="nav-search-price">{Number(sale ? p.discount_price : p.price).toFixed(0)} грн</div>
                                </div>
                            </div>
                        );
                    })}
                    <div className="nav-search-all" onClick={() => { navigate('/?search='+encodeURIComponent(query)); setQuery(''); setOpen(false); }}>
                        Всі результати для «{query}» →
                    </div>
                </div>
            )}
        </div>
    );
}

function NotifBell({ user }) {
    const [notifs, setNotifs] = useState([]);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const navigate = useNavigate();
    const load = useCallback(() => {
        if (!user?.token) return;
        fetch(API+'/api/notifications', {headers:{Authorization:'Bearer '+user.token}})
            .then(r=>r.json()).then(d=>setNotifs(Array.isArray(d)?d:[])).catch(()=>{});
    }, [user]);
    useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);
    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
    }, []);
    const unread = notifs.filter(n => !n.is_read).length;
    const markAll = async () => {
        await fetch(API+'/api/notifications/read', {method:'POST',headers:{Authorization:'Bearer '+user.token}});
        setNotifs(p => p.map(n=>({...n,is_read:1})));
    };
    const click = async (n) => {
        if (!n.is_read) {
            await fetch(API+'/api/notifications/'+n.id+'/read', {method:'PATCH',headers:{Authorization:'Bearer '+user.token}});
            setNotifs(p => p.map(x=>x.id===n.id?{...x,is_read:1}:x));
        }
        if (n.order_id) { navigate('/orders/'+n.order_id); setOpen(false); }
    };
    const ago = (dt) => { const m=Math.floor((Date.now()-new Date(dt).getTime())/60000); if(m<1)return'щойно'; if(m<60)return m+' хв'; const h=Math.floor(m/60); if(h<24)return h+' год'; return Math.floor(h/24)+' дн'; };
    return (
        <div className="notif-wrap" ref={ref}>
            <button className="notif-btn" onClick={() => setOpen(o=>!o)} title="Сповіщення">
                🔔{unread>0 && <span className="notif-badge">{unread>9?'9+':unread}</span>}
            </button>
            {open && (
                <div className="notif-dropdown">
                    <div className="notif-header">
                        <h4>Сповіщення{unread>0 && ` (${unread})`}</h4>
                        {unread>0 && <button className="notif-read-all" onClick={markAll}>Прочитати всі</button>}
                    </div>
                    <div className="notif-list">
                        {notifs.length===0 ? <div className="notif-empty">Поки немає сповіщень</div> :
                            notifs.map(n => (
                                <div key={n.id} className={`notif-item${n.is_read?'':' unread'}`} onClick={()=>click(n)}>
                                    <div className={`notif-dot${n.is_read?' read':''}`}/>
                                    <div>
                                        <div className="notif-msg">{n.message}</div>
                                        <div className="notif-time">{ago(n.created_at)}</div>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            )}
        </div>
    );
}

function App() {
    const [cart,setCart] = useState(()=>{try{return JSON.parse(localStorage.getItem('cart'))||[];}catch{return [];}});
    const [wishlist,setWishlist] = useState([]);
    const [compareList,setCompareList] = useState([]);
    const [recentIds,setRecentIds] = useState(()=>{try{return JSON.parse(localStorage.getItem('recent'))||[];}catch{return [];}});
    const [products,setProducts] = useState([]);
    const [loadingProducts,setLoadingProducts] = useState(true);
    const [user,setUser] = useState(()=>{try{return JSON.parse(localStorage.getItem('user'))||null;}catch{return null;}});
    const [toast,setToast] = useState(null);
    const [mobileMenuOpen,setMobileMenuOpen] = useState(false);
    const toastTimer = useRef(null);
    const sessionId = useRef(localStorage.getItem('session_id')||(() => { const id=Math.random().toString(36).slice(2)+Date.now(); localStorage.setItem('session_id',id); return id; })());

    useEffect(()=>{localStorage.setItem('cart',JSON.stringify(cart));},[cart]);
    useEffect(()=>{localStorage.setItem('recent',JSON.stringify(recentIds));},[recentIds]);

    const showToast = useCallback((message,type='success')=>{
        if(toastTimer.current) clearTimeout(toastTimer.current);
        setToast({message,type});
        toastTimer.current = setTimeout(()=>setToast(null),3500);
    },[]);

    const fetchProducts = useCallback(async (params={})=>{
        setLoadingProducts(true);
        try {
            const q = new URLSearchParams(params).toString();
            const res = await fetch(API+'/api/products'+(q?'?'+q:''));
            if(!res.ok) throw new Error();
            const data = await res.json();
            setProducts(Array.isArray(data) ? data : []);
        } catch { showToast('Помилка завантаження','error'); setProducts([]); }
        finally { setLoadingProducts(false); }
    },[showToast]);

    useEffect(()=>{fetchProducts();},[]);
    useEffect(()=>{
        if(user?.token) fetch(API+'/api/wishlist/ids',{headers:{Authorization:'Bearer '+user.token}}).then(r=>r.json()).then(d=>setWishlist(Array.isArray(d)?d:[])).catch(()=>{});
        else setWishlist([]);
    },[user]);
    useEffect(()=>{
        fetch(API+'/api/compare/'+sessionId.current).then(r=>r.json()).then(d=>setCompareList(Array.isArray(d)?d.map(p=>p.id):[])).catch(()=>{});
    },[]);

    const addToCart = useCallback((product,qty=1)=>{
        setCart(prev=>{
            const ex=prev.find(i=>i.id===product.id); const cur=ex?ex.quantity:0;
            if(cur+qty>product.stock_quantity){showToast('Більше немає на складі','error');return prev;}
            showToast('"'+product.title+'" додано до кошика ✓');
            if(ex) return prev.map(i=>i.id===product.id?{...i,quantity:i.quantity+qty}:i);
            return [...prev,{...product,quantity:qty}];
        });
    },[showToast]);
    const updateCartQty = useCallback((id,qty)=>setCart(prev=>qty<=0?prev.filter(i=>i.id!==id):prev.map(i=>i.id===id?{...i,quantity:qty}:i)),[]);
    const removeFromCart = useCallback((id)=>setCart(prev=>prev.filter(i=>i.id!==id)),[]);
    const clearCart = useCallback(()=>{setCart([]);localStorage.removeItem('cart');},[]);
    const addToRecent = useCallback((id)=>setRecentIds(prev=>[id,...prev.filter(x=>x!==id)].slice(0,10)),[]);
    const toggleWishlist = useCallback(async(productId)=>{
        if(!user?.token){showToast('Увійдіть щоб додати до вибраного','error');return;}
        try{const res=await fetch(API+'/api/wishlist/'+productId,{method:'POST',headers:{Authorization:'Bearer '+user.token}});const data=await res.json();setWishlist(prev=>data.added?[...prev,productId]:prev.filter(id=>id!==productId));showToast(data.added?'Додано до вибраного ♡':'Видалено з вибраного');}catch{showToast('Помилка','error');}
    },[user,showToast]);
    const toggleCompare = useCallback(async(productId)=>{
        try{const res=await fetch(API+'/api/compare/'+sessionId.current+'/'+productId,{method:'POST'});const data=await res.json();if(!res.ok){showToast(data.error,'error');return;}setCompareList(prev=>data.added?[...prev,productId]:prev.filter(id=>id!==productId));showToast(data.added?'Додано до порівняння':'Видалено з порівняння');}catch{showToast('Помилка','error');}
    },[showToast]);
    const handleLogin = useCallback((d)=>{setUser(d);localStorage.setItem('user',JSON.stringify(d));showToast('Вітаємо, '+d.full_name+'! 👋');},[showToast]);
    const handleLogout = useCallback(()=>{setUser(null);setWishlist([]);localStorage.removeItem('user');showToast('До побачення!');},[showToast]);

    const totalQty = cart.reduce((s,i)=>s+i.quantity,0);
    const isStaff = user && STAFF.includes(user.role);
    const commonProps = {onAddToCart:addToCart,wishlist,onToggleWishlist:toggleWishlist,compareList,onToggleCompare:toggleCompare,user};

    return (
        <Router>
            <ScrollToTop/>
            <div className="app-container">
                <nav className="navbar">
                    <div className="navbar-inner">
                        <div className="nav-brand"><Link to="/">Beautica</Link></div>
                        <NavSearch/>
                        <button className={'burger'+(mobileMenuOpen?' open':'')} onClick={()=>setMobileMenuOpen(o=>!o)} aria-label="Меню">
                            <span/><span/><span/>
                        </button>
                        <div className={'nav-links'+(mobileMenuOpen?' open':'')} onClick={()=>setMobileMenuOpen(false)}>
                            <Link to="/">Каталог</Link>
                            <Link to="/sales" className="sales-link">🏷 Акції</Link>
                            {compareList.length>0 && <Link to="/compare" className="compare-link">⚖ Порівняти <span className="tab-badge">{compareList.length}</span></Link>}
                            <Link to="/support">Підтримка</Link>
                            {isStaff && (<>
                                <span className="nav-sep">|</span>
                                <Link to="/admin" className="admin-link">Товари</Link>
                                <Link to="/admin/orders" className="admin-link">Замовлення</Link>
                                <Link to="/admin/support" className="admin-link">Чат</Link>
                                {user.role==='admin' && <><Link to="/admin/promo" className="admin-link">Промо</Link><Link to="/admin/users" className="admin-link">Юзери</Link></>}
                            </>)}
                            <span className="nav-sep">|</span>
                            {user ? (<>
                                <NotifBell user={user}/>
                                <Link to="/profile">👤 {user.full_name.split(' ')[0]}</Link>
                                <Link to="/cart" className="cart-link">🛒{totalQty>0 && <span className="cart-badge">{totalQty}</span>}</Link>
                                <button className="logout-btn" onClick={handleLogout}>Вийти</button>
                            </>) : (<>
                                <Link to="/cart" className="cart-link">🛒 Кошик{totalQty>0 && <span className="cart-badge">{totalQty}</span>}</Link>
                                <Link to="/profile" className="nav-btn-primary">Увійти</Link>
                            </>)}
                        </div>
                    </div>
                </nav>

                <main className="content">
                    <Routes>
                        <Route path="/" element={<Catalog products={products} loading={loadingProducts} onFilter={fetchProducts} {...commonProps}/>}/>
                        <Route path="/product/:id" element={<ProductPage {...commonProps} showToast={showToast} onAddRecent={addToRecent} recentIds={recentIds}/>}/>
                        <Route path="/cart" element={<Cart cartItems={cart} onUpdate={updateCartQty} onRemove={removeFromCart}/>}/>
                        <Route path="/checkout" element={<Checkout cartItems={cart} user={user} onOrderSuccess={clearCart} showToast={showToast}/>}/>
                        <Route path="/profile" element={<Profile user={user} onLogin={handleLogin} onLogout={handleLogout} showToast={showToast}/>}/>
                        <Route path="/sales" element={<SalesPage {...commonProps}/>}/>
                        <Route path="/compare" element={<ComparePage sessionId={sessionId.current} onToggleCompare={toggleCompare} onAddToCart={addToCart}/>}/>
                        <Route path="/support" element={<SupportPage user={user} showToast={showToast}/>}/>
                        <Route path="/support/:id" element={<SupportTicket user={user} showToast={showToast}/>}/>
                        <Route path="/orders/:id" element={<ProtectedRoute user={user} allowed={['user','manager','admin']}><OrderPage user={user} showToast={showToast}/></ProtectedRoute>}/>
                        <Route path="/admin" element={<ProtectedRoute user={user} allowed={CAN_MANAGE}><AdminPanel user={user} showToast={showToast}/></ProtectedRoute>}/>
                        <Route path="/admin/orders" element={<ProtectedRoute user={user} allowed={['admin','manager']}><AdminOrders user={user} showToast={showToast}/></ProtectedRoute>}/>
                        <Route path="/admin/promo" element={<ProtectedRoute user={user} allowed={['admin']}><AdminPromo user={user} showToast={showToast}/></ProtectedRoute>}/>
                        <Route path="/admin/users" element={<ProtectedRoute user={user} allowed={['admin']}><AdminUsers user={user} showToast={showToast}/></ProtectedRoute>}/>
                        <Route path="/admin/support" element={<ProtectedRoute user={user} allowed={STAFF}><SupportPage user={user} showToast={showToast} isAdmin/></ProtectedRoute>}/>
                    </Routes>
                </main>

                <footer className="footer">
                    <div className="footer-inner">
                        <div className="footer-grid">
                            <div className="footer-brand-col">
                                <div className="brand">Beautica</div>
                                <p>Інтернет-магазин косметики та засобів догляду. Тільки перевірені бренди та найкращі ціни. Швидка доставка по всій Україні.</p>
                            </div>
                            <div className="footer-col">
                                <h4>Каталог</h4>
                                <Link to="/?category=perfume">Парфуми</Link>
                                <Link to="/?category=cream">Креми</Link>
                                <Link to="/?category=skincare">Догляд</Link>
                                <Link to="/?category=makeup">Макіяж</Link>
                                <Link to="/sales">Акції</Link>
                            </div>
                            <div className="footer-col">
                                <h4>Покупцям</h4>
                                <Link to="/cart">Кошик</Link>
                                <Link to="/profile">Особистий кабінет</Link>
                                <Link to="/support">Підтримка</Link>
                                <Link to="/compare">Порівняння товарів</Link>
                            </div>
                            <div className="footer-col">
                                <h4>Інформація</h4>
                                <a href="#">Про Beautica</a>
                                <a href="#">Доставка та оплата</a>
                                <a href="#">Повернення товару</a>
                                <a href="#">Контакти</a>
                            </div>
                        </div>
                        <div className="footer-bottom">
                            <span className="footer-copy">© 2026 Beautica. Всі права захищені.</span>
                            <span className="footer-copy">Гуцол А. А.</span>
                        </div>
                    </div>
                </footer>
                {toast && <Toast message={toast.message} type={toast.type}/>}
            </div>
        </Router>
    );
}
export default App;
