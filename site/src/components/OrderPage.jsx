import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

const API = 'http://localhost:5000';
const STAFF = ['admin','manager'];
const STATUS_CONFIG = {
    pending:   { label: 'Очікує обробки',  color: '#92400e', bg: '#fffbeb', border: '#fde68a', icon: '⏳', step: 0 },
    confirmed: { label: 'Підтверджено',    color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe', icon: '✅', step: 1 },
    shipped:   { label: 'Відправлено',     color: '#5b21b6', bg: '#ede9fe', border: '#ddd6fe', icon: '🚚', step: 2 },
    delivered: { label: 'Доставлено',      color: '#065f46', bg: '#d1fae5', border: '#a7f3d0', icon: '📦', step: 3 },
    cancelled: { label: 'Скасовано',       color: '#991b1b', bg: '#fee2e2', border: '#fecaca', icon: '❌', step: -1 },
};
const DELIVERY_LABELS = { 'Nova Poshta': '📦 Нова Пошта', 'UkrPoshta': '🇺🇦 Укрпошта', 'Courier': '🛵 Кур\'єр' };
const TIMELINE = ['pending','confirmed','shipped','delivered'];

const OrderPage = ({ user, showToast }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newStatus, setNewStatus] = useState('');
    const [tracking, setTracking] = useState('');
    const [saving, setSaving] = useState(false);
    const isStaff = STAFF.includes(user?.role);

    const load = async () => {
        setLoading(true);
        try {
            const r = await fetch(API + '/api/orders/' + id, { headers: { Authorization: 'Bearer ' + user.token } });
            if (!r.ok) throw new Error();
            const d = await r.json();
            setOrder(d); setNewStatus(d.status); setTracking(d.tracking_number || '');
        } catch { showToast('Замовлення не знайдено', 'error'); navigate(-1); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, [id]);

    const save = async () => {
        const unchanged = newStatus === order.status && tracking === (order.tracking_number || '');
        if (unchanged) return;
        setSaving(true);
        try {
            const r = await fetch(API + '/api/admin/orders/' + id + '/tracking', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + user.token },
                body: JSON.stringify({ status: newStatus, tracking_number: tracking || null })
            });
            if (!r.ok) throw new Error();
            showToast('Замовлення оновлено ✓');
            setOrder(prev => ({ ...prev, status: newStatus, tracking_number: tracking || null }));
        } catch { showToast('Помилка', 'error'); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="loading-container"><div className="spinner"/></div>;
    if (!order) return null;

    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
    const step = cfg.step;

    return (
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <button className="back-btn" onClick={() => navigate(isStaff ? '/admin/orders' : '/profile')}>← Назад</button>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--t1)', marginBottom: 4 }}>Замовлення #{order.id}</h1>
                    <span style={{ fontSize: '0.82rem', color: 'var(--t4)', fontWeight: 600 }}>{new Date(order.created_at).toLocaleString('uk-UA')}</span>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.border}`, fontWeight: 800, fontSize: '0.88rem' }}>
                    {cfg.icon} {cfg.label}
                </span>
            </div>

            {/* Timeline */}
            {order.status !== 'cancelled' && (
                <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--rl)', padding: '20px 24px', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        {TIMELINE.map((s, i) => {
                            const sc = STATUS_CONFIG[s];
                            const done = i <= step, active = i === step;
                            return (
                                <React.Fragment key={s}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: i < 3 ? 'none' : 1, zIndex: 1 }}>
                                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: done ? 'var(--primary)' : 'var(--bg2)', border: `2px solid ${done ? 'var(--primary)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: active ? '1.1rem' : '0.85rem', boxShadow: active ? '0 0 0 4px rgba(232,53,109,0.15)' : 'none', color: done ? '#fff' : 'var(--t4)', transition: 'all 0.3s', fontWeight: 800 }}>
                                            {done ? (active ? sc.icon : '✓') : i + 1}
                                        </div>
                                        <span style={{ fontSize: '0.68rem', marginTop: 6, fontWeight: active ? 800 : 600, color: active ? 'var(--primary)' : done ? 'var(--t2)' : 'var(--t4)', textAlign: 'center', whiteSpace: 'nowrap', maxWidth: 76 }}>{sc.label}</span>
                                    </div>
                                    {i < 3 && <div style={{ flex: 1, height: 2, background: i < step ? 'var(--primary)' : 'var(--border)', margin: '18px 4px 0', transition: 'background 0.3s' }}/>}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tracking display */}
            {order.tracking_number && (
                <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 'var(--rl)', padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: '1.5rem' }}>📬</span>
                    <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Номер відстеження (ТТН)</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.08em', fontFamily: 'monospace' }}>{order.tracking_number}</div>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: 20 }}>
                <div>
                    {/* Items */}
                    <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--rl)', overflow: 'hidden', marginBottom: 16 }}>
                        <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', fontWeight: 800, fontSize: '0.88rem', color: 'var(--t1)' }}>
                            🛒 Товари ({order.items?.length || 0} позицій)
                        </div>
                        {(order.items || []).map((item, i) => (
                            <Link to={'/product/' + item.product_id} key={i}
                                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', textDecoration: 'none', borderBottom: i < (order.items.length - 1) ? '1px solid var(--border)' : 'none', transition: 'background 0.15s', background: '#fff' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                                onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                <div style={{ width: 60, height: 60, borderRadius: 10, background: 'var(--bg)', flexShrink: 0, overflow: 'hidden', border: '1.5px solid var(--border)' }}>
                                    {item.image_url ? <img src={API + item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>🌸</div>}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, color: 'var(--t1)', fontSize: '0.9rem', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                                    {item.category && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase' }}>{item.category}</span>}
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontWeight: 900, color: 'var(--t1)' }}>{(item.price_at_purchase * item.quantity).toFixed(0)} грн</div>
                                    <div style={{ fontSize: '0.76rem', color: 'var(--t4)', marginTop: 2, fontWeight: 600 }}>{item.quantity} × {Number(item.price_at_purchase).toFixed(0)} грн</div>
                                </div>
                                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>→</span>
                            </Link>
                        ))}
                    </div>

                    {/* Delivery */}
                    <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--rl)', overflow: 'hidden' }}>
                        <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', fontWeight: 800, fontSize: '0.88rem', color: 'var(--t1)' }}>📋 Деталі доставки</div>
                        <div style={{ padding: '16px 18px' }}>
                            {[
                                { icon: '👤', label: 'Отримувач', val: order.full_name },
                                { icon: '📞', label: 'Телефон', val: order.phone },
                                { icon: '🚚', label: 'Доставка', val: DELIVERY_LABELS[order.delivery_method] || order.delivery_method },
                                { icon: '📍', label: 'Адреса', val: order.address || '—' },
                                { icon: '💳', label: 'Оплата', val: order.payment_method === 'cash_on_delivery' ? '💵 Післяплата' : '💳 Картка Online' },
                            ].map(({ icon, label, val }) => (
                                <div key={label} style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: '1rem', width: 22, flexShrink: 0 }}>{icon}</span>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--t4)', fontWeight: 800, width: 90, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: 1 }}>{label}</span>
                                    <span style={{ fontSize: '0.88rem', color: 'var(--t1)', fontWeight: 600 }}>{val}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Total */}
                    <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--rl)', padding: '18px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--t1)', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>💰 Підсумок</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--t3)', marginBottom: 8, fontWeight: 600 }}>
                            <span>Товари</span><span>{(order.items||[]).reduce((s,i)=>s+i.price_at_purchase*i.quantity,0).toFixed(0)} грн</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--t4)', marginBottom: 12, fontWeight: 600 }}>
                            <span>Доставка</span><span>за тарифами</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1.1rem', color: 'var(--t1)', paddingTop: 10, borderTop: '2px solid var(--border)' }}>
                            <span>Разом</span><span style={{ color: 'var(--primary)' }}>{Number(order.total_price).toFixed(0)} грн</span>
                        </div>
                    </div>

                    {/* Staff controls */}
                    {isStaff && (
                        <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--rl)', padding: '18px' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--t1)', marginBottom: 14 }}>⚙️ Управління</div>

                            <label className="field-label">📬 Номер ТТН</label>
                            <input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="20450000000000"
                                style={{ display: 'block', width: '100%', marginBottom: 14, padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--r)', fontFamily: 'monospace', fontSize: '0.9rem', outline: 'none', color: 'var(--t1)', background: 'var(--bg)', boxSizing: 'border-box', fontWeight: 700 }}
                                onFocus={e=>e.target.style.borderColor='var(--primary)'} onBlur={e=>e.target.style.borderColor='var(--border)'} />

                            <label className="field-label" style={{ marginBottom: 8 }}>Статус замовлення</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                                {Object.entries(STATUS_CONFIG).map(([s, sc]) => (
                                    <label key={s} onClick={() => setNewStatus(s)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: `1.5px solid ${newStatus === s ? sc.border : 'var(--border)'}`, borderRadius: 'var(--r)', cursor: 'pointer', background: newStatus === s ? sc.bg : 'var(--bg)', transition: 'all 0.15s' }}>
                                        <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${newStatus === s ? sc.color : 'var(--border)'}`, background: newStatus === s ? sc.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {newStatus === s && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }}/>}
                                        </div>
                                        <span style={{ fontSize: '0.84rem' }}>{sc.icon}</span>
                                        <span style={{ fontSize: '0.84rem', fontWeight: newStatus === s ? 800 : 600, color: newStatus === s ? sc.color : 'var(--t2)' }}>{sc.label}</span>
                                    </label>
                                ))}
                            </div>

                            <button onClick={save} disabled={saving || (newStatus === order.status && tracking === (order.tracking_number || ''))}
                                style={{ width: '100%', padding: '11px', borderRadius: 'var(--r)', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s', opacity: (newStatus === order.status && tracking === (order.tracking_number || '')) ? 0.45 : 1 }}>
                                {saving ? '⏳ Збереження...' : '✓ Зберегти зміни'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderPage;
