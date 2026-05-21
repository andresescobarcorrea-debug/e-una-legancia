const { pool } = require('../config/db');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const openid = require('openid');
const crypto = require('crypto');

const STEAM_API_KEY = process.env.STEAM_API_KEY || '';
const XBOX_CLIENT_ID = process.env.XBOX_CLIENT_ID || '';
const XBOX_CLIENT_SECRET = process.env.XBOX_CLIENT_SECRET || '';
const EPIC_CLIENT_ID = process.env.EPIC_CLIENT_ID || '';
const EPIC_CLIENT_SECRET = process.env.EPIC_CLIENT_SECRET || '';

// URL base del backend para callbacks
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const relyingParty = new openid.RelyingParty(
    `${BASE_URL}/api/connections/steam/callback`,
    BASE_URL,
    true,
    false,
    []
);

// Encriptación simple para tokens (aes-256-cbc)
const ENCRYPTION_KEY = crypto.scryptSync(process.env.JWT_SECRET || 'regaming_secret', 'salt', 32);
const IV_LENGTH = 16;

function encrypt(text) {
    if (!text) return null;
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    if (!text) return null;
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

exports.initAuth = async (req, res) => {
    try {
        const platform = req.params.platform.toLowerCase();
        const userId = req.user.id;
        
        // Creamos un token efímero de estado para asegurar el flujo y saber qué usuario es en el callback
        const stateToken = jwt.sign({ userId, platform }, process.env.JWT_SECRET || 'regaming_secret', { expiresIn: '15m' });

        switch (platform) {
            case 'steam':
                // Steam usa OpenID 2.0 y no permite el parámetro state estándar tan fácilmente en el Auth URL.
                // Usaremos un return_to URL dinámico con el token.
                const returnTo = `${BASE_URL}/api/connections/steam/callback?state=${stateToken}`;
                const rp = new openid.RelyingParty(returnTo, BASE_URL, true, false, []);
                rp.authenticate('https://steamcommunity.com/openid', false, (error, authUrl) => {
                    if (error) return res.status(500).json({ error: 'Error inicializando Steam' });
                    res.json({ url: authUrl });
                });
                break;
            case 'xbox':
                const xboxAuthUrl = `https://login.live.com/oauth20_authorize.srf?client_id=${XBOX_CLIENT_ID}&response_type=code&redirect_uri=${BASE_URL}/api/connections/xbox/callback&scope=XboxLive.signin offline_access&state=${stateToken}`;
                res.json({ url: xboxAuthUrl });
                break;
            case 'epic':
                const epicAuthUrl = `https://www.epicgames.com/id/authorize?client_id=${EPIC_CLIENT_ID}&response_type=code&redirect_uri=${BASE_URL}/api/connections/epic/callback&scope=basic_profile&state=${stateToken}`;
                res.json({ url: epicAuthUrl });
                break;
            case 'playstation':
                // Preparado estructuralmente para PSN OAuth (Suele requerir PSSO)
                const psnAuthUrl = `https://ca.account.sony.com/api/authz/v3/oauth/authorize?client_id=PSN_CLIENT_ID&response_type=code&redirect_uri=${BASE_URL}/api/connections/playstation/callback&scope=psn:s2s&state=${stateToken}`;
                res.json({ url: psnAuthUrl });
                break;
            case 'ea':
                // Preparado estructuralmente para EA Games OAuth
                const eaAuthUrl = `https://accounts.ea.com/connect/auth?client_id=EA_CLIENT_ID&response_type=code&redirect_uri=${BASE_URL}/api/connections/ea/callback&state=${stateToken}`;
                res.json({ url: eaAuthUrl });
                break;
            default:
                res.status(400).json({ error: 'Plataforma no soportada' });
        }
    } catch (error) {
        console.error('Error initAuth:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

exports.callback = async (req, res) => {
    try {
        const platform = req.params.platform.toLowerCase();
        const stateToken = req.query.state;
        
        if (!stateToken && platform !== 'steam') {
            return res.redirect(`${FRONTEND_URL}/configuracion.html?error=missing_state`);
        }

        let userId;
        try {
            const decoded = jwt.verify(stateToken, process.env.JWT_SECRET || 'regaming_secret');
            userId = decoded.userId;
            if (decoded.platform !== platform) throw new Error('Platform mismatch');
        } catch (err) {
            return res.redirect(`${FRONTEND_URL}/configuracion.html?error=invalid_state`);
        }

        let accountData = {
            accountId: null,
            username: null,
            avatarUrl: null,
            accessToken: null,
            refreshToken: null,
            expiresAt: null
        };

        if (platform === 'steam') {
            // Steam Callback validation
            await new Promise((resolve, reject) => {
                const rp = new openid.RelyingParty(`${BASE_URL}/api/connections/steam/callback?state=${stateToken}`, BASE_URL, true, false, []);
                rp.verifyAssertion(req, async (error, result) => {
                    if (error || !result.authenticated) return reject('Steam auth failed');
                    
                    const steamId = result.claimedIdentifier.split('/id/')[1];
                    accountData.accountId = steamId;
                    
                    // Fetch Steam Profile (Requiere STEAM_API_KEY en prod)
                    if (STEAM_API_KEY) {
                        try {
                            const profileRes = await axios.get(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`);
                            const player = profileRes.data.response.players[0];
                            accountData.username = player.personaname;
                            accountData.avatarUrl = player.avatarfull;
                        } catch(e) { console.error('Error fetching steam profile'); }
                    } else {
                        accountData.username = 'Steam User ' + steamId;
                    }
                    resolve();
                });
            });
        } 
        else if (platform === 'xbox') {
            const code = req.query.code;
            // 1. Obtener access token de Microsoft
            const tokenRes = await axios.post('https://login.live.com/oauth20_token.srf', new URLSearchParams({
                client_id: XBOX_CLIENT_ID,
                client_secret: XBOX_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: `${BASE_URL}/api/connections/xbox/callback`
            }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }});
            
            accountData.accessToken = tokenRes.data.access_token;
            accountData.refreshToken = tokenRes.data.refresh_token;
            // XSTS Authorization and Profile fetching normally happens here
            accountData.accountId = 'xbox_' + crypto.randomBytes(4).toString('hex');
            accountData.username = 'Xbox User'; 
        }
        else if (platform === 'epic') {
            const code = req.query.code;
            const basicAuth = Buffer.from(`${EPIC_CLIENT_ID}:${EPIC_CLIENT_SECRET}`).toString('base64');
            const tokenRes = await axios.post('https://api.epicgames.dev/epic/oauth/v1/token', new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: `${BASE_URL}/api/connections/epic/callback`
            }).toString(), { headers: { 'Authorization': `Basic ${basicAuth}`, 'Content-Type': 'application/x-www-form-urlencoded' }});
            
            accountData.accessToken = tokenRes.data.access_token;
            accountData.accountId = tokenRes.data.account_id;
            accountData.username = tokenRes.data.displayName || 'Epic User';
        }
        else if (platform === 'playstation' || platform === 'ea') {
            // Simulated flow for PSN and EA since they require official unreleased keys
            accountData.accountId = `${platform}_simulated_${crypto.randomBytes(4).toString('hex')}`;
            accountData.username = `${platform} Player`;
        }

        // Upsert en la base de datos
        const request = pool.request();
        request.input('user_id', userId);
        request.input('platform', platform);
        request.input('acc_id', accountData.accountId);
        request.input('username', accountData.username);
        request.input('avatar', accountData.avatarUrl);
        request.input('acc_token', encrypt(accountData.accessToken));
        request.input('ref_token', encrypt(accountData.refreshToken));
        
        await request.query(`
            IF EXISTS (SELECT 1 FROM user_connections WHERE user_id = @user_id AND platform = @platform)
            BEGIN
                UPDATE user_connections 
                SET platform_account_id = @acc_id, platform_username = @username, platform_avatar_url = @avatar, 
                    access_token = @acc_token, refresh_token = @ref_token, updated_at = GETDATE()
                WHERE user_id = @user_id AND platform = @platform;
            END
            ELSE
            BEGIN
                INSERT INTO user_connections (user_id, platform, platform_account_id, platform_username, platform_avatar_url, access_token, refresh_token)
                VALUES (@user_id, @platform, @acc_id, @username, @avatar, @acc_token, @ref_token);
            END
        `);

        res.redirect(`${FRONTEND_URL}/configuracion.html?connected=${platform}`);

    } catch (error) {
        console.error('Error callback:', error);
        res.redirect(`${FRONTEND_URL}/configuracion.html?error=auth_failed`);
    }
};

exports.getMyConnections = async (req, res) => {
    try {
        const result = await pool.request()
            .input('user_id', req.user.id)
            .query(`SELECT platform, platform_username, platform_avatar_url, updated_at FROM user_connections WHERE user_id = @user_id`);
        
        const connections = {};
        result.recordset.forEach(row => {
            connections[row.platform] = {
                connected: true,
                username: row.platform_username,
                avatarUrl: row.platform_avatar_url,
                updatedAt: row.updated_at
            };
        });
        
        res.json(connections);
    } catch (error) {
        console.error('Error fetching connections:', error);
        res.status(500).json({ error: 'Error fetching connections' });
    }
};

exports.disconnect = async (req, res) => {
    try {
        const platform = req.params.platform.toLowerCase();
        
        await pool.request()
            .input('user_id', req.user.id)
            .input('platform', platform)
            .query(`DELETE FROM user_connections WHERE user_id = @user_id AND platform = @platform`);
            
        res.json({ success: true, message: `Desvinculado de ${platform} correctamente` });
    } catch (error) {
        console.error('Error disconnect:', error);
        res.status(500).json({ error: 'Error desconectando' });
    }
};
