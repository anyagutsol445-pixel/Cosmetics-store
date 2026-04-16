import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard.jsx';

const API = 'http://localhost:5000';

const CATEGORY_LABELS = {
    perfume: '🌹 Парфуми',
    cream: '🧴 Креми',
    skincare: '✨ Догляд',
    makeup: '💄 Макіяж',
    hair: '💆 Волосся',
    body: '🛁 Тіло',
};

const Catalog = ({ products, loading, onAddToCart, onFilter, wishlist = [], onToggleWishlist, compareList = [], onToggleCompare }) => {
    const [categories, setCategories] = useState([]);
    const [filterAttrs, setFilterAttrs] = useState({});
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('newest');
    const [priceMin, setPriceMin] = useState('');
    const [priceMax, setPriceMax] = useState('');
    const [saleOnly, setSaleOnly] = useState(false);
    const [selectedAttrs, setSelectedAttrs] = useState({});

    useEffect(() => {
        fetch(API + '/api/categories')
            .then(r => r.ok ? r.json() : [])
            .then(data => setCategories(Array.isArray(data) ? data : []))
            .catch(() => {});

        fetch(API + '/api/filter-attrs')
            .then(r => r.ok ? r.json() : {})
            .then(data => setFilterAttrs(data && typeof data === 'object' ? data : {}))
            .catch(() => {});
    }, []);

    const buildParams = (overrides = {}) => {
        const params = {};
        const cat   = overrides.category  !== undefined ? overrides.category  : activeCategory;
        const s     = overrides.search    !== undefined ? overrides.search    : search;
        const so    = overrides.sort      !== undefined ? overrides.sort      : sort;
        const min   = overrides.min       !== undefined ? overrides.min       : priceMin;
        const max   = overrides.max       !== undefined ? overrides.max       : priceMax;
        const sale  = overrides.saleOnly  !== undefined ? overrides.saleOnly  : saleOnly;
        const attrs = overrides.attrs     !== undefined ? overrides.attrs     : selectedAttrs;

        if (cat && cat !== 'all') params.category = cat;
        if (s) params.search = s;
        if (so && so !== 'newest') params.sort = so;
        if (min) params.min_price = min;
        if (max) params.max_price = max;
        if (sale) params.sale = '1';

        const attrList = Object.entries(attrs)
            .filter(([, v]) => v)
            .map(([name, value]) => ({ name, value }));
        if (attrList.length) params.attrs = encodeURIComponent(JSON.stringify(attrList));

        return params;
    };

    const safeFilter = (params) => {
        if (typeof onFilter === 'function') onFilter(params);
    };

    const handleCategory = (cat) => { setActiveCategory(cat); safeFilter(buildParams({ category: cat })); };
    const handleSort = (e) => { const v = e.target.value; setSort(v); safeFilter(buildParams({ sort: v })); };
    const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); safeFilter(buildParams({ search: searchInput })); };
    const handleSale = () => { const next = !saleOnly; setSaleOnly(next); safeFilter(buildParams({ saleOnly: next })); };
    const handlePriceApply = () => safeFilter(buildParams({}));

    const handleAttr = (name, value) => {
        const next = { ...selectedAttrs, [name]: selectedAttrs[name] === value ? '' : value };
        setSelectedAttrs(next);
        safeFilter(buildParams({ attrs: next }));
    };

    const handleReset = () => {
        setActiveCategory('all'); setSearch(''); setSearchInput('');
        setSort('newest'); setPriceMin(''); setPriceMax('');
        setSaleOnly(false); setSelectedAttrs({});
        safeFilter({});
    };

    const safeProducts = Array.isArray(products) ? products : [];
    const inStock    = safeProducts.filter(p => p.stock_quantity > 0);
    const outOfStock = safeProducts.filter(p => p.stock_quantity <= 0);
    const hasActiveFilters = activeCategory !== 'all' || search || priceMin || priceMax || saleOnly || Object.values(selectedAttrs).some(Boolean);

    const saleCount = safeProducts.filter(p => p.discount_price && new Date(p.discount_expiry) > new Date()).length;

    return (
        <div>
        {/* Hero */}
        <div className="hero">
            <div className="hero-inner">
                <div>
                    <h1 className="hero-title">Краса та догляд<br/><span>за найкращими цінами</span></h1>
                    <p className="hero-sub">Парфуми, креми, сироватки та косметика від провідних брендів. Швидка доставка по всій Україні.</p>
                    <div className="hero-actions">
                        <button className="hero-btn hero-btn-primary" onClick={()=>handleCategory('all')}>Переглянути каталог</button>
                        <button className="hero-btn hero-btn-outline" onClick={()=>{setSaleOnly(true);safeFilter(buildParams({saleOnly:true}));}}>🏷 Акції та знижки</button>
                    </div>
                </div>
                <div className="hero-stats">
                    <div className="hero-stat"><div className="hero-stat-num">{products.length}+</div><div className="hero-stat-label">товарів</div></div>
                    <div className="hero-stat"><div className="hero-stat-num">{saleCount}</div><div className="hero-stat-label">зі знижкою</div></div>
                    <div className="hero-stat"><div className="hero-stat-num">🚚</div><div className="hero-stat-label">доставка</div></div>
                </div>
            </div>
        </div>

        {/* Category chips */}
        <div className="category-chips">
            {[{val:'all',label:'🛍 Всі товари'},...categories.map(c=>({val:c,label:CATEGORY_LABELS[c]||c})),{val:'_sale',label:'🏷 Акції'}].map(({val,label})=>(
                <button key={val} className={'cat-chip'+((val==='_sale'?saleOnly:activeCategory===val)?' active':'')}
                    style={val==='_sale'?{borderColor:saleOnly?undefined:'var(--red)',color:saleOnly?'#fff':'var(--red)'}:{}}
                    onClick={()=>{
                        if(val==='_sale'){const s=!saleOnly;setSaleOnly(s);safeFilter(buildParams({saleOnly:s}));}
                        else handleCategory(val);
                    }}>
                    {label}
                </button>
            ))}
        </div>

        <div className="catalog-layout">
            <aside className="catalog-sidebar">
                <div className="sidebar-block">
                    <div className="sidebar-title">Категорії</div>
                    <ul className="category-list">
                        <li>
                            <button className={'cat-btn' + (activeCategory === 'all' ? ' active' : '')} onClick={() => handleCategory('all')}>
                                Всі товари
                            </button>
                        </li>
                        {categories.map(cat => (
                            <li key={cat}>
                                <button className={'cat-btn' + (activeCategory === cat ? ' active' : '')} onClick={() => handleCategory(cat)}>
                                    {CATEGORY_LABELS[cat] || cat}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="sidebar-block">
                    <div className="sidebar-title">Ціна (грн)</div>
                    <div className="price-inputs">
                        <input type="number" placeholder="від" value={priceMin} onChange={e => setPriceMin(e.target.value)} />
                        <span>—</span>
                        <input type="number" placeholder="до" value={priceMax} onChange={e => setPriceMax(e.target.value)} />
                    </div>
                    <button className="apply-price-btn" onClick={handlePriceApply}>Застосувати</button>
                </div>

                <div className="sidebar-block">
                    <label className="sale-toggle">
                        <input type="checkbox" checked={saleOnly} onChange={handleSale} />
                        <span>Тільки акції</span>
                    </label>
                </div>

                {Object.entries(filterAttrs).map(([attrName, values]) => (
                    <div className="sidebar-block" key={attrName}>
                        <div className="sidebar-title">{attrName}</div>
                        <div className="attr-filter-list">
                            {values.map(val => (
                                <label key={val} className={'attr-filter-option' + (selectedAttrs[attrName] === val ? ' active' : '')}>
                                    <input
                                        type="radio"
                                        name={'attr-' + attrName}
                                        checked={selectedAttrs[attrName] === val}
                                        onChange={() => handleAttr(attrName, val)}
                                    />
                                    <span>{val}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}

                {hasActiveFilters && (
                    <button className="reset-filters-btn" onClick={handleReset}>Скинути фільтри</button>
                )}
            </aside>

            <div className="catalog-main">
                <div className="catalog-toolbar">
                    <form onSubmit={handleSearch} className="search-form">
                        <input type="text" placeholder="Пошук товарів..." value={searchInput} onChange={e => setSearchInput(e.target.value)} />
                        <button type="submit">🔍</button>
                    </form>
                    <select className="sort-select" value={sort} onChange={handleSort}>
                        <option value="newest">Спочатку нові</option>
                        <option value="price_asc">Ціна: від низької</option>
                        <option value="price_desc">Ціна: від високої</option>
                        <option value="name">За назвою</option>
                        <option value="rating">За рейтингом</option>
                    </select>
                </div>

                {loading ? (
                    <div className="loading-container"><div className="spinner" /><p>Завантаження...</p></div>
                ) : safeProducts.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🔍</div>
                        <p>Нічого не знайдено</p>
                        {hasActiveFilters && (
                            <button className="reset-filters-btn" style={{ margin: '12px auto 0', maxWidth: 180 }} onClick={handleReset}>
                                Скинути фільтри
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {inStock.length > 0 && (
                            <>
                                <div className="section-header">
                                    <h2>В наявності <span className="count-chip">{inStock.length}</span></h2>
                                </div>
                                <div className="grid">
                                    {inStock.map(p => (
                                        <ProductCard key={p.id} item={p} onAddToCart={onAddToCart} wishlist={wishlist} onToggleWishlist={onToggleWishlist} compareList={compareList} onToggleCompare={onToggleCompare} />
                                    ))}
                                </div>
                            </>
                        )}
                        {outOfStock.length > 0 && (
                            <div className="pre-order-section">
                                <div className="section-header">
                                    <h2>Передзамовлення <span className="count-chip">{outOfStock.length}</span></h2>
                                </div>
                                <div className="grid">
                                    {outOfStock.map(p => (
                                        <ProductCard key={p.id} item={p} isPreOrder onAddToCart={onAddToCart} wishlist={wishlist} onToggleWishlist={onToggleWishlist} compareList={compareList} onToggleCompare={onToggleCompare} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
        </div>
    );
};

export default Catalog;