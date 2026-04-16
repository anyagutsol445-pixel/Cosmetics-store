import React, { useState, useEffect, useRef } from 'react';

const API = '[localhost](http://localhost:5000)';

const PROMO_TYPES = [
    { value: 'public',      label: '🌐 Публічний',           desc: 'Доступний для всіх' },
    { value: 'first_order', label: '🎁 Перше замовлення',    desc: 'Тільки для нових покупців' },
    { value: 'personal',    label: '👤 Персональний',        desc: 'Для конкретного користувача' },
];

const TYPE_COLORS = {
    public:      { color: '#10b981', bg: '#d1fae5', border: '#a7f3d0' },
    first_order: { color: '#f59e0b', bg: '#fef3c7', border: '#fde68a' },
    personal:    { color: '#8b5cf6', bg: '#ede9fe', border: '#ddd6fe' },
};

const TYPE_LABEL = {
    public:      '🌐 Публічний',
    first_order: '🎁 Перше замовлення',
    personal:    '👤 Персональний',
};

const getPromoType = (p) => {
    if (p.user_id) return 'personal';
    if (p.first_order_only) return 'first_order';
    return 'public';
};

const AdminPromo = ({ user, showToast }) => {
    const [promos, setPromos] = useState([]);
    const [form, setForm] = useState({
        code: '', discount_percent: '', max_uses: '', expires_at: '',
        promo_type: 'public', user_id: '', min_order_amount: '',
    });
    const [loading, setLoading] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [userResults, setUserResults] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [filterType, setFilterType] = useState('all');
    const [filterActive, setFilterActive] = useState('all');
    const searchRef = useRef(null);
    const searchTimer = useRef(null);

    const headers = { Authorization: 'Bearer ' + user?.token };

    const fetchPromos = async () => {
        try {
            const res = await fetch(API + '/api/admin/promo', { headers });
            const data = await res.json();
            setPromos(Array.isArray(data) ? data : []);
        } catch { showToast('Помилка завантаження', 'error'); }
    };

    useEffect(() => { fetchPromos(); }, []);

    // Пошук користувачів для персонального промокоду
    useEffect(() => {
        if (form.promo_type !== 'personal') return;
        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (userSearch.length < 2) { setUserResults([]); return; }
        searchTimer.current = setTimeout(async () => {
            try {
                const res = await fetch(API + '/api/admin/users/search?q=' + encodeURIComponent(userSearch), { headers });
                const data = await res.json();
                setUserResults(Array.isArray(data) ? data : []);
            } catch {}
        }, 300);
    }, [userSearch, form.promo_type]);

    // Закриваємо дропдаун при кліку зовні
    useEffect(() => {
        const h = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setUserResults([]); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const handleTypeChange = (type) => {
        setForm(f => ({ ...f, promo_type: type, user_id: '' }));
        setSelectedUser(null);
        setUserSearch('');
        setUserResults([]);
    };

    const selectUser = (u) => {
        setSelectedUser(u);
        setForm(f => ({ ...f, user_id: u.id }));
        setUserSearch(u.full_name + ' (' + u.email + ')');
        setUserResults([]);
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!form.code || !form.discount_percent) { showToast('Код та відсоток обов\'язкові', 'error'); return; }
        if (form.promo_type === 'personal' && !form.user_id) { showToast('Оберіть користувача', 'error'); return; }
        setLoading(true);
        try {
            const res = await fetch(API + '/api/admin/promo', {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showToast('Промокод створено!');
            setForm({ code: '', discount_percent: '', max_uses: '', expires_at: '', promo_type: 'public', user_id: '', min_order_amount: '' });
            setSelectedUser(null);
            setUserSearch('');
            fetchPromos();
        } catch (err) { showToast(err.message, 'error'); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id, code) => {
        if (!window.confirm('Видалити промокод "' + code + '"?')) return;
        try {
            await fetch(API + '/api/admin/promo/' + id, { method: 'DELETE', headers });
            showToast('Видалено');
            fetchPromos();
        } catch { showToast('Помилка', 'error'); }
    };

    const handleToggle = async (id) => {
        try {
            await fetch(API + '/api/admin/promo/' + id + '/toggle', { method: 'PATCH', headers });
            setPromos(prev => prev.map(p => p.id === id ? { ...p, is_active: p.is_active ? 0 : 1 } : p));
        } catch { showToast('Помилка', 'error'); }
    };

    // Фільтрація
    const filtered = promos.filter(p => {
        const type = getPromoType(p);
        const matchType = filterType === 'all' || type === filterType;
        const matchActive = filterActive === 'all' || (filterActive === 'active' ? p.is_active : !p.is_active);
        return matchType && matchActive;
    });

    const counts = {
        all: promos.length,
        public: promos.filter(p => getPromoType(p) === 'public').length,
        first_order: promos.filter(p => getPromoType(p) === 'first_order').length,
        personal: promos.filter(p => getPromoType(p) === 'personal').length,
    };

    const isExpired = (p) => p.expires_at && new Date(p.expires_at) < new Date();
    const isExhausted = (p) => p.max_uses && p.uses_count >= p.max_uses;

    return (
        <div className="admin-layout">
            {/* ── Форма створення ── */}
            <div className="admin-container">
                <h2>Створити промокод</h2>
                <form onSubmit={handleAdd} className="admin-form">

                    {/* Тип промокоду */}
                    <label className="field-label">Тип промокоду</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                        {PROMO_TYPES.map(pt => {
                            const clr = TYPE_COLORS[pt.value];
                            const active = form.promo_type === pt.value;
                            return (
                                <label key={pt.value}
                                    onClick={() => handleTypeChange(pt.value)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                                        border: `2px solid ${active ? clr.color : 'var(--border)'}`,
                                        borderRadius: 'var(--r)', cursor: 'pointer',
                                        background: active ? clr.bg : 'var(--bg)',
                                        transition: 'all 0.2s',
                                    }}>
                                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${active ? clr.color : 'var(--border)'}`, background: active ? clr.color : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {active && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: active ? clr.color : 'var(--t2)' }}>{pt.label}</div>
                                        <div style={{ fontSize: '0.74rem', color: 'var(--t4)' }}>{pt.desc}</div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>

                    {/* Пошук юзера для персонального */}
                    {form.promo_type === 'personal' && (
                        <div style={{ marginBottom: 14 }}>
                            <label className="field-label">Користувач *</label>
                            <div ref={searchRef} style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="Пошук по імені або email..."
                                    value={userSearch}
                                    onChange={e => { setUserSearch(e.target.value); setSelectedUser(null); setForm(f => ({ ...f, user_id: '' })); }}
                                    style={{ marginBottom: 0 }}
                                />
                                {userResults.length > 0 && (
                                    <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid var(--primary)', borderTop: 'none', borderRadius: '0 0 var(--r) var(--r)', list: 'none', margin: 0, padding: 0, zIndex: 100, boxShadow: 'var(--shadow-md)' }}>
                                        {userResults.map(u => (
                                            <li key={u.id} onMouseDown={e => { e.preventDefault(); selectUser(u); }}
                                                style={{ padding: '10px 13px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.86rem' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                                                onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                                <div style={{ fontWeight: 700, color: 'var(--t1)' }}>{u.full_name}</div>
                                                <div style={{ fontSize: '0.76rem', color: 'var(--t4)' }}>{u.email}</div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            {selectedUser && (
                                <div style={{ marginTop: 6, padding: '7px 12px', background: '#ede9fe', border: '1px solid #ddd6fe', borderRadius: 'var(--r)', fontSize: '0.82rem', color: '#5b21b6', fontWeight: 600 }}>
                                    ✓ Обрано: {selectedUser.full_name} ({selectedUser.email})
                                </div>
                            )}
                        </div>
                    )}

                    {/* Код */}
                    <label className="field-label">Код промокоду *</label>
                    <input
                        placeholder="WELCOME10"
                        value={form.code}
                        onChange={e => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                        required
                    />

                    {/* Знижка */}
                    <label className="field-label">Знижка (%)</label>
                    <input type="number" placeholder="10" min="1" max="100" value={form.discount_percent}
                        onChange={e => setForm({ ...form, discount_percent: e.target.value })} required />

                    {/* Мінімальна сума */}
                    <label className="field-label">Мінімальна сума замовлення (грн)</label>
                    <input type="number" placeholder="Без обмеження" min="0" value={form.min_order_amount}
                        onChange={e => setForm({ ...form, min_order_amount: e.target.value })} />

                    <div className="form-row">
                        <div>
                            <label className="field-label">Макс. використань</label>
                            <input type="number" placeholder="∞" min="1" value={form.max_uses}
                                onChange={e => setForm({ ...form, max_uses: e.target.value })} />
                        </div>
                        <div>
                            <label className="field-label">Діє до</label>
                            <input type="datetime-local" value={form.expires_at}
                                onChange={e => setForm({ ...form, expires_at: e.target.value })} />
                        </div>
                    </div>

                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? '...' : 'Створити промокод'}
                    </button>
                </form>
            </div>

            {/* ── Список промокодів ── */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--t1)' }}>
                        Промокоди <span style={{ fontSize: '0.9rem', color: 'var(--t4)', fontWeight: 500 }}>({promos.length})</span>
                    </h2>
                </div>

                {/* Фільтри за типом */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {[{ key: 'all', label: 'Всі', color: 'var(--t3)' },
                      { key: 'public', label: '🌐 Публічні', color: TYPE_COLORS.public.color },
                      { key: 'first_order', label: '🎁 Перше замовлення', color: TYPE_COLORS.first_order.color },
                      { key: 'personal', label: '👤 Персональні', color: TYPE_COLORS.personal.color },
                    ].map(f => (
                        <button key={f.key} onClick={() => setFilterType(f.key)}
                            style={{
                                padding: '4px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
                                fontSize: '0.72rem', fontWeight: 700,
                                border: filterType === f.key ? `1px solid ${f.color}` : '1px solid var(--border)',
                                background: filterType === f.key ? f.color + '18' : '#fff',
                                color: filterType === f.key ? f.color : 'var(--t4)', transition: 'all 0.18s',
                            }}>
                            {f.label} ({counts[f.key] ?? 0})
                        </button>
                    ))}
                </div>

                {/* Фільтр активності */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                    {[{ key: 'all', label: 'Всі' }, { key: 'active', label: 'Активні' }, { key: 'inactive', label: 'Вимкнені' }].map(f => (
                        <button key={f.key} onClick={() => setFilterActive(f.key)}
                            style={{
                                padding: '3px 10px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
                                fontSize: '0.7rem', fontWeight: 700,
                                border: filterActive === f.key ? '1px solid var(--primary)' : '1px solid var(--border)',
                                background: filterActive === f.key ? 'var(--primary-dim)' : '#fff',
                                color: filterActive === f.key ? 'var(--primary)' : 'var(--t4)', transition: 'all 0.18s',
                            }}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {filtered.length === 0 ? (
                    <div className="empty-state"><div className="empty-icon">🎟</div><p>Промокодів не знайдено</p></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {filtered.map(p => {
                            const type = getPromoType(p);
                            const clr = TYPE_COLORS[type];
                            const expired = isExpired(p);
                            const exhausted = isExhausted(p);
                            const inactive = !p.is_active || expired || exhausted;

                            return (
                                <div key={p.id} style={{
                                    background: '#fff', border: `1.5px solid ${inactive ? 'var(--border)' : clr.border}`,
                                    borderRadius: 'var(--rl)', overflow: 'hidden',
                                    opacity: inactive ? 0.75 : 1, transition: 'all 0.2s',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', flexWrap: 'wrap' }}>

                                        {/* Тип */}
                                        <div style={{ width: 36, height: 36, borderRadius: 10, background: clr.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                                            {type === 'public' ? '🌐' : type === 'first_order' ? '🎁' : '👤'}
                                        </div>

                                        {/* Код і знижка */}
                                        <div style={{ flex: 1, minWidth: 120 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                                <span style={{ fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 900, color: inactive ? 'var(--t4)' : 'var(--t1)', letterSpacing: '0.06em' }}>
                                                    {p.code}
                                                </span>
                                                <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 800, color: clr.color, background: clr.bg, border: `1px solid ${clr.border}` }}>
                                                    {TYPE_LABEL[type]}
                                                </span>
                                                {expired && <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700, color: '#991b1b', background: '#fee2e2' }}>Прострочено</span>}
                                                {exhausted && !expired && <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700, color: '#92400e', background: '#fef3c7' }}>Ліміт вичерпано</span>}
                                            </div>

                                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: '0.76rem', color: 'var(--t4)' }}>
                                                <span style={{ color: clr.color, fontWeight: 800 }}>−{p.discount_percent}%</span>
                                                <span>{p.uses_count}{p.max_uses ? '/' + p.max_uses : ''} використань</span>
                                                {p.min_order_amount && <span>від {Number(p.min_order_amount).toFixed(0)} грн</span>}
                                                {p.expires_at && <span>до {new Date(p.expires_at).toLocaleDateString('uk-UA')}</span>}
                                                {p.user_name && <span>👤 {p.user_name}</span>}
                                            </div>
                                        </div>

                                        {/* Кнопки */}
                                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                            <button onClick={() => handleToggle(p.id)}
                                                style={{
                                                    padding: '6px 13px', borderRadius: 'var(--r)', border: `1.5px solid ${p.is_active ? 'var(--green)' : 'var(--border)'}`,
                                                    background: p.is_active ? 'var(--green-light)' : 'var(--bg)', color: p.is_active ? '#065f46' : 'var(--t4)',
                                                    cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s',
                                                }}>
                                                {p.is_active ? '✓ Активний' : 'Вимкнено'}
                                            </button>
                                            <button className="delete-btn" onClick={() => handleDelete(p.id, p.code)}>Видалити</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPromo;
