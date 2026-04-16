import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API = 'http://localhost:5000';

const STATUS = {
    pending:   { label: 'Очікує',       color: '#dfb870', bg: 'rgba(223,184,112,0.1)', icon: '⏳' },
    confirmed: { label: 'Підтверджено', color: '#78a8df', bg: 'rgba(120,168,223,0.1)', icon: '✅' },
    shipped:   { label: 'Відправлено',  color: '#b8a0e8', bg: 'rgba(184,160,232,0.1)', icon: '🚚' },
    cancelled: { label: 'Скасовано',    color: '#e8a8a8', bg: 'rgba(232,168,168,0.1)', icon: '✕' },
};

const DELIVERY_LABELS = {
    'Nova Poshta': '📦 Нова Пошта',
    'UkrPoshta':   '🇺🇦 Укрпошта',
    'Courier':     '🛵 Кур\'єр',
};

const OrderRow = ({ o, onUpdateStatus }) => {
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState(o.status);
    const [saving, setSaving] = useState(false);
    const cfg = STATUS[o.status] || STATUS.pending;

    const save = async () => {
        if (status === o.status) return;
        setSaving(true);
        await onUpdateStatus(o.id, status);
        setSaving(false);
    };

    return (
        <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--rl)', overflow: 'hidden',
            transition: 'border-color 0.18s, box-shadow 0.18s',
            ...(open ? { borderColor: 'var(--border-hi)', boxShadow: 'var(--shadow-sm)' } : {}),
        }}>
            {/* Row header — always visible */}
            <div onClick={() => setOpen(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', cursor: 'pointer', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--t4)', fontWeight: 700, minWidth: 38 }}>#{o.id}</span>

                <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontWeight: 600, color: 'var(--t1)', fontSize: '0.88rem' }}>{o.full_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--t4)', marginTop: 1 }}>{o.phone}</div>
                </div>

                {/* Items preview */}
                <div style={{ flex: 2, minWidth: 140, fontSize: '0.74rem', color: 'var(--t3)' }}>
                    {o.items_summary && o.items_summary.split(', ').slice(0, 2).join(' · ')}
                    {o.items_summary && o.items_summary.split(', ').length > 2 &&
                        <span style={{ color: 'var(--t4)' }}> +{o.items_summary.split(', ').length - 2}</span>
                    }
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--t1)', fontSize: '0.95rem' }}>{Number(o.total_price).toFixed(0)} грн</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--t4)', marginTop: 1 }}>{new Date(o.created_at).toLocaleDateString('uk-UA')}</div>
                </div>

                <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700,
                    color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33`,
                    whiteSpace: 'nowrap',
                }}>
                    {cfg.icon} {cfg.label}
                </span>

                <span style={{ color: 'var(--t4)', fontSize: '0.75rem' }}>{open ? '▲' : '▼'}</span>
            </div>

            {/* Expanded */}
            {open && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Full items list */}
                    <div>
                        <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 10 }}>Склад замовлення</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                            {o.items_summary?.split(', ').map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', gap: 8 }}>
                                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'var(--t4)', flexShrink: 0 }}>{i+1}</span>
                                    <span style={{ fontSize: '0.84rem', color: 'var(--t2)', flex: 1 }}>{item.trim()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Info grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                        {[
                            { icon: '📍', label: 'Адреса', val: o.address || '—' },
                            { icon: '🚚', label: 'Доставка', val: DELIVERY_LABELS[o.delivery_method] || o.delivery_method },
                            { icon: '💳', label: 'Оплата', val: o.payment_method === 'cash_on_delivery' ? '💵 Післяплата' : '💳 Картка' },
                            { icon: '📅', label: 'Дата', val: new Date(o.created_at).toLocaleString('uk-UA') },
                        ].map(({ icon, label, val }) => (
                            <div key={label} style={{ background: 'var(--surface)', borderRadius: 'var(--r)', padding: '10px 14px' }}>
                                <div style={{ fontSize: '0.62rem', color: 'var(--t4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                                <div style={{ fontSize: '0.84rem', color: 'var(--t2)' }}>{icon} {val}</div>
                            </div>
                        ))}
                    </div>

                    {/* Status change */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.76rem', color: 'var(--t4)', fontWeight: 600 }}>Змінити статус:</span>
                        <select value={status} onChange={e => setStatus(e.target.value)}
                            style={{
                                padding: '7px 14px', background: 'var(--surface)',
                                border: `1px solid ${STATUS[status]?.color || 'var(--border)'}55`,
                                borderRadius: 'var(--r)', color: STATUS[status]?.color || 'var(--t2)',
                                fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', outline: 'none',
                            }}>
                            {Object.entries(STATUS).map(([val, s]) => (
                                <option key={val} value={val}>{s.icon} {s.label}</option>
                            ))}
                        </select>
                        <button onClick={save} disabled={saving || status === o.status}
                            style={{
                                padding: '7px 20px', borderRadius: 'var(--r)', border: 'none',
                                background: status !== o.status ? 'var(--gold)' : 'var(--border)',
                                color: '#0d0c0e', fontWeight: 700, fontFamily: 'inherit',
                                fontSize: '0.78rem', cursor: status !== o.status ? 'pointer' : 'default',
                                opacity: status === o.status ? 0.4 : 1, transition: 'all 0.18s',
                            }}>
                            {saving ? '...' : 'Зберегти'}
                        </button>
                        <Link to={'/orders/' + o.id}
                            style={{ marginLeft: 'auto', fontSize: '0.76rem', color: 'var(--gold)', textDecoration: 'none', letterSpacing: '0.04em' }}>
                            Повна сторінка →
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

const AdminOrders = ({ user, showToast }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const headers = { Authorization: 'Bearer ' + user?.token };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const q = filter !== 'all' ? '?status=' + filter : '';
            const res = await fetch(`${API}/api/admin/orders${q}`, { headers });
            const data = await res.json();
            setOrders(Array.isArray(data) ? data : []);
        } catch { showToast('Помилка завантаження', 'error'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchOrders(); }, [filter]);

    const updateStatus = async (orderId, status) => {
        try {
            const res = await fetch(`${API}/api/admin/orders/${orderId}/tracking`, {
                method: 'PATCH',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error();
            showToast(`Статус #${orderId} оновлено ✓`);
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
        } catch { showToast('Помилка', 'error'); }
    };

    const filtered = orders.filter(o =>
        !search || o.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        o.phone?.includes(search) || String(o.id) === search
    );

    const counts = { all: orders.length };
    Object.keys(STATUS).forEach(s => { counts[s] = orders.filter(o => o.status === s).length; });

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <h2 className="page-title" style={{ margin: 0, paddingBottom: 0, borderBottom: 'none' }}>
                    Замовлення <span style={{ fontSize: '1rem', color: 'var(--t4)', fontFamily: 'DM Sans, sans-serif' }}>({orders.length})</span>
                </h2>
                <button onClick={fetchOrders}
                    style={{ padding: '7px 16px', background: 'none', border: '1px solid var(--border-hi)', borderRadius: 'var(--r)', color: 'var(--t3)', fontFamily: 'inherit', fontSize: '0.76rem', cursor: 'pointer', letterSpacing: '0.06em' }}>
                    ↻ Оновити
                </button>
            </div>

            {/* Status filters */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {[{ key: 'all', label: 'Всі', color: 'var(--t3)' },
                  ...Object.entries(STATUS).map(([k, v]) => ({ key: k, label: v.label, color: v.color }))
                ].map(({ key, label, color }) => (
                    <button key={key} onClick={() => setFilter(key)}
                        style={{
                            padding: '5px 14px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
                            fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em',
                            border: filter === key ? `1px solid ${color}` : '1px solid var(--border)',
                            background: filter === key ? `${color}18` : 'var(--card)',
                            color: filter === key ? color : 'var(--t4)', transition: 'all 0.18s',
                        }}>
                        {label} ({counts[key] ?? 0})
                    </button>
                ))}
            </div>

            {/* Search */}
            <input placeholder="Пошук по імені, телефону або ID..." value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', maxWidth: 380, padding: '9px 14px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--t2)', fontFamily: 'inherit', fontSize: '0.86rem', outline: 'none', marginBottom: 18, display: 'block' }}
            />

            {loading ? (
                <div className="loading-container"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">📦</div><p>Замовлень не знайдено</p></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filtered.map(o => (
                        <OrderRow key={o.id} o={o} onUpdateStatus={updateStatus} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminOrders;
