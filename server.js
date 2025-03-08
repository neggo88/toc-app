const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce')();
const querystring = require('querystring');
const request = require('request-promise');
const dotenv = require('dotenv');
const db = require('./config/db');
const Shopify = require('shopify-api-node');
const path = require('path');

// Lade Umgebungsvariablen aus .env
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Statische Dateien ausliefern

const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = process.env.SCOPES || 'read_products,write_products';
const appUrl = process.env.APP_URL || 'https://34250n80-3000.euw.devtunnels.ms/';
const redirectUri = `${appUrl}/shopify/callback`;
const PORT = process.env.PORT || 3000;

// OAuth Start (aus Server/index.js)
app.get('/shopify', (req, res) => {
    const shop = req.query.shop;
    if (!shop) return res.status(400).send('Missing shop parameter');

    const state = nonce();
    const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&state=${state}&redirect_uri=${redirectUri}`;
    res.cookie('state', state);
    res.redirect(installUrl);
});

// OAuth Callback (aus Server/index.js, mit Token-Speicherung)
app.get('/shopify/callback', (req, res) => {
    const { shop, hmac, code, state } = req.query;
    const stateCookie = cookie.parse(req.headers.cookie).state;

    if (state !== stateCookie) {
        return res.status(403).send('Request origin cannot be verified');
    }

    if (shop && hmac && code) {
        const map = Object.assign({}, req.query);
        delete map['hmac'];
        const message = querystring.stringify(map);
        const generatedHash = crypto
            .createHmac('sha256', apiSecret)
            .update(message)
            .digest('hex');

        if (generatedHash !== hmac) {
            return res.status(400).send('HMAC validation failed');
        }

        const accessTokenRequestUrl = `https://${shop}/admin/oauth/access_token`;
        const accessTokenPayload = {
            client_id: apiKey,
            client_secret: apiSecret,
            code,
        };

        request.post(accessTokenRequestUrl, { json: accessTokenPayload })
            .then((response) => {
                const accessToken = response.access_token;
                db.run(
                    'INSERT OR REPLACE INTO settings (id, shop, access_token) VALUES (?, ?, ?)',
                    [1, shop, accessToken],
                    (err) => {
                        if (err) {
                            console.error('Fehler beim Speichern des Tokens:', err);
                            return res.status(500).send('Error saving token');
                        }
                        console.log(`Token gespeichert: Shop=${shop}, Access Token=${accessToken}`);
                        res.redirect('/app');
                    }
                );
            })
            .catch((error) => {
                res.status(500).send(error.message);
            });
    } else {
        res.status(400).send('Required parameters missing');
    }
});

// Check Settings (aus View/server.js)
app.get('/check-settings', (req, res) => {
    db.get('SELECT shop, access_token FROM settings WHERE id = 1', [], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'No settings found' });
        }
        res.json(row);
    });
});

// API Settings (aus View/server.js)
app.get('/api/settings', (req, res) => {
    db.get('SELECT * FROM settings LIMIT 1', [], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(row || { toc_enabled: 0, blacklist: '[]', toc_title: 'Inhaltsverzeichnis', toggle_show: '[anzeigen]', toggle_hide: '[verbergen]' });
    });
});

app.post('/api/settings', (req, res) => {
    const { toc_enabled, blacklist, toc_title, toggle_show, toggle_hide } = req.body;
    db.run(
        `INSERT OR REPLACE INTO settings (id, toc_enabled, blacklist, toc_title, toggle_show, toggle_hide, shop, access_token)
         VALUES (1, ?, ?, ?, ?, ?, (SELECT shop FROM settings WHERE id = 1), (SELECT access_token FROM settings WHERE id = 1))`,
        [toc_enabled, JSON.stringify(blacklist), toc_title, toggle_show, toggle_hide],
        (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Settings updated' });
        }
    );
});

// API Blogs (aus View/server.js)
app.get('/api/blogs', async (req, res) => {
    db.get('SELECT shop, access_token FROM settings WHERE id = 1', [], async (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row || !row.shop || !row.access_token) {
            return res.status(500).json({ error: 'Shop not authenticated' });
        }

        const shopify = new Shopify({
            shopName: row.shop,
            accessToken: row.access_token,
        });

        try {
            const blogs = await shopify.blog.list();
            res.json(blogs);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
});

// App Route (Frontend)
app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Index.html'));
});

// Settings Route (optional, falls serverseitig gerendert)
app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'settings.html'));
});

// Standardroute
app.get('/', (req, res) => {
    res.send('Hallo! Dein Server läuft.');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
app.get('/', (req, res) => {
    res.send('Hallo! Dein Server läuft.');
});