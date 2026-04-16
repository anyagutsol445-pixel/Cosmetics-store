import React from 'react';
import { Link } from 'react-router-dom';

const API = 'http://localhost:5000';

const Cart = ({ cartItems, onUpdate, onRemove }) => {
    const getPrice = (item) => {
        const isSale = item.discount_price && new Date(item.discount_expiry) > new Date();
        return isSale ? Number(item.discount_price) : Number(item.price);
    };

    const total = cartItems.reduce((s, i) => s + getPrice(i) * i.quantity, 0);

    if (!cartItems.length) {
        return (
            <div className="cart-empty">
                <div className="cart-empty-icon">🛒</div>
                <h2>Кошик порожній</h2>
                <p>Додайте товари з каталогу</p>
                <Link to="/" className="submit-btn" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center', width: 'auto', padding: '13px 32px' }}>
                    До каталогу
                </Link>
            </div>
        );
    }

    return (
        <div className="cart-page">
            <h2 className="page-title">Кошик <span className="count-chip">{cartItems.length}</span></h2>

            <div className="cart-layout">
                <div className="cart-items">
                    {cartItems.map(item => {
                        const price = getPrice(item);
                        const isSale = item.discount_price && new Date(item.discount_expiry) > new Date();
                        return (
                            <div key={item.id} className="cart-item">
                                <div className="cart-item-img">
                                    {item.image_url
                                        ? <img src={API + item.image_url} alt={item.title} />
                                        : <div className="cart-no-img">✦</div>
                                    }
                                </div>
                                <div className="cart-item-info">
                                    <Link to={'/product/' + item.id} className="cart-item-title">{item.title}</Link>
                                    {item.category && <span className="cart-item-cat">{item.category}</span>}
                                    <div className="cart-item-price-row">
                                        {isSale && <span className="old-price">{Number(item.price).toFixed(0)} грн</span>}
                                        <span className={isSale ? 'new-price' : 'price'}>{price.toFixed(0)} грн</span>
                                    </div>
                                </div>
                                <div className="cart-item-qty">
                                    <button onClick={() => onUpdate(item.id, item.quantity - 1)}>−</button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => onUpdate(item.id, Math.min(item.stock_quantity, item.quantity + 1))}>+</button>
                                </div>
                                <div className="cart-item-subtotal">
                                    {(price * item.quantity).toFixed(0)} грн
                                </div>
                                <button className="cart-item-remove" onClick={() => onRemove(item.id)}>×</button>
                            </div>
                        );
                    })}
                </div>

                <div className="cart-summary">
                    <h3>Підсумок</h3>
                    <div className="cart-summary-rows">
                        {cartItems.map(item => {
                            const price = getPrice(item);
                            return (
                                <div key={item.id} className="summary-row">
                                    <span>{item.title} × {item.quantity}</span>
                                    <span>{(price * item.quantity).toFixed(0)} грн</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="cart-total">
                        <span>Разом</span>
                        <strong>{total.toFixed(0)} грн</strong>
                    </div>
                    <Link to="/checkout" className="submit-btn" style={{ display: 'block', textDecoration: 'none', textAlign: 'center' }}>
                        Оформити замовлення →
                    </Link>
                    <Link to="/" style={{ display: 'block', textAlign: 'center', marginTop: 12, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        Продовжити покупки
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Cart;
