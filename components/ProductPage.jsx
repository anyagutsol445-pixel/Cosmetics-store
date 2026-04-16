import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ProductCard from './ProductCard.jsx';

const API = 'http://localhost:5000';
const STAFF = ['admin','manager'];

const Stars = ({ rating, interactive = false, onRate, size = '1.1rem' }) => {
    const [hovered, setHovered] = useState(0);
    const display = interactive ? (hovered || rating) : rating;
    return (
        <div style={{ display: 'inline-flex', gap: 2 }}>
            {[1,2,3,4,5].map(n => (
                <span key={n}
                    onClick={() => interactive && onRate && onRate(n)}
                    onMouseEnter={() => interactive && setHovered(n)}
                    onMouseLeave={() => interactive && setHovered(0)}
                    style={{ fontSize: size, cursor: interactive ? 'pointer' : 'default', color: display >= n ? '#f4a800' : 'var(--border)', transition: 'color 0.1s' }}>★</span>
            ))}
        </div>
    );
};

const Card = ({ children, title, icon }) => (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: 4 }}>
        {title && (
            <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', fontWeight: 700, fontSize: '0.88rem', color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                {icon && <span>{icon}</span>}{title}
            </div>
        )}
        <div style={{ padding: '18px' }}>{children}</div>
    </div>
);

const ProductPage = ({ onAddToCart, wishlist=[], onToggleWishlist, compareList=[], onToggleCompare, user, showToast=()=>{}, onAddRecent, recentIds=[] }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recentProducts, setRecentProducts] = useState([]);
    const [activeImg, setActiveImg] = useState(0);
    const [qty, setQty] = useState(1);
    const [tab, setTab] = useState('desc');

    // Reviews
    const [reviews, setReviews] = useState([]);
    const [myRating, setMyRating] = useState(5);
    const [myReview, setMyReview] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewMsg, setReviewMsg] = useState(null);

    // Q&A
    const [questions, setQuestions] = useState([]);
    const [myQuestion, setMyQuestion] = useState('');
    const [submittingQ, setSubmittingQ] = useState(false);
    const [answeringId, setAnsweringId] = useState(null);
    const [answerText, setAnswerText] = useState('');

    const isStaff = user && STAFF.includes(user.role);

    const fetchProduct = () => {
        setLoading(true);
        fetch(API+'/api/products/'+id)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => { setProduct(data); setLoading(false); })
            .catch(() => navigate('/'));
    };
    const fetchReviews = () => fetch(API+'/api/products/'+id+'/reviews').then(r=>r.json()).then(d=>setReviews(Array.isArray(d)?d:[])).catch(()=>{});
    const fetchQuestions = () => fetch(API+'/api/products/'+id+'/questions').then(r=>r.json()).then(d=>setQuestions(Array.isArray(d)?d:[])).catch(()=>{});

    useEffect(() => {
        fetchProduct(); fetchReviews(); fetchQuestions();
        setActiveImg(0); setTab('desc'); setReviewMsg(null); setQty(1); setMyQuestion('');
        if (onAddRecent) onAddRecent(Number(id));
    }, [id]);

    useEffect(() => {
        const others = recentIds.filter(rid => rid !== Number(id)).slice(0, 6);
        if (!others.length) { setRecentProducts([]); return; }
        Promise.all(others.map(rid => fetch(API+'/api/products/'+rid).then(r=>r.ok?r.json():null).catch(()=>null)))
            .then(results => setRecentProducts(results.filter(Boolean)));
    }, [id, recentIds]);

    const submitReview = async () => {
        if (!user?.token) return;
        setReviewMsg(null); setSubmittingReview(true);
        try {
            const res = await fetch(API+'/api/products/'+id+'/reviews', {
                method:'POST', headers:{'Content-Type':'application/json',Authorization:'Bearer '+user.token},
                body: JSON.stringify({ rating:myRating, body:myReview })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMyReview(''); setMyRating(5);
            setReviewMsg({ type:'success', text:'✓ Відгук опубліковано!' });
            fetchReviews(); fetchProduct();
        } catch(err) { setReviewMsg({ type:'error', text:err.message }); }
        finally { setSubmittingReview(false); }
    };

    const submitQuestion = async () => {
        if (!myQuestion.trim() || !user?.token) return;
        setSubmittingQ(true);
        try {
            const res = await fetch(API+'/api/products/'+id+'/questions', {
                method:'POST', headers:{'Content-Type':'application/json',Authorization:'Bearer '+user.token},
                body: JSON.stringify({ question:myQuestion })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMyQuestion(''); fetchQuestions();
        } catch(err) { showToast(err.message, 'error'); }
        finally { setSubmittingQ(false); }
    };

    const submitAnswer = async (qid) => {
        if (!answerText.trim()) return;
        try {
            const res = await fetch(API+'/api/products/'+id+'/questions/'+qid+'/answer', {
                method:'PATCH', headers:{'Content-Type':'application/json',Authorization:'Bearer '+user.token},
                body: JSON.stringify({ answer:answerText })
            });
            if (!res.ok) throw new Error();
            setAnsweringId(null); setAnswerText(''); fetchQuestions();
        } catch { showToast('Помилка збереження', 'error'); }
    };

    const deleteQuestion = async (qid) => {
        if (!window.confirm('Видалити питання?')) return;
        await fetch(API+'/api/products/'+id+'/questions/'+qid, { method:'DELETE', headers:{Authorization:'Bearer '+user.token} });
        fetchQuestions();
    };

    if (loading) return <div className="loading-container"><div className="spinner"/></div>;
    if (!product) return null;

    const isSale = product.discount_price && new Date(product.discount_expiry) > new Date();
    const price = isSale ? Number(product.discount_price) : Number(product.price);
    const inWishlist = wishlist.includes(product.id);
    const inCompare = compareList.includes(product.id);
    const inStock = product.stock_quantity > 0;
    const reviewCount = Number(product.review_count)||0;
    const avgRating = Number(product.avg_rating)||0;
    const allImages = product.images?.length ? product.images.map(i=>i.image_url) : product.image_url ? [product.image_url] : [];
    const ratingCounts = [5,4,3,2,1].map(n=>({ n, count:reviews.filter(r=>r.rating===n).length }));
    const answeredQ = questions.filter(q=>q.answer);
    const unansweredQ = questions.filter(q=>!q.answer);

    return (
        <div className="product-page">
            <button className="back-btn" onClick={()=>navigate(-1)}>← Назад</button>

            {/* ── Main layout ── */}
            <div className="product-page-inner">
                {/* Gallery */}
                <div className="product-gallery">
                    <div className="gallery-main" style={{ position:'relative', borderRadius:'var(--r)', overflow:'hidden', background:'var(--bg2)', aspectRatio:'1/1' }}>
                        {allImages.length > 0
                            ? <img src={API+allImages[activeImg]} alt={product.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                            : <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'3rem',color:'var(--t4)'}}>✦</div>
                        }
                        {isSale && (
                            <span style={{position:'absolute',top:12,left:12,background:'var(--blush)',color:'#fff',padding:'4px 12px',borderRadius:20,fontSize:'0.78rem',fontWeight:800}}>
                                −{Math.round((1-price/Number(product.price))*100)}%
                            </span>
                        )}
                    </div>
                    {allImages.length > 1 && (
                        <div className="gallery-thumbs">
                            {allImages.map((img,i)=>(
                                <div key={i} className={'gallery-thumb'+(activeImg===i?' active':'')} onClick={()=>setActiveImg(i)}>
                                    <img src={API+img} alt={i+1}/>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="product-page-info">
                    {product.category && (
                        <span style={{fontSize:'0.65rem',fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--gold)',display:'block',marginBottom:8}}>
                            {product.category}
                        </span>
                    )}
                    <h1 style={{margin:'0 0 10px',fontSize:'1.7rem',fontWeight:700,color:'var(--t1)',lineHeight:1.25}}>{product.title}</h1>

                    {/* Rating */}
                    {reviewCount > 0 && (
                        <div onClick={()=>setTab('reviews')}
                            style={{display:'flex',alignItems:'center',gap:8,marginBottom:16,cursor:'pointer',width:'fit-content',padding:'6px 12px',borderRadius:'var(--r)',background:'var(--bg2)',border:'1px solid var(--border)'}}>
                            <Stars rating={Math.round(avgRating)} size="0.9rem"/>
                            <span style={{fontWeight:700,color:'var(--t1)',fontSize:'0.88rem'}}>{avgRating}</span>
                            <span style={{color:'var(--t4)',fontSize:'0.78rem'}}>{reviewCount} відгуків</span>
                        </div>
                    )}
                    {reviewCount === 0 && (
                        <div onClick={()=>setTab('reviews')}
                            style={{display:'inline-flex',alignItems:'center',gap:6,marginBottom:16,cursor:'pointer',fontSize:'0.78rem',color:'var(--t4)'}}>
                            <span>☆ Будьте першим хто залишить відгук</span>
                        </div>
                    )}

                    {/* Price */}
                    <div style={{marginBottom:18}}>
                        {isSale ? (
                            <div style={{display:'flex',alignItems:'baseline',gap:12,flexWrap:'wrap'}}>
                                <span style={{fontSize:'2.2rem',fontWeight:800,color:'var(--blush)',lineHeight:1}}>{price.toFixed(0)} грн</span>
                                <span style={{fontSize:'1.1rem',color:'var(--t4)',textDecoration:'line-through'}}>{Number(product.price).toFixed(0)} грн</span>
                            </div>
                        ) : (
                            <span style={{fontSize:'2.2rem',fontWeight:800,color:'var(--t1)',lineHeight:1}}>{price.toFixed(0)} грн</span>
                        )}
                    </div>

                    {/* Stock */}
                    <div style={{marginBottom:22}}>
                        {inStock
                            ? <span style={{display:'inline-flex',alignItems:'center',gap:7,color:'#4ade80',fontSize:'0.85rem',fontWeight:600}}>
                                <span style={{width:8,height:8,borderRadius:'50%',background:'#4ade80',display:'inline-block',boxShadow:'0 0 6px #4ade8080'}}/>
                                В наявності · {product.stock_quantity} шт
                              </span>
                            : <span style={{display:'inline-flex',alignItems:'center',gap:7,color:'#f87171',fontSize:'0.85rem',fontWeight:600}}>
                                <span style={{width:8,height:8,borderRadius:'50%',background:'#f87171',display:'inline-block'}}/>
                                Немає в наявності
                              </span>
                        }
                    </div>

                    {/* Buy */}
                    {inStock && (
                        <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:14,flexWrap:'wrap'}}>
                            <div style={{display:'flex',alignItems:'center',border:'1.5px solid var(--border)',borderRadius:'var(--r)',overflow:'hidden'}}>
                                <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{width:40,height:46,border:'none',background:'var(--bg2)',color:'var(--t2)',fontSize:'1.3rem',cursor:'pointer',fontWeight:700}}>−</button>
                                <span style={{width:46,textAlign:'center',fontWeight:700,fontSize:'1rem',color:'var(--t1)'}}>{qty}</span>
                                <button onClick={()=>setQty(q=>Math.min(product.stock_quantity,q+1))} style={{width:40,height:46,border:'none',background:'var(--bg2)',color:'var(--t2)',fontSize:'1.3rem',cursor:'pointer',fontWeight:700}}>+</button>
                            </div>
                            <button className="submit-btn product-buy-btn" onClick={()=>onAddToCart(product,qty)}
                                style={{flex:1,minWidth:160,padding:'13px 20px',fontSize:'0.95rem',fontWeight:800}}>
                                🛒 До кошика
                            </button>
                        </div>
                    )}
                    {!inStock && <button className="submit-btn product-buy-btn" disabled style={{marginBottom:14,opacity:0.4,cursor:'not-allowed'}}>Немає в наявності</button>}

                    {/* Wishlist / Compare */}
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                        <button onClick={()=>onToggleWishlist(product.id)}
                            style={{display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:'var(--r)',border:`1.5px solid ${inWishlist?'var(--blush)':'var(--border)'}`,background:inWishlist?'rgba(232,168,168,0.08)':'var(--card)',color:inWishlist?'var(--blush)':'var(--t3)',cursor:'pointer',fontWeight:600,fontSize:'0.85rem',transition:'all 0.2s'}}>
                            {inWishlist?'♥ У вибраному':'♡ До вибраного'}
                        </button>
                        {onToggleCompare && (
                            <button onClick={()=>onToggleCompare(product.id)}
                                style={{display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:'var(--r)',border:`1.5px solid ${inCompare?'var(--gold)':'var(--border)'}`,background:inCompare?'rgba(201,169,110,0.08)':'var(--card)',color:inCompare?'var(--gold)':'var(--t3)',cursor:'pointer',fontWeight:600,fontSize:'0.85rem',transition:'all 0.2s'}}>
                                {inCompare?'⚖ У порівнянні':'⚖ Порівняти'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="product-tabs" style={{marginTop:32}}>
                {[
                    {key:'desc',label:'Опис'},
                    {key:'attrs',label:`Характеристики${product.attrs?.length?' ('+product.attrs.length+')':''}`},
                    {key:'reviews',label:`Відгуки (${reviewCount})`},
                    {key:'qa',label:`Питання (${questions.length})`},
                ].map(t=>(
                    <button key={t.key} className={'product-tab'+(tab===t.key?' active':'')} onClick={()=>setTab(t.key)}>{t.label}</button>
                ))}
            </div>

            <div className="product-tab-content">
                {/* ── Desc ── */}
                {tab==='desc' && (
                    <div className="product-desc-block">
                        {product.description
                            ? <p style={{lineHeight:1.8,color:'var(--t2)',fontSize:'0.95rem'}}>{product.description}</p>
                            : <p style={{color:'var(--t4)'}}>Опис відсутній</p>}
                    </div>
                )}

                {/* ── Attrs ── */}
                {tab==='attrs' && (
                    <div className="product-attrs-block">
                        {product.attrs?.length > 0 ? (
                            <table className="attrs-table" style={{width:'100%',borderCollapse:'collapse'}}>
                                <tbody>
                                    {product.attrs.map((a,i)=>(
                                        <tr key={i} style={{background:i%2===0?'var(--bg2)':'transparent'}}>
                                            <td className="attr-name" style={{padding:'10px 16px',color:'var(--t4)',fontSize:'0.85rem',width:'40%',borderBottom:'1px solid var(--border)'}}>{a.attr_name}</td>
                                            <td className="attr-value" style={{padding:'10px 16px',color:'var(--t1)',fontWeight:600,fontSize:'0.88rem',borderBottom:'1px solid var(--border)'}}>{a.attr_value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : <p style={{color:'var(--t4)'}}>Характеристики не вказані</p>}
                    </div>
                )}

                {/* ── Reviews ── */}
                {tab==='reviews' && (
                    <div className="product-reviews-block">
                        {reviews.length > 0 && (
                            <div style={{display:'flex',gap:24,padding:'20px',background:'var(--bg2)',borderRadius:'var(--r)',marginBottom:20,flexWrap:'wrap',border:'1px solid var(--border)'}}>
                                <div style={{textAlign:'center',minWidth:80}}>
                                    <div style={{fontSize:'3.2rem',fontWeight:800,color:'var(--t1)',lineHeight:1}}>{avgRating}</div>
                                    <Stars rating={Math.round(avgRating)} size="1rem"/>
                                    <div style={{fontSize:'0.72rem',color:'var(--t4)',marginTop:5}}>{reviewCount} відгуків</div>
                                </div>
                                <div style={{flex:1,minWidth:160}}>
                                    {ratingCounts.map(({n,count})=>(
                                        <div key={n} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                                            <span style={{fontSize:'0.72rem',color:'var(--t4)',width:22,textAlign:'right'}}>{n}★</span>
                                            <div style={{flex:1,height:5,background:'var(--border)',borderRadius:3,overflow:'hidden'}}>
                                                <div style={{height:'100%',width:reviews.length?(count/reviews.length*100)+'%':'0%',background:'#f4a800',borderRadius:3,transition:'width 0.4s'}}/>
                                            </div>
                                            <span style={{fontSize:'0.72rem',color:'var(--t4)',width:16}}>{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
                            {reviews.map(r=>(
                                <div key={r.id} style={{padding:'16px',background:'var(--card)',border:'1px solid var(--border)',borderRadius:'var(--r)'}}>
                                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,flexWrap:'wrap'}}>
                                        <div style={{width:34,height:34,borderRadius:'50%',background:'var(--bg2)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'var(--gold)',fontSize:'0.9rem',flexShrink:0}}>
                                            {r.user_name?.[0]?.toUpperCase()||'?'}
                                        </div>
                                        <span style={{fontWeight:600,color:'var(--t1)',fontSize:'0.88rem'}}>{r.user_name}</span>
                                        <Stars rating={r.rating} size="0.8rem"/>
                                        <span style={{marginLeft:'auto',fontSize:'0.72rem',color:'var(--t4)'}}>{new Date(r.created_at).toLocaleDateString('uk-UA')}</span>
                                    </div>
                                    {r.body && <p style={{margin:0,fontSize:'0.88rem',color:'var(--t2)',lineHeight:1.6}}>{r.body}</p>}
                                </div>
                            ))}
                            {reviews.length===0 && (
                                <div style={{textAlign:'center',padding:'32px',color:'var(--t4)'}}>
                                    <div style={{fontSize:'2rem',marginBottom:8}}>💬</div>
                                    Відгуків ще немає. Будьте першим!
                                </div>
                            )}
                        </div>

                        <Card title="Написати відгук" icon="✍️">
                            {user ? (
                                <>
                                    <div style={{marginBottom:14}}>
                                        <div style={{fontSize:'0.75rem',fontWeight:700,color:'var(--t3)',marginBottom:7,textTransform:'uppercase',letterSpacing:'0.05em'}}>Ваша оцінка</div>
                                        <Stars rating={myRating} interactive onRate={setMyRating} size="1.8rem"/>
                                    </div>
                                    <div style={{marginBottom:12}}>
                                        <div style={{fontSize:'0.75rem',fontWeight:700,color:'var(--t3)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Коментар</div>
                                        <textarea placeholder="Поділіться враженнями про товар..." value={myReview} onChange={e=>setMyReview(e.target.value)} rows={3}
                                            style={{width:'100%',boxSizing:'border-box',padding:'10px 13px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'var(--r)',color:'var(--t2)',fontFamily:'inherit',fontSize:'0.88rem',resize:'vertical',outline:'none'}}/>
                                    </div>
                                    {reviewMsg && (
                                        <div style={{padding:'8px 12px',borderRadius:'var(--r)',marginBottom:12,fontSize:'0.82rem',fontWeight:600,background:reviewMsg.type==='success'?'rgba(74,222,128,0.1)':'rgba(248,113,113,0.1)',color:reviewMsg.type==='success'?'#4ade80':'#f87171',border:`1px solid ${reviewMsg.type==='success'?'rgba(74,222,128,0.3)':'rgba(248,113,113,0.3)'}`}}>
                                            {reviewMsg.text}
                                        </div>
                                    )}
                                    <button onClick={submitReview} disabled={submittingReview}
                                        style={{padding:'10px 28px',borderRadius:'var(--r)',border:'none',background:'var(--gold)',color:'#fff',fontWeight:700,cursor:submittingReview?'default':'pointer',fontSize:'0.88rem',opacity:submittingReview?0.7:1}}>
                                        {submittingReview?'Надсилаємо...':'Опублікувати відгук'}
                                    </button>
                                </>
                            ) : (
                                <p style={{margin:0,color:'var(--t4)',fontSize:'0.88rem'}}>
                                    <Link to="/profile" style={{color:'var(--gold)',fontWeight:600}}>Увійдіть</Link>, щоб залишити відгук
                                </p>
                            )}
                        </Card>
                    </div>
                )}

                {/* ── Q&A ── */}
                {tab==='qa' && (
                    <div>
                        {/* Unanswered (staff only) */}
                        {isStaff && unansweredQ.length > 0 && (
                            <div style={{marginBottom:20}}>
                                <div style={{fontSize:'0.72rem',fontWeight:800,color:'var(--blush)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
                                    <span style={{width:8,height:8,borderRadius:'50%',background:'var(--blush)',display:'inline-block'}}/>
                                    Без відповіді ({unansweredQ.length})
                                </div>
                                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                                    {unansweredQ.map(q=>(
                                        <div key={q.id} style={{padding:'14px 16px',background:'var(--card)',border:'1px solid var(--blush)',borderRadius:'var(--r)',borderLeft:'3px solid var(--blush)'}}>
                                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,marginBottom:8}}>
                                                <div>
                                                    <span style={{fontWeight:600,fontSize:'0.82rem',color:'var(--t3)'}}>{q.user_name}</span>
                                                    <span style={{fontSize:'0.72rem',color:'var(--t4)',marginLeft:8}}>{new Date(q.created_at).toLocaleDateString('uk-UA')}</span>
                                                </div>
                                                <button onClick={()=>deleteQuestion(q.id)} style={{background:'none',border:'none',color:'var(--t4)',cursor:'pointer',fontSize:'0.85rem',padding:'2px 6px'}}>×</button>
                                            </div>
                                            <p style={{margin:'0 0 10px',fontSize:'0.9rem',color:'var(--t1)',lineHeight:1.5}}>❓ {q.question}</p>
                                            {answeringId===q.id ? (
                                                <div>
                                                    <textarea value={answerText} onChange={e=>setAnswerText(e.target.value)} placeholder="Введіть відповідь..." rows={2}
                                                        style={{width:'100%',boxSizing:'border-box',padding:'8px 11px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'var(--r)',color:'var(--t2)',fontFamily:'inherit',fontSize:'0.85rem',resize:'vertical',outline:'none',marginBottom:8}}/>
                                                    <div style={{display:'flex',gap:8}}>
                                                        <button onClick={()=>submitAnswer(q.id)} style={{padding:'6px 16px',background:'var(--gold)',border:'none',borderRadius:'var(--r)',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:'0.82rem'}}>Зберегти</button>
                                                        <button onClick={()=>{setAnsweringId(null);setAnswerText('');}} style={{padding:'6px 14px',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--r)',color:'var(--t3)',cursor:'pointer',fontSize:'0.82rem'}}>Скасувати</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={()=>{setAnsweringId(q.id);setAnswerText('');}} style={{padding:'6px 14px',background:'var(--gold)',border:'none',borderRadius:'var(--r)',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:'0.8rem'}}>
                                                    💬 Відповісти
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Answered */}
                        {answeredQ.length > 0 && (
                            <div style={{marginBottom:20}}>
                                {isStaff && <div style={{fontSize:'0.72rem',fontWeight:800,color:'#4ade80',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>З відповіддю ({answeredQ.length})</div>}
                                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                                    {answeredQ.map(q=>(
                                        <div key={q.id} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'var(--r)',overflow:'hidden'}}>
                                            <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border)'}}>
                                                <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:6}}>
                                                    <span style={{fontSize:'0.78rem',color:'var(--t4)'}}>{q.user_name} · {new Date(q.created_at).toLocaleDateString('uk-UA')}</span>
                                                    {isStaff && <button onClick={()=>deleteQuestion(q.id)} style={{background:'none',border:'none',color:'var(--t4)',cursor:'pointer',fontSize:'0.82rem'}}>×</button>}
                                                </div>
                                                <p style={{margin:0,fontSize:'0.9rem',color:'var(--t2)',lineHeight:1.5}}>❓ {q.question}</p>
                                            </div>
                                            <div style={{padding:'12px 16px',background:'rgba(201,169,110,0.06)'}}>
                                                <div style={{fontSize:'0.75rem',fontWeight:700,color:'var(--gold)',marginBottom:5}}>
                                                    💡 {q.answered_by} відповів
                                                </div>
                                                <p style={{margin:0,fontSize:'0.88rem',color:'var(--t2)',lineHeight:1.6}}>{q.answer}</p>
                                                {isStaff && (
                                                    <button onClick={()=>{setAnsweringId(q.id);setAnswerText(q.answer||'');}} style={{marginTop:8,padding:'4px 12px',background:'none',border:'1px solid var(--border)',borderRadius:'var(--r)',color:'var(--t4)',cursor:'pointer',fontSize:'0.75rem'}}>Редагувати відповідь</button>
                                                )}
                                                {answeringId===q.id && (
                                                    <div style={{marginTop:10}}>
                                                        <textarea value={answerText} onChange={e=>setAnswerText(e.target.value)} rows={2}
                                                            style={{width:'100%',boxSizing:'border-box',padding:'8px 11px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'var(--r)',color:'var(--t2)',fontFamily:'inherit',fontSize:'0.85rem',resize:'vertical',outline:'none',marginBottom:8}}/>
                                                        <div style={{display:'flex',gap:8}}>
                                                            <button onClick={()=>submitAnswer(q.id)} style={{padding:'6px 16px',background:'var(--gold)',border:'none',borderRadius:'var(--r)',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:'0.82rem'}}>Зберегти</button>
                                                            <button onClick={()=>{setAnsweringId(null);setAnswerText('');}} style={{padding:'6px 14px',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--r)',color:'var(--t3)',cursor:'pointer',fontSize:'0.82rem'}}>Скасувати</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {questions.length===0 && !isStaff && (
                            <div style={{textAlign:'center',padding:'32px',color:'var(--t4)'}}>
                                <div style={{fontSize:'2rem',marginBottom:8}}>❓</div>
                                Питань ще немає. Задайте перше!
                            </div>
                        )}

                        {/* Ask question form */}
                        <Card title="Задати питання" icon="❓">
                            {user ? (
                                <div style={{display:'flex',gap:8}}>
                                    <input value={myQuestion} onChange={e=>setMyQuestion(e.target.value)}
                                        placeholder="Ваше питання про товар..."
                                        onKeyDown={e=>{if(e.key==='Enter')submitQuestion();}}
                                        style={{flex:1,padding:'10px 13px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'var(--r)',color:'var(--t2)',fontFamily:'inherit',fontSize:'0.88rem',outline:'none'}}/>
                                    <button onClick={submitQuestion} disabled={submittingQ||!myQuestion.trim()}
                                        style={{padding:'10px 20px',borderRadius:'var(--r)',border:'none',background:myQuestion.trim()?'var(--gold)':'var(--border)',color:'#fff',fontWeight:700,cursor:myQuestion.trim()?'pointer':'default',fontSize:'0.88rem',whiteSpace:'nowrap'}}>
                                        {submittingQ?'...':'Надіслати'}
                                    </button>
                                </div>
                            ) : (
                                <p style={{margin:0,color:'var(--t4)',fontSize:'0.88rem'}}>
                                    <Link to="/profile" style={{color:'var(--gold)',fontWeight:600}}>Увійдіть</Link>, щоб задати питання
                                </p>
                            )}
                        </Card>
                    </div>
                )}
            </div>

            {/* Recent */}
            {recentProducts.length > 0 && (
                <div className="recent-section">
                    <h3 className="recent-title">Нещодавно переглянуті</h3>
                    <div className="recent-grid">
                        {recentProducts.map(p=>(
                            <ProductCard key={p.id} item={p} onAddToCart={onAddToCart} wishlist={wishlist}
                                onToggleWishlist={onToggleWishlist} compareList={compareList} onToggleCompare={onToggleCompare}/>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductPage;
