import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = 'http://localhost:5000';

const ComparePage = ({ sessionId, onToggleCompare, onAddToCart }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetch_ = () => {
        setLoading(true);
        fetch(API + '/api/compare/' + sessionId)
            .then(r => r.json())
            .then(d => setProducts(Array.isArray(d) ? d : []))
            .catch(() => setProducts([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetch_(); }, []);

    const remove = async (id) => {
        await onToggleCompare(id);
        setProducts(prev => prev.filter(p => p.id !== id));
    };

    const clearAll = async () => {
        await fetch(API + '/api/compare/' + sessionId, { method: 'DELETE' });
        setProducts([]);
    };

    const allAttrs = [...new Set(products.flatMap(p => (p.attrs||[]).map(a => a.attr_name)))];

    if (loading) return <div className="loading-container"><div className="spinner" /></div>;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h1 className="page-title" style={{ marginBottom: 0 }}>Порівняння товарів</h1>
                {products.length > 0 && (
                    <button className="reset-filters-btn" style={{ width: 'auto', padding: '7px 16px' }} onClick={clearAll}>
                        Очистити все
                    </button>
                )}
            </div>

            {products.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">⚖️</div>
                    <p>Немає товарів для порівняння</p>
                    <Link to="/" style={{ color: 'var(--gold)', marginTop: 12, display: 'block' }}>До каталогу →</Link>
                </div>
            ) : (
                <div className="compare-table-wrap">
                    <table className="compare-table">
                        <thead>
                            <tr>
                                <th className="compare-label-col">Товар</th>
                                {products.map(p => (
                                    <th key={p.id} className="compare-product-col">
                                        <div className="compare-product-header">
                                            <button className="compare-remove" onClick={() => remove(p.id)}>×</button>
                                            <Link to={'/product/'+p.id}>
                                                {p.image_url
                                                    ? <img src={API + p.image_url} alt={p.title} className="compare-img" />
                                                    : <div className="compare-no-img">✦</div>
                                                }
                                            </Link>
                                            <Link to={'/product/'+p.id} className="compare-product-title">{p.title}</Link>
                                            <button className="submit-btn" style={{ fontSize: '0.68rem', padding: '8px' }}
                                                onClick={() => onAddToCart(p)} disabled={!p.stock_quantity}>
                                                {p.stock_quantity > 0 ? 'До кошика' : 'Немає'}
                                            </button>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="compare-label">Ціна</td>
                                {products.map(p => {
                                    const isSale = p.discount_price && new Date(p.discount_expiry) > new Date();
                                    return (
                                        <td key={p.id} className="compare-value">
                                            {isSale ? (
                                                <><span className="old-price">{Number(p.price).toFixed(0)} грн</span><br/><span className="new-price">{Number(p.discount_price).toFixed(0)} грн</span></>
                                            ) : (
                                                <span className="price">{Number(p.price).toFixed(0)} грн</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                            <tr>
                                <td className="compare-label">Наявність</td>
                                {products.map(p => (
                                    <td key={p.id} className="compare-value">
                                        {p.stock_quantity > 0
                                            ? <span className="stock-ok">✓ Є ({p.stock_quantity} шт)</span>
                                            : <span className="stock-no">✗ Немає</span>
                                        }
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className="compare-label">Категорія</td>
                                {products.map(p => <td key={p.id} className="compare-value">{p.category || '—'}</td>)}
                            </tr>
                            {allAttrs.map(attrName => (
                                <tr key={attrName}>
                                    <td className="compare-label">{attrName}</td>
                                    {products.map(p => {
                                        const attr = (p.attrs||[]).find(a => a.attr_name === attrName);
                                        return <td key={p.id} className="compare-value">{attr ? attr.attr_value : '—'}</td>;
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ComparePage;
