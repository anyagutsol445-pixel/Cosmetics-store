import React, { useState, useEffect, useRef } from 'react';

const API = '[localhost](http://localhost:5000)';
const EMPTY = { title: '', description: '', price: '', discount_price: '', discount_expiry: '', stock_quantity: '', category: '' };

const CATEGORIES = [
    { value: 'perfume',  label: '🌹 Парфуми' },
    { value: 'cream',    label: '🧴 Креми'   },
    { value: 'skincare', label: '✨ Догляд'  },
    { value: 'makeup',   label: '💄 Макіяж'  },
    { value: 'hair',     label: '💆 Волосся' },
    { value: 'body',     label: '🛁 Тіло'    },
];

// Стандартні групи характеристик — можна розширювати
const ATTR_PRESETS = {
    'Бренд':          ['Chanel', 'Dior', "L'Oréal", 'Nivea', 'Maybelline', 'NYX', 'MAC', 'NARS', 'Lancome', 'Clinique', 'Estee Lauder', 'Guerlain', 'Yves Saint Laurent', 'Givenchy', 'Burberry'],
    'Об\'єм':         ['10 мл', '15 мл', '20 мл', '30 мл', '50 мл', '75 мл', '100 мл', '150 мл', '200 мл', '250 мл', '500 мл'],
    'Тип шкіри':      ['Для всіх типів', 'Для сухої шкіри', 'Для жирної шкіри', 'Для комбінованої', 'Для чутливої шкіри', 'Для нормальної шкіри'],
    'Стать':          ['Жіночий', 'Чоловічий', 'Унісекс'],
    'Країна':         ['Франція', 'Великобританія', 'США', 'Італія', 'Германія', 'Японія', 'Корея', 'Україна'],
    'SPF':            ['SPF 15', 'SPF 20', 'SPF 30', 'SPF 50', 'SPF 50+'],
    'Ефект':          ['Зволоження', 'Живлення', 'Ліфтинг', 'Освітлення', 'Антивікові', 'Матування', 'Тонування'],
    'Текстура':       ['Крем', 'Гель', 'Сироватка', 'Олія', 'Тонер', 'Пінка', 'Міцелярна вода', 'Маска'],
    'Упаковка':       ['Флакон', 'Тюбик', 'Баночка', 'Помпа', 'Спрей', 'Стік'],
    'Колір':          ['Прозорий', 'Бежевий', 'Рожевий', 'Червоний', 'Нюдовий', 'Коричневий', 'Персиковий'],
    'Термін придатності': ['6 місяців', '12 місяців', '18 місяців', '24 місяці', '36 місяців'],
};

// Компонент для редагування значення існуючої характеристики з автодоповненням
const AttrValueInput = ({ attrName, value, allOptions, onChange }) => {
    const [input, setInput] = React.useState(value);
    const [show, setShow] = React.useState(false);
    const ref = React.useRef(null);

    React.useEffect(() => { setInput(value); }, [value]);
    React.useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    // Об'єднуємо пресети і варіанти з бази
    const presetVals = ATTR_PRESETS[attrName] || [];
    const dbVals = allOptions[attrName] || [];
    const merged = [...new Set([...presetVals, ...dbVals])];
    const filtered = merged.filter(s => !input || s.toLowerCase().includes(input.toLowerCase()));

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

    // Новий атрибут: ім'я
    const [newAttrNameInput, setNewAttrNameInput] = useState('');
    const [showNameDropdown, setShowNameDropdown] = useState(false);
    // Новий атрибут: значення
    const [newAttrValueInput, setNewAttrValueInput] = useState('');
    const [showValueDropdown, setShowValueDropdown] = useState(false);

    const attrNameRef = useRef(null);
    const attrValueRef = useRef(null);
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

    // Усі відомі імена характеристик: пресети + з бази
    const allAttrNames = [...new Set([...Object.keys(ATTR_PRESETS), ...Object.keys(attrOptions)])].sort();

    // Значення для поточного вибраного імені
    const valuesForName = (name) => {
        const preset = ATTR_PRESETS[name] || [];
        const db = attrOptions[name] || [];
        return [...new Set([...preset, ...db])];
    };

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
        setNewAttrNameInput('');
        setNewAttrValueInput('');
        setShowNameDropdown(false);
        setShowValueDropdown(false);
    };

    // Закриваємо дропдауни при кліку зовні
    useEffect(() => {
        const h = (e) => {
            if (attrNameRef.current && !attrNameRef.current.contains(e.target)) setShowNameDropdown(false);
            if (attrValueRef.current && !attrValueRef.current.contains(e.target)) setShowValueDropdown(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const filteredAttrNames = allAttrNames.filter(n =>
        !newAttrNameInput || n.toLowerCase().includes(newAttrNameInput.toLowerCase())
    );

    const filteredAttrValues = valuesForName(newAttrNameInput).filter(v =>
        !newAttrValueInput || v.toLowerCase().includes(newAttrValueInput.toLowerCase())
    );

    const updateAttrValue = (i, val) => setAttrs(prev => prev.map((a, idx) => idx === i ? { ...a, value: val } : a));
    const removeAttr = i => setAttrs(prev => prev.filter((_, idx) => idx !== i));

    const handleEdit = async (p) => {
        setEditingId(p.id);
        setForm({
            title: p.title || '', description: p.description || '', price: p.price || '',
            discount_price: p.discount_price || '',
            discount_expiry: p.discount_expiry ? p.discount_expiry.slice(0, 16) : '',
            stock_quantity: p.stock_quantity || '', category: p.category || '',
        });
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
        setNewAttrNameInput(''); setNewAttrValueInput('');
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
            const url = API + '/api/products' + (editingId ? '/' + editingId : '');
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
                {/* ── Форма ── */}
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
                        <input placeholder="Назва товару" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />

                        <label className="field-label">Категорія</label>
                        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                            <option value="">— Оберіть —</option>
                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>

                        <label className="field-label">Опис</label>
                        <textarea placeholder="Опис товару..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />

                        <div className="form-row">
                            <div>
                                <label className="field-label">Ціна (грн) *</label>
                                <input type="number" placeholder="350" min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
                            </div>
                            <div>
                                <label className="field-label">Кількість</label>
                                <input type="number" placeholder="10" min="0" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} />
                            </div>
                        </div>

                        <div className="form-row">
                            <div>
                                <label className="field-label">Акційна ціна</label>
                                <input type="number" placeholder="280" min="0" step="0.01" value={form.discount_price} onChange={e => setForm({ ...form, discount_price: e.target.value })} />
                            </div>
                            <div>
                                <label className="field-label">Акція до</label>
                                <input type="datetime-local" value={form.discount_expiry} onChange={e => setForm({ ...form, discount_expiry: e.target.value })} />
                            </div>
                        </div>

                        {/* ── Характеристики ── */}
                        <div className="attrs-section">
                            <div className="attrs-header">
                                <span className="field-label" style={{ margin: 0 }}>Характеристики</span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--t4)' }}>{attrs.length} шт</span>
                            </div>

                            {/* Існуючі характеристики */}
                            {attrs.map((a, i) => (
                                <div key={i} className="attr-row">
                                    <span className="attr-row-name" title={a.name}>{a.name}</span>
                                    <AttrValueInput
                                        attrName={a.name}
                                        value={a.value}
                                        allOptions={attrOptions}
                                        onChange={v => updateAttrValue(i, v)}
                                    />
                                    <button type="button" className="attr-remove" onClick={() => removeAttr(i)}>×</button>
                                </div>
                            ))}

                            {/* Швидке додавання через пресети */}
                            {Object.keys(ATTR_PRESETS).filter(name => !attrs.find(a => a.name === name)).length > 0 && (
                                <div style={{ marginTop: 10, marginBottom: 8 }}>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                                        Швидке додавання
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {Object.keys(ATTR_PRESETS).filter(name => !attrs.find(a => a.name === name)).map(name => (
                                            <button key={name} type="button"
                                                onClick={() => { setNewAttrNameInput(name); setShowNameDropdown(false); attrValueRef.current?.querySelector('input')?.focus(); }}
                                                style={{
                                                    padding: '4px 10px', borderRadius: 20, border: '1.5px solid var(--border)',
                                                    background: '#fff', color: 'var(--t3)', fontSize: '0.74rem', fontWeight: 700,
                                                    cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--t3)'; }}>
                                                + {name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Форма додавання нового атрибуту */}
                            <div style={{ marginTop: 10, padding: '12px', background: 'var(--bg)', borderRadius: 'var(--r)', border: '1.5px dashed var(--border-hi)' }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                                    Нова характеристика
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {/* Ім'я атрибуту */}
                                    <div ref={attrNameRef} style={{ position: 'relative', flex: 1, minWidth: 120 }}>
                                        <input
                                            className="attr-custom-input"
                                            placeholder="Назва (напр. Бренд)"
                                            value={newAttrNameInput}
                                            onChange={e => { setNewAttrNameInput(e.target.value); setShowNameDropdown(true); setNewAttrValueInput(''); }}
                                            onFocus={() => setShowNameDropdown(true)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') { e.preventDefault(); addAttr(); }
                                                if (e.key === 'Escape') setShowNameDropdown(false);
                                                if (e.key === 'Tab') setShowNameDropdown(false);
                                            }}
                                            autoComplete="off"
                                            style={{ marginBottom: 0 }}
                                        />
                                        {showNameDropdown && filteredAttrNames.length > 0 && (
                                            <ul className="attr-dropdown">
                                                {filteredAttrNames.slice(0, 12).map(n => (
                                                    <li key={n} className="attr-dropdown-item"
                                                        onMouseDown={e => { e.preventDefault(); setNewAttrNameInput(n); setShowNameDropdown(false); setNewAttrValueInput(''); }}>
                                                        {n}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    {/* Значення атрибуту */}
                                    <div ref={attrValueRef} style={{ position: 'relative', flex: 1, minWidth: 120 }}>
                                        <input
                                            className="attr-custom-input"
                                            placeholder="Значення (напр. Chanel)"
                                            value={newAttrValueInput}
                                            onChange={e => { setNewAttrValueInput(e.target.value); setShowValueDropdown(true); }}
                                            onFocus={() => setShowValueDropdown(true)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') { e.preventDefault(); addAttr(); }
                                                if (e.key === 'Escape') setShowValueDropdown(false);
                                            }}
                                            autoComplete="off"
                                            style={{ marginBottom: 0 }}
                                        />
                                        {showValueDropdown && filteredAttrValues.length > 0 && (
                                            <ul className="attr-dropdown">
                                                {filteredAttrValues.slice(0, 12).map(v => (
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

                {/* ── Список товарів ── */}
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
                                        </div>
                                        <div className="admin-product-info">
                                            <div className="admin-product-title">{p.title}</div>
                                            <div className="admin-product-meta">
                                                {p.category && <span className="card-category">{p.category}</span>}
                                                {isSale
                                                    ? <><span style={{ textDecoration: 'line-through', color: 'var(--t4)', fontSize: '0.8rem' }}>{p.price} грн</span><span style={{ color: 'var(--primary)', fontWeight: 800 }}>{p.discount_price} грн</span></>
                                                    : <span style={{ fontWeight: 700 }}>{p.price} грн</span>
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
