const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();

exports.login = functions.https.onRequest(async (req, res) => {
  const redirectUri = `https://us-central1-prover-pump.cloudfunctions.net/api/auth`;
  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=1380863605796241448&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify`;
  res.redirect(authUrl);
});

exports.auth = functions.https.onRequest(async (req, res) => {
  const code = req.query.code;
  const redirectUri = `https://us-central1-prover-pump.cloudfunctions.net/api/auth`;

  try {
    // Обмін коду на токен доступу
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: '1380863605796241448',
      client_secret: functions.config().discord.client_secret || '<your-new-client-secret>', // Замініть на новий Client Secret
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      scope: 'identify',
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const accessToken = tokenResponse.data.access_token;

    // Отримання інформації про користувача
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const discordUser = userResponse.data;
    const userId = discordUser.id;

    // Створення кастомного токена Firebase
    const customToken = await admin.auth().createCustomToken(userId, {
      discordId: userId,
      username: discordUser.username,
    });

    // Зберігання даних користувача у Firestore
    const newUser = {
      userId: userId,
      nickname: discordUser.username,
      discordId: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const newWallet = {
      userId: userId,
      balance: 10000,
      tokens: [],
      tokenBalances: {},
    };

    await admin.firestore().collection('users').doc(userId).set(newUser);
    await admin.firestore().collection('wallets').doc(userId).set(newWallet);

    // Відправлення токена клієнту
    res.redirect(`/auth?token=${customToken}`);
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).send('Authentication failed');
  }
});