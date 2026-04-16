import React, { useState } from 'react';

const UserProfile = ({ user, onLogin }) => {
    const [mode, setMode] = useState('login');
    const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async () => {
        setError('');
        if (!form.email || !form.password) { setError('Заповніть email та пароль'); return; }
        if (mode === 'register' && !form.full_name) { setError('Введіть ім\'я'); return; }
        setLoading(true);
        try {
            const res = await fetch('http://localhost:5000/api/auth/' + mode, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onLogin(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleKey = e => { if (e.key === 'Enter') handleSubmit(); };

    if (user) {
        return (
            <div className="profile-card">
                <div className="profile-logged-in">
                    <div className="profile-avatar">
                        {user.full_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                        <div className="profile-name">{user.full_name}</div>
                        <span className={'profile-role ' + (user.role === 'admin' ? 'role-admin' : 'role-user')}>
                            {user.role === 'admin' ? '✦ Адміністратор' : 'Покупець'}
                        </span>
                    </div>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', letterSpacing: '0.04em' }}>
                    Ви авторизовані у системі
                </p>
            </div>
        );
    }

    return (
        <div className="profile-card">
            <h2>{mode === 'login' ? 'Вхід' : 'Реєстрація'}</h2>
            <div className="auth-tabs">
                <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>
                    Увійти
                </button>
                <button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); }}>
                    Реєстрація
                </button>
            </div>
            {mode === 'register' && (
                <>
                    <label className="field-label">Повне ім'я</label>
                    <input type="text" name="full_name" placeholder="Ім'я Прізвище"
                        value={form.full_name} onChange={handleChange} onKeyDown={handleKey} />
                </>
            )}
            <label className="field-label">Email</label>
            <input type="email" name="email" placeholder="you@example.com"
                value={form.email} onChange={handleChange} onKeyDown={handleKey} />
            <label className="field-label">Пароль</label>
            <input type="password" name="password" placeholder="••••••••"
                value={form.password} onChange={handleChange} onKeyDown={handleKey} />
            {mode === 'register' && (
                <>
                    <label className="field-label">Телефон</label>
                    <input type="tel" name="phone" placeholder="+380 XX XXX XX XX"
                        value={form.phone} onChange={handleChange} />
                </>
            )}
            {error && <p className="error-msg">{error}</p>}
            <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
                {loading ? '...' : mode === 'login' ? 'Увійти' : 'Створити акаунт'}
            </button>
        </div>
    );
};

export default UserProfile;
