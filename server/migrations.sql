-- Створення таблиці користувачів
CREATE TABLE IF NOT EXISTS users (
    userId UUID PRIMARY KEY,
    nickname VARCHAR(50) UNIQUE NOT NULL,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Створення таблиці гаманців
CREATE TABLE IF NOT EXISTS wallets (
    userId UUID PRIMARY KEY REFERENCES users(userId),
    balance DECIMAL(20, 8) DEFAULT 10000,
    tokenBalances JSONB DEFAULT '{}',
    tokens JSONB DEFAULT '[]',
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Створення таблиці токенів
CREATE TABLE IF NOT EXISTS tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    description TEXT,
    creatorId UUID REFERENCES users(userId),
    imageUrl TEXT,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Створення таблиці коментарів
CREATE TABLE IF NOT EXISTS comments (
    id VARCHAR(50) PRIMARY KEY,
    tokenId UUID REFERENCES tokens(id),
    userId UUID REFERENCES users(userId),
    username VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Створення таблиці транзакцій
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tokenId UUID REFERENCES tokens(id),
    userId UUID REFERENCES users(userId),
    type VARCHAR(10) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Створення таблиці стану торгівлі
CREATE TABLE IF NOT EXISTS tradingStates (
    tokenId UUID PRIMARY KEY REFERENCES tokens(id),
    pool JSONB DEFAULT '{"usd": 20000, "tokens": 2000000, "k": 40000000000}',
    candles JSONB DEFAULT '{}',
    holders JSONB DEFAULT '[]',
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Створення індексів
CREATE INDEX IF NOT EXISTS idx_tokens_creator ON tokens(creatorId);
CREATE INDEX IF NOT EXISTS idx_comments_token ON comments(tokenId);
CREATE INDEX IF NOT EXISTS idx_transactions_token ON transactions(tokenId);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(userId); 