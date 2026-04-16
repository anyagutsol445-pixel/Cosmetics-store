import React, { useState, useEffect, useRef, useCallback } from 'react';

const API = 'http://localhost:5000';
const EMPTY = { title: '', description: '', price: '', discount_price: '', discount_expiry: '', stock_quantity: '', category: '' };
const CATEGORIES = [
    { value: 'perfume', label: '🌹 Парфуми' },
    { value: 'cream',   label: '🧴 Креми'   },
    { value: 'skincare',label: '✨ Догляд'  },
    { value: 'makeup',  label: '💄 Макіяж'  },
    { value: 'hair',    label: '💆 Волосся' },
    { value: 'body',    label: '🛁 Тіло'    },
];

// ─── Модальне вікно для управління словником характеристик ───────────────────
const NewAttrModal = ({ onClose, attrOptions, setAttrOptions, headers, showToast }) => {
    const [tab, setTab] = useState('add'); // 'add' | 'manage'
    const [newName, setNewName] = useState('');
    const [newValue, setNewValue] = useState('');
    const [existingName, setExistingName] = useState('');
    const [addValueTo, setAddValueTo] = useState('');
    const [addValueText, setAddValueText] = useState('');
    const [saving, setSaving] = useState(false);

    const attrNames = Object.keys(attrOptions).sort();

    const handleAddNew = async () => {
        const n = newName.trim(); const v = newValue.trim();
        if (!n || !v) { showToast('Назва та значення обов\'язкові', 'error'); return; }
        setSaving(true);
        try {
            const res = await fetch(API + '/api/admin/attr-options', {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ attr_name: n, attr_value: v })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setAttrOptions(prev => {
                const updated = { ...prev };
                if (!updated[n]) updated[n] = [];
                if (!updated[n].includes(v)) updated[n] = [...updated[n], v].sort();
                return updated;
            });
            showToast('Характеристику додано!');
            setNewName(''); setNewValue('');
        } catch (err) { showToast(err.message || 'Помилка', 'error'); }
        finally { setSaving(false); }
    };

    const handleAddValueToExisting = async () => {
        const n = addValueTo; const v = addValueText.trim();
        if (!n || !v) { showToast('Оберіть характеристику та введіть значення', 'error'); return; }
        setSaving(true);
        try {
            const res = await fetch(API + '/api/admin/attr-options', {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ attr_name: n, attr_value: v })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setAttrOptions(prev => {
                const updated = { ...prev };
                if (!updated[n]) updated[n] = [];
                if (!updated[n].includes(v)) updated[n] = [...updated[n], v].sort();
                return updated;
            });
            showToast('Значення додано!');
            setAddValueText('');
        } catch (err) { showToast(err.message || 'Помилка', 'error'); }
        finally { setSaving(false); }
    };

    const handleDeleteValue = async (name, value) => {
        if (!window.confirm(`Видалити значення "${value}" з характеристики "${name}"?`)) return;
        try {
            await fetch(API + '/api/admin/attr-options', {
                method: 'DELETE',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ attr_name: name, attr_value: value })
            });
            setAttrOptions(prev => {
                const updated = { ...prev };
                updated[name] = updated[name].filter(v => v !== value);
                if (updated[name].length === 0) delete updated[name];
                return updated;
            });
            showToast('Видалено');
        } catch { showToast('Помилка', 'error'); }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{
                background: 'var(--card-bg, #fff)', borderRadius: 16, width: '100%', maxWidth: 540,
                maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}>
                {/* Header */}
                <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>⚙️ Управління характеристиками</h3>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
                    </div>
                    <div style={{ display: 'flex', gap: 0 }}>
                        {[{ id: 'add', label: '+ Нова' }, { id: 'manage', label: '✏️ Редагувати' }].map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)} style={{
                                padding: '8px 20px', border: 'none', borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
                                background: 'transparent', cursor: 'pointer', fontWeight: tab === t.id ? 700 : 400,
                                color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.9rem', transition: 'all 0.15s'
                            }}>{t.label}</button>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
                    {tab === 'add' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Нова характеристика з нуля */}
                            <div style={{ background: 'var(--bg-subtle, rgba(0,0,0,0.03))', borderRadius: 12, padding: 16 }}>
                                <div style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.9rem' }}>Нова характеристика</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <input placeholder="Назва (напр. Бренд, Об'єм, Тип шкіри)"
                                        value={newName} onChange={e => setNewName(e.target.value)}
                                        style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg, #fff)', color: 'var(--text)', fontSize: '0.9rem' }} />
                                    <input placeholder="Перше значення (напр. Chanel, 50мл, суха)"
                                        value={newValue} onChange={e => setNewValue(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddNew()}
                                        style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg, #fff)', color: 'var(--text)', fontSize: '0.9rem' }} />
                                    <button onClick={handleAddNew} disabled={saving || !newName.trim() || !newValue.trim()}
                                        style={{ padding: '9px', borderRadius: 8, border: 'none', background: (!newName.trim() || !newValue.trim()) ? 'var(--border)' : 'var(--accent, #7c5cbf)', color: (!newName.trim() || !newValue.trim()) ? 'var(--text-muted)' : '#fff', fontWeight: 600, cursor: (!newName.trim() || !newValue.trim()) ? 'default' : 'pointer', fontSize: '0.9rem', transition: 'all 0.15s' }}>
                                        {saving ? '...' : 'Створити характеристику'}
                                    </button>
                                </div>
                            </div>

                            {/* Додати значення до існуючої */}
                            {attrNames.length > 0 && (
                                <div style={{ background: 'var(--bg-subtle, rgba(0,0,0,0.03))', borderRadius: 12, padding: 16 }}>
                                    <div style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.9rem' }}>Додати значення до існуючої</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <select value={addValueTo} onChange={e => setAddValueTo(e.target.value)}
                                            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg, #fff)', color: 'var(--text)', fontSize: '0.9rem' }}>
                                            <option value="">— Оберіть характеристику —</option>
                                            {attrNames.map(n => <option key={n} value={n}>{n} ({(attrOptions[n] || []).length} знач.)</option>)}
                                        </select>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <input placeholder="Нове значення"
                                                value={addValueText} onChange={e => setAddValueText(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAddValueToExisting()}
                                                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg, #fff)', color: 'var(--text)', fontSize: '0.9rem' }} />
                                            <button onClick={handleAddValueToExisting} disabled={saving || !addValueTo || !addValueText.trim()}
                                                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: (!addValueTo || !addValueText.trim()) ? 'var(--border)' : 'var(--accent, #7c5cbf)', color: (!addValueTo || !addValueText.trim()) ? 'var(--text-muted)' : '#fff', fontWeight: 600, cursor: (!addValueTo || !addValueText.trim()) ? 'default' : 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                                                + Додати
                                            </button>
                                        </div>
                                        {addValueTo && attrOptions[addValueTo] && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                                {attrOptions[addValueTo].map(v => (
                                                    <span key={v} style={{ padding: '2px 8px', background: 'var(--border)', borderRadius: 20, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'manage' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {attrNames.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Ще немає характеристик</div>
                            ) : attrNames.map(name => (
                                <div key={name} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                                    <div style={{ padding: '10px 14px', background: 'var(--bg-subtle, rgba(0,0,0,0.03)', fontWeight: 700, fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>{name}</span>
                                        <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>{(attrOptions[name] || []).length} значень</span>
                                    </div>
                                    <div style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {(attrOptions[name] || []).map(val => (
                                            <span key={val} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px 3px 10px', background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 20, fontSize: '0.8rem' }}>
                                                {val}
                                                <button onClick={() => handleDeleteValue(name, val)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.9rem', lineHeight: 1, padding: 0, marginLeft: 2 }}>×</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Компонент для редагування значення існуючої характеристики з автодоповненням
const AttrValueInput = ({ value, suggestions, onChange }) => {
    const [input, setInput] = React.useState(value);
    const [show, setShow] = React.useState(false);
    const ref = React.useRef(null);

    React.useEffect(() => { setInput(value); }, [value]);
    React.useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const filtered = suggestions.filter(s => !input || s.toLowerCase().includes(input.toLowerCase()));

    return (
        <div ref={ref} style={{ position: 'relative', flex: 1 }}>
            <input
                className="attr-custom-input"
                value={input}
                onChange={e => { setInput(e.target.value); onChange(e.target.value); setShow(true); }}
                onFocus={() => setShow(true)}
                onKeyDown={e => e.key === 'Escape' && setShow(false)}
                placeholder="Значення"
                autoComplete="off"
            />
            {show && filtered.length > 0 && (
                <ul className="attr-dropdown">
                    {filtered.map(s => (
                        <li key={s} className="attr-dropdown-item"
                            onMouseDown={e => { e.preventDefault(); setInput(s); onChange(s); setShow(false); }}>
                            {s}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const AdminPanel = ({ user, showToast }) => {
    const [stats, setStats] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(EMPTY);
    const [editingId, setEditingId] = useState(null);
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    const [attrs, setAttrs] = useState([]);
    const [attrOptions, setAttrOptions] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [showAttrModal, setShowAttrModal] = useState(false);
    const [newAttrName, setNewAttrName] = useState('');
    const [newAttrNameInput, setNewAttrNameInput] = useState('');
    const [newAttrValue, setNewAttrValue] = useState('');
    const [newAttrValueInput, setNewAttrValueInput] = useState('');
    const [showNameDropdown, setShowNameDropdown] = useState(false);
    const [showValueDropdown, setShowValueDropdown] = useState(false);
    const attrNameRef = React.useRef(null);
    const attrValueRef = React.useRef(null);
    const fileRef = useRef();
    const headers = { Authorization: 'Bearer ' + user?.token };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [pr, st, opts] = await Promise.all([
                fetch(API + '/api/products').then(r => r.json()),
                fetch(API + '/api/admin/stats', { headers }).then(r => r.json()),
                fetch(API + '/api/attr-options').then(r => r.json()),
            ]);
            setProducts(Array.isArray(pr) ? pr : []);
            setStats(st);
            setAttrOptions(opts && typeof opts === 'object' ? opts : {});
        } catch { showToast('Помилка завантаження', 'error'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleFiles = e => {
        const files = Array.from(e.target.files);
        setImageFiles(prev => [...prev, ...files]);
        setImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    };

    const removeNewImage = i => {
        setImageFiles(prev => prev.filter((_, idx) => idx !== i));
        setImagePreviews(prev => prev.filter((_, idx) => idx !== i));
    };

    const removeExistingImage = async (imgId) => {
        try {
            await fetch(API + '/api/products/' + editingId + '/images/' + imgId, { method: 'DELETE', headers });
            setExistingImages(prev => prev.filter(img => img.id !== imgId));
            showToast('Фото видалено');
        } catch { showToast('Помилка', 'error'); }
    };

    const addAttr = () => {
        const name = newAttrNameInput.trim();
        const value = newAttrValueInput.trim();
        if (!name || !value) return;
        setAttrs(prev => [...prev, { name, value }]);
        setNewAttrNameInput(''); setNewAttrName('');
        setNewAttrValueInput(''); setNewAttrValue('');
        setShowNameDropdown(false); setShowValueDropdown(false);
    };

    // Close dropdowns on outside click
    React.useEffect(() => {
        const h = (e) => {
            if (attrNameRef.current && !attrNameRef.current.contains(e.target)) setShowNameDropdown(false);
            if (attrValueRef.current && !attrValueRef.current.contains(e.target)) setShowValueDropdown(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const filteredAttrNames = Object.keys(attrOptions).filter(n =>
        !newAttrNameInput || n.toLowerCase().includes(newAttrNameInput.toLowerCase())
    );

    const filteredAttrValues = (attrOptions[newAttrNameInput] || []).filter(v =>
        !newAttrValueInput || v.toLowerCase().includes(newAttrValueInput.toLowerCase())
    );

    const updateAttrValue = (i, val) => setAttrs(prev => prev.map((a, idx) => idx === i ? { ...a, value: val } : a));
    const removeAttr = i => setAttrs(prev => prev.filter((_, idx) => idx !== i));

    const handleEdit = async (p) => {
        setEditingId(p.id);
        setForm({ title: p.title||'', description: p.description||'', price: p.price||'', discount_price: p.discount_price||'', discount_expiry: p.discount_expiry ? p.discount_expiry.slice(0,16) : '', stock_quantity: p.stock_quantity||'', category: p.category||'' });
        setImageFiles([]); setImagePreviews([]);
        try {
            const data = await fetch(API + '/api/products/' + p.id).then(r => r.json());
            setExistingImages(data.images || []);
            setAttrs(data.attrs?.map(a => ({ name: a.attr_name, value: a.attr_value })) || []);
        } catch { setExistingImages([]); setAttrs([]); }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        setEditingId(null); setForm(EMPTY);
        setImageFiles([]); setImagePreviews([]);
        setExistingImages([]); setAttrs([]);
        setNewAttrNameInput(''); setNewAttrName('');
        setNewAttrValueInput(''); setNewAttrValue('');
    };

    const handleSubmit = async e => {
        e.preventDefault();
        if (!form.title || !form.price) { showToast('Назва та ціна обов\'язкові', 'error'); return; }
        setSubmitting(true);
        try {
            const data = new FormData();
            Object.entries(form).forEach(([k, v]) => { if (v !== '') data.append(k, v); });
            imageFiles.forEach(f => data.append('images', f));
            data.append('attrs', JSON.stringify(attrs.filter(a => a.name && a.value)));
            const url = API + '/api/products' + (editingId ? '/'+editingId : '');
            const method = editingId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers, body: data });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            showToast(editingId ? 'Товар оновлено!' : 'Товар додано!');
            handleCancel(); fetchAll();
        } catch (err) { showToast('Помилка: ' + err.message, 'error'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm('Видалити "' + title + '"?')) return;
        try {
            const res = await fetch(API + '/api/products/' + id, { method: 'DELETE', headers });
            if (!res.ok) throw new Error();
            showToast('Видалено'); fetchAll();
        } catch { showToast('Помилка видалення', 'error'); }
    };


    return (
        <div>
            {showAttrModal && (
                <NewAttrModal
                    onClose={() => setShowAttrModal(false)}
                    attrOptions={attrOptions}
                    setAttrOptions={setAttrOptions}
                    headers={headers}
                    showToast={showToast}
                />
            )}
            {stats && (
                <div className="stats-grid">
                    <div className="stat-card"><div className="stat-value">{stats.total_orders}</div><div className="stat-label">Замовлень</div></div>
                    <div className="stat-card urgent"><div className="stat-value">{stats.pending_orders}</div><div className="stat-label">Очікують</div></div>
                    <div className="stat-card"><div className="stat-value">{Number(stats.total_revenue).toFixed(0)} грн</div><div className="stat-label">Дохід</div></div>
                    <div className="stat-card"><div className="stat-value">{stats.total_products}</div><div className="stat-label">Товарів</div></div>
                    <div className="stat-card"><div className="stat-value">{stats.total_users}</div><div className="stat-label">Користувачів</div></div>
                </div>
            )}

            <div className="admin-layout">
                <div className="admin-container">
                    <h2>{editingId ? 'Редагувати товар' : 'Додати товар'}</h2>
                    <form onSubmit={handleSubmit} className="admin-form">

                        {/* Фото */}
                        <div className="photo-section">
                            {existingImages.length > 0 && (
                                <div style={{ marginBottom: 10 }}>
                                    <div className="field-label">Поточні фото</div>
                                    <div className="photos-grid">
                                        {existingImages.map(img => (
                                            <div key={img.id} className="photo-thumb">
                                                <img src={API + img.image_url} alt="" />
                                                <button type="button" className="photo-remove" onClick={() => removeExistingImage(img.id)}>×</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {imagePreviews.length > 0 && (
                                <div style={{ marginBottom: 10 }}>
                                    <div className="field-label">Нові фото</div>
                                    <div className="photos-grid">
                                        {imagePreviews.map((src, i) => (
                                            <div key={i} className="photo-thumb">
                                                <img src={src} alt="" />
                                                <button type="button" className="photo-remove" onClick={() => removeNewImage(i)}>×</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="photo-upload-zone" onClick={() => fileRef.current.click()}>
                                <div className="photo-placeholder">
                                    <span className="photo-icon">+</span>
                                    <span>Додати фото (до 8 шт)</span>
                                    <span className="photo-hint">JPG, PNG, WebP — до 8 МБ</span>
                                </div>
                                <input type="file" ref={fileRef} accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
                            </div>
                        </div>

                        <label className="field-label">Назва *</label>
                        <input placeholder="Назва товару" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />

                        <label className="field-label">Категорія</label>
                        <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                            <option value="">— Оберіть —</option>
                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>

                        <label className="field-label">Опис</label>
                        <textarea placeholder="Опис товару..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} />

                        <div className="form-row">
                            <div>
                                <label className="field-label">Ціна (грн) *</label>
                                <input type="number" placeholder="350" min="0" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
                            </div>
                            <div>
                                <label className="field-label">Кількість</label>
                                <input type="number" placeholder="10" min="0" value={form.stock_quantity} onChange={e => setForm({...form, stock_quantity: e.target.value})} />
                            </div>
                        </div>

                        <div className="form-row">
                            <div>
                                <label className="field-label">Акційна ціна</label>
                                <input type="number" placeholder="280" min="0" step="0.01" value={form.discount_price} onChange={e => setForm({...form, discount_price: e.target.value})} />
                            </div>
                            <div>
                                <label className="field-label">Акція до</label>
                                <input type="datetime-local" value={form.discount_expiry} onChange={e => setForm({...form, discount_expiry: e.target.value})} />
                            </div>
                        </div>

                        {/* Характеристики */}
                        <div className="attrs-section">
                            <div className="attrs-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="field-label" style={{ margin: 0 }}>Характеристики</span>
                                <button type="button" onClick={() => setShowAttrModal(true)}
                                    style={{ padding: '4px 12px', borderRadius: 8, border: '1px dashed var(--accent)', background: 'transparent', color: 'var(--accent)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                                    ⚙️ Управляти списком
                                </button>
                            </div>

                            {attrs.map((a, i) => {
                                const vals = attrOptions[a.name] || [];
                                return (
                                    <div key={i} className="attr-row">
                                        <span className="attr-row-name">{a.name}</span>
                                        <AttrValueInput
                                            value={a.value}
                                            suggestions={vals}
                                            onChange={v => updateAttrValue(i, v)}
                                        />
                                        <button type="button" className="attr-remove" onClick={() => removeAttr(i)}>×</button>
                                    </div>
                                );
                            })}

                            {/* Add new attr row with autocomplete */}
                            <div className="add-attr-row" style={{ flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {/* Name input with dropdown */}
                                    <div ref={attrNameRef} style={{ position: 'relative', flex: 1 }}>
                                        <input
                                            className="attr-custom-input"
                                            placeholder="Назва характеристики..."
                                            value={newAttrNameInput}
                                            onChange={e => { setNewAttrNameInput(e.target.value); setShowNameDropdown(true); }}
                                            onFocus={() => setShowNameDropdown(true)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAttr(); } if (e.key === 'Escape') setShowNameDropdown(false); }}
                                            autoComplete="off"
                                        />
                                        {showNameDropdown && filteredAttrNames.length > 0 && (
                                            <ul className="attr-dropdown">
                                                {filteredAttrNames.map(n => (
                                                    <li key={n} className="attr-dropdown-item"
                                                        onMouseDown={e => { e.preventDefault(); setNewAttrNameInput(n); setShowNameDropdown(false); }}>
                                                        {n}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    {/* Value input with dropdown */}
                                    <div ref={attrValueRef} style={{ position: 'relative', flex: 1 }}>
                                        <input
                                            className="attr-custom-input"
                                            placeholder="Значення..."
                                            value={newAttrValueInput}
                                            onChange={e => { setNewAttrValueInput(e.target.value); setShowValueDropdown(true); }}
                                            onFocus={() => setShowValueDropdown(true)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAttr(); } if (e.key === 'Escape') setShowValueDropdown(false); }}
                                            autoComplete="off"
                                        />
                                        {showValueDropdown && filteredAttrValues.length > 0 && (
                                            <ul className="attr-dropdown">
                                                {filteredAttrValues.map(v => (
                                                    <li key={v} className="attr-dropdown-item"
                                                        onMouseDown={e => { e.preventDefault(); setNewAttrValueInput(v); setShowValueDropdown(false); }}>
                                                        {v}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <button type="button" className="add-attr-btn"
                                        onClick={addAttr}
                                        disabled={!newAttrNameInput.trim() || !newAttrValueInput.trim()}>
                                        + Додати
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="admin-form-actions">
                            <button type="submit" className="submit-btn" disabled={submitting}>
                                {submitting ? '...' : editingId ? 'Зберегти зміни' : 'Додати товар'}
                            </button>
                            {editingId && <button type="button" className="cancel-btn" onClick={handleCancel}>Скасувати</button>}
                        </div>
                    </form>
                </div>

                <div className="admin-products-section">
                    <h2>Товари ({products.length})</h2>
                    {loading ? (
                        <div className="loading-container"><div className="spinner" /></div>
                    ) : products.length === 0 ? (
                        <div className="empty-state">Додайте перший товар</div>
                    ) : (
                        <div className="admin-products-grid">
                            {products.map(p => {
                                const isSale = p.discount_price && new Date(p.discount_expiry) > new Date();
                                return (
                                    <div key={p.id} className="admin-product-card">
                                        <div className="admin-product-img">
                                            {p.image_url ? <img src={API + p.image_url} alt={p.title} /> : <span>✦</span>}
                                            {isSale && <span className="sale-badge">Sale</span>}
                                        </div>
                                        <div className="admin-product-info">
                                            <div className="admin-product-title">{p.title}</div>
                                            <div className="admin-product-meta">
                                                {p.category && <span className="card-category">{p.category}</span>}
                                                {isSale
                                                    ? <><span className="old-price">{p.price} грн</span><span className="new-price">{p.discount_price} грн</span></>
                                                    : <span className="price">{p.price} грн</span>
                                                }
                                                <span className={'stock-chip ' + (p.stock_quantity > 0 ? 'in-stock' : 'out-stock')}>
                                                    {p.stock_quantity > 0 ? p.stock_quantity + ' шт' : 'Немає'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="admin-product-actions">
                                            <button className="edit-btn" onClick={() => handleEdit(p)}>Ред.</button>
                                            <button className="delete-btn" onClick={() => handleDelete(p.id, p.title)}>✕</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;