import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import nodemailer from 'nodemailer';
import db from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const SECRET = process.env.JWT_SECRET || 'cosmetics_secret_2026';

// ─── Email transporter (nodemailer) ───────────────────────────────────────────
const mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
    },
});

// Надсилає email усьому персоналу (admin + manager) та пише їм у notifications
async function notifyStaff({ type, message, order_id = null, emailSubject, emailText }) {
    try {
        const [staffUsers] = await db.query(
            'SELECT id, email FROM users WHERE role IN ("admin","manager")'
        );
        for (const staff of staffUsers) {
            await db.query(
                'INSERT INTO notifications (user_id, type, message, order_id) VALUES (?,?,?,?)',
                [staff.id, type, message, order_id]
            );
        }
        // Email — тільки якщо SMTP налаштовано
        if (process.env.SMTP_USER && staffUsers.length) {
            const emails = staffUsers.map(s => s.email).filter(Boolean).join(',');
            if (emails) {
                await mailer.sendMail({
                    from: `"Магазин" <${process.env.SMTP_USER}>`,
                    to: emails,
                    subject: emailSubject,
                    text: emailText,
                }).catch(e => console.error('Email error:', e.message));
            }
        }
    } catch (e) {
        console.error('notifyStaff error:', e.message);
    }
}

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: (req, file, cb) => cb(null, /jpeg|jpg|png|webp/.test(file.mimetype)) });

// Ролі: user (покупець), manager (товари+замовлення+підтримка+питання), admin (все)
const STAFF_ROLES = ['manager', 'admin'];

const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).json({ error: 'Токен відсутній' });
    try { req.user = jwt.verify(token, SECRET); next(); }
    catch { res.status(401).json({ error: 'Невалідний токен' }); }
};

const adminMiddleware = (req, res, next) => {
    authMiddleware(req, res, () => {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Тільки для адміна' });
        next();
    });
};

const staffMiddleware = (req, res, next) => {
    authMiddleware(req, res, () => {
        if (!STAFF_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Доступ заборонено' });
        next();
    });
};

const canManageProducts = (req, res, next) => {
    authMiddleware(req, res, () => {
        if (!['admin','manager'].includes(req.user.role)) return res.status(403).json({ error: 'Недостатньо прав' });
        next();
    });
};

const canManageOrders = (req, res, next) => {
    authMiddleware(req, res, () => {
        if (!['admin','manager'].includes(req.user.role)) return res.status(403).json({ error: 'Недостатньо прав' });
        next();
    });
};

const optionalAuth = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) { try { req.user = jwt.verify(token, SECRET); } catch {} }
    next();
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
    const { full_name, email, password, phone } = req.body;
    if (!email || !password || !full_name) return res.status(400).json({ error: 'Заповніть всі поля' });
    try {
        const [ex] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (ex.length) return res.status(409).json({ error: 'Email вже зареєстровано' });
        const hash = await bcrypt.hash(password, 10);
        const [r] = await db.query('INSERT INTO users (full_name,email,password_hash,phone) VALUES (?,?,?,?)', [full_name, email, hash, phone||null]);
        const token = jwt.sign({ id: r.insertId, role: 'user' }, SECRET, { expiresIn: '24h' });
        res.status(201).json({ token, role: 'user', full_name, id: r.insertId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Введіть email та пароль' });
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (!rows.length) return res.status(404).json({ error: 'Користувача не знайдено' });
        const user = rows[0];
        if (!await bcrypt.compare(password, user.password_hash)) return res.status(401).json({ error: 'Невірний пароль' });
        const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '24h' });
        res.json({ token, role: user.role, full_name: user.full_name, id: user.id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        const [[u]] = await db.query('SELECT id,full_name,email,phone,saved_address,saved_phone,role,birthday FROM users WHERE id=?', [req.user.id]);
        res.json(u);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/auth/me', authMiddleware, async (req, res) => {
    const { full_name, phone, saved_address, saved_phone, birthday } = req.body;
    try {
        await db.query('UPDATE users SET full_name=?,phone=?,saved_address=?,saved_phone=?,birthday=? WHERE id=?',
            [full_name, phone||null, saved_address||null, saved_phone||null, birthday||null, req.user.id]);
        res.json({ message: 'Профіль оновлено' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// ─── Forgot / Reset Password ──────────────────────────────────────────────────

app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Введіть email' });
    try {
        const [[user]] = await db.query('SELECT id, full_name FROM users WHERE email=?', [email]);
        // Завжди відповідаємо 200, щоб не розкривати наявність акаунту
        if (!user) return res.json({ message: 'Якщо такий email існує — лист надіслано' });

        const token = jwt.sign({ id: user.id, purpose: 'reset' }, SECRET, { expiresIn: '1h' });
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

        if (process.env.SMTP_USER) {
            await mailer.sendMail({
                from: `"Магазин" <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'Відновлення паролю',
                text: `Привіт, ${user.full_name}!\n\nДля відновлення паролю перейдіть за посиланням (дійсне 1 годину):\n${resetLink}\n\nЯкщо ви не запитували скидання — проігноруйте цей лист.`,
                html: `<p>Привіт, <b>${user.full_name}</b>!</p><p>Для відновлення паролю натисніть кнопку нижче (посилання дійсне <b>1 годину</b>):</p><p><a href="${resetLink}" style="background:#333;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block">Відновити пароль</a></p><p>Якщо ви не запитували скидання — просто проігноруйте цей лист.</p>`,
            });
        } else {
            // SMTP не налаштовано — повертаємо токен у відповіді (тільки для розробки!)
            return res.json({ message: 'SMTP не налаштовано (dev mode)', dev_token: token });
        }

        res.json({ message: 'Якщо такий email існує — лист надіслано' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/reset-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Токен та пароль обов\'язкові' });
    if (password.length < 6) return res.status(400).json({ error: 'Пароль має бути не менше 6 символів' });
    try {
        let payload;
        try { payload = jwt.verify(token, SECRET); }
        catch { return res.status(400).json({ error: 'Посилання недійсне або прострочене' }); }
        if (payload.purpose !== 'reset') return res.status(400).json({ error: 'Невалідний токен' });
        const hash = await bcrypt.hash(password, 10);
        await db.query('UPDATE users SET password_hash=? WHERE id=?', [hash, payload.id]);
        res.json({ message: 'Пароль успішно змінено!' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Products ─────────────────────────────────────────────────────────────────

app.get('/api/products', optionalAuth, async (req, res) => {
    const { category, search, sort, min_price, max_price, sale, attrs } = req.query;
    let q = 'SELECT DISTINCT p.*, ROUND((SELECT AVG(r.rating) FROM reviews r WHERE r.product_id=p.id),1) as avg_rating, (SELECT COUNT(*) FROM reviews r WHERE r.product_id=p.id) as review_count FROM products p';
    const params = [];
    if (attrs) {
        try {
            const af = JSON.parse(decodeURIComponent(attrs));
            if (Array.isArray(af)) af.forEach((f, i) => { q += ` JOIN product_attrs pa${i} ON pa${i}.product_id=p.id AND pa${i}.attr_name=? AND pa${i}.attr_value=?`; params.push(f.name, f.value); });
        } catch {}
    }
    q += ' WHERE 1=1';
    if (category && category !== 'all') { q += ' AND p.category=?'; params.push(category); }
    if (search) { q += ' AND (p.title LIKE ? OR p.description LIKE ?)'; params.push('%'+search+'%', '%'+search+'%'); }
    if (min_price) { q += ' AND p.price >= ?'; params.push(Number(min_price)); }
    if (max_price) { q += ' AND p.price <= ?'; params.push(Number(max_price)); }
    if (sale === '1') { q += ' AND p.discount_price IS NOT NULL AND p.discount_expiry > NOW()'; }
    if (sort === 'price_asc') q += ' ORDER BY COALESCE(p.discount_price,p.price) ASC';
    else if (sort === 'price_desc') q += ' ORDER BY COALESCE(p.discount_price,p.price) DESC';
    else if (sort === 'name') q += ' ORDER BY p.title ASC';
    else if (sort === 'rating') q += ' ORDER BY (SELECT COALESCE(AVG(r.rating),0) FROM reviews r WHERE r.product_id=p.id) DESC';
    else q += ' ORDER BY p.id DESC';
    try { const [rows] = await db.query(q, params); res.json(rows); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/products/:id', optionalAuth, async (req, res) => {
    try {
        const [[product]] = await db.query('SELECT * FROM products WHERE id=?', [req.params.id]);
        if (!product) return res.status(404).json({ error: 'Не знайдено' });
        const [images] = await db.query('SELECT * FROM product_images WHERE product_id=? ORDER BY sort_order', [product.id]);
        const [attrs] = await db.query('SELECT * FROM product_attrs WHERE product_id=? ORDER BY id', [product.id]);
        const [[rr]] = await db.query('SELECT ROUND(AVG(rating),1) as avg_rating, COUNT(*) as review_count FROM reviews WHERE product_id=?', [product.id]);
        res.json({ ...product, images, attrs, avg_rating: rr.avg_rating||0, review_count: Number(rr.review_count||0) });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/categories', async (req, res) => {
    try { const [r] = await db.query('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category'); res.json(r.map(x => x.category)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/attr-options', async (req, res) => {
    try {
        const [r] = await db.query('SELECT attr_name,attr_value FROM attr_options ORDER BY attr_name,attr_value');
        const g = {}; r.forEach(x => { if (!g[x.attr_name]) g[x.attr_name]=[]; g[x.attr_name].push(x.attr_value); });
        res.json(g);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/filter-attrs', async (req, res) => {
    try {
        const [r] = await db.query('SELECT DISTINCT attr_name,attr_value FROM product_attrs ORDER BY attr_name,attr_value');
        const g = {}; r.forEach(x => { if (!g[x.attr_name]) g[x.attr_name]=[]; g[x.attr_name].push(x.attr_value); });
        res.json(g);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', canManageProducts, upload.array('images', 8), async (req, res) => {
    const { title, description, price, discount_price, discount_expiry, stock_quantity, category, attrs } = req.body;
    if (!title || !price) return res.status(400).json({ error: 'Назва та ціна обов\'язкові' });
    const mainImage = req.files?.[0] ? '/uploads/'+req.files[0].filename : null;
    try {
        const [r] = await db.query('INSERT INTO products (title,description,price,discount_price,discount_expiry,stock_quantity,image_url,category) VALUES (?,?,?,?,?,?,?,?)',
            [title, description||null, price, discount_price||null, discount_expiry||null, stock_quantity||0, mainImage, category||null]);
        const pid = r.insertId;
        if (req.files?.length) for (let i=0;i<req.files.length;i++) await db.query('INSERT INTO product_images (product_id,image_url,sort_order) VALUES (?,?,?)',[pid,'/uploads/'+req.files[i].filename,i]);
        if (attrs) { const p = typeof attrs==='string'?JSON.parse(attrs):attrs; if(Array.isArray(p)) for(const a of p) if(a.name&&a.value) { await db.query('INSERT INTO product_attrs (product_id,attr_name,attr_value) VALUES (?,?,?)',[pid,a.name,a.value]); await db.query('INSERT IGNORE INTO attr_options (attr_name,attr_value) VALUES (?,?)',[a.name,a.value]); } }
        res.status(201).json({ id: pid, message: 'Товар додано!' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/products/:id', canManageProducts, upload.array('images', 8), async (req, res) => {
    const { title, description, price, discount_price, discount_expiry, stock_quantity, category, attrs } = req.body;
    try {
        const [[ex]] = await db.query('SELECT * FROM products WHERE id=?', [req.params.id]);
        if (!ex) return res.status(404).json({ error: 'Не знайдено' });
        const mainImage = req.files?.[0] ? '/uploads/'+req.files[0].filename : ex.image_url;
        await db.query('UPDATE products SET title=?,description=?,price=?,discount_price=?,discount_expiry=?,stock_quantity=?,image_url=?,category=? WHERE id=?',
            [title, description||null, price, discount_price||null, discount_expiry||null, stock_quantity, mainImage, category||null, req.params.id]);
        if (req.files?.length) for (const f of req.files) { const [[c]]=await db.query('SELECT COUNT(*) as n FROM product_images WHERE product_id=?',[req.params.id]); await db.query('INSERT INTO product_images (product_id,image_url,sort_order) VALUES (?,?,?)',[req.params.id,'/uploads/'+f.filename,c.n]); }
        if (attrs !== undefined) { await db.query('DELETE FROM product_attrs WHERE product_id=?',[req.params.id]); const p=typeof attrs==='string'?JSON.parse(attrs):attrs; if(Array.isArray(p)) for(const a of p) if(a.name&&a.value) { await db.query('INSERT INTO product_attrs (product_id,attr_name,attr_value) VALUES (?,?,?)',[req.params.id,a.name,a.value]); await db.query('INSERT IGNORE INTO attr_options (attr_name,attr_value) VALUES (?,?)',[a.name,a.value]); } }
        res.json({ message: 'Оновлено!' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', canManageProducts, async (req, res) => {
    try {
        const [imgs]=await db.query('SELECT image_url FROM product_images WHERE product_id=?',[req.params.id]);
        for(const img of imgs){const f=path.join(__dirname,img.image_url);if(fs.existsSync(f))fs.unlinkSync(f);}
        const [[p]]=await db.query('SELECT image_url FROM products WHERE id=?',[req.params.id]);
        if(p?.image_url){const f=path.join(__dirname,p.image_url);if(fs.existsSync(f))fs.unlinkSync(f);}
        await db.query('DELETE FROM products WHERE id=?',[req.params.id]);
        res.json({ message: 'Видалено' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id/images/:imgId', canManageProducts, async (req, res) => {
    try {
        const [[img]]=await db.query('SELECT * FROM product_images WHERE id=? AND product_id=?',[req.params.imgId,req.params.id]);
        if(!img) return res.status(404).json({error:'Не знайдено'});
        const f=path.join(__dirname,img.image_url);if(fs.existsSync(f))fs.unlinkSync(f);
        await db.query('DELETE FROM product_images WHERE id=?',[req.params.imgId]);
        res.json({ message: 'Видалено' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Reviews ──────────────────────────────────────────────────────────────────

app.get('/api/products/:id/reviews', async (req, res) => {
    try { const [r]=await db.query('SELECT * FROM reviews WHERE product_id=? ORDER BY created_at DESC',[req.params.id]); res.json(r); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products/:id/reviews', authMiddleware, async (req, res) => {
    const { rating, body } = req.body;
    if (!rating || rating<1 || rating>5) return res.status(400).json({ error: 'Рейтинг від 1 до 5' });
    try {
        const [[u]]=await db.query('SELECT full_name FROM users WHERE id=?',[req.user.id]);
        const [ex]=await db.query('SELECT id FROM reviews WHERE product_id=? AND user_id=?',[req.params.id,req.user.id]);
        if(ex.length) return res.status(409).json({ error: 'Ви вже залишили відгук на цей товар' });
        await db.query('INSERT INTO reviews (product_id,user_id,user_name,rating,body) VALUES (?,?,?,?,?)',[req.params.id,req.user.id,u.full_name,rating,body||null]);
        res.status(201).json({ message: 'Відгук додано!' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/reviews/:id', staffMiddleware, async (req, res) => {
    try { await db.query('DELETE FROM reviews WHERE id=?',[req.params.id]); res.json({ message: 'Видалено' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Support ──────────────────────────────────────────────────────────────────

app.get('/api/support/tickets', authMiddleware, async (req, res) => {
    try {
        let q, params;
        if (STAFF_ROLES.includes(req.user.role)) {
            q = 'SELECT t.*, (SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id=t.id) as msg_count FROM support_tickets t ORDER BY t.created_at DESC';
            params = [];
        } else {
            q = 'SELECT t.*, (SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id=t.id) as msg_count FROM support_tickets t WHERE t.user_id=? ORDER BY t.created_at DESC';
            params = [req.user.id];
        }
        const [rows] = await db.query(q, params);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/support/tickets', optionalAuth, async (req, res) => {
    const { subject, body, user_name, user_email } = req.body;
    if (!subject || !body) return res.status(400).json({ error: 'Тема та повідомлення обов\'язкові' });
    try {
        const name = req.user ? (await db.query('SELECT full_name FROM users WHERE id=?',[req.user.id]))[0][0]?.full_name : user_name;
        const [r] = await db.query('INSERT INTO support_tickets (user_id,user_name,user_email,subject) VALUES (?,?,?,?)',
            [req.user?.id||null, name||user_name||'Гість', user_email||null, subject]);
        await db.query('INSERT INTO support_messages (ticket_id,sender_id,sender_name,sender_role,body) VALUES (?,?,?,?,?)',
            [r.insertId, req.user?.id||null, name||user_name||'Гість', req.user?.role||'user', body]);
        // Сповіщення персоналу про новий тікет
        await notifyStaff({
            type: 'new_ticket',
            message: `Нове звернення в підтримку #${r.insertId}: "${subject}" від ${name || user_name || 'Гість'}`,
            emailSubject: `[Підтримка] Нове звернення #${r.insertId}: ${subject}`,
            emailText: `Від: ${name || user_name || 'Гість'}\nТема: ${subject}\n\n${body}\n\nПерейти: /admin (розділ Підтримка)`,
        });
        res.status(201).json({ ticket_id: r.insertId, message: 'Звернення створено!' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/support/tickets/:id/messages', authMiddleware, async (req, res) => {
    try {
        const [[ticket]] = await db.query('SELECT * FROM support_tickets WHERE id=?', [req.params.id]);
        if (!ticket) return res.status(404).json({ error: 'Не знайдено' });
        if (!STAFF_ROLES.includes(req.user.role) && ticket.user_id !== req.user.id) return res.status(403).json({ error: 'Доступ заборонено' });
        const [msgs] = await db.query('SELECT * FROM support_messages WHERE ticket_id=? ORDER BY created_at ASC', [req.params.id]);
        res.json({ ticket, messages: msgs });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/support/tickets/:id/messages', authMiddleware, async (req, res) => {
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: 'Повідомлення порожнє' });
    try {
        const [[ticket]] = await db.query('SELECT * FROM support_tickets WHERE id=?', [req.params.id]);
        if (!ticket) return res.status(404).json({ error: 'Не знайдено' });
        if (!STAFF_ROLES.includes(req.user.role) && ticket.user_id !== req.user.id) return res.status(403).json({ error: 'Доступ заборонено' });
        const [[u]] = await db.query('SELECT full_name FROM users WHERE id=?', [req.user.id]);
        await db.query('INSERT INTO support_messages (ticket_id,sender_id,sender_name,sender_role,body) VALUES (?,?,?,?,?)',
            [req.params.id, req.user.id, u.full_name, req.user.role, body]);
        if (STAFF_ROLES.includes(req.user.role)) {
            await db.query('UPDATE support_tickets SET status="answered" WHERE id=?', [req.params.id]);
            // Сповіщення покупцю що отримав відповідь на тікет
            if (ticket.user_id) {
                await db.query(
                    'INSERT INTO notifications (user_id, type, message) VALUES (?,?,?)',
                    [ticket.user_id, 'ticket_reply', `Отримано відповідь на ваше звернення: "${ticket.subject}"`]
                );
            }
        } else {
            // Користувач написав у тікет — сповіщаємо персонал
            await notifyStaff({
                type: 'ticket_reply',
                message: `Нове повідомлення у зверненні #${req.params.id} "${ticket.subject}" від ${u.full_name}`,
                emailSubject: `[Підтримка] Нова відповідь у зверненні #${req.params.id}`,
                emailText: `Від: ${u.full_name}\nЗвернення #${req.params.id}: ${ticket.subject}\n\n${body}`,
            });
        }
        res.status(201).json({ message: 'Надіслано' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/support/tickets/:id/status', staffMiddleware, async (req, res) => {
    const { status } = req.body;
    if (!['open','answered','closed'].includes(status)) return res.status(400).json({ error: 'Невалідний статус' });
    try { await db.query('UPDATE support_tickets SET status=? WHERE id=?', [status, req.params.id]); res.json({ message: 'Оновлено' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Product Q&A ──────────────────────────────────────────────────────────────

app.get('/api/products/:id/questions', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM product_questions WHERE product_id=? ORDER BY created_at DESC',
            [req.params.id]
        );
        res.json(rows);
    } catch(err){ res.status(500).json({error:err.message}); }
});

app.post('/api/products/:id/questions', authMiddleware, async (req, res) => {
    const { question } = req.body;
    if (!question?.trim()) return res.status(400).json({ error: 'Питання не може бути порожнім' });
    try {
        const [[u]] = await db.query('SELECT full_name FROM users WHERE id=?', [req.user.id]);
        await db.query(
            'INSERT INTO product_questions (product_id,user_id,user_name,question) VALUES (?,?,?,?)',
            [req.params.id, req.user.id, u.full_name, question.trim()]
        );
        // Сповіщення персоналу про нове питання
        const [[prod]] = await db.query('SELECT title FROM products WHERE id=?', [req.params.id]);
        await notifyStaff({
            type: 'new_question',
            message: `Нове питання до товару "${prod?.title || '#'+req.params.id}" від ${u.full_name}: ${question.trim().substring(0,100)}`,
            emailSubject: `[Питання] До товару "${prod?.title || '#'+req.params.id}"`,
            emailText: `Від: ${u.full_name}\nТовар: ${prod?.title || '#'+req.params.id}\n\nПитання: ${question.trim()}\n\nПерейти: /admin (розділ Товари → Q&A)`,
        });
        res.status(201).json({ message: 'Питання відправлено!' });
    } catch(err){ res.status(500).json({error:err.message}); }
});

app.patch('/api/products/:pid/questions/:qid/answer', canManageProducts, async (req, res) => {
    const { answer } = req.body;
    if (!answer?.trim()) return res.status(400).json({ error: 'Відповідь не може бути порожньою' });
    try {
        const [[u]] = await db.query('SELECT full_name FROM users WHERE id=?', [req.user.id]);
        await db.query(
            'UPDATE product_questions SET answer=?, answered_by=?, answered_at=NOW() WHERE id=? AND product_id=?',
            [answer.trim(), u.full_name, req.params.qid, req.params.pid]
        );
        // Сповіщення покупцю що відповіли на його питання
        const [[qa]] = await db.query('SELECT user_id, question FROM product_questions WHERE id=?', [req.params.qid]);
        if (qa?.user_id) {
            const [[qprod]] = await db.query('SELECT title FROM products WHERE id=?', [req.params.pid]);
            await db.query(
                'INSERT INTO notifications (user_id, type, message) VALUES (?,?,?)',
                [qa.user_id, 'question_answered', `На ваше питання до товару "${qprod?.title || '#'+req.params.pid}" дали відповідь`]
            );
        }
        res.json({ message: 'Відповідь збережена!' });
    } catch(err){ res.status(500).json({error:err.message}); }
});

app.delete('/api/products/:pid/questions/:qid', canManageProducts, async (req, res) => {
    try {
        await db.query('DELETE FROM product_questions WHERE id=? AND product_id=?', [req.params.qid, req.params.pid]);
        res.json({ message: 'Видалено' });
    } catch(err){ res.status(500).json({error:err.message}); }
});

// ─── Compare ──────────────────────────────────────────────────────────────────

app.get('/api/compare/:sessionId', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT p.*, pi.image_url as first_image FROM compare_list c
             JOIN products p ON c.product_id=p.id
             LEFT JOIN product_images pi ON pi.product_id=p.id AND pi.sort_order=0
             WHERE c.session_id=? ORDER BY c.added_at`, [req.params.sessionId]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/compare/:sessionId/:productId', async (req, res) => {
    try {
        const [ex] = await db.query('SELECT id FROM compare_list WHERE session_id=? AND product_id=?', [req.params.sessionId, req.params.productId]);
        if (ex.length) { await db.query('DELETE FROM compare_list WHERE session_id=? AND product_id=?', [req.params.sessionId, req.params.productId]); return res.json({ added: false }); }
        const [cnt] = await db.query('SELECT COUNT(*) as n FROM compare_list WHERE session_id=?', [req.params.sessionId]);
        if (cnt[0].n >= 4) return res.status(400).json({ error: 'Максимум 4 товари для порівняння' });
        await db.query('INSERT INTO compare_list (session_id,product_id) VALUES (?,?)', [req.params.sessionId, req.params.productId]);
        res.json({ added: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/compare/:sessionId', async (req, res) => {
    try { await db.query('DELETE FROM compare_list WHERE session_id=?', [req.params.sessionId]); res.json({ message: 'Очищено' }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Promo ────────────────────────────────────────────────────────────────────

app.post('/api/promo/check', optionalAuth, async (req, res) => {
    const { code, total } = req.body;
    if (!code) return res.status(400).json({ error: 'Введіть промокод' });
    try {
        const [[p]] = await db.query('SELECT * FROM promo_codes WHERE code=? AND is_active=1', [code.toUpperCase()]);
        if (!p) return res.status(404).json({ error: 'Промокод не знайдено' });
        if (p.expires_at && new Date(p.expires_at)<new Date()) return res.status(400).json({ error: 'Промокод прострочено' });
        if (p.max_uses && p.uses_count>=p.max_uses) return res.status(400).json({ error: 'Ліміт використань вичерпано' });

        // Перевірки по типу
        const userId = req.user?.id || null;

        if (p.promo_type === 'first_order') {
            if (!userId) return res.status(400).json({ error: 'Увійдіть в акаунт для використання цього промокоду' });
            const [[orderCheck]] = await db.query('SELECT id FROM orders WHERE user_id=? LIMIT 1', [userId]);
            if (orderCheck) return res.status(400).json({ error: 'Цей промокод лише для першого замовлення' });
        }

        if (p.promo_type === 'single_use') {
            if (!userId) return res.status(400).json({ error: 'Увійдіть в акаунт для використання цього промокоду' });
            const [[usageCheck]] = await db.query('SELECT id FROM promo_usage WHERE promo_id=? AND user_id=?', [p.id, userId]);
            if (usageCheck) return res.status(400).json({ error: 'Ви вже використовували цей промокод' });
        }

        if (p.promo_type === 'min_amount') {
            if (p.min_order_amount && Number(total) < Number(p.min_order_amount)) {
                return res.status(400).json({ error: `Мінімальна сума замовлення — ${p.min_order_amount} грн` });
            }
        }

        if (p.promo_type === 'birthday') {
            if (!userId) return res.status(400).json({ error: 'Увійдіть в акаунт для використання цього промокоду' });
            const [[userRow]] = await db.query('SELECT birthday FROM users WHERE id=?', [userId]);
            if (!userRow?.birthday) return res.status(400).json({ error: 'У вашому профілі не вказано дату народження' });
            const today = new Date();
            const bday = new Date(userRow.birthday);
            const sameMonth = bday.getMonth() === today.getMonth();
            if (!sameMonth) return res.status(400).json({ error: 'Цей промокод дійсний лише у ваш місяць народження' });
        }

        if (p.promo_type === 'personal') {
            if (!userId) return res.status(400).json({ error: 'Увійдіть в акаунт для використання цього промокоду' });
            if (p.user_id && p.user_id !== userId) return res.status(400).json({ error: 'Цей промокод призначений іншому користувачу' });
        }

        const discount = Math.round(total * p.discount_percent / 100);
        res.json({ valid: true, discount_percent: p.discount_percent, discount, new_total: total-discount, promo_type: p.promo_type });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Orders ───────────────────────────────────────────────────────────────────

app.post('/api/orders', optionalAuth, async (req, res) => {
    const { full_name, phone, address, delivery_method, payment_method, items, promo_code } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'Кошик порожній' });
    if (!full_name||!phone) return res.status(400).json({ error: 'ПІБ та телефон обов\'язкові' });
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        let total=0; const enriched=[];
        for(const item of items){
            const [[p]]=await conn.query('SELECT * FROM products WHERE id=? FOR UPDATE',[item.product_id]);
            if(!p) throw new Error('Товар #'+item.product_id+' не знайдено');
            if(p.stock_quantity<item.quantity) throw new Error('"'+p.title+'" — недостатньо (є: '+p.stock_quantity+')');
            const isSale=p.discount_price&&new Date(p.discount_expiry)>new Date();
            const unitPrice=isSale?Number(p.discount_price):Number(p.price);
            total+=unitPrice*item.quantity; enriched.push({...item,unitPrice});
        }
        let discount=0;
        if(promo_code){
            const [[pr]]=await conn.query('SELECT * FROM promo_codes WHERE code=? AND is_active=1',[promo_code.toUpperCase()]);
            if(pr&&(!pr.expires_at||new Date(pr.expires_at)>new Date())&&(!pr.max_uses||pr.uses_count<pr.max_uses)){
                // Перевірки по типу при оформленні
                let promoValid = true;
                const uid = req.user?.id || null;

                if (pr.promo_type === 'first_order') {
                    if (!uid) promoValid = false;
                    else {
                        const [[existing]] = await conn.query('SELECT id FROM orders WHERE user_id=? LIMIT 1', [uid]);
                        if (existing) promoValid = false;
                    }
                }
                if (pr.promo_type === 'single_use') {
                    if (!uid) promoValid = false;
                    else {
                        const [[usedAlready]] = await conn.query('SELECT id FROM promo_usage WHERE promo_id=? AND user_id=?', [pr.id, uid]);
                        if (usedAlready) promoValid = false;
                    }
                }
                if (pr.promo_type === 'min_amount' && pr.min_order_amount) {
                    if (total < Number(pr.min_order_amount)) promoValid = false;
                }
                if (pr.promo_type === 'birthday') {
                    if (!uid) promoValid = false;
                    else {
                        const [[userRow]] = await conn.query('SELECT birthday FROM users WHERE id=?', [uid]);
                        if (!userRow?.birthday || new Date(userRow.birthday).getMonth() !== new Date().getMonth()) promoValid = false;
                    }
                }
                if (pr.promo_type === 'personal') {
                    if (!uid || (pr.user_id && pr.user_id !== uid)) promoValid = false;
                }

                if (promoValid) {
                    discount=Math.round(total*pr.discount_percent/100);
                    await conn.query('UPDATE promo_codes SET uses_count=uses_count+1 WHERE id=?',[pr.id]);
                    // Записуємо використання для single_use та first_order
                    if (uid && (pr.promo_type === 'single_use' || pr.promo_type === 'first_order')) {
                        await conn.query('INSERT IGNORE INTO promo_usage (promo_id, user_id) VALUES (?,?)', [pr.id, uid]);
                    }
                }
            }
        }
        const [or]=await conn.query('INSERT INTO orders (user_id,full_name,phone,address,total_price,delivery_method,payment_method,status) VALUES (?,?,?,?,?,?,?,"pending")',
            [req.user?.id||null,full_name,phone,address||null,(total-discount).toFixed(2),delivery_method||'Nova Poshta',payment_method||'cash_on_delivery']);
        for(const item of enriched){
            await conn.query('INSERT INTO order_items (order_id,product_id,quantity,price_at_purchase) VALUES (?,?,?,?)',[or.insertId,item.product_id,item.quantity,item.unitPrice]);
            await conn.query('UPDATE products SET stock_quantity=stock_quantity-? WHERE id=?',[item.quantity,item.product_id]);
        }
        await conn.commit();
        res.status(201).json({ order_id: or.insertId, total: total-discount, discount, message: 'Замовлення створено!' });
    } catch(err){ await conn.rollback(); res.status(400).json({error:err.message}); }
    finally { conn.release(); }
});

app.get('/api/orders/my', authMiddleware, async (req, res) => {
    try {
        const [orders]=await db.query(
            `SELECT o.*, GROUP_CONCAT(CONCAT(p.title,' x',oi.quantity,' (',oi.price_at_purchase,' грн)') SEPARATOR '||') AS items_detail
             FROM orders o LEFT JOIN order_items oi ON o.id=oi.order_id LEFT JOIN products p ON oi.product_id=p.id
             WHERE o.user_id=? GROUP BY o.id ORDER BY o.created_at DESC`,[req.user.id]);
        res.json(orders);
    } catch(err){ res.status(500).json({error:err.message}); }
});

// Детальне замовлення з товарами (для користувача та адміна)
app.get('/api/orders/:id', authMiddleware, async (req, res) => {
    try {
        const [[order]] = await db.query('SELECT * FROM orders WHERE id=?', [req.params.id]);
        if (!order) return res.status(404).json({ error: 'Замовлення не знайдено' });
        const isStaff = ['admin','manager'].includes(req.user.role);
        if (!isStaff && order.user_id !== req.user.id) return res.status(403).json({ error: 'Доступ заборонено' });
        const [items] = await db.query(
            `SELECT oi.*, p.title, p.image_url, p.category, p.description FROM order_items oi
             LEFT JOIN products p ON oi.product_id=p.id WHERE oi.order_id=?`, [req.params.id]);
        res.json({ ...order, items });
    } catch(err){ res.status(500).json({error:err.message}); }
});

// ─── Wishlist ─────────────────────────────────────────────────────────────────

app.get('/api/wishlist', authMiddleware, async (req, res) => {
    try { const [r]=await db.query('SELECT p.* FROM wishlist w JOIN products p ON w.product_id=p.id WHERE w.user_id=? ORDER BY w.created_at DESC',[req.user.id]); res.json(r); }
    catch(err){ res.status(500).json({error:err.message}); }
});

app.post('/api/wishlist/:productId', authMiddleware, async (req, res) => {
    try {
        const [ex]=await db.query('SELECT id FROM wishlist WHERE user_id=? AND product_id=?',[req.user.id,req.params.productId]);
        if(ex.length){ await db.query('DELETE FROM wishlist WHERE user_id=? AND product_id=?',[req.user.id,req.params.productId]); return res.json({added:false}); }
        await db.query('INSERT INTO wishlist (user_id,product_id) VALUES (?,?)',[req.user.id,req.params.productId]);
        res.json({added:true});
    } catch(err){ res.status(500).json({error:err.message}); }
});

app.get('/api/wishlist/ids', authMiddleware, async (req, res) => {
    try { const [r]=await db.query('SELECT product_id FROM wishlist WHERE user_id=?',[req.user.id]); res.json(r.map(x=>x.product_id)); }
    catch(err){ res.status(500).json({error:err.message}); }
});

// ─── Admin ────────────────────────────────────────────────────────────────────

app.get('/api/admin/orders', canManageOrders, async (req, res) => {
    const { status } = req.query;
    let q=`SELECT o.*, GROUP_CONCAT(CONCAT(p.title,' x',oi.quantity) SEPARATOR ', ') AS items_summary FROM orders o LEFT JOIN order_items oi ON o.id=oi.order_id LEFT JOIN products p ON oi.product_id=p.id`;
    const params=[];
    if(status&&status!=='all'){ q+=' WHERE o.status=?'; params.push(status); }
    q+=' GROUP BY o.id ORDER BY o.created_at DESC';
    try { const [r]=await db.query(q,params); res.json(r); }
    catch(err){ res.status(500).json({error:err.message}); }
});

app.patch('/api/admin/orders/:id', canManageOrders, async (req, res) => {
    const { status } = req.body;
    if(!['pending','confirmed','shipped','cancelled'].includes(status)) return res.status(400).json({error:'Невалідний статус'});
    try { await db.query('UPDATE orders SET status=? WHERE id=?',[status,req.params.id]); res.json({message:'Оновлено'}); }
    catch(err){ res.status(500).json({error:err.message}); }
});

app.get('/api/admin/stats', staffMiddleware, async (req, res) => {
    try {
        const [[{total_orders}]]=await db.query('SELECT COUNT(*) as total_orders FROM orders');
        const [[{total_revenue}]]=await db.query('SELECT COALESCE(SUM(total_price),0) as total_revenue FROM orders WHERE status!="cancelled"');
        const [[{total_products}]]=await db.query('SELECT COUNT(*) as total_products FROM products');
        const [[{total_users}]]=await db.query('SELECT COUNT(*) as total_users FROM users WHERE role="user"');
        const [[{pending_orders}]]=await db.query('SELECT COUNT(*) as pending_orders FROM orders WHERE status="pending"');
        const [[{open_tickets}]]=await db.query('SELECT COUNT(*) as open_tickets FROM support_tickets WHERE status="open"');
        const [[{unread_notifications}]]=await db.query(
            'SELECT COUNT(*) as unread_notifications FROM notifications n JOIN users u ON u.id=n.user_id WHERE u.role IN ("admin","manager") AND n.is_read=0'
        );
        const [[{unanswered_questions}]]=await db.query('SELECT COUNT(*) as unanswered_questions FROM product_questions WHERE answer IS NULL');
        res.json({total_orders,total_revenue,total_products,total_users,pending_orders,open_tickets,unread_notifications,unanswered_questions});
    } catch(err){ res.status(500).json({error:err.message}); }
});

app.get('/api/admin/users', adminMiddleware, async (req, res) => {
    try {
        const [rows]=await db.query('SELECT id,full_name,email,phone,role,created_at FROM users ORDER BY created_at DESC');
        res.json(rows);
    } catch(err){ res.status(500).json({error:err.message}); }
});

app.patch('/api/admin/users/:id/role', adminMiddleware, async (req, res) => {
    const { role } = req.body;
    if(!['user','manager','admin'].includes(role)) return res.status(400).json({error:'Невалідна роль'});
    if(Number(req.params.id)===req.user.id) return res.status(400).json({error:'Не можна змінити власну роль'});
    try { await db.query('UPDATE users SET role=? WHERE id=?',[role,req.params.id]); res.json({message:'Роль оновлено'}); }
    catch(err){ res.status(500).json({error:err.message}); }
});

app.get('/api/admin/promo', staffMiddleware, async (req, res) => {
    try { const [r]=await db.query('SELECT * FROM promo_codes ORDER BY id DESC'); res.json(r); }
    catch(err){ res.status(500).json({error:err.message}); }
});

app.post('/api/admin/promo', adminMiddleware, async (req, res) => {
    const { code, discount_percent, max_uses, expires_at, promo_type, min_order_amount, description, user_id } = req.body;
    if(!code||!discount_percent) return res.status(400).json({error:'Код та відсоток обов\'язкові'});
    const type = ['standard','first_order','min_amount','birthday','single_use','personal'].includes(promo_type) ? promo_type : 'standard';
    try {
        const [ins] = await db.query(
            'INSERT INTO promo_codes (code,discount_percent,max_uses,expires_at,promo_type,min_order_amount,description,user_id) VALUES (?,?,?,?,?,?,?,?)',
            [code.toUpperCase(), discount_percent, max_uses||null, expires_at||null, type, min_order_amount||null, description||null, user_id||null]
        );
        // Якщо персональний — надіслати сповіщення користувачу
        if (type === 'personal' && user_id) {
            const [[u]] = await db.query('SELECT full_name FROM users WHERE id=?', [user_id]);
            const msg = `🎁 Для вас персональний промокод: ${code.toUpperCase()} — знижка ${discount_percent}%${expires_at ? ` (діє до ${new Date(expires_at).toLocaleDateString('uk-UA')})` : ''}`;
            await db.query('INSERT INTO notifications (user_id, type, message) VALUES (?,?,?)', [user_id, 'promo', msg]);
        }
        res.json({message:'Створено'});
    } catch(err){ res.status(500).json({error:err.message}); }
});

// Розіслати birthday-промокод усім хто народився цього місяця (або сьогодні)
app.post('/api/admin/promo/:id/send-birthday', adminMiddleware, async (req, res) => {
    const { mode } = req.body; // 'month' або 'today'
    try {
        const [[promo]] = await db.query('SELECT * FROM promo_codes WHERE id=? AND promo_type="birthday"', [req.params.id]);
        if (!promo) return res.status(404).json({ error: 'Промокод не знайдено або не є birthday-типом' });

        let whereDate;
        if (mode === 'today') {
            whereDate = 'MONTH(birthday) = MONTH(CURDATE()) AND DAY(birthday) = DAY(CURDATE())';
        } else {
            whereDate = 'MONTH(birthday) = MONTH(CURDATE())';
        }

        const [users] = await db.query(
            `SELECT id, full_name FROM users WHERE birthday IS NOT NULL AND ${whereDate} AND role='user'`
        );

        if (!users.length) return res.json({ message: 'Немає користувачів з ДН в цей період', sent: 0 });

        let sent = 0;
        for (const u of users) {
            const msg = `🎂 З Днем народження, ${u.full_name}! Для вас промокод: ${promo.code} — знижка ${promo.discount_percent}%${promo.expires_at ? ` (діє до ${new Date(promo.expires_at).toLocaleDateString('uk-UA')})` : ''}`;
            // Не дублювати якщо вже надіслано
            const [[exists]] = await db.query(
                'SELECT id FROM notifications WHERE user_id=? AND type="promo" AND message LIKE ?',
                [u.id, `%${promo.code}%`]
            );
            if (!exists) {
                await db.query('INSERT INTO notifications (user_id, type, message) VALUES (?,?,?)', [u.id, 'promo', msg]);
                sent++;
            }
        }
        res.json({ message: `Сповіщення надіслано ${sent} користувачам`, sent, total: users.length });
    } catch(err){ res.status(500).json({error:err.message}); }
});

// Пошук користувачів для персонального промокоду
app.get('/api/admin/users/search', staffMiddleware, async (req, res) => {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    try {
        const like = `%${q}%`;
        const [rows] = await db.query(
            'SELECT id, full_name, email, phone FROM users WHERE role="user" AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ?) LIMIT 10',
            [like, like, like]
        );
        res.json(rows);
    } catch(err){ res.status(500).json({error:err.message}); }
});

app.patch('/api/admin/promo/:id/toggle', adminMiddleware, async (req, res) => {
    const { is_active } = req.body;
    try {
        await db.query('UPDATE promo_codes SET is_active=? WHERE id=?', [is_active ? 1 : 0, req.params.id]);
        res.json({message:'Оновлено'});
    } catch(err){ res.status(500).json({error:err.message}); }
});

app.delete('/api/admin/promo/:id', adminMiddleware, async (req, res) => {
    try { await db.query('DELETE FROM promo_codes WHERE id=?',[req.params.id]); res.json({message:'Видалено'}); }
    catch(err){ res.status(500).json({error:err.message}); }
});

// ─── Attr Options Management ──────────────────────────────────────────────────

app.post('/api/admin/attr-options', staffMiddleware, async (req, res) => {
    const { attr_name, attr_value } = req.body;
    if (!attr_name || !attr_value) return res.status(400).json({ error: 'Назва та значення обов\'язкові' });
    try {
        await db.query('INSERT IGNORE INTO attr_options (attr_name, attr_value) VALUES (?,?)', [attr_name.trim(), attr_value.trim()]);
        res.json({ message: 'Додано' });
    } catch(err){ res.status(500).json({error:err.message}); }
});

app.delete('/api/admin/attr-options', staffMiddleware, async (req, res) => {
    const { attr_name, attr_value } = req.body;
    if (!attr_name || !attr_value) return res.status(400).json({ error: 'Назва та значення обов\'язкові' });
    try {
        await db.query('DELETE FROM attr_options WHERE attr_name=? AND attr_value=?', [attr_name, attr_value]);
        res.json({ message: 'Видалено' });
    } catch(err){ res.status(500).json({error:err.message}); }
});

app.post('/api/setup', async (req, res) => {
    if(req.body.secret!=='setup123') return res.status(403).json({error:'Невірний секрет'});
    try {
        const [ex]=await db.query('SELECT id FROM users WHERE role="admin"');
        if(ex.length) return res.status(409).json({error:'Адмін вже існує'});
        const hash=await bcrypt.hash(req.body.password,10);
        await db.query('INSERT INTO users (full_name,email,password_hash,role) VALUES (?,?,?,"admin")',[req.body.full_name,req.body.email,hash]);
        res.json({message:'Адміна створено!'});
    } catch(err){ res.status(500).json({error:err.message}); }
});

app.get('/', (req,res)=>res.send('Cosmetics API'));
const PORT = process.env.PORT||5000;
app.listen(PORT, ()=>console.log('Server: http://localhost:'+PORT));

// ─── Tracking & Status Update (with notifications) ────────────────────────────

app.patch('/api/admin/orders/:id/tracking', canManageOrders, async (req, res) => {
    const { tracking_number, status } = req.body;
    try {
        const [[order]] = await db.query('SELECT * FROM orders WHERE id=?', [req.params.id]);
        if (!order) return res.status(404).json({ error: 'Замовлення не знайдено' });
        const validStatuses = ['pending','confirmed','shipped','delivered','cancelled'];
        const newStatus = validStatuses.includes(status) ? status : order.status;
        const newTracking = tracking_number !== undefined ? (tracking_number || null) : order.tracking_number;
        await db.query('UPDATE orders SET status=?, tracking_number=? WHERE id=?', [newStatus, newTracking, req.params.id]);
        if (order.user_id) {
            let msg = null;
            if (newTracking && newTracking !== order.tracking_number) {
                msg = `Замовлення #${req.params.id} відправлено. Номер ТТН: ${newTracking}`;
            } else if (newStatus !== order.status) {
                const labels = { confirmed:'підтверджено', shipped:'відправлено', delivered:'доставлено', cancelled:'скасовано' };
                if (labels[newStatus]) msg = `Статус замовлення #${req.params.id} змінено: ${labels[newStatus]}`;
            }
            if (msg) await db.query('INSERT INTO notifications (user_id, type, message, order_id) VALUES (?,?,?,?)', [order.user_id, 'order', msg, req.params.id]);
        }
        res.json({ message: 'Оновлено' });
    } catch(err){ res.status(500).json({ error: err.message }); }
});

// ─── Notifications ────────────────────────────────────────────────────────────

app.get('/api/notifications', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 30', [req.user.id]);
        res.json(rows);
    } catch(err){ res.status(500).json({ error: err.message }); }
});

app.post('/api/notifications/read', authMiddleware, async (req, res) => {
    try { await db.query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.user.id]); res.json({ message: 'OK' }); }
    catch(err){ res.status(500).json({ error: err.message }); }
});

app.patch('/api/notifications/:id/read', authMiddleware, async (req, res) => {
    try { await db.query('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?', [req.params.id, req.user.id]); res.json({ message: 'OK' }); }
    catch(err){ res.status(500).json({ error: err.message }); }
});