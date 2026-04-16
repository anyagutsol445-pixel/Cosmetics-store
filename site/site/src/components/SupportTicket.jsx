import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000';
const STAFF = ['admin', 'manager'];
const ROLE_LABELS = { admin: 'Адмін', manager: 'Менеджер', user: '' };
const STATUS = {
    open:     { label: 'Відкрито',         color: '#dfb870' },
    answered: { label: 'Відповідь надана', color: '#78a8df' },
    closed:   { label: 'Закрито',          color: '#5c5560' },
};

const SupportTicket = ({ user, showToast }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef(null);

    const fetchData = () => {
        if (!user?.token) { navigate('/support'); return; }
        fetch(`${API}/api/support/tickets/${id}/messages`, {
            headers: { Authorization: 'Bearer ' + user.token }
        })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => navigate('/support'));
    };

    useEffect(() => { fetchData(); }, [id, user]);
    useEffect(() => {
        if (data) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }, [data?.messages?.length]);

    const sendReply = async () => {
        if (!reply.trim()) return;
        setSending(true);
        try {
            const res = await fetch(`${API}/api/support/tickets/${id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + user.token },
                body: JSON.stringify({ body: reply }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error);
            setReply('');
            fetchData();
        } catch (err) { showToast(err.message, 'error'); }
        finally { setSending(false); }
    };

    const updateStatus = async (status) => {
        try {
            await fetch(`${API}/api/support/tickets/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + user.token },
                body: JSON.stringify({ status }),
            });
            showToast('Статус оновлено ✓');
            fetchData();
        } catch { showToast('Помилка', 'error'); }
    };

    if (!user?.token) return null;
    if (loading) return <div className="loading-container"><div className="spinner" /></div>;
    if (!data) return null;

    const { ticket, messages } = data;
    const isStaff = STAFF.includes(user?.role);
    const isClosed = ticket.status === 'closed';
    const statusCfg = STATUS[ticket.status] || STATUS.open;

    return (
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <button className="back-btn" onClick={() => navigate(isStaff ? '/admin/support' : '/support')}>
                ← Назад
            </button>

            {/* Ticket header */}
            <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--rl)', padding: '18px 20px', marginBottom: 20,
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 12,
            }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.62rem', color: 'var(--t4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            Звернення #{ticket.id}
                        </span>
                        <span style={{
                            padding: '2px 10px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 700,
                            color: statusCfg.color, background: statusCfg.color + '18',
                            border: `1px solid ${statusCfg.color}33`,
                        }}>
                            {statusCfg.label}
                        </span>
                    </div>
                    <h2 style={{ margin: '0 0 8px', fontSize: '1.05rem', color: 'var(--t1)', fontFamily: "'Cormorant Garamond', serif", fontWeight: 400 }}>
                        {ticket.subject}
                    </h2>
                    <div style={{ display: 'flex', gap: 14, fontSize: '0.74rem', color: 'var(--t4)' }}>
                        <span>👤 {ticket.user_name}</span>
                        <span>{new Date(ticket.created_at).toLocaleString('uk-UA')}</span>
                    </div>
                </div>
                {isStaff && !isClosed && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => updateStatus('answered')}
                            style={{ padding: '6px 14px', borderRadius: 'var(--r)', border: '1px solid var(--blue)', background: 'rgba(120,168,223,0.1)', color: 'var(--blue)', fontFamily: 'inherit', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }}>
                            ✓ Відповідь надана
                        </button>
                        <button onClick={() => updateStatus('closed')}
                            style={{ padding: '6px 14px', borderRadius: 'var(--r)', border: '1px solid var(--border-hi)', background: 'none', color: 'var(--t4)', fontFamily: 'inherit', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }}>
                            Закрити
                        </button>
                    </div>
                )}
            </div>

            {/* Messages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {messages.map(m => {
                    const isStaffMsg = STAFF.includes(m.sender_role);
                    const roleLabel = ROLE_LABELS[m.sender_role];
                    return (
                        <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isStaffMsg ? 'flex-end' : 'flex-start' }}>
                            <div style={{
                                maxWidth: '78%',
                                padding: '12px 16px',
                                borderRadius: isStaffMsg ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                background: isStaffMsg ? 'var(--gold-dim)' : 'var(--surface)',
                                border: `1px solid ${isStaffMsg ? 'rgba(201,169,110,0.25)' : 'var(--border)'}`,
                            }}>
                                {/* Author */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: isStaffMsg ? 'var(--gold)' : 'var(--t2)' }}>
                                        {m.sender_name}
                                    </span>
                                    {roleLabel && (
                                        <span style={{ fontSize: '0.62rem', padding: '1px 8px', borderRadius: 10, background: 'var(--card)', color: 'var(--gold)', border: '1px solid var(--border)', fontWeight: 600 }}>
                                            {roleLabel}
                                        </span>
                                    )}
                                </div>
                                {/* Body */}
                                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--t2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                    {m.body}
                                </p>
                                {/* Time */}
                                <div style={{ fontSize: '0.65rem', marginTop: 8, color: 'var(--t4)', textAlign: 'right' }}>
                                    {new Date(m.created_at).toLocaleString('uk-UA')}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Reply box */}
            {!isClosed ? (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', padding: '16px' }}>
                    <textarea
                        rows={3}
                        placeholder={isStaff ? 'Відповідь клієнту...' : 'Ваше повідомлення...'}
                        value={reply}
                        onChange={e => setReply(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendReply(); }}
                        style={{
                            width: '100%', padding: '10px 13px',
                            background: 'var(--card)', border: '1px solid var(--border)',
                            borderRadius: 'var(--r)', color: 'var(--t2)', fontFamily: 'inherit',
                            fontSize: '0.88rem', resize: 'vertical', outline: 'none', marginBottom: 10,
                            display: 'block', boxSizing: 'border-box',
                        }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--t4)', letterSpacing: '0.06em' }}>Ctrl+Enter — надіслати</span>
                        <button onClick={sendReply} disabled={sending || !reply.trim()}
                            style={{
                                padding: '9px 24px', borderRadius: 'var(--r)', border: 'none',
                                background: reply.trim() ? 'var(--gold)' : 'var(--border)',
                                color: '#0d0c0e', fontWeight: 700, fontFamily: 'inherit',
                                fontSize: '0.82rem', cursor: reply.trim() ? 'pointer' : 'default',
                                transition: 'all 0.18s',
                            }}>
                            {sending ? '...' : 'Надіслати →'}
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--t4)', fontSize: '0.8rem', background: 'var(--surface)', borderRadius: 'var(--rl)', border: '1px solid var(--border)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    🔒 Звернення закрито
                </div>
            )}
        </div>
    );
};

export default SupportTicket;
