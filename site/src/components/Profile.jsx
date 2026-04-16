import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000';

const STATUS_CONFIG = {
    pending:   { label: 'Очікує',       color: '#92400e', bg: '#fffbeb', icon: '⏳' },
    confirmed: { label: 'Підтверджено', color: '#1e40af', bg: '#eff6ff', icon: '✅' },
    shipped:   { label: 'Відправлено',  color: '#5b21b6', bg: '#ede9fe', icon: '🚚' },
    delivered: { label: 'Доставлено',   color: '#065f46', bg: '#d1fae5', icon: '📦' },
    cancelled: { label: 'Скасовано',    color: '#991b1b', bg: '#fee2e2', icon: '❌' },
};

const ROLE_INFO = {
    admin:   { label: 'Адміністратор', color: '#78350f', bg: '#fef3c7', icon: '👑' },
    manager: { label: 'Менеджер',      color: '#1e40af', bg: '#dbeafe', icon: '⚙️' },
    user:    { label: 'Покупець',      color: '#be185d', bg: '#fce7f3', icon: '👤' },
};

const Inp = ({ label, ...props }) => (
    <div style={{ marginBottom: 14 }}>
        {label && <label className="field-label">{label}</label>}
        <input {...props} style={{
            display: 'block', width: '100%', padding: '10px 12px',
            background: props.disabled ? 'var(--bg2)' : 'var(--bg)',
            border: '1.5px solid var(--border)', borderRadius: 'var(--r)',
            fontFamily: 'inherit', fontSize: '0.88rem', color: 'var(--t1)',
            outline: 'none', boxSizing: 'border-box',
            opacity: props.disabled ? 0.6 : 1, fontWeight: 600,
            ...props.style
        }}
        onFocus={e => !props.disabled && (e.target.style.borderColor = 'var(--primary)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
    </div>
);

const Profile = ({ user, onLogin, onLogout, showToast }) => {
    const navigate = useNavigate();
    const [mode, setMode] = useState('login');
    const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tab, setTab] = useState('info');
    const [profileData, setProfileData] = useState(null);
    const [orders, setOrders] = useState([]);
    const [wishlistItems, setWishlistItems] = useState([]);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user?.token) {
            fetch(API + '/api/auth/me', { headers: { Authorization: 'Bearer ' + user.token } })
                .then(r => r.json()).then(d => { setProfileData(d); setEditForm(d); }).catch(() => {});
        }
    }, [user]);

    useEffect(() => {
        if (!user?.token) return;
        if (tab === 'orders') {
            fetch(API + '/api/orders/my', { headers: { Authorization: 'Bearer ' + user.token } })
                .then(r => r.json()).then(d => setOrders(Array.isArray(d) ? d : [])).catch(() => {});
        }
        if (tab === 'wishlist') {
            fetch(API + '/api/wishlist', { headers: { Authorization: 'Bearer ' + user.token } })
                .then(r => r.json()).then(d => setWishlistItems(Array.isArray(d) ? d : [])).catch(() => {});
        }
    }, [user, tab]);

    const handleAuth = async () => {
        setError('');
        if (!form.email || !form.password) { setError('Заповніть email та пароль'); return; }
        if (mode === 'register' && !form.full_name) { setError("Введіть ім'я"); return; }
        setLoading(true);
        try {
            const res = await fetch(API + '/api/auth/' + mode, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onLogin(data);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(API + '/api/auth/me', {
                method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + user.token },
                body: JSON.stringify(editForm)
            });
            if (!res.ok) throw new Error();
            setProfileData({ ...profileData, ...editForm });
            showToast('Профіль збережено ✓');
        } catch { showToast('Помилка збереження', 'error'); }
        finally { setSaving(false); }
    };

    const removeWish = async (id) => {
        try {
            await fetch(API + '/api/wishlist/' + id, { method: 'POST', headers: { Authorization: 'Bearer ' + user.token } });
            setWishlistItems(prev => prev.filter(p => p.id !== id));
            showToast('Видалено з вибраного');
        } catch { showToast('Помилка', 'error'); }
    };

    /* ── NOT LOGGED IN ── */
    if (!user) {
        return (
            <div className="auth-page">
                <div className="profile-card">
                    <div style={{ textAlign: 'center', marginBottom: 22 }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🌸</div>
                        <h2 style={{ marginBottom: 0, fontSize: '1.35rem' }}>
                            {mode === 'login' ? 'Вхід до кабінету' : 'Реєстрація'}
                        </h2>
                    </div>
                    <div className="auth-tabs">
                        <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Увійти</button>
                        <button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); }}>Реєстрація</button>
                    </div>
                    {mode === 'register' && (
                        <Inp label="Повне ім'я" type="text" placeholder="Ім'я Прізвище"
                            value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                    )}
                    <Inp label="Email" type="email" placeholder="you@example.com"
                        value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && handleAuth()} />
                    <Inp label="Пароль" type="password" placeholder="••••••••"
                        value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && handleAuth()} />
                    {mode === 'register' && (
                        <Inp label="Телефон" type="tel" placeholder="+380 XX XXX XX XX"
                            value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    )}
                    {error && <p className="error-msg">{error}</p>}
                    <button className="submit-btn" onClick={handleAuth} disabled={loading} style={{ marginTop: 4 }}>
                        {loading ? 'Зачекайте...' : mode === 'login' ? 'Увійти' : 'Створити акаунт'}
                    </button>
                </div>
            </div>
        );
    }

    const roleInfo = ROLE_INFO[user.role] || ROLE_INFO.user;

    return (
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px', background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--rl)', marginBottom: 22, flexWrap: 'wrap' }}>
                <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.4rem', flexShrink: 0 }}>
                    {user.full_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--t1)', marginBottom: 5 }}>{user.full_name}</div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', fontWeight: 800, color: roleInfo.color, background: roleInfo.bg, padding: '3px 10px', borderRadius: 20 }}>
                        {roleInfo.icon} {roleInfo.label}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {(user.role === 'admin' || user.role === 'manager') && (
                        <Link to="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--r)', background: 'var(--primary)', color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: '0.82rem' }}>
                            ⚙ Панель
                        </Link>
                    )}
                    <button className="logout-btn" onClick={onLogout}>Вийти</button>
                </div>
            </div>

            {/* Tabs */}
            <div className="profile-tabs" style={{ marginBottom: 20 }}>
                {[['info', '👤 Мої дані'], ['orders', '📦 Замовлення'], ['wishlist', '♡ Вибране']].map(([k, l]) => (
                    <button key={k} className={'profile-tab' + (tab === k ? ' active' : '')} onClick={() => setTab(k)}>
                        {l}
                        {k === 'orders' && orders.length > 0 && <span className="tab-badge">{orders.length}</span>}
                    </button>
                ))}
            </div>

            {/* INFO */}
            {tab === 'info' && profileData && (
                <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--rl)', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 18px', fontSize: '1rem', fontWeight: 800, color: 'var(--t1)', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>Особисті дані</h3>
                    <div className="form-row">
                        <Inp label="Повне ім'я" value={editForm.full_name || ''} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} />
                        <Inp label="Телефон" value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+380..." />
                    </div>
                    <div className="form-row">
                        <Inp label="Email (не змінюється)" value={editForm.email || ''} disabled />
                        <div style={{ marginBottom: 14 }}>
                            <label className="field-label">🎂 Дата народження</label>
                            <input type="date" value={editForm.birthday ? editForm.birthday.slice(0,10) : ''}
                                onChange={e => setEditForm({ ...editForm, birthday: e.target.value })}
                                style={{ display: 'block', width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'inherit', fontSize: '0.88rem', color: 'var(--t1)', outline: 'none', boxSizing: 'border-box', fontWeight: 600 }}
                                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                            <div style={{ fontSize: '0.72rem', color: 'var(--t4)', marginTop: 4 }}>Для отримання знижки на день народження</div>
                        </div>
                    </div>

                    <div style={{ height: 1, background: 'var(--border)', margin: '18px 0' }} />
                    <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 800, color: 'var(--t1)' }}>Адреса доставки</h3>
                    <Inp label="Телефон для доставки" value={editForm.saved_phone || ''} onChange={e => setEditForm({ ...editForm, saved_phone: e.target.value })} placeholder="+380..." />
                    <div style={{ marginBottom: 14 }}>
                        <label className="field-label">Адреса доставки</label>
                        <textarea rows={2} value={editForm.saved_address || ''} onChange={e => setEditForm({ ...editForm, saved_address: e.target.value })}
                            placeholder="м. Київ, Нова Пошта №14..."
                            style={{ display: 'block', width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'inherit', fontSize: '0.88rem', color: 'var(--t1)', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontWeight: 600 }}
                            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                    </div>
                    <button className="submit-btn" onClick={handleSave} disabled={saving} style={{ maxWidth: 220, marginTop: 4 }}>
                        {saving ? 'Збереження...' : 'Зберегти зміни'}
                    </button>
                </div>
            )}

            {/* ORDERS */}
            {tab === 'orders' && (
                orders.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📦</div>
                        <p>Замовлень ще немає</p>
                        <Link to="/" style={{ color: 'var(--primary)', fontWeight: 700, marginTop: 8, display: 'inline-block' }}>До каталогу →</Link>
                    </div>
                ) : (
                    <div className="orders-history">
                        {orders.map(order => {
                            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                            const items = (order.items_detail || '').split('||').filter(Boolean);
                            return (
                                <div key={order.id} className="order-card" onClick={() => navigate('/orders/' + order.id)}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontWeight: 900, color: 'var(--t1)', fontSize: '0.95rem' }}>Замовлення #{order.id}</span>
                                            <span style={{ fontSize: '0.76rem', color: 'var(--t4)', fontWeight: 600 }}>{new Date(order.created_at).toLocaleDateString('uk-UA')}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <span style={{ fontWeight: 900, color: 'var(--t1)' }}>{Number(order.total_price).toFixed(0)} грн</span>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, fontSize: '0.76rem', fontWeight: 800, color: cfg.color, background: cfg.bg }}>
                                                {cfg.icon} {cfg.label}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ padding: '10px 18px 12px', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                        {items.slice(0, 2).map((it, i) => (
                                            <span key={i} style={{ fontSize: '0.78rem', color: 'var(--t3)', background: 'var(--bg)', padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                                {it.trim()}
                                            </span>
                                        ))}
                                        {items.length > 2 && <span style={{ fontSize: '0.76rem', color: 'var(--t4)', fontWeight: 600 }}>+{items.length - 2} ще</span>}
                                        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>Деталі →</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {/* WISHLIST */}
            {tab === 'wishlist' && (
                wishlistItems.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">♡</div>
                        <p>Список вибраного порожній</p>
                        <Link to="/" style={{ color: 'var(--primary)', fontWeight: 700, marginTop: 8, display: 'inline-block' }}>До каталогу →</Link>
                    </div>
                ) : (
                    <div className="wishlist-grid">
                        {wishlistItems.map(p => (
                            <div key={p.id} className="wishlist-card">
                                <Link to={'/product/' + p.id}>
                                    {p.image_url ? <img src={API + p.image_url} alt={p.title} /> : <div className="wishlist-no-img">🌸</div>}
                                </Link>
                                <div>
                                    <Link to={'/product/' + p.id} className="wishlist-card-title">{p.title}</Link>
                                    <div style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '0.95rem' }}>{Number(p.price).toFixed(0)} грн</div>
                                </div>
                                <button className="delete-btn" onClick={() => removeWish(p.id)}>×</button>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
};

export default Profile;