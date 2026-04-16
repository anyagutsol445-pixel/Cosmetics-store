import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000';

const UA_CITIES = [
    'Київ','Харків','Одеса','Дніпро','Запоріжжя','Львів','Кривий Ріг',
    'Миколаїв','Вінниця','Херсон','Полтава','Чернігів','Черкаси','Суми',
    'Хмельницький','Чернівці','Житомир','Рівне','Івано-Франківськ',
    'Кропивницький','Тернопіль','Луцьк','Ужгород','Мукачево','Бердянськ',
];

const DELIVERY_OPTIONS = [
    { value: 'Nova Poshta', label: 'Нова Пошта',  icon: '📦', fields: [{ name: 'branch', label: 'Відділення або поштомат', placeholder: '№14 або Поштомат №1234' }] },
    { value: 'UkrPoshta',   label: 'Укрпошта',    icon: '🇺🇦', fields: [{ name: 'branch', label: 'Відділення Укрпошти', placeholder: 'Номер відділення або адреса' }] },
    { value: 'Courier',     label: 'Кур\'єр',     icon: '🛵', fields: [
        { name: 'city',   label: 'Місто', placeholder: 'Київ' },
        { name: 'street', label: 'Вулиця, будинок, квартира', placeholder: 'вул. Хрещатик, 1, кв. 10' },
    ]},
];

const PAYMENT_OPTIONS = [
    { value: 'cash_on_delivery', label: 'Післяплата',    icon: '💵', desc: 'Оплата при отриманні' },
    { value: 'card',             label: 'Картка Online', icon: '💳', desc: 'Visa / Mastercard' },
];

const FieldInput = ({ label, ...props }) => (
    <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--t3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
        <input {...props} style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--t2)', fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s', ...props.style }} onFocus={e => e.target.style.borderColor = 'var(--gold)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
    </div>
);

const Section = ({ step, total, label, children }) => (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r)', marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--gold)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>{step}</span>
            <span style={{ fontWeight: 700, color: 'var(--t1)', fontSize: '0.95rem' }}>{label}</span>
        </div>
        <div style={{ padding: '18px' }}>{children}</div>
    </div>
);

const Checkout = ({ cartItems, user, onOrderSuccess, showToast }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [delivery, setDelivery] = useState('Nova Poshta');
    const [deliveryDetails, setDeliveryDetails] = useState({});
    const [payment, setPayment] = useState('cash_on_delivery');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [saveAddress, setSaveAddress] = useState(false);
    const [promoInput, setPromoInput] = useState('');
    const [promoApplied, setPromoApplied] = useState(null);
    const [promoLoading, setPromoLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [cityInput, setCityInput] = useState('');
    const [citySuggestions, setCitySuggestions] = useState([]);
    const cityRef = useRef(null);

    useEffect(() => {
        if (user?.token) {
            fetch(API + '/api/auth/me', { headers: { Authorization: 'Bearer ' + user.token } })
                .then(r => r.json())
                .then(d => {
                    setFullName(d.full_name || '');
                    setPhone(d.saved_phone || d.phone || '');
                    if (d.saved_address) {
                        const parts = d.saved_address.split(', ');
                        if (parts.length >= 2) { setCityInput(parts[0]); setDeliveryDetails({ city: parts[0], street: parts.slice(1).join(', ') }); }
                        else setDeliveryDetails({ branch: d.saved_address });
                    }
                }).catch(() => {});
        }
    }, [user]);

    useEffect(() => {
        const handleClick = (e) => { if (cityRef.current && !cityRef.current.contains(e.target)) setCitySuggestions([]); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleCityInput = (val) => {
        setCityInput(val); setDeliveryDetails(prev => ({ ...prev, city: val }));
        setCitySuggestions(val.length >= 2 ? UA_CITIES.filter(c => c.toLowerCase().startsWith(val.toLowerCase())).slice(0,6) : []);
    };
    const selectCity = (city) => { setCityInput(city); setDeliveryDetails(prev => ({ ...prev, city })); setCitySuggestions([]); };

    const currentDelivery = DELIVERY_OPTIONS.find(o => o.value === delivery);
    const getPrice = item => { const isSale = item.discount_price && new Date(item.discount_expiry) > new Date(); return isSale ? Number(item.discount_price) : Number(item.price); };
    const subtotal = cartItems.reduce((s, i) => s + getPrice(i) * i.quantity, 0);
    const discount = promoApplied?.discount || 0;
    const total = subtotal - discount;

    const applyPromo = async () => {
        if (!promoInput.trim()) return;
        setPromoLoading(true);
        try {
            const res = await fetch(API + '/api/promo/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: promoInput, total: subtotal }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setPromoApplied(data);
            showToast('Промокод застосовано — знижка ' + data.discount_percent + '%! 🎉');
        } catch (err) { showToast(err.message, 'error'); setPromoApplied(null); }
        finally { setPromoLoading(false); }
    };

    const buildAddress = () => Object.values(deliveryDetails).filter(Boolean).join(', ');

    const handleGoConfirm = () => {
        if (!fullName.trim()) { showToast('Вкажіть ПІБ', 'error'); return; }
        if (!phone.trim()) { showToast('Вкажіть телефон', 'error'); return; }
        setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const processOrder = async () => {
        setLoading(true);
        try {
            if (saveAddress && user?.token) {
                await fetch(API + '/api/auth/me', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + user.token }, body: JSON.stringify({ full_name: fullName, phone, saved_phone: phone, saved_address: buildAddress() }) }).catch(() => {});
            }
            const res = await fetch(API + '/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(user?.token ? { Authorization: 'Bearer ' + user.token } : {}) },
                body: JSON.stringify({ full_name: fullName, phone, address: buildAddress(), delivery_method: delivery, payment_method: payment, promo_code: promoApplied ? promoInput : null, items: cartItems.map(i => ({ product_id: i.id, quantity: i.quantity })) })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showToast('✓ Замовлення #' + data.order_id + ' оформлено!');
            onOrderSuccess();
            navigate(user ? '/profile' : '/');
        } catch (err) { showToast('Помилка: ' + err.message, 'error'); setStep(1); }
        finally { setLoading(false); }
    };

    if (!cartItems.length) return null;

    const deliveryLabel = DELIVERY_OPTIONS.find(o => o.value === delivery)?.label;
    const paymentOpt = PAYMENT_OPTIONS.find(o => o.value === payment);

    // ─── Summary sidebar (shared) ─────────────────────────────────────────────
    const Summary = () => (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', position: 'sticky', top: 80 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', fontWeight: 700, color: 'var(--t1)', fontSize: '0.95rem' }}>
                🛒 Ваше замовлення ({cartItems.length} поз.)
            </div>
            <div style={{ padding: '14px 18px' }}>
                {cartItems.map(item => {
                    const price = getPrice(item);
                    return (
                        <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'center', paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--border)' }}>
                            <div style={{ width: 46, height: 46, borderRadius: 8, background: 'var(--bg2)', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                                {item.image_url ? <img src={API + item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t4)' }}>✦</div>}
                                <span style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: 'var(--gold)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 800 }}>{item.quantity}</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.82rem', color: 'var(--t2)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--t1)', marginTop: 2 }}>{(price * item.quantity).toFixed(0)} грн</div>
                            </div>
                        </div>
                    );
                })}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--t3)', marginBottom: 6 }}>
                    <span>Сума товарів</span><span>{subtotal.toFixed(0)} грн</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--t4)', marginBottom: 6 }}>
                    <span>Доставка</span><span>за тарифами</span>
                </div>
                {discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#22c55e', fontWeight: 600, marginBottom: 6 }}>
                        <span>Знижка</span><span>−{discount.toFixed(0)} грн</span>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', color: 'var(--t1)', paddingTop: 12, borderTop: '2px solid var(--border)', marginTop: 6 }}>
                    <span>Разом</span><span>{total.toFixed(0)} грн</span>
                </div>
            </div>
        </div>
    );

    // ─── Step 2: Confirm ──────────────────────────────────────────────────────
    if (step === 2) {
        return (
            <div className="checkout-page">
                <h2 className="page-title">Підтвердження замовлення</h2>
                <div className="checkout-layout">
                    <div className="checkout-form">
                        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: 16 }}>
                            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', fontWeight: 700, color: 'var(--t1)', fontSize: '0.95rem' }}>
                                📋 Деталі замовлення
                            </div>
                            <div style={{ padding: '18px' }}>
                                {[
                                    { label: 'ПІБ', val: fullName },
                                    { label: 'Телефон', val: phone },
                                    { label: 'Доставка', val: deliveryLabel + (buildAddress() ? ' — ' + buildAddress() : '') },
                                    { label: 'Оплата', val: paymentOpt?.icon + ' ' + paymentOpt?.label },
                                    ...(promoApplied ? [{ label: 'Промокод', val: promoInput + ' (−' + promoApplied.discount_percent + '%)' }] : []),
                                ].map(({ label, val }) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                        <span style={{ fontSize: '0.82rem', color: 'var(--t4)', fontWeight: 600 }}>{label}</span>
                                        <span style={{ fontSize: '0.88rem', color: 'var(--t1)', fontWeight: 600, textAlign: 'right' }}>{val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Confirm notice */}
                        <div style={{ background: '#fffbea', border: '1px solid #fde68a', borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 16, fontSize: '0.82rem', color: '#92400e' }}>
                            ⚠️ Перевірте дані перед підтвердженням. Після оформлення замовлення зміни неможливі.
                        </div>

                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <button onClick={() => setStep(1)}
                                style={{ flex: 1, minWidth: 140, padding: '12px 20px', borderRadius: 'var(--r)', border: '1.5px solid var(--border)', background: 'var(--card)', color: 'var(--t3)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
                                ← Змінити дані
                            </button>
                            <button onClick={processOrder} disabled={loading}
                                style={{ flex: 2, minWidth: 200, padding: '12px 20px', borderRadius: 'var(--r)', border: 'none', background: loading ? 'var(--border)' : 'var(--gold)', color: '#fff', fontWeight: 800, cursor: loading ? 'default' : 'pointer', fontSize: '0.95rem', transition: 'all 0.2s' }}>
                                {loading ? '⏳ Оформлення...' : '✓ Підтвердити замовлення'}
                            </button>
                        </div>
                    </div>
                    <Summary />
                </div>
            </div>
        );
    }

    // ─── Step 1: Form ─────────────────────────────────────────────────────────
    return (
        <div className="checkout-page">
            {/* Progress */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28, maxWidth: 400 }}>
                {['Оформлення', 'Підтвердження'].map((label, i) => (
                    <React.Fragment key={i}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? 'var(--gold)' : 'var(--border)', color: i === 0 ? '#fff' : 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', transition: 'all 0.3s' }}>{i+1}</div>
                            <span style={{ fontSize: '0.7rem', color: i === 0 ? 'var(--gold)' : 'var(--t4)', fontWeight: i === 0 ? 700 : 400, whiteSpace: 'nowrap' }}>{label}</span>
                        </div>
                        {i < 1 && <div style={{ flex: 1, height: 2, background: 'var(--border)', margin: '0 6px', marginBottom: 18 }} />}
                    </React.Fragment>
                ))}
            </div>

            <div className="checkout-layout">
                <div className="checkout-form">

                    {/* Contact */}
                    <Section step={1} label="Контактні дані">
                        <FieldInput label="ПІБ *" type="text" placeholder="Прізвище Ім'я По-батькові" value={fullName} onChange={e => setFullName(e.target.value)} />
                        <FieldInput label="Телефон *" type="tel" placeholder="+380 XX XXX XX XX" value={phone} onChange={e => setPhone(e.target.value)} />
                        {user && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.82rem', color: 'var(--t3)', marginTop: 4 }}>
                                <input type="checkbox" checked={saveAddress} onChange={e => setSaveAddress(e.target.checked)} style={{ accentColor: 'var(--gold)' }} />
                                Зберегти контакти для наступних замовлень
                            </label>
                        )}
                    </Section>

                    {/* Delivery */}
                    <Section step={2} label="Спосіб доставки">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                            {DELIVERY_OPTIONS.map(opt => (
                                <label key={opt.value}
                                    onClick={() => { setDelivery(opt.value); setDeliveryDetails({}); setCityInput(''); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: `2px solid ${delivery === opt.value ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 'var(--r)', cursor: 'pointer', background: delivery === opt.value ? '#fffbea' : 'var(--bg)', transition: 'all 0.2s' }}>
                                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${delivery === opt.value ? 'var(--gold)' : 'var(--border)'}`, background: delivery === opt.value ? 'var(--gold)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {delivery === opt.value && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                                    </div>
                                    <span style={{ fontSize: '1.1rem' }}>{opt.icon}</span>
                                    <span style={{ fontWeight: delivery === opt.value ? 700 : 500, color: delivery === opt.value ? 'var(--gold)' : 'var(--t2)', fontSize: '0.88rem' }}>{opt.label}</span>
                                </label>
                            ))}
                        </div>
                        {currentDelivery?.fields.map(field => (
                            <div key={field.name}>
                                {field.name === 'city' ? (
                                    <div ref={cityRef} style={{ position: 'relative', marginBottom: 14 }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--t3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{field.label}</label>
                                        <input type="text" placeholder={field.placeholder} value={cityInput}
                                            onChange={e => handleCityInput(e.target.value)} autoComplete="off"
                                            style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--t2)', fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none' }} />
                                        {citySuggestions.length > 0 && (
                                            <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r)', listStyle: 'none', margin: '2px 0 0', padding: 0, zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                                                {citySuggestions.map(city => (
                                                    <li key={city} onClick={() => selectCity(city)}
                                                        style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--t2)', borderBottom: '1px solid var(--border)' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                        {city}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ) : (
                                    <FieldInput label={field.label} type="text" placeholder={field.placeholder}
                                        value={deliveryDetails[field.name] || ''}
                                        onChange={e => setDeliveryDetails(prev => ({ ...prev, [field.name]: e.target.value }))} />
                                )}
                            </div>
                        ))}
                    </Section>

                    {/* Payment */}
                    <Section step={3} label="Спосіб оплати">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {PAYMENT_OPTIONS.map(opt => (
                                <label key={opt.value}
                                    onClick={() => setPayment(opt.value)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: `2px solid ${payment === opt.value ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 'var(--r)', cursor: 'pointer', background: payment === opt.value ? '#fffbea' : 'var(--bg)', transition: 'all 0.2s' }}>
                                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${payment === opt.value ? 'var(--gold)' : 'var(--border)'}`, background: payment === opt.value ? 'var(--gold)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {payment === opt.value && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                                    </div>
                                    <span style={{ fontSize: '1.1rem' }}>{opt.icon}</span>
                                    <div>
                                        <div style={{ fontWeight: payment === opt.value ? 700 : 500, color: payment === opt.value ? 'var(--gold)' : 'var(--t2)', fontSize: '0.88rem' }}>{opt.label}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--t4)' }}>{opt.desc}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </Section>

                    {/* Promo */}
                    <Section step={4} label="Промокод">
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input type="text" placeholder="WELCOME10"
                                value={promoInput} onChange={e => setPromoInput(e.target.value.toUpperCase())}
                                disabled={!!promoApplied}
                                style={{ flex: 1, padding: '11px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--t2)', fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none', letterSpacing: '0.05em' }} />
                            {promoApplied
                                ? <button onClick={() => { setPromoApplied(null); setPromoInput(''); }}
                                    style={{ padding: '0 14px', border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--bg2)', color: 'var(--t3)', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                                : <button onClick={applyPromo} disabled={promoLoading}
                                    style={{ padding: '0 18px', border: 'none', borderRadius: 'var(--r)', background: 'var(--gold)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                    {promoLoading ? '...' : 'Застосувати'}
                                </button>
                            }
                        </div>
                        {promoApplied && (
                            <div style={{ marginTop: 8, padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--r)', fontSize: '0.82rem', color: '#166534', fontWeight: 600 }}>
                                ✓ Знижка {promoApplied.discount_percent}% застосована — економія {promoApplied.discount.toFixed(0)} грн
                            </div>
                        )}
                    </Section>

                    <button onClick={handleGoConfirm}
                        style={{ width: '100%', padding: '14px 20px', borderRadius: 'var(--r)', border: 'none', background: 'var(--gold)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '1rem', transition: 'opacity 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                        Перейти до підтвердження →
                    </button>
                </div>
                <Summary />
            </div>
        </div>
    );
};

export default Checkout;
