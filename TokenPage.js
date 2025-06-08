import ChartLogic from './ChartLogic.js';
import NotificationWidget from './NotificationWidget.js';
const io = window.io;

const React = window.React;

const SERVER_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://proverpump-server.vercel.app';

const tokenLogic = {
    getBasePrice: (totalSupply) => 0.01,
    formatTokens: (value) => parseFloat(value).toFixed(2),
};

const timeframeIntervals = {
    '1s': 1,
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
};

function TokenPage({ userId, user, wallet, setWallet, setError, setView, tokenId }) {
    const getInitialToken = () => ({
        id: tokenId,
        name: 'Unknown Token',
        symbol: 'UNK',
        totalSupply: 100_000_000,
        tokensSold: 0,
        currentPrice: 0.01,
        volume: 0,
        priceHistory: [],
        creatorId: userId,
        creatorNickname: user.nickname || 'Unknown',
        image: 'https://via.placeholder.com/120',
        about: 'No information available.',
    });

    const [token, setToken] = React.useState(getInitialToken());
    const [pool, setPool] = React.useState({ usd: 20000, tokens: 2000000, k: 40000000000 });
    const [userBalance, setUserBalance] = React.useState({ usd: 10000, tokens: 0 });
    const [pendingBalance, setPendingBalance] = React.useState(null);
    const [amount, setAmount] = React.useState('');
    const [tradeType, setTradeType] = React.useState('buy');
    const [visibleTransactions, setVisibleTransactions] = React.useState([]);
    const [pendingTransactions, setPendingTransactions] = React.useState([]);
    const [holders, setHolders] = React.useState([]);
    const [comments, setComments] = React.useState([]);
    const [newComment, setNewComment] = React.useState('');
    const [notifications, setNotifications] = React.useState([]);
    const [timeframe, setTimeframe] = React.useState('1s');
    const [candles, setCandles] = React.useState({ '1s': {}, '1m': {}, '5m': {}, '15m': {}, '1h': {} });
    const [error, setLocalError] = React.useState('');
    const [isAboutOpen, setIsAboutOpen] = React.useState(false);
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [prevVolume, setPrevVolume] = React.useState(0);
    const [nicknames, setNicknames] = React.useState({});
    const [lastTradeTime, setLastTradeTime] = React.useState(0);
    const [cooldownMessage, setCooldownMessage] = React.useState('');

    const chartContainerRef = React.useRef(null);

    const formatTokens = tokenLogic.formatTokens;

    const formatMarketCap = (value) => {
        if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
        else if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
        return value.toFixed(2);
    };

    const formatVolume = (value) => {
        if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
        return value.toFixed(2);
    };

    const getPrice = () => pool.usd / pool.tokens;

    const chartLogic = ChartLogic({ timeframe, candles, chartContainerRef, isLoaded, setError: setLocalError });

    const validateTokenData = (tokenData) => ({
        ...tokenData,
        priceHistory: Array.isArray(tokenData.priceHistory) ? tokenData.priceHistory : [],
        currentPrice: parseFloat(tokenData.currentPrice) || 0.01,
        tokensSold: parseFloat(tokenData.tokensSold) || 0,
        volume: parseFloat(tokenData.volume) || 0,
        creatorNickname: tokenData.creatorNickname || user.nickname || 'Unknown',
    });

    const updateHolders = React.useCallback((transactions, prevHolders = []) => {
        const holderBalances = {};
        (transactions || []).forEach((tx) => {
            const wallet = tx.wallet;
            const tokens = parseFloat(tx.tokens) || 0;
            if (!wallet) return;
            if (!holderBalances[wallet]) holderBalances[wallet] = 0;
            if (tx.type === 'buy') holderBalances[wallet] += tokens;
            else if (tx.type === 'sell') holderBalances[wallet] -= tokens;
        });
        const totalSupply = token.totalSupply || 100_000_000;
        const holderMap = new Map(prevHolders.map(h => [h.wallet, h]));
        const updatedHolders = Object.keys(holderBalances)
            .map((wallet) => {
                const amount = holderBalances[wallet] || 0;
                const share = (amount / totalSupply) * 100;
                const prevHolder = holderMap.get(wallet);
                return {
                    wallet,
                    amount,
                    share,
                    id: wallet,
                    prevAmount: prevHolder ? prevHolder.amount : amount,
                    prevShare: prevHolder ? prevHolder.share : share,
                };
            })
            .filter((holder) => holder.amount > 0)
            .sort((a, b) => b.amount - a.amount || a.wallet.localeCompare(b.wallet));
        return updatedHolders;
    }, [token.totalSupply]);

    const cachedHolders = React.useMemo(() => {
        const allTransactions = [...pendingTransactions, ...visibleTransactions];
        return updateHolders(allTransactions, holders);
    }, [pendingTransactions, visibleTransactions, holders, updateHolders]);

    const calculatedVolume = React.useMemo(() => {
        const allTransactions = [...pendingTransactions, ...visibleTransactions];
        const newVolume = allTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
        if (newVolume === 0 && prevVolume !== 0 && allTransactions.length > 0) {
            return prevVolume;
        }
        setPrevVolume(newVolume);
        return newVolume;
    }, [visibleTransactions, pendingTransactions, prevVolume]);

    const getNickname = (id, creatorNickname) => {
        if (creatorNickname && id === token.creatorId) return creatorNickname;
        if (id === user.userId && user.nickname) return user.nickname;
        return nicknames[id] || 'Unknown';
    };

    const fetchNicknames = async (userIds) => {
        try {
            const response = await fetch(`${SERVER_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIds }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch nicknames');
            const nicknameMap = {};
            if (user && user.userId && user.nickname) nicknameMap[user.userId] = user.nickname;
            data.forEach(user => nicknameMap[user.userId] = user.nickname || 'Unknown');
            setNicknames(nicknameMap);
        } catch (err) {
            setLocalError('Не вдалося отримати нікнейми');
        }
    };

    const loadState = async () => {
        try {
            const response = await fetch(`${SERVER_URL}/tokens/${tokenId}/state`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('zkPumpToken')}` },
            });
            const { token: fetchedToken, wallet: storedWallet, comments, transactions, tradingState } = await response.json();
            if (!response.ok) throw new Error('Failed to load token state');

            const validatedToken = validateTokenData(fetchedToken);
            const sortedTransactions = transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            const sortedComments = comments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            const loadedPool = tradingState.pool || pool;
            const currentPrice = loadedPool.usd / loadedPool.tokens;

            setToken({
                ...validatedToken,
                currentPrice,
                volume: calculatedVolume,
            });
            setPool(loadedPool);
            setCandles(tradingState.candles || { '1s': {}, '1m': {}, '5m': {}, '15m': {}, '1h': {} });
            setUserBalance({
                usd: storedWallet.balance || 10000,
                tokens: storedWallet.tokenBalances?.[tokenId] || 0,
            });
            setPendingBalance({
                usd: storedWallet.balance || 10000,
                tokens: storedWallet.tokenBalances?.[tokenId] || 0,
            });
            setWallet({
                ...wallet,
                balance: storedWallet.balance,
                tokenBalances: { ...wallet.tokenBalances, [tokenId]: storedWallet.tokenBalances?.[tokenId] || 0 },
                tokens: storedWallet.tokens || [],
            });
            setVisibleTransactions(sortedTransactions);
            setHolders(tradingState.holders ? Object.keys(tradingState.holders).map(wallet => ({
                wallet,
                amount: tradingState.holders[wallet],
                share: (tradingState.holders[wallet] / validatedToken.totalSupply) * 100,
                id: wallet,
            })) : []);
            setComments(sortedComments);
            setIsLoaded(true);

            const userIds = [
                ...new Set([
                    validatedToken.creatorId,
                    ...sortedTransactions.map(tx => tx.wallet),
                    ...sortedComments.map(c => c.userId),
                    ...Object.keys(tradingState.holders || {}),
                ]),
            ].filter(id => id);
            if (userIds.length > 0) fetchNicknames(userIds);
        } catch (err) {
            setLocalError('Не вдалося завантажити дані токена');
            setIsLoaded(true);
        }
    };

    const cachedTransactions = React.useMemo(() => {
        const allTransactions = [...pendingTransactions, ...visibleTransactions];
        const uniqueTransactions = [...new Map(allTransactions.map(tx => [tx.id, tx])).values()];
        return uniqueTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [visibleTransactions, pendingTransactions]);

    React.useEffect(() => {
        loadState();

        const socket = io(SERVER_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling']
        });
        socket.on('connect', () => {
            socket.emit('subscribeToken', tokenId);
            socket.emit('subscribeWallet', userId);
        });

        socket.on('tokenUpdate', (updatedToken) => {
            setToken(prev => ({ ...prev, ...validateTokenData(updatedToken), volume: calculatedVolume }));
        });

        socket.on('tradingStateUpdate', ({ pool, candles, holders }) => {
            setPool(pool);
            setCandles(candles || { '1s': {}, '1m': {}, '5m': {}, '15m': {}, '1h': {} });
            setToken(prev => ({ ...prev, currentPrice: pool.usd / pool.tokens, volume: calculatedVolume }));
            setHolders(Object.keys(holders).map(wallet => ({
                wallet,
                amount: holders[wallet],
                share: (holders[wallet] / token.totalSupply) * 100,
                id: wallet,
            })));
        });

        socket.on('transaction', (transaction) => {
            setVisibleTransactions(prev => {
                const unique = [...prev, transaction].filter((tx, i, arr) => arr.findIndex(t => t.id === tx.id) === i);
                return unique.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            });
            setPendingTransactions(prev => prev.filter(tx => tx.id !== transaction.id));
            fetchNicknames([transaction.wallet]);
        });

        socket.on('comment', (comment) => {
            setComments(prev => {
                const unique = [...prev, comment].filter((c, i, arr) => arr.findIndex(c2 => c2.id === c.id) === i);
                return unique.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            });
            fetchNicknames([comment.userId]);
        });

        socket.on('walletUpdate', ({ wallet: updatedWallet }) => {
            setWallet(updatedWallet);
            setUserBalance({
                usd: updatedWallet.balance,
                tokens: updatedWallet.tokenBalances?.[tokenId] || 0,
            });
            setPendingBalance({
                usd: updatedWallet.balance,
                tokens: updatedWallet.tokenBalances?.[tokenId] || 0,
            });
        });

        socket.on('disconnect', () => console.log('WebSocket disconnected'));

        return () => socket.disconnect();
    }, [tokenId, userId, calculatedVolume, user.nickname]);

    React.useEffect(() => {
        if (notifications.length > 0) {
            const timer = setTimeout(() => setNotifications(prev => prev.slice(1)), 5000);
            return () => clearTimeout(timer);
        }
    }, [notifications]);

    React.useEffect(() => {
        if (cooldownMessage) {
            const timer = setTimeout(() => setCooldownMessage(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [cooldownMessage]);

    const handleTrade = async () => {
        const currentTime = Date.now();
        if (currentTime - lastTradeTime < 5000) {
            setCooldownMessage('Wait 5 seconds before the next transaction');
            return;
        }

        const amountValue = parseFloat(amount);
        if (isNaN(amountValue) || amountValue <= 0) {
            setLocalError('Будь ласка, введіть правильну суму');
            return;
        }

        try {
            const response = await fetch(`${SERVER_URL}/tokens/${tokenId}/trade`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('zkPumpToken')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ type: tradeType, amount: amountValue }),
            });
            const { token: updatedToken, wallet: updatedWallet, transaction } = await response.json();
            if (!response.ok) throw new Error('Failed to process trade');

            setNotifications(prev => [{
                id: Date.now(),
                type: tradeType,
                amount: transaction.tokens,
                currency: token.symbol,
                timestamp: Date.now(),
            }, ...prev]);
            setLastTradeTime(currentTime);
            setAmount('');
        } catch (err) {
            setLocalError(`Не вдалося обробити торгівлю: ${err.message}`);
        }
    };

    const handleCommentSubmit = async () => {
        if (!newComment.trim()) return;
        try {
            const response = await fetch(`${SERVER_URL}/tokens/${tokenId}/comments`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('zkPumpToken')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: newComment }),
            });
            const comment = await response.json();
            if (!response.ok) throw new Error(comment.error || 'Failed to add comment');
            setNewComment('');
        } catch (err) {
            setLocalError('Не вдалося зберегти коментар');
        }
    };

    const handleFastAction = (percentage) => {
        const balance = tradeType === 'buy' ? userBalance.usd : userBalance.tokens;
        const calculatedAmount = (balance * percentage) / 100;
        setAmount(calculatedAmount.toFixed(2));
    };

    const calculatePriceChange = React.useCallback(() => {
        if (!token.priceHistory || token.priceHistory.length < 2) return 0;
        const now = Math.floor(Date.now() / 1000);
        const twentyFourHoursAgo = now - 24 * 3600;
        const recentPrices = token.priceHistory.filter(
            p => p.time >= twentyFourHoursAgo && typeof p.close === 'number' && !isNaN(p.close)
        );
        if (recentPrices.length < 2) return 0;
        const oldestPrice = recentPrices[0].close;
        const newestPrice = recentPrices[recentPrices.length - 1].close;
        return oldestPrice ? ((newestPrice - oldestPrice) / oldestPrice) * 100 : 0;
    }, [token.priceHistory]);

    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const past = new Date(timestamp);
        const diffInSeconds = Math.floor((now - past) / 1000);
        if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
    };

    const marketCap = token.totalSupply * (token.currentPrice || 0);
    const price = parseFloat(token.currentPrice || 0).toFixed(6);
    const change24h = calculatePriceChange().toFixed(2);
    const displayBalance = pendingBalance || userBalance;

    return React.createElement(
        'div',
        { className: 'token-page-container container', style: { position: 'relative' } },
        React.createElement(
            'div',
            {
                className: 'notifications-container',
                style: { position: 'absolute', top: '0px', right: '-175px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' },
            },
            notifications.map(notification =>
                React.createElement(NotificationWidget, {
                    key: notification.id,
                    notification,
                    onClose: () => setNotifications(prev => prev.filter(n => n.id !== notification.id)),
                })
            )
        ),
        React.createElement(
            'div',
            { className: 'token-page-grid' },
            React.createElement(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: '20px' } },
                React.createElement(
                    'div',
                    { className: 'token-info-container inner-container', style: { padding: '15px', marginTop: '-30px', position: 'relative', transition: 'all 0.3s ease' } },
                    React.createElement(
                        'button',
                        {
                            onClick: () => setIsAboutOpen(!isAboutOpen),
                            className: 'btn-about',
                            style: { position: 'absolute', top: '10px', right: '10px', padding: '8px 12px', fontFamily: 'Orbitron, sans-serif', fontSize: '14px' },
                        },
                        'About'
                    ),
                    React.createElement(
                        'div',
                        { style: { display: 'flex', alignItems: 'center', gap: '16px' } },
                        React.createElement('img', {
                            src: token.image,
                            alt: token.name,
                            className: 'w-[130px] h-[130px] object-cover rounded-full token-image-fix',
                            style: { border: '2px solid #ff69b4', alignSelf: 'center' },
                        }),
                        React.createElement(
                            'div',
                            { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                            React.createElement(
                                'h2',
                                { style: { fontFamily: 'Orbitron, sans-serif', color: '#ffb6c1', fontSize: '24px', textShadow: '0 0 8px #ff00ff' } },
                                `${token.name} `,
                                React.createElement('span', { style: { fontSize: '18px' } }, `(${token.symbol})`)
                            ),
                            React.createElement(
                                'ul',
                                { style: { fontFamily: 'Exo 2, sans-serif', marginLeft: '10px', listStyleType: 'none' } },
                                React.createElement('li', null, 'Created by: ', React.createElement('span', { style: { color: '#ff69b4' } }, getNickname(token.creatorId, token.creatorNickname))),
                                React.createElement('li', null, `Market cap: ${formatMarketCap(marketCap)} PROVE`),
                                React.createElement('li', null, `Volume: ${formatVolume(calculatedVolume)} PROVE`),
                                React.createElement(
                                    'li',
                                    null,
                                    `Price: ${price} PROVE`,
                                    React.createElement(
                                        'span',
                                        { style: { marginLeft: '8px', color: change24h >= 0 ? '#28a745' : '#dc3545' } },
                                        `${change24h >= 0 ? '+' : ''}${change24h}%`
                                    )
                                )
                            )
                        )
                    )
                ),
                isAboutOpen && React.createElement(
                    'div',
                    { className: 'about-modal' },
                    React.createElement(
                        'div',
                        { className: 'about-modal-content' },
                        React.createElement('h3', { style: { fontFamily: 'Orbitron, sans-serif', color: '#ffb6c1', textShadow: '0 0 8px #ff00ff', marginBottom: '16px' } }, `About ${token.name}`),
                        React.createElement('p', { style: { fontFamily: 'Exo 2, sans-serif', fontSize: '14px' } }, token.about || 'No information available for this token.'),
                        React.createElement('button', { onClick: () => setIsAboutOpen(false), className: 'btn-simple', style: { marginTop: '16px', padding: '8px 12px', fontFamily: 'Orbitron, sans-serif' } }, 'Close')
                    )
                ),
                React.createElement(
                    'div',
                    { className: 'chart-wrapper inner-container', style: { marginTop: '-50px' } },
                    React.createElement(
                        'div',
                        { className: 'button-container', style: { paddingBottom: '0' } },
                        React.createElement(
                            'div',
                            { className: 'flex gap-6' },
                            ['1s', '1m', '5m', '15m', '1h'].map(tf =>
                                React.createElement(
                                    'button',
                                    { key: tf, onClick: () => setTimeframe(tf), className: `btn-timeframe ${timeframe === tf ? 'btn-timeframe-active' : ''}`, style: { fontFamily: 'Orbitron, sans-serif' } },
                                    tf
                                )
                            )
                        )
                    ),
                    React.createElement(
                        'div',
                        { className: 'chart-container', style: { marginLeft: '-15px', width: '1000px', height: '600px', border: '2px solid #ff00ff', borderRadius: '16px', overflow: 'hidden' } },
                        React.createElement('div', { ref: chartContainerRef })
                    )
                ),
                React.createElement(
                    'div',
                    { className: 'inner-container', style: { minHeight: '400px', padding: '15px', marginTop: '-10px', transition: 'all 0.3s ease' } },
                    React.createElement('h3', { style: { fontFamily: 'Orbitron, sans-serif', color: '#ffb6c1', textShadow: '0 0 8px #ff00ff', marginBottom: '8px' } }, 'Transactions'),
                    cachedTransactions.length === 0 ? React.createElement('p', { style: { fontFamily: 'Exo 2, sans-serif' } }, 'No transactions yet.') : React.createElement(
                        'div',
                        { className: 'transactions-container overflow-y-auto', style: { height: '534px', boxSizing: 'border-box', contain: 'strict' } },
                        React.createElement(
                            'div',
                            { style: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', borderBottom: '2px solid #ff69b4', paddingBottom: '8px' } },
                            React.createElement('span', null, 'Type'),
                            React.createElement('span', null, 'Wallet'),
                            React.createElement('span', null, 'Time'),
                            React.createElement('span', null, token.symbol),
                            React.createElement('span', null, 'PROVE'),
                            React.createElement('span', null, 'Price')
                        ),
                        cachedTransactions.map(tx => React.createElement(
                            'div',
                            { key: tx.id, style: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', padding: '8px 0', borderBottom: '2px solid #ff69b4', transition: 'all 0.3s ease' } },
                            React.createElement('span', { style: { padding: '4px 8px', borderRadius: '4px', background: tx.type === 'buy' ? '#28a745' : '#dc3545' } }, tx.type.toUpperCase()),
                            React.createElement('span', null, getNickname(tx.wallet, tx.nickname)),
                            React.createElement('span', null, formatTimeAgo(tx.timestamp)),
                            React.createElement('span', null, formatTokens(tx.tokens) || 'N/A'),
                            React.createElement('span', null, formatTokens(tx.amount) || '0'),
                            React.createElement('span', null, formatTokens(tx.price) || '0')
                        ))
                    )
                )
            ),
            React.createElement(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' } },
                React.createElement(
                    'div',
                    { className: 'inner-container', style: { minHeight: '300px', padding: '15px', position: 'relative', transition: 'all 0.3s ease' } },
                    React.createElement(
                        'div',
                        { style: { display: 'flex' } },
                        React.createElement('button', { onClick: () => setTradeType('buy'), className: `btn-buy ${tradeType === 'buy' ? 'active' : ''}`, style: { width: '50%', padding: '8px', fontFamily: 'Orbitron, sans-serif' } }, 'Buy'),
                        React.createElement('button', { onClick: () => setTradeType('sell'), className: `btn-sell ${tradeType === 'sell' ? 'active' : ''}`, style: { width: '50%', padding: '8px', fontFamily: 'Orbitron, sans-serif' } }, 'Sell')
                    ),
                    React.createElement(
                        'div',
                        { style: { padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' } },
                        React.createElement(
                            'div',
                            { style: { display: 'flex', justifyContent: 'space-between' } },
                            React.createElement('label', { style: { fontFamily: 'Exo 2, sans-serif' } }, 'Amount'),
                            React.createElement('div', { style: { fontFamily: 'Exo 2, sans-serif' } }, tradeType === 'buy' ? `Balance: ${formatTokens(displayBalance.usd)} PROVE` : `Balance: ${formatTokens(displayBalance.tokens)} ${token.symbol}`)
                        ),
                        React.createElement('input', {
                            type: 'number',
                            placeholder: '0.00',
                            value: amount,
                            onChange: (e) => {
                                let value = e.target.value;
                                if (value.startsWith('.')) value = '0' + value;
                                setAmount(value);
                            },
                            className: 'trade-input',
                            style: { width: '100%', padding: '8px', borderRadius: '8px' },
                        }),
                        React.createElement(
                            'div',
                            { className: 'fast-action-buttons' },
                            [10, 25, 50, 100].map(perc => React.createElement('button', { key: perc, onClick: () => handleFastAction(perc), className: `fast-action-button btn-percentage-${perc}`, style: { fontFamily: 'Orbitron, sans-serif' } }, `${perc}%`))
                        ),
                        React.createElement('button', { onClick: handleTrade, className: 'btn-trade', style: 'flex', padding: '8px', fontFamily: 'Orbitron, sans-serif', margin: '8px', borderRadius: '8px' }, 'Place trade'),
                        cooldownMessage && React.createElement(
                            'p',
                            { 
                                className: 'text-red-500 text-center', 
                                style: { 
                                    color: 'red', 
                                    marginTop: '8px', 
                                    position: 'absolute', 
                                    bottom: '15px', 
                                    left: '50%', 
                                    transform: 'translateX(-50%)', 
                                    width: '100%' 
                                } 
                            },
                            cooldownMessage
                        )
                    )
                ),
                React.createElement(
                    'div',
                    { className: 'inner-container', style: { minHeight: '485px', padding: '15px', transition: 'all 0.3s ease' } },
                    React.createElement('h3', { style: { fontFamily: 'Orbitron', color: '#ffb6c1', textShadow: '0 0 8px #ff00ff', marginBottom: '8px' } }, 'Holders'),
                    React.createElement(
                        'div',
                        { className: 'holders-container overflow-y-auto', style: { height: 'calc(100% - 40px)' } },
                        React.createElement(
                            'div',
                            { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', borderBottom: '2px solid #ff69b4', paddingBottom: '8px', fontFamily: 'Exo 2, sans-serif' } },
                            React.createElement('span', { style: { textAlign: 'center' } }, 'Wallet'),
                            React.createElement('span', { style: { textAlign: 'center' } }, 'Share'),
                            React.createElement('span', { style: { textAlign: 'center' } }, 'Amount')
                        ),
                        cachedHolders.length === 0 ? React.createElement('p', { style: { fontFamily: 'Exo 2, sans-serif', textAlign: 'center' } }, 'No holders yet.') : cachedHolders.map(holder => (
                            React.createElement(
                                'div',
                                { key: holder.id, style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', borderBottom: '2px solid #ff69b4', padding: '8px 0', fontFamily: 'Exo 2, sans-serif', transition: 'all 0.3s ease' } },
                                React.createElement('span', { style: { textAlign: 'center', color: '#ff69b4' } }, getNickname(holder.wallet)),
                                React.createElement('span', { style: { textAlign: 'center', transition: 'all 0.3s ease' } }, formatTokens(holder.share) + '%'),
                                React.createElement('span', { style: { textAlign: 'center', transition: 'all 0.3s ease' } }, formatTokens(holder.amount))
                            )
                        ))
                    )
                ),
                React.createElement(
                    'div',
                    { className: 'inner-container', style: { minHeight: '585px', padding: '15px', transition: 'all 0.3s ease' } },
                    React.createElement('h3', { style: { fontFamily: 'Orbitron, sans-serif', color: '#ffb6c1', textShadow: '0 0 8px #ff00ff', marginBottom: '8px' } }, 'Comments'),
                    React.createElement(
                        'div',
                        { style: { display: 'flex', gap: '8px', marginBottom: '16px' } },
                        React.createElement('input', { type: 'text', value: newComment, onChange: (e) => setNewComment(e.target.value), placeholder: 'Send message', style: { flexGrow: '1', padding: '8px', borderRadius: '8px' } }),
                        React.createElement('button', { onClick: handleCommentSubmit, className: 'btn-simple', style: { padding: '8px', fontFamily: 'Orbitron, sans-serif', borderRadius: '8px' } }, 'Send')
                    ),
                    React.createElement(
                        'div',
                        { className: 'comments-container overflow-y-auto', style: { height: 'calc(100% - 80px)' } },
                        comments.length === 0 ? React.createElement('p', { style: { fontFamily: 'Exo 2, sans-serif', fontSize: '14px' } }, 'No comments yet.') : comments.map(comment => React.createElement(
                            'div',
                            { key: comment.id, style: { marginBottom: '16px' } },
                            React.createElement(
                                'div',
                                { style: { display: 'flex', justifyContent: 'space-between', fontSize: '14px' } },
                                React.createElement('span', { style: { color: '#ff69b4' } }, getNickname(comment.userId)),
                                React.createElement('span', { style: { color: '#999' } }, formatTimeAgo(comment.timestamp))
                            ),
                            React.createElement('p', { style: { fontFamily: 'Exo 2, sans-serif', fontSize: '14px' } }, comment.content)
                        ))
                    )
                )
            )
        ),
        error && React.createElement('p', { className: 'text-red-500 text-center' }, error)
    );
}

export default TokenPage;