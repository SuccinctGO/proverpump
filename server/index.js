const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const socketIo = require('socket.io');
const http = require('http');
const axios = require('axios');
const cors = require('cors');
const storage = require('./storage');
const multer = require('multer');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// CORS configuration
const corsOptions = {
    origin: ['https://proverpump.vercel.app', 'https://proverpump-server-ewqtdbfip-istzzzs-projects.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Додаємо middleware для обробки OPTIONS запитів
app.options('*', cors(corsOptions));

// Додаємо CORS middleware для всіх запитів
app.use(cors(corsOptions));

// Socket.IO configuration with CORS
const io = new Server(server, {
    cors: {
        origin: ['https://proverpump.vercel.app', 'https://proverpump-server-ewqtdbfip-istzzzs-projects.vercel.app'],
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    path: '/socket.io/'
});

// Додаємо middleware для логування всіх запитів
app.use((req, res, next) => {
    console.log('\n=== Incoming Request ===');
    console.log('Time:', new Date().toISOString());
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Query:', JSON.stringify(req.query, null, 2));
    console.log('Origin:', req.headers.origin);
    console.log('======================\n');
    next();
});

// Додаємо логування для Socket.IO
io.on('connection', (socket) => {
    console.log('Socket.IO connection established');
    console.log('Socket ID:', socket.id);
    console.log('Socket headers:', socket.handshake.headers);
    console.log('Socket origin:', socket.handshake.headers.origin);

    socket.on('disconnect', () => {
        console.log('Socket.IO client disconnected:', socket.id);
    });

    socket.on('error', (error) => {
        console.error('Socket.IO error:', error);
    });
});

// Додаємо middleware для обробки помилок
app.use((err, req, res, next) => {
    console.error('\n=== Express Error ===');
    console.error('Time:', new Date().toISOString());
    console.error('Path:', req.path);
    console.error('Method:', req.method);
    console.error('Headers:', req.headers);
    console.error('Body:', req.body);
    console.error('Error:', err);
    console.error('Stack:', err.stack);
    console.error('========================\n');
    res.status(500).json({ error: err.message });
});

const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

// Перевірка змінних середовища
console.log('\n=== Environment Variables Check ===');
const requiredEnvVars = [
    'DB_USER',
    'DB_HOST',
    'DB_NAME',
    'DB_PASSWORD',
    'DB_PORT',
    'JWT_SECRET',
    'SUPABASE_URL',
    'SUPABASE_KEY'
];

console.log('Checking required environment variables:');
requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    console.log(`${varName}: ${value ? '✓' : '✗'}`);
    if (value) {
        // Маскуємо чутливі дані
        if (varName.includes('PASSWORD') || varName.includes('SECRET') || varName.includes('KEY')) {
            console.log(`${varName} value: ${value.substring(0, 4)}...${value.substring(value.length - 4)}`);
        } else {
            console.log(`${varName} value: ${value}`);
        }
    }
});

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars);
    process.exit(1);
}

// Перевірка підключення до бази даних
console.log('\n=== Database Connection Check ===');
console.log('Attempting to connect to database...');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);

// Перевірка Supabase
console.log('\n=== Supabase Configuration Check ===');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✓' : '✗');

// Перевірка JWT
console.log('\n=== JWT Configuration Check ===');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✓' : '✗');

// Додаємо обробку необроблених помилок
process.on('uncaughtException', (error) => {
    console.error('\n=== Uncaught Exception ===');
    console.error('Time:', new Date().toISOString());
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    console.error('========================\n');
    // Не завершуємо процес, щоб Vercel міг отримати логи
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\n=== Unhandled Rejection ===');
    console.error('Time:', new Date().toISOString());
    console.error('Reason:', reason);
    console.error('Promise:', promise);
    console.error('========================\n');
    // Не завершуємо процес, щоб Vercel міг отримати логи
});

// Додаємо обробку помилок для Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Додаємо обробку помилок для Socket.IO
io.on('error', (error) => {
    console.error('\n=== Socket.IO Error ===');
    console.error('Time:', new Date().toISOString());
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    console.error('========================\n');
});

// Додаємо обробку помилок для HTTP сервера
server.on('error', (error) => {
    console.error('\n=== HTTP Server Error ===');
    console.error('Time:', new Date().toISOString());
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    console.error('========================\n');
});

// Додаємо обробку помилок для бази даних
const db = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

db.on('error', (err) => {
    console.error('\n=== Database Error ===');
    console.error('Time:', new Date().toISOString());
    console.error('Error:', err);
    console.error('Stack:', err.stack);
    console.error('========================\n');
});

// Додаємо перевірку підключення до бази даних
db.connect()
    .then(() => {
        console.log('\n=== Database Connection Successful ===');
        console.log('Time:', new Date().toISOString());
        console.log('Connected to database:', process.env.DB_NAME);
        console.log('Host:', process.env.DB_HOST);
        console.log('Port:', process.env.DB_PORT);
        console.log('User:', process.env.DB_USER);
        console.log('=====================================\n');
    })
    .catch((err) => {
        console.error('\n=== Database Connection Failed ===');
        console.error('Time:', new Date().toISOString());
        console.error('Error:', err);
        console.error('Stack:', err.stack);
        console.error('================================\n');
    });

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Реєстрація користувача
app.post('/users/register', async (req, res) => {
    console.log('=== Registration Request ===');
    console.log('Time:', new Date().toISOString());
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request origin:', req.headers.origin);
    
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            console.log('Missing username or password');
            return res.status(400).json({ error: 'Username and password are required' });
        }

        console.log('Checking for existing user:', username);
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select()
            .eq('username', username)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking existing user:', checkError);
            throw checkError;
        }

        if (existingUser) {
            console.log('Username already exists:', username);
            return res.status(400).json({ error: 'Username already exists' });
        }

        const userId = uuidv4();
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log('Creating new user:', { username, userId });
        const { data: user, error: userError } = await supabase
            .from('users')
            .insert([
                {
                    userId,
                    username,
                    password: hashedPassword
                }
            ])
            .select()
            .single();

        if (userError) {
            console.error('Error creating user:', userError);
            throw userError;
        }

        const token = jwt.sign({ userId, username }, process.env.JWT_SECRET, { expiresIn: '24h' });
        
        console.log('User created successfully:', { username, userId });
        res.json({ token, user: { userId, username } });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Логін користувача
app.post('/users/login', async (req, res) => {
    console.log('=== Login Request ===');
    console.log('Time:', new Date().toISOString());
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const { data: user, error: userError } = await supabase
            .from('users')
            .select()
            .eq('username', username)
            .single();

        if (userError || !user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign({ userId: user.userId, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
        
        console.log('Login successful:', { username: user.username });
        res.json({ token, user: { userId: user.userId, username: user.username } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Отримання даних користувача
app.get('/users/me', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE userId = $1', [req.user.userId]);
    const walletResult = await pool.query('SELECT * FROM wallets WHERE userId = $1', [req.user.userId]);
    if (userResult.rows.length === 0 || walletResult.rows.length === 0) {
      return res.status(404).json({ error: 'User or wallet not found' });
    }
    res.json({ user: userResult.rows[0], wallet: walletResult.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Отримання нікнеймів за ID користувачів
app.post('/users', async (req, res) => {
  const { userIds } = req.body;
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'Invalid userIds' });
  }
  try {
    const result = await pool.query(
      'SELECT userId, nickname FROM users WHERE userId = ANY($1::uuid[])',
      [userIds]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Створення токена
app.post('/tokens', authenticateToken, upload.single('image'), async (req, res) => {
  const { name, symbol, description } = req.body;
  const image = req.file;

  if (!name || name.length > 50) {
    return res.status(400).json({ error: 'Token name is required and must be 50 characters or less' });
  }
  if (!symbol || symbol.length > 10) {
    return res.status(400).json({ error: 'Token symbol is required and must be 10 characters or less' });
  }
  if (!description || description.length > 500) {
    return res.status(400).json({ error: 'Description is required and must be 500 characters or less' });
  }
  if (image && !image.mimetype.match(/image\/(png|jpe?g|gif)/)) {
    return res.status(400).json({ error: 'Image must be a PNG, JPG, JPEG, or GIF file' });
  }

  try {
    const tokenId = `${req.user.userId}-${symbol.trim().toUpperCase()}-${Date.now()}`;
    let imageUrl = `https://placehold.co/200x200/FF69B4/FFF?text=${symbol.trim().toUpperCase()}`;

    if (image) {
      imageUrl = await storage.uploadFile(image);
    }

    const newToken = {
      id: tokenId,
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      about: description.trim(),
      totalSupply: 100_000_000,
      currentPrice: 0.01,
      tokensSold: 0,
      volume: 0,
      creatorId: req.user.userId,
      creatorNickname: req.user.nickname,
      image: imageUrl,
      createdAt: new Date().toISOString(),
    };

    await pool.query(
      'INSERT INTO tokens (id, name, symbol, about, totalSupply, currentPrice, tokensSold, volume, creatorId, creatorNickname, image, createdAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
      [
        tokenId,
        newToken.name,
        newToken.symbol,
        newToken.about,
        newToken.totalSupply,
        newToken.currentPrice,
        newToken.tokensSold,
        newToken.volume,
        newToken.creatorId,
        newToken.creatorNickname,
        newToken.image,
        newToken.createdAt,
      ]
    );

    const initialPool = {
      usd: newToken.currentPrice * 2_000_000,
      tokens: 2_000_000,
      k: newToken.currentPrice * 2_000_000 * 2_000_000,
    };
    const initialCandles = { '1s': {}, '1m': {}, '5m': {}, '15m': {}, '1h': {} };
    await pool.query(
      'INSERT INTO tradingStates (tokenId, pool, candles, holders) VALUES ($1, $2, $3, $4)',
      [tokenId, initialPool, initialCandles, {}]
    );

    io.emit('newToken', newToken);
    res.json(newToken);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create token' });
  }
});

// Отримання всіх токенів
app.get('/tokens', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tokens ORDER BY createdAt DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

// Отримання токена за ID
app.get('/tokens/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const tokenResult = await pool.query('SELECT * FROM tokens WHERE id = $1', [id]);
    if (tokenResult.rows.length === 0) {
      return res.status(404).json({ error: 'Token not found' });
    }
    res.json(tokenResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch token' });
  }
});

// Отримання токенів користувача
app.get('/tokens/my', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tokens WHERE creatorId = $1',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user tokens' });
  }
});

// Отримання повного стану токена
app.get('/tokens/:tokenId/state', async (req, res) => {
  const { tokenId } = req.params;
  try {
    const [tokenResult, walletResult, commentsResult, transactionsResult, tradingStateResult] = await Promise.all([
      pool.query('SELECT * FROM tokens WHERE id = $1', [tokenId]),
      pool.query('SELECT * FROM wallets WHERE userId = $1', [req.user?.userId || '']),
      pool.query('SELECT * FROM comments WHERE tokenId = $1 ORDER BY timestamp DESC', [tokenId]),
      pool.query('SELECT * FROM transactions WHERE tokenId = $1 ORDER BY timestamp DESC', [tokenId]),
      pool.query('SELECT * FROM tradingStates WHERE tokenId = $1', [tokenId]),
    ]);

    if (tokenResult.rows.length === 0) {
      return res.status(404).json({ error: 'Token not found' });
    }

    res.json({
      token: tokenResult.rows[0],
      wallet: walletResult.rows[0] || { balance: 10000, tokenBalances: {}, tokens: [] },
      comments: commentsResult.rows,
      transactions: transactionsResult.rows,
      tradingState: tradingStateResult.rows[0] || { pool: { usd: 20000, tokens: 2000000, k: 40000000000 }, candles: {}, holders: [] },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch token state' });
  }
});

// Торгівля токенами
app.post('/tokens/:tokenId/trade', authenticateToken, async (req, res) => {
  const { tokenId } = req.params;
  const { type, amount } = req.body;
  if (!['buy', 'sell'].includes(type) || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid trade type or amount' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const [tokenResult, walletResult, tradingStateResult] = await Promise.all([
        client.query('SELECT * FROM tokens WHERE id = $1 FOR UPDATE', [tokenId]),
        client.query('SELECT * FROM wallets WHERE userId = $1 FOR UPDATE', [req.user.userId]),
        client.query('SELECT * FROM tradingStates WHERE tokenId = $1 FOR UPDATE', [tokenId]),
      ]);

      if (tokenResult.rows.length === 0) {
        throw new Error('Token not found');
      }
      if (walletResult.rows.length === 0) {
        throw new Error('Wallet not found');
      }
      if (tradingStateResult.rows.length === 0) {
        throw new Error('Trading state not found');
      }

      const token = tokenResult.rows[0];
      const wallet = walletResult.rows[0];
      let pool = tradingStateResult.rows[0].pool;
      let candles = tradingStateResult.rows[0].candles || {};
      let holders = tradingStateResult.rows[0].holders || {};

      if (!pool.usd || !pool.tokens || !pool.k) {
        pool = {
          usd: token.currentPrice * 2_000_000,
          tokens: 2_000_000,
          k: token.currentPrice * 2_000_000 * 2_000_000,
        };
      }

      let newPool, newBalance, tokensTraded, usdAmount, price;
      const fee = amount * 0.003;
      const effectiveAmount = amount - fee;

      if (type === 'buy') {
        if (wallet.balance < amount) {
          throw new Error('Insufficient PROVE balance');
        }
        const newUsd = pool.usd + effectiveAmount;
        const newTokens = pool.k / newUsd;
        tokensTraded = pool.tokens - newTokens;
        usdAmount = amount;
        price = newUsd / newTokens;
        newPool = { usd: newUsd, tokens: newTokens, k: newUsd * newTokens };
        newBalance = {
          usd: wallet.balance - amount,
          tokens: (wallet.tokenBalances[tokenId] || 0) + tokensTraded,
        };
      } else {
        const userTokens = wallet.tokenBalances[tokenId] || 0;
        if (userTokens < amount) {
          throw new Error('Insufficient token balance');
        }
        const newTokens = pool.tokens + effectiveAmount;
        const newUsd = pool.k / newTokens;
        usdAmount = pool.usd - newUsd;
        tokensTraded = amount;
        price = newUsd / newTokens;
        newPool = { usd: newUsd, tokens: newTokens, k: newUsd * newTokens };
        newBalance = {
          usd: wallet.balance + usdAmount,
          tokens: userTokens - amount,
        };
      }

      const transactionId = Date.now().toString();
      const transaction = {
        id: transactionId,
        type,
        wallet: req.user.userId,
        amount: usdAmount,
        tokens: tokensTraded,
        price,
        tokenId,
        tokenSymbol: token.symbol,
        tokenName: token.name,
        nickname: req.user.nickname,
        timestamp: new Date().toISOString(),
      };

      const updateCandles = (candles, price) => {
        const time = Math.floor(Date.now() / 1000);
        const newCandles = { ...candles };
        for (const tf of ['1s', '1m', '5m', '15m', '1h']) {
          const interval = { '1s': 1, '1m': 60, '5m': 300, '15m': 900, '1h': 3600 }[tf];
          const candleTime = Math.floor(time / interval) * interval;
          if (!newCandles[tf]) newCandles[tf] = {};
          if (!newCandles[tf][candleTime]) {
            const prevCandle = Object.values(newCandles[tf] || {})
              .filter(c => c.time < candleTime)
              .sort((a, b) => b.time - a.time)[0];
            newCandles[tf][candleTime] = {
              time: candleTime,
              open: prevCandle?.close || price,
              high: price,
              low: price,
              close: price,
            };
          } else {
            const candle = newCandles[tf][candleTime];
            candle.high = Math.max(candle.high, price);
            candle.low = Math.min(candle.low, price);
            candle.close = price;
          }
        }
        return newCandles;
      };

      candles = updateCandles(candles, price);

      const updateHolders = (holders, walletId, tokens, type) => {
        const holderBalances = { ...holders };
        if (!holderBalances[walletId]) holderBalances[walletId] = 0;
        if (type === 'buy') holderBalances[walletId] += tokens;
        else if (type === 'sell') holderBalances[walletId] -= tokens;
        if (holderBalances[walletId] <= 0) delete holderBalances[walletId];
        return holderBalances;
      };

      holders = updateHolders(holders, req.user.userId, tokensTraded, type);

      await client.query(
        'UPDATE tokens SET currentPrice = $1, tokensSold = $2, volume = $3, priceHistory = $4 WHERE id = $5',
        [
          price,
          token.tokensSold + (type === 'buy' ? tokensTraded : -tokensTraded),
          token.volume + usdAmount,
          [...(token.priceHistory || []), { time: Math.floor(Date.now() / 1000), open: price, high: price, low: price, close: price, volume: usdAmount }],
          tokenId,
        ]
      );

      const updatedTokenBalances = { ...wallet.tokenBalances, [tokenId]: newBalance.tokens };
      await client.query(
        'UPDATE wallets SET balance = $1, tokenBalances = $2 WHERE userId = $3',
        [newBalance.usd, updatedTokenBalances, req.user.userId]
      );

      await client.query(
        'UPDATE tradingStates SET pool = $1, candles = $2, holders = $3 WHERE tokenId = $4',
        [newPool, candles, holders, tokenId]
      );

      await client.query(
        'INSERT INTO transactions (id, type, wallet, amount, tokens, price, tokenId, tokenSymbol, tokenName, nickname, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
        [
          transactionId,
          transaction.type,
          transaction.wallet,
          transaction.amount,
          transaction.tokens,
          transaction.price,
          transaction.tokenId,
          transaction.tokenSymbol,
          transaction.tokenName,
          transaction.nickname,
          transaction.timestamp,
        ]
      );

      await client.query('COMMIT');

      io.to(`token_${tokenId}`).emit('transaction', transaction);
      io.to(`wallet_${req.user.userId}`).emit('walletUpdate', { userId: req.user.userId, wallet: { ...wallet, balance: newBalance.usd, tokenBalances: updatedTokenBalances } });
      io.to(`token_${tokenId}`).emit('tokenUpdate', { ...token, currentPrice: price, tokensSold: token.tokensSold + (type === 'buy' ? tokensTraded : -tokensTraded), volume: token.volume + usdAmount });
      io.to(`token_${tokenId}`).emit('tradingStateUpdate', { pool: newPool, candles, holders });

      res.json({ token: { ...token, currentPrice: price }, wallet: { ...wallet, balance: newBalance.usd, tokenBalances: updatedTokenBalances }, transaction });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to process trade' });
  }
});

// Додавання коментаря
app.post('/tokens/:tokenId/comments', authenticateToken, async (req, res) => {
  const { tokenId } = req.params;
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content is required' });
  }

  try {
    const commentId = Date.now().toString();
    const comment = {
      id: commentId,
      tokenId,
      userId: req.user.userId,
      username: req.user.nickname,
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    await pool.query(
      'INSERT INTO comments (id, tokenId, userId, username, content, timestamp) VALUES ($1, $2, $3, $4, $5, $6)',
      [commentId, tokenId, req.user.userId, req.user.nickname, content.trim(), comment.timestamp]
    );

    io.to(`token_${tokenId}`).emit('comment', comment);
    res.json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Отримання останніх транзакцій
app.get('/transactions', async (req, res) => {
  const limit = parseInt(req.query.limit) || 3;
  try {
    const result = await pool.query(
      'SELECT * FROM transactions ORDER BY timestamp DESC LIMIT $1',
      [limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Отримання гаманця
app.get('/wallets/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  if (userId !== req.user.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  try {
    const result = await pool.query('SELECT * FROM wallets WHERE userId = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

// Додавання PROVE до гаманця
app.post('/wallets/:userId/add-prove', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  if (userId !== req.user.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  try {
    const walletResult = await pool.query('SELECT * FROM wallets WHERE userId = $1', [userId]);
    if (walletResult.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    const wallet = walletResult.rows[0];
    const newBalance = (wallet.balance || 10000) + 100;

    await pool.query(
      'UPDATE wallets SET balance = $1 WHERE userId = $2',
      [newBalance, userId]
    );

    const updatedWallet = { ...wallet, balance: newBalance };
    io.to(`wallet_${userId}`).emit('walletUpdate', { userId, wallet: updatedWallet });
    res.json(updatedWallet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add PROVE' });
  }
});

// Перевірка PROVER-статусу
app.get('/prover-status', authenticateToken, async (req, res) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    res.json({ status: 'verified', userId: req.user.userId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to check PROVER status' });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Environment variables check:', {
        SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Not set',
        SUPABASE_KEY: process.env.SUPABASE_KEY ? 'Set' : 'Not set',
        JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set'
    });
    console.log('CORS enabled for:', corsOptions.origin);
});