import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5000';

const PROMO_TYPES = [
    { value: 'standard',      label: '🏷️ Звичайний',           desc: 'Діє для всіх замовлень' },
    { value: 'first_order',   label: '🎁 Перше замовлення',    desc: 'Лише для першого замовлення користувача' },
    { value: 'min_amount',    label: '💰 Мінімальна сума',     desc: 'Активується при сумі від X грн' },
    { value: 'birthday',      label: '🎂 День народження',     desc: 'Для користувачів у день/місяць народження' },
    { value: 'single_use',    label: '🔑 Одноразовий',         desc: 'Кожен може використати лише раз' },
    { value: 'personal',      label: '👤 Персональний',        desc: 'Призначається конкретному користувачу' },
];

const TYPE_BADGES = {
    standard:    { label: 'Звичайний',        color: '#6c757d' },
    first_order: { label: 'Перше замовл.',    color: '#7c5cbf' },
    min_amount:  { label: 'Мін. сума',        color: '#0a7abf' },
    birthday:    { label: 'День нар.',         color: '#d97706' },
    single_use:  { label: 'Одноразовий',      color: '#059669' },
    personal:    { label: 'Персональний',     color: '#be185d' },
};

const EMPTY = { code: '', discount_percent: '', max_uses: '', expires_at: '', promo_type: 'standard', min_order_amount: '', description: '', user_id: '' };

// Компонент пошуку користувача
const UserSearch = ({ headers, value, onChange }) => {
    const [query, setQuery] = React.useState('');
    const [allUsers, setAllUsers] = React.useState([]);
    const [selected, setSelected] = React.useState(null);
    const [show, setShow] = React.useState(false);
    const [loadError, setLoadError] = React.useState(false);
    const ref = React.useRef(null);

    // Завантажуємо всіх юзерів одразу через існуючий ендпоінт
    React.useEffect(() => {
        fetch(API + '/api/admin/users', { headers })
            .then(r => r.json())
            .then(data => setAllUsers(Array.isArray(data) ? data.filter(u => u.role === 'user') : []))
            .catch(() => setLoadError(true));
    }, []);

    React.useEffect(() => {
        const h = e => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const filtered = query.length < 1
        ? allUsers
        : allUsers.filter(u => {
            const q = query.toLowerCase();
            return (u.full_name || '').toLowerCase().includes(q)
                || (u.email || '').toLowerCase().includes(q)
                || (u.phone || '').toLowerCase().includes(q);
        });

    const select = (u) => {
        setSelected(u);
        setQuery(u.full_name + ' (' + u.email + ')');
        setShow(false);
        onChange(u.id);
    };

    const clear = () => { setSelected(null); setQuery(''); onChange(''); setShow(false); };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: 8 }}>
                <input
                    placeholder={loadError ? 'Помилка завантаження користувачів' : allUsers.length ? `Пошук серед ${allUsers.length} покупців...` : 'Завантаження...'}
                    value={query}
                    onChange={e => { setQuery(e.target.value); setShow(true); if (!e.target.value) { setSelected(null); onChange(''); } }}
                    onFocus={() => !selected && setShow(true)}
                    style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `1px solid ${selected ? 'var(--accent, #7c5cbf)' : 'var(--border)'}`, background: 'var(--input-bg, #fff)', color: 'var(--text)', fontSize: '0.88rem' }}
                    autoComplete="off"
                    readOnly={!!selected}
                />
                {selected && (
                    <button type="button" onClick={clear}
                        style={{ padding: '0 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem' }}>×</button>
                )}
            </div>

            {show && !selected && filtered.length > 0 && (
                <ul style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100, background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: 0, listStyle: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.14)', maxHeight: 240, overflowY: 'auto' }}>
                    {filtered.slice(0, 20).map(u => (
                        <li key={u.id}
                            onMouseDown={e => { e.preventDefault(); select(u); }}
                            style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent, #7c5cbf)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                                    {(u.full_name?.[0] || '?').toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{u.full_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}{u.phone ? ' · ' + u.phone : ''}</div>
                                </div>
                            </div>
                        </li>
                    ))}
                    {filtered.length > 20 && (
                        <li style={{ padding: '8px 14px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                            Показано 20 з {filtered.length} — уточніть запит
                        </li>
                    )}
                </ul>
            )}

            {show && !selected && filtered.length === 0 && query.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100, background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: '0.82rem', color: 'var(--text-muted)', boxShadow: '0 8px 24px rgba(0,0,0,0.14)' }}>
                    Нікого не знайдено за «{query}»
                </div>
            )}

            {selected && (
                <div style={{ marginTop: 6, padding: '7px 12px', background: 'rgba(124,92,191,0.07)', border: '1px solid rgba(124,92,191,0.25)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--accent, #7c5cbf)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>✓</span>
                    <span><strong>{selected.full_name}</strong> · {selected.email}{selected.phone ? ' · ' + selected.phone : ''}</span>
                </div>
            )}
        </div>
    );
};

const AdminPromo = ({ user, showToast }) => {
    const [promos, setPromos] = useState([]);
    const [form, setForm] = useState(EMPTY);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('all');
    const [sendingBirthday, setSendingBirthday] = useState(null); // promo id

    const headers = { Authorization: 'Bearer ' + user?.token };

    const fetchPromos = async () => {
        try {
            const res = await fetch(API + '/api/admin/promo', { headers });
            const data = await res.json();
            setPromos(Array.isArray(data) ? data : []);
        } catch { showToast('Помилка завантаження', 'error'); }
    };

    useEffect(() => { fetchPromos(); }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!form.code || !form.discount_percent) { showToast('Код та відсоток обов\'язкові', 'error'); return; }
        if (form.promo_type === 'min_amount' && !form.min_order_amount) { showToast('Вкажіть мінімальну суму', 'error'); return; }
        if (form.promo_type === 'personal' && !form.user_id) { showToast('Оберіть користувача', 'error'); return; }
        setLoading(true);
        try {
            const payload = {
                code: form.code,
                discount_percent: form.discount_percent,
                max_uses: form.max_uses || null,
                expires_at: form.expires_at || null,
                promo_type: form.promo_type,
                min_order_amount: form.promo_type === 'min_amount' ? form.min_order_amount : null,
                description: form.description || null,
                user_id: form.promo_type === 'personal' ? form.user_id : null,
            };
            const res = await fetch(API + '/api/admin/promo', {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showToast(form.promo_type === 'personal' ? '✓ Промокод створено і надіслано користувачу!' : 'Промокод створено!');
            setForm(EMPTY);
            fetchPromos();
        } catch (err) { showToast(err.message, 'error'); }
        finally { setLoading(false); }
    };

    const handleSendBirthday = async (promoId, mode) => {
        setSendingBirthday(promoId + '_' + mode);
        try {
            const res = await fetch(API + '/api/admin/promo/' + promoId + '/send-birthday', {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showToast(data.message);
        } catch (err) { showToast(err.message || 'Помилка', 'error'); }
        finally { setSendingBirthday(null); }
    };

    const handleToggle = async (id, isActive) => {
        try {
            await fetch(API + '/api/admin/promo/' + id + '/toggle', {
                method: 'PATCH',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !isActive })
            });
            showToast(isActive ? 'Промокод вимкнено' : 'Промокод увімкнено');
            fetchPromos();
        } catch { showToast('Помилка', 'error'); }
    };

    const handleDelete = async (id, code) => {
        if (!window.confirm('Видалити промокод "' + code + '"?')) return;
        try {
            await fetch(API + '/api/admin/promo/' + id, { method: 'DELETE', headers });
            showToast('Видалено');
            fetchPromos();
        } catch { showToast('Помилка', 'error'); }
    };

    const filteredPromos = promos.filter(p => filter === 'all' || p.promo_type === filter);

    const selectedType = PROMO_TYPES.find(t => t.value === form.promo_type);

    return (
        <div className="admin-layout">
            <div className="admin-container">
                <h2>Створити промокод</h2>
                <form onSubmit={handleAdd} className="admin-form">

                    {/* Тип промокоду */}
                    <label className="field-label">Тип промокоду</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }}>
                        {PROMO_TYPES.map(t => (
                            <label key={t.value} style={{
                                display: 'grid',
                                gridTemplateColumns: '20px 1fr',
                                alignItems: 'center',
                                gap: 10,
                                padding: '10px 14px',
                                border: `2px solid ${form.promo_type === t.value ? 'var(--accent)' : 'var(--border)'}`,
                                borderRadius: 10,
                                cursor: 'pointer',
                                background: form.promo_type === t.value ? 'var(--accent-faint, rgba(124,92,191,0.07))' : 'transparent',
                                transition: 'all 0.15s',
                                boxSizing: 'border-box',
                                width: '100%',
                            }}>
                                <input type="radio" name="promo_type" value={t.value}
                                    checked={form.promo_type === t.value}
                                    onChange={e => setForm({ ...form, promo_type: e.target.value, min_order_amount: '' })}
                                    style={{ justifySelf: 'center' }} />
                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px 8px', minWidth: 0 }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{t.label}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.desc}</span>
                                </div>
                            </label>
                        ))}
                    </div>

                    {/* Опис/нотатка */}
                    <label className="field-label" style={{ marginTop: 8 }}>Нотатка (необов'язково)</label>
                    <input placeholder="Наприклад: для розсилки квітень 2025"
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })} />

                    <div className="form-row">
                        <div>
                            <label className="field-label">Код *</label>
                            <input placeholder="SALE20" value={form.code}
                                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} required
                                style={{ fontFamily: 'monospace', letterSpacing: '0.08em', fontWeight: 700 }} />
                        </div>
                        <div>
                            <label className="field-label">Знижка (%) *</label>
                            <input type="number" placeholder="20" min="1" max="100" value={form.discount_percent}
                                onChange={e => setForm({ ...form, discount_percent: e.target.value })} required />
                        </div>
                    </div>

                    {/* Мінімальна сума — тільки для типу min_amount */}
                    {form.promo_type === 'min_amount' && (
                        <div>
                            <label className="field-label">Мінімальна сума замовлення (грн) *</label>
                            <input type="number" placeholder="500" min="1" value={form.min_order_amount}
                                onChange={e => setForm({ ...form, min_order_amount: e.target.value })} required />
                        </div>
                    )}

                    <div className="form-row">
                        <div>
                            <label className="field-label">
                                {form.promo_type === 'single_use' ? 'Макс. використань (загалом)' : 'Макс. використань'}
                            </label>
                            <input type="number" placeholder="∞" min="1" value={form.max_uses}
                                onChange={e => setForm({ ...form, max_uses: e.target.value })} />
                        </div>
                        <div>
                            <label className="field-label">Діє до</label>
                            <input type="datetime-local" value={form.expires_at}
                                onChange={e => setForm({ ...form, expires_at: e.target.value })} />
                        </div>
                    </div>

                    {/* Підказки для типу */}
                    {form.promo_type === 'first_order' && (
                        <div style={{ background: 'rgba(124,92,191,0.08)', border: '1px solid rgba(124,92,191,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            ℹ️ Промокод автоматично перевірить, чи це перше замовлення користувача. Анонімні покупці не можуть використати цей тип.
                        </div>
                    )}
                    {form.promo_type === 'single_use' && (
                        <div style={{ background: 'rgba(5,150,105,0.07)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            ℹ️ Кожен авторизований користувач зможе скористатись цим кодом лише один раз.
                        </div>
                    )}
                    {form.promo_type === 'birthday' && (
                        <div style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            ℹ️ Промокод буде дійсний лише для користувачів, у яких сьогодні або цього місяця день народження (якщо вказано в профілі). Після створення — використайте кнопку «Розіслати» в картці промокоду.
                        </div>
                    )}
                    {form.promo_type === 'personal' && (
                        <div>
                            <label className="field-label">Користувач *</label>
                            <UserSearch headers={headers} value={form.user_id} onChange={id => setForm({ ...form, user_id: id })} />
                            <div style={{ marginTop: 6, background: 'rgba(190,24,93,0.07)', border: '1px solid rgba(190,24,93,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                ℹ️ Промокод буде доступний лише обраному користувачу. Йому автоматично надійде сповіщення із кодом.
                            </div>
                        </div>
                    )}

                    <button type="submit" className="submit-btn" disabled={loading} style={{ marginTop: 8 }}>
                        {loading ? '...' : '✦ Створити промокод'}
                    </button>
                </form>
            </div>

            {/* Список промокодів */}
            <div className="admin-products-section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                    <h2 style={{ margin: 0 }}>Промокоди ({filteredPromos.length})</h2>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {[{ value: 'all', label: 'Всі' }, ...PROMO_TYPES].map(f => (
                            <button key={f.value} onClick={() => setFilter(f.value)}
                                style={{
                                    padding: '4px 12px', borderRadius: 20, fontSize: '0.78rem', cursor: 'pointer',
                                    border: `1px solid ${filter === f.value ? 'var(--accent)' : 'var(--border)'}`,
                                    background: filter === f.value ? 'var(--accent)' : 'transparent',
                                    color: filter === f.value ? '#fff' : 'var(--text-muted)',
                                    transition: 'all 0.15s'
                                }}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredPromos.length === 0 ? (
                    <div className="empty-state">Промокодів немає</div>
                ) : (
                    <div className="admin-products-grid">
                        {filteredPromos.map(p => {
                            const typeInfo = TYPE_BADGES[p.promo_type] || TYPE_BADGES.standard;
                            const expired = p.expires_at && new Date(p.expires_at) < new Date();
                            return (
                                <div key={p.id} className="admin-product-card" style={{ opacity: (!p.is_active || expired) ? 0.65 : 1 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <div className="admin-product-title" style={{ fontSize: '1.05rem', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                                                {p.code}
                                            </div>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 600,
                                                background: typeInfo.color + '20', color: typeInfo.color, border: `1px solid ${typeInfo.color}40`
                                            }}>
                                                {typeInfo.label}
                                            </span>
                                        </div>

                                        {p.description && (
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4, fontStyle: 'italic' }}>
                                                {p.description}
                                            </div>
                                        )}
                                        {p.promo_type === 'personal' && p.user_id && (
                                            <div style={{ fontSize: '0.78rem', color: '#be185d', marginBottom: 4 }}>
                                                👤 User ID: {p.user_id}
                                            </div>
                                        )}

                                        <div className="admin-product-meta">
                                            <span className="stock-chip in-stock">−{p.discount_percent}%</span>

                                            {p.min_order_amount && (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                                    від {p.min_order_amount} грн
                                                </span>
                                            )}

                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                {p.uses_count}{p.max_uses ? '/' + p.max_uses : ''} використань
                                            </span>

                                            {p.expires_at && (
                                                <span style={{ color: expired ? '#ef4444' : 'var(--text-muted)', fontSize: '0.78rem' }}>
                                                    {expired ? '⚠ Прострочено' : 'до ' + new Date(p.expires_at).toLocaleDateString('uk-UA')}
                                                </span>
                                            )}

                                            <span className={p.is_active && !expired ? 'stock-chip in-stock' : 'stock-chip out-stock'}>
                                                {expired ? 'Прострочено' : p.is_active ? 'Активний' : 'Вимкнено'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="admin-product-actions" style={{ flexDirection: 'column', gap: 6 }}>
                                        {p.promo_type === 'birthday' && (
                                            <>
                                                <button
                                                    onClick={() => handleSendBirthday(p.id, 'today')}
                                                    disabled={!!sendingBirthday}
                                                    style={{ padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer', border: '1px solid #d97706', background: 'rgba(217,119,6,0.08)', color: '#d97706', whiteSpace: 'nowrap' }}>
                                                    {sendingBirthday === p.id + '_today' ? '...' : '🎂 Сьогодні'}
                                                </button>
                                                <button
                                                    onClick={() => handleSendBirthday(p.id, 'month')}
                                                    disabled={!!sendingBirthday}
                                                    style={{ padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer', border: '1px solid #d97706', background: 'rgba(217,119,6,0.08)', color: '#d97706', whiteSpace: 'nowrap' }}>
                                                    {sendingBirthday === p.id + '_month' ? '...' : '📅 Цей місяць'}
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => handleToggle(p.id, p.is_active)}
                                            style={{
                                                padding: '4px 10px', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer',
                                                border: `1px solid ${p.is_active ? '#ef4444' : '#22c55e'}`,
                                                background: 'transparent',
                                                color: p.is_active ? '#ef4444' : '#22c55e'
                                            }}>
                                            {p.is_active ? 'Вимкнути' : 'Увімкнути'}
                                        </button>
                                        <button className="delete-btn" onClick={() => handleDelete(p.id, p.code)}>Видалити</button>
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