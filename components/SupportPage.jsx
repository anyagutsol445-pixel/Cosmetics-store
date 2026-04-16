import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000';
const STAFF = ['admin', 'manager'];

const STATUS = {
    open:     { label: 'Відкрито',  color: '#dfb870' },
    answered: { label: 'Відповідь', color: '#78a8df' },
    closed:   { label: 'Закрито',   color: '#5c5560'  },
};

const SupportPage = ({ user, showToast, isAdmin = false }) => {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const isStaff = user && STAFF.includes(user.role);

    const fetchTickets = () => {
        if (!user?.token) return;
        setLoading(true);
        fetch(`${API}/api/support/tickets`, {
            headers: { Authorization: 'Bearer ' + user.token }
        })
            .then(r => r.json())
            .then(d => setTickets(Array.isArray(d) ? d : []))
            .catch(() => showToast('Помилка завантаження', 'error'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchTickets(); }, [user]);

    const handleSubmit = async () => {
        if (!subject.trim() || !body.trim()) { showToast('Заповніть тему та повідомлення', 'error'); return; }
        setSubmitting(true);
        try {
            const res = await fetch(`${API}/api/support/tickets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(user?.token ? { Authorization: 'Bearer ' + user.token } : {}) },
                body: JSON.stringify({ subject, body, user_name: guestName, user_email: guestEmail })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showToast(`Звернення #${data.ticket_id} створено!`);
            setSubject(''); setBody(''); setGuestName(''); setGuestEmail('');
            setShowForm(false);
            if (user?.token) { fetchTickets(); navigate('/support/' + data.ticket_id); }
        } catch (err) { showToast(err.message, 'error'); }
        finally { setSubmitting(false); }
    };

    const filtered = tickets.filter(t => statusFilter === 'all' || t.status === statusFilter);
    const counts = { all: tickets.length };
    Object.keys(STATUS).forEach(s => { counts[s] = tickets.filter(t => t.status === s).length; });

    return (
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
                <div>
                    <h1 className="page-title" style={{ marginBottom: 4 }}>
                        {isAdmin ? '🎧 Звернення клієнтів' : '💬 Підтримка'}
                    </h1>
                    <p style={{ color: 'var(--t4)', fontSize: '0.84rem', margin: 0 }}>
                        {isAdmin ? 'Всі звернення користувачів' : 'Задайте питання або опишіть проблему'}
                    </p>
                </div>
                {!isAdmin && (
                    <button onClick={() => setShowForm(v => !v)}
                        style={{
                            padding: '9px 22px', borderRadius: 'var(--r)', border: showForm ? '1px solid var(--border-hi)' : 'none',
                            background: showForm ? 'none' : 'var(--gold)', color: showForm ? 'var(--t3)' : '#0d0c0e',
                            fontWeight: 700, fontFamily: 'inherit', fontSize: '0.78rem',
                            letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.18s',
                        }}>
                        {showForm ? '× Закрити' : '+ Нове звернення'}
                    </button>
                )}
            </div>

            {/* New ticket form */}
            {showForm && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', padding: '22px', marginBottom: 24 }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 16 }}>Нове звернення</div>
                    {!user && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                            {[['Ваше ім\'я', guestName, setGuestName, 'text', 'Ім\'я'],
                              ['Email', guestEmail, setGuestEmail, 'email', 'email@example.com']].map(([label, val, set, type, ph]) => (
                                <div key={label}>
                                    <label className="field-label">{label}</label>
                                    <input type={type} placeholder={ph} value={val} onChange={e => set(e.target.value)} />
                                </div>
                            ))}
                        </div>
                    )}
                    <label className="field-label">Тема</label>
                    <input placeholder="Коротко опишіть питання..." value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
                    <label className="field-label">Повідомлення</label>
                    <textarea rows={4} placeholder="Детально опишіть ситуацію..." value={body} onChange={e => setBody(e.target.value)}
                        style={{ width: '100%', padding: '10px 13px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--t2)', fontFamily: 'inherit', fontSize: '0.86rem', resize: 'vertical', outline: 'none', display: 'block', marginBottom: 14 }} />
                    <button onClick={handleSubmit} disabled={submitting}
                        style={{ padding: '10px 26px', borderRadius: 'var(--r)', border: 'none', background: submitting ? 'var(--border)' : 'var(--gold)', color: '#0d0c0e', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.84rem', cursor: submitting ? 'default' : 'pointer' }}>
                        {submitting ? '...' : 'Надіслати'}
                    </button>
                </div>
            )}

            {/* List */}
            {user?.token ? (
                loading ? <div className="loading-container"><div className="spinner" /></div> : (
                    <>
                        {tickets.length > 0 && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                                {[{ key: 'all', label: 'Всі', color: 'var(--t3)' },
                                  ...Object.entries(STATUS).map(([k, v]) => ({ key: k, label: v.label, color: v.color }))
                                ].map(({ key, label, color }) => (
                                    <button key={key} onClick={() => setStatusFilter(key)}
                                        style={{
                                            padding: '4px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
                                            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em',
                                            border: statusFilter === key ? `1px solid ${color}` : '1px solid var(--border)',
                                            background: statusFilter === key ? `${color}18` : 'var(--card)',
                                            color: statusFilter === key ? color : 'var(--t4)', transition: 'all 0.18s',
                                        }}>
                                        {label} ({counts[key] ?? 0})
                                    </button>
                                ))}
                            </div>
                        )}

                        {filtered.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">💬</div>
                                <p>{isAdmin ? 'Звернень немає' : 'Зверніть до нас — ми допоможемо!'}</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {filtered.map(t => {
                                    const s = STATUS[t.status] || STATUS.open;
                                    return (
                                        <Link to={'/support/' + t.id} key={t.id}
                                            style={{ textDecoration: 'none', display: 'block' }}>
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: 14,
                                                padding: '14px 18px', background: 'var(--card)',
                                                border: '1px solid var(--border)', borderRadius: 'var(--rl)',
                                                transition: 'border-color 0.18s',
                                            }}
                                                onMouseEnter={e => e.currentTarget.style.borderColor = s.color + '66'}
                                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                            >
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, color: 'var(--t1)', fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {t.subject}
                                                    </div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--t4)', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                                        {isAdmin && <span>👤 {t.user_name}</span>}
                                                        <span>{t.msg_count} повід.</span>
                                                        <span>{new Date(t.created_at).toLocaleDateString('uk-UA')}</span>
                                                    </div>
                                                </div>
                                                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700, color: s.color, background: s.color + '18', border: `1px solid ${s.color}33`, flexShrink: 0 }}>
                                                    {s.label}
                                                </span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )
            ) : (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', padding: '28px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 10, opacity: 0.4 }}>💬</div>
                    <p style={{ color: 'var(--t3)', margin: '0 0 8px', fontSize: '0.9rem' }}>
                        Щоб переглянути свої звернення — <Link to="/profile" style={{ color: 'var(--gold)' }}>увійдіть</Link>.
                    </p>
                    <p style={{ color: 'var(--t4)', margin: 0, fontSize: '0.82rem' }}>Або надішліть звернення вище без реєстрації.</p>
                </div>
            )}
        </div>
    );
};

export default SupportPage;
