import React from 'react';
import { Link } from 'react-router-dom';
const API = 'http://localhost:5000';
const Stars = ({ rating, count }) => {
    const r = Math.round(Number(rating)||0);
    return (
        <div className="card-stars">
            <div className="stars-row">
                {[1,2,3,4,5].map(n=><span key={n} className={'star-icon '+(n<=r?'filled':'empty')}>★</span>)}
            </div>
            {Number(rating)>0 && <span className="rating-num">{Number(rating).toFixed(1)}</span>}
            {Number(count)>0 && <span className="review-cnt">({count})</span>}
        </div>
    );
};
const ProductCard = ({ item, isPreOrder, onAddToCart, wishlist=[], onToggleWishlist, compareList=[], onToggleCompare }) => {
    const isSale = item.discount_price && new Date(item.discount_expiry) > new Date();
    const inWishlist = wishlist.includes(item.id);
    const inCompare = compareList.includes(item.id);
    const pct = isSale ? Math.round((1-item.discount_price/item.price)*100) : 0;
    const price = isSale ? Number(item.discount_price) : Number(item.price);
    return (
        <div className={'card'+(isPreOrder?' pre-order':'')}>
            <div className="card-image-wrap">
                <Link to={'/product/'+item.id}>
                    {item.image_url ? <img src={API+item.image_url} alt={item.title} loading="lazy"/> : <div className="card-no-image">🌸</div>}
                </Link>
                <div className="card-badges">
                    {isSale && <span className="badge-sale">−{pct}%</span>}
                    {isPreOrder && <span className="badge-preorder">Передзамовлення</span>}
                    {!isPreOrder && item.stock_quantity>0 && item.stock_quantity<=5 && <span className="badge-stock">Лишилось {item.stock_quantity}</span>}
                </div>
                <button className={'card-wishlist'+(inWishlist?' active':'')}
                    onClick={e=>{e.preventDefault();onToggleWishlist&&onToggleWishlist(item.id);}}
                    title={inWishlist?'Видалити з вибраного':'До вибраного'}>
                    {inWishlist?'♥':'♡'}
                </button>
            </div>
            <div className="card-body">
                {item.category && <div className="card-category">{item.category}</div>}
                <Link to={'/product/'+item.id} className="card-title">{item.title}</Link>
                {(Number(item.avg_rating)>0||Number(item.review_count)>0) && <Stars rating={item.avg_rating} count={item.review_count}/>}
                <div className="card-price">
                    <div className="card-price-row">
                        <span className={'price-current'+(isSale?' sale':'')}>{price.toFixed(0)} грн</span>
                        {isSale && <span className="price-old">{Number(item.price).toFixed(0)} грн</span>}
                    </div>
                    <button className="card-btn" disabled={isPreOrder&&!item.allow_preorder}
                        onClick={()=>!isPreOrder&&onAddToCart&&onAddToCart(item)}>
                        {isPreOrder?'📋 Передзамовлення':'🛒 До кошика'}
                    </button>
                    {onToggleCompare && (
                        <div className="card-actions-row">
                            <button className={'card-compare-btn'+(inCompare?' active':'')} onClick={()=>onToggleCompare(item.id)}>
                                {inCompare?'✓ У порівнянні':'⚖ Порівняти'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
export default ProductCard;
