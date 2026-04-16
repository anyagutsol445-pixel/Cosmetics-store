import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5000';

const ROLES = [
    { value: 'user',    label: 'Покупець',  color: '#968e96' },
    { value: 'manager', label: 'Менеджер',  color: '#78a8df' },
    { value: 'admin',   label: 'Адмін',     color: '#c9a96e' },
];

const ROLE_DESC = {
    user:    'Звичайний покупець, може оформляти замовлення',
    manager: 'Додає товари · приймає замовлення · відповідає на підтримку та питання',
    admin:   'Повний доступ · керує користувачами та промокодами',
};

const AdminUsers = ({ user, showToast }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    const fetchUsers = () => {
        setLoading(true);
        fetch(`${API}/api/admin/users`, {
            headers: { Authorization: 'Bearer ' + user?.token }
        })
            .then(r => r.json())
            .then(d => { setUsers(Array.isArray(d) ? d : []); })
            .catch(() => showToast('Помилка завантаження', 'error'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchUsers(); }, []);

    const changeRole = async (userId, role) => {
        try {
            const res = await fetch(`${API}/api/admin/users/${userId}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + user.token },
                body: JSON.stringify({ role })
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error);
            showToast('Роль оновлено ✓');
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
        } catch (err) { showToast(err.message, 'error'); }
    };

    const filtered = users.filter(u => {
        const q = search.toLowerCase();
        const matchSearch = !search || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
        const matchRole = roleFilter === 'all' || u.role === roleFilter;
        return matchSearch && matchRole;
    });

    const counts = { all: users.length };
    ROLES.forEach(r => { counts[r.value] = users.filter(u => u.role === r.value).length; });

    return (
        <div>
            <h2 className="page-title">Користувачі</h2>

            {/* Roles legend */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', padding: '16px 20px', marginBottom: 22 }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 12 }}>Права ролей</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ROLES.map(r => (
                        <div key={r.value} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <span style={{ minWidth: 80, fontSize: '0.8rem', fontWeight: 700, color: r.color }}>{r.label}</span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--t3)', lineHeight: 1.5 }}>— {ROLE_DESC[r.value]}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                {[{ value: 'all', label: 'Всі', color: 'var(--t3)' }, ...ROLES].map(r => (
                    <button key={r.value} onClick={() => setRoleFilter(r.value)}
                        style={{
                            padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
                            fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em',
                            border: roleFilter === r.value ? `1px solid ${r.color}` : '1px solid var(--border)',
                            background: roleFilter === r.value ? `${r.color}18` : 'var(--card)',
                            color: roleFilter === r.value ? r.color : 'var(--t4)',
                            transition: 'all 0.18s', fontFamily: 'inherit',
                        }}>
                        {r.label} ({counts[r.value] ?? 0})
                    </button>
                ))}
            </div>

            {/* Search */}
            <input type="text" placeholder="Пошук по імені або email..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', maxWidth: 380, padding: '9px 14px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--t2)', fontFamily: 'inherit', fontSize: '0.86rem', outline: 'none', marginBottom: 18, display: 'block' }}
            />

            {loading ? (
                <div className="loading-container"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
                <div className="empty-state"><p>Користувачів не знайдено</p></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filtered.map(u => {
                        const roleInfo = ROLES.find(r => r.value === u.role) || ROLES[0];
                        const isSelf = u.id === user?.id;
                        return (
                            <div key={u.id} style={{
                                display: 'flex', alignItems: 'center', gap: 14,
                                padding: '14px 18px', background: 'var(--card)',
                                border: '1px solid var(--border)', borderRadius: 'var(--rl)',
                                flexWrap: 'wrap', transition: 'border-color 0.18s',
                            }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hi)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                            >
                                {/* Avatar */}
                                <div style={{
                                    width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                                    background: `${roleInfo.color}18`,
                                    border: `2px solid ${roleInfo.color}44`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, fontSize: '1rem', color: roleInfo.color,
                                    fontFamily: "'Cormorant Garamond', serif",
                                }}>
                                    {u.full_name?.[0]?.toUpperCase() || '?'}
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 140 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontWeight: 600, color: 'var(--t1)', fontSize: '0.9rem' }}>{u.full_name}</span>
                                        {isSelf && <span style={{ fontSize: '0.6rem', color: 'var(--t4)', background: 'var(--surface)', padding: '2px 8px', borderRadius: 10, border: '1px solid var(--border)', letterSpacing: '0.08em' }}>ВИ</span>}
                                    </div>
                                    <div style={{ fontSize: '0.76rem', color: 'var(--t4)', marginTop: 2 }}>{u.email}</div>
                                </div>

                                {/* Date */}
                                <div style={{ fontSize: '0.7rem', color: 'var(--t4)' }}>
                                    {new Date(u.created_at).toLocaleDateString('uk-UA')}
                                </div>

                                {/* Role */}
                                {isSelf ? (
                                    <span style={{ padding: '5px 14px', borderRadius: 20, background: `${roleInfo.color}18`, color: roleInfo.color, fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${roleInfo.color}44` }}>
                                        {roleInfo.label}
                                    </span>
                                ) : (
                                    <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                                        style={{
                                            padding: '6px 12px', background: `${roleInfo.color}12`,
                                            border: `1.5px solid ${roleInfo.color}55`, borderRadius: 20,
                                            color: roleInfo.color, fontFamily: 'inherit',
                                            fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', outline: 'none',
                                        }}>
                                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </select>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
