import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard.jsx';

const API = 'http://localhost:5000';

const SalesPage = ({ onAddToCart, wishlist, onToggleWishlist, compareList, onToggleCompare }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sort, setSort] = useState('newest');

    useEffect(() => {
        setLoading(true);
        fetch(API + '/api/products?sale=1&sort=' + sort)
            .then(r => r.json())
            .then(d => setProducts(Array.isArray(d) ? d : []))
            .catch(() => setProducts([]))
            .finally(() => setLoading(false));
    }, [sort]);

    return (
        <div>
            <div className="sales-header">
                <div>
                    <h1 className="page-title" style={{ marginBottom: 4 }}>🏷 Акції та знижки</h1>
                    <p style={{ color: 'var(--t4)', fontSize: '0.88rem' }}>Товари зі знижками — {products.length} позицій</p>
                </div>
                <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
                    <option value="newest">Спочатку нові</option>
                    <option value="price_asc">Ціна: від низької</option>
                    <option value="price_desc">Ціна: від високої</option>
                    <option value="rating">За рейтингом</option>
                </select>
            </div>

            {loading ? (
                <div className="loading-container"><div className="spinner" /></div>
            ) : products.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">🏷</div><p>Акцій поки немає</p></div>
            ) : (
                <div className="grid">
                    {products.map(p => (
                        <ProductCard key={p.id} item={p}
                            onAddToCart={onAddToCart}
                            wishlist={wishlist}
                            onToggleWishlist={onToggleWishlist}
                            compareList={compareList}
                            onToggleCompare={onToggleCompare}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default SalesPage;
