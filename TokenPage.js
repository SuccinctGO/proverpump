import { doc, getDoc, setDoc, collection, getDocs, onSnapshot, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { db } from './firebase-config.js';
import ChartLogic from './ChartLogic.js';
import NotificationWidget from './NotificationWidget.js';

const React = window.React;

const tokenLogic = {
    getBasePrice: (totalSupply) => 0.01,
    formatTokens: (value) => value.toFixed(2),
};

const timeframeIntervals = {
    '1s': 1,
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
};

function TokenPage({ userId, user, wallet, setWallet, setError, setView, tokenId }) {
    const getInitialToken = () => {
        return {
            id: tokenId,
            name: 'Unknown Token',
            symbol: 'UNK',
            totalSupply: 100_000_000,
            tokenSold: 0,
            initialPrice: 0.01,
            currentPrice: 0.01,
            volume: 0,
            priceHistory: [],
            creatorId: userId,
            creatorNickname: user.nickname || 'Unknown',
            image: 'https://via.placeholder.com/120',
            about: 'No information available.',
        };
    };

    const [token, setToken] = React.useState(getInitialToken());
    const [pool, setPool] = React.useState({
        usd: 20000,
        tokens: 2000000,
        k: 20000 * 2000000,
    });
    const [userBalance, setUserBalance] = React.useState({
        usd: 10000,
        tokens: 0,
    });
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
    const [candles, setCandles] = React.useState({});
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
        if (value >= 1_000_000_000) {
            return `${(value / 1_000_000_000).toFixed(2)}B`;
        } else if (value >= 1_000_000) {
            return `${(value / 1_000_000).toFixed(2)}M`;
        }
        return value.toFixed(2);
    };

    const formatVolume = (value) => {
        if (value >= 1000) {
            return `${(value / 1000).toFixed(1)}k`;
        }
        return value.toFixed(2);
    };

    const getPrice = () => pool.usd / pool.tokens;

    const chartLogic = ChartLogic({ timeframe, candles, transactions: visibleTransactions, chartContainerRef, isLoaded, setError });

    const validateTokenData = (tokenData) => {
        const validated = { ...tokenData };
        if (!validated.priceHistory) validated.priceHistory = [];
        if (!Array.isArray(validated.priceHistory)) validated.priceHistory = [];
        if (typeof validated.currentPrice !== 'number' || isNaN(validated.currentPrice)) validated.currentPrice = 0.01;
        if (typeof validated.tokenSold !== 'number' || isNaN(validated.tokenSold)) validated.tokenSold = 0;
        if (typeof validated.volume !== 'number' || isNaN(validated.volume)) validated.volume = 0;
        if (!validated.creatorNickname) validated.creatorNickname = user.nickname || 'Unknown';
        return validated;
    };

    const updateCandlesForTransaction = (transaction, currentCandles) => {
        const price = transaction.price;
        if (price <= 0 || isNaN(price) || price > 1_000_000) {
            console.warn('Invalid price for candle update:', price);
            return currentCandles;
        }
        const time = Math.floor(Date.now() / 1000);
        const newCandles = JSON.parse(JSON.stringify(currentCandles || {}));
        for (const tf of Object.keys(timeframeIntervals)) {
            const interval = timeframeIntervals[tf];
            const candleTime = Math.floor(time / interval) * interval;
            if (!newCandles[tf]) newCandles[tf] = {};
            if (!newCandles[tf][candleTime]) {
                const prevCandle = Object.values(newCandles[tf] || {})
                    .filter((c) => c.time < candleTime && chartLogic.validateCandle(c))
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
            if (tf === '1s') {
                const candle = newCandles[tf][candleTime];
                if (candle.high - candle.low < 0.0001) {
                    candle.high = Math.max(candle.open, candle.close) + 0.0001;
                    candle.low = Math.min(candle.open, candle.close) - 0.0001;
                }
            }
        }
        return newCandles;
    };

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
            .sort((a, b) => {
                if (a.amount === b.amount) return a.wallet.localeCompare(b.wallet);
                return b.amount - a.amount;
            });
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
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const nicknameMap = {};
            if (user && user.userId && user.nickname) {
                nicknameMap[user.userId] = user.nickname;
            }
            usersSnapshot.forEach(doc => {
                if (userIds.includes(doc.id)) {
                    const data = doc.data();
                    nicknameMap[doc.id] = data.nickname || 'Unknown';
                }
            });
            setNicknames(nicknameMap);
        } catch (err) {
            setLocalError('Не вдалося отримати нікнейми');
        }
    };

    const saveTokenToStorage = async (updatedToken) => {
        const tokenToSave = validateTokenData({
            ...updatedToken,
            currentPrice: updatedToken.currentPrice || getPrice(),
            priceHistory: updatedToken.priceHistory || [],
            tokenSold: updatedToken.tokenSold || 0,
            volume: updatedToken.volume || 0,
            creatorNickname: updatedToken.creatorNickname || user.nickname || 'Unknown',
        });
        try {
            await setDoc(doc(db, 'tokens', tokenId), tokenToSave, { merge: true });
        } catch (err) {
            setLocalError('Не вдалося зберегти дані токена');
        }
    };

    const saveTransaction = async (transaction) => {
        try {
            const transactionId = transaction.id;
            const userDoc = await getDoc(doc(db, 'users', transaction.wallet));
            const nickname = userDoc.exists() ? userDoc.data().nickname || transaction.wallet : transaction.wallet;
            await setDoc(doc(db, 'transactions', transactionId), {
                ...transaction,
                nickname: nickname,
                tokenId: tokenId,
                timestamp: serverTimestamp(),
            });
        } catch (err) {
            setLocalError('Не вдалося зберегти транзакцію');
        }
    };

    const saveState = async (newUserBalance, updatedPool, newCandles, newHolders) => {
        try {
            const validatedPool = {
                usd: typeof updatedPool.usd === 'number' && !isNaN(updatedPool.usd) ? updatedPool.usd : pool.usd,
                tokens: typeof updatedPool.tokens === 'number' && !isNaN(updatedPool.tokens) ? updatedPool.tokens : pool.tokens,
                k: (typeof updatedPool.usd === 'number' && typeof updatedPool.tokens === 'number')
                    ? updatedPool.usd * updatedPool.tokens
                    : pool.usd * pool.tokens,
            };
            const validatedCandles = newCandles || candles;
            const validatedHolders = newHolders || holders;
            const batch = writeBatch(db);
            batch.set(doc(db, 'tradingStates', tokenId), {
                pool: validatedPool,
                candles: validatedCandles,
                holders: validatedHolders,
            }, { merge: true });

            const walletData = {
                userId: userId,
                balance: typeof newUserBalance.usd === 'number' && !isNaN(newUserBalance.usd) ? newUserBalance.usd : 10000,
                tokens: [],
                tokenBalances: {
                    ...(wallet.tokenBalances || {}),
                    [tokenId]: typeof newUserBalance.tokens === 'number' && !isNaN(newUserBalance.tokens) ? newUserBalance.tokens : 0,
                },
            };
            batch.set(doc(db, 'wallets', userId), walletData, { merge: true });
            await batch.commit();
        } catch (err) {
            setLocalError('Не вдалося зберегти стан');
        }
    };

    const toggleAbout = () => {
        setIsAboutOpen(!isAboutOpen);
    };

    const loadState = async () => {
        try {
            const walletRef = doc(db, 'wallets', userId);
            const tokenRef = doc(db, 'tokens', tokenId);
            const commentsRef = collection(db, 'tokens', tokenId, 'comments');
            const transactionsRef = collection(db, 'transactions');
            const tradingStateRef = doc(db, 'tradingStates', tokenId);

            const [walletSnap, tokenSnap, commentsSnap, transactionsSnap, tradingStateSnap] = await Promise.all([
                getDoc(walletRef),
                getDoc(tokenRef),
                getDocs(commentsRef),
                getDocs(transactionsRef),
                getDoc(tradingStateRef),
            ]);

            const storedWallet = walletSnap.exists() ? walletSnap.data() : { balance: 10000, tokenBalances: {}, tokens: [] };
            const loadedToken = tokenSnap.exists() ? validateTokenData(tokenSnap.data()) : getInitialToken();
            const storedComments = commentsSnap.docs.map(doc => doc.data()).sort((a, b) => {
                const aTime = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
                const bTime = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
                return bTime - aTime;
            });
            const storedTransactions = transactionsSnap.docs
                .map(doc => doc.data())
                .filter(tx => tx.tokenId === tokenId);
            const state = tradingStateSnap.exists() ? tradingStateSnap.data() : { pool: pool, candles: {}, holders: [] };

            const sortedTransactions = storedTransactions.sort((a, b) => {
                const aTime = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
                const bTime = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
                return bTime - aTime;
            });
            let loadedPool = state.pool || pool;

            if (!loadedPool.usd || !loadedPool.tokens || !loadedPool.k || loadedPool.k !== loadedPool.usd * loadedPool.tokens) {
                const tokensInPool = loadedPool.tokens || pool.tokens;
                const currentPrice = loadedToken.currentPrice || loadedPool.usd / loadedPool.tokens || 0.01;
                loadedPool = {
                    usd: currentPrice * tokensInPool,
                    tokens: tokensInPool,
                    k: currentPrice * tokensInPool * tokensInPool,
                };
            }
            const currentPrice = loadedPool.usd / loadedPool.tokens;

            const loadedCandles = state.candles || {};
            const loadedHolders = state.holders || updateHolders(sortedTransactions);

            setPool(loadedPool);
            const newBalance = {
                usd: storedWallet.balance || 10000,
                tokens: storedWallet.tokenBalances?.[tokenId] || 0,
            };
            setUserBalance(newBalance);
            setPendingBalance(newBalance);

            setToken((prev) => ({
                ...prev,
                ...loadedToken,
                currentPrice: currentPrice,
                tokenSold: loadedToken.tokenSold || 0,
                volume: sortedTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0),
                creatorNickname: loadedToken.creatorNickname || user.nickname || 'Unknown',
            }));

            setCandles(loadedCandles);
            setWallet({
                ...wallet,
                address: userId,
                balance: storedWallet.balance,
                tokens: storedWallet.tokens || [],
                tokenBalances: { ...wallet.tokenBalances, [tokenId]: storedWallet.tokenBalances?.[tokenId] || 0 },
            });

            setVisibleTransactions(sortedTransactions);
            setHolders(loadedHolders);
            setComments(storedComments);
            setIsLoaded(true);

            const userIds = [
                ...new Set([
                    loadedToken.creatorId,
                    ...loadedHolders.map(h => h.wallet),
                    ...storedComments.map(c => c.userId),
                    ...sortedTransactions.map(tx => tx.wallet),
                ]),
            ].filter(id => id);
            if (userIds.length > 0) {
                fetchNicknames(userIds);
            }
        } catch (err) {
            setLocalError('Не вдалося завантажити дані токена');
            setIsLoaded(true);
        }
    };

    const cachedTransactions = React.useMemo(() => {
        const allTransactions = [...pendingTransactions, ...visibleTransactions];
        const uniqueTransactions = [];
        const seenIds = new Set();
        for (const tx of allTransactions) {
            if (!seenIds.has(tx.id)) {
                seenIds.add(tx.id);
                uniqueTransactions.push(tx);
            }
        }
        return uniqueTransactions.sort((a, b) => {
            const aTime = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : a.time || 0;
            const bTime = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : b.time || 0;
            return bTime - aTime;
        });
    }, [visibleTransactions, pendingTransactions]);

    React.useEffect(() => {
        loadState();

        const tokenRef = doc(db, 'tokens', tokenId);
        const unsubscribeToken = onSnapshot(tokenRef, (doc) => {
            if (doc.exists()) {
                const updatedToken = validateTokenData(doc.data());
                setToken((prev) => ({
                    ...prev,
                    ...updatedToken,
                    currentPrice: updatedToken.currentPrice || getPrice(),
                    volume: calculatedVolume,
                    creatorNickname: updatedToken.creatorNickname || user.nickname || 'Unknown',
                }));
            }
        }, () => {
            setLocalError('Не вдалося завантажити оновлення токена');
        });

        const tradingStateRef = doc(db, 'tradingStates', tokenId);
        const unsubscribeTradingState = onSnapshot(tradingStateRef, (doc) => {
            if (doc.exists()) {
                const state = doc.data();
                const updatedPool = state.pool || pool;
                if (updatedPool.k !== updatedPool.usd * updatedPool.tokens) {
                    updatedPool.k = updatedPool.usd * updatedPool.tokens;
                }
                const updatedCandles = state.candles || {};
                setPool(updatedPool);
                setCandles(updatedCandles);
                setToken((prev) => ({
                    ...prev,
                    currentPrice: updatedPool.usd / updatedPool.tokens,
                    volume: calculatedVolume,
                    creatorNickname: prev.creatorNickname || user.nickname || 'Unknown',
                }));
            }
        }, () => {
            setLocalError('Не вдалося завантажити оновлення стану торгівлі');
        });

        const transactionsRef = collection(db, 'transactions');
        const unsubscribeTransactions = onSnapshot(transactionsRef, (snapshot) => {
            const serverTransactions = snapshot.docs
                .map(doc => ({
                    ...doc.data(),
                    _isLocal: false,
                }))
                .filter(tx => tx.tokenId === tokenId);
            setVisibleTransactions((prev) => {
                const localTxs = prev.filter(tx => tx._isLocal);
                const merged = [...localTxs, ...serverTransactions];
                const unique = [];
                const seenIds = new Set();
                for (const tx of merged) {
                    if (!seenIds.has(tx.id)) {
                        seenIds.add(tx.id);
                        unique.push(tx);
                    }
                }
                return unique.sort((a, b) => {
                    const aTime = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.time || 0);
                    const bTime = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.time || 0);
                    return bTime - aTime;
                });
            });
            setPendingTransactions((prev) => {
                const remaining = prev.filter(tx => !serverTransactions.some(stx => stx.id === tx.id));
                return remaining;
            });
            const newUserIds = [
                ...new Set(serverTransactions.map(tx => tx.wallet)),
            ].filter(id => id);
            if (newUserIds.length > 0) {
                fetchNicknames(newUserIds);
            }
        }, () => {
            setLocalError('Не вдалося завантажити транзакції');
        });

        const commentsRef = collection(db, 'tokens', tokenId, 'comments');
        const unsubscribeComments = onSnapshot(commentsRef, (snapshot) => {
            const updatedComments = snapshot.docs.map(doc => doc.data());
            setComments(updatedComments.sort((a, b) => {
                const aTime = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
                const bTime = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
                return bTime - aTime;
            }));
            const newUserIds = [
                ...new Set(updatedComments.map(c => c.userId)),
            ].filter(id => id);
            if (newUserIds.length > 0) {
                fetchNicknames(newUserIds);
            }
        }, () => {
            setLocalError('Не вдалося завантажити коментарі');
        });

        return () => {
            unsubscribeToken();
            unsubscribeTradingState();
            unsubscribeTransactions();
            unsubscribeComments();
        };
    }, [tokenId, userId, calculatedVolume, user.nickname]);

    React.useEffect(() => {
        if (notifications.length > 0) {
            const timer = setTimeout(() => {
                setNotifications((prev) => prev.slice(1));
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notifications]);

    React.useEffect(() => {
        if (cooldownMessage) {
            const timer = setTimeout(() => {
                setCooldownMessage('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [cooldownMessage]);

    const buyTokens = (usdAmount) => {
        const currentTime = Date.now();
        if (currentTime - lastTradeTime < 5000) {
            setCooldownMessage('Wait 5 seconds before the next transaction');
            return;
        }
        if (usdAmount <= 0 || usdAmount > userBalance.usd) {
            setLocalError('Невірна сума PROVE або недостатній баланс');
            return;
        }
        const fee = usdAmount * 0.003;
        const effectiveUsd = usdAmount - fee;
        let correctedPool = { ...pool };
        if (correctedPool.k !== correctedPool.usd * correctedPool.tokens || correctedPool.usd <= 0 || correctedPool.tokens <= 0) {
            const currentPrice = getPrice() || 0.01;
            correctedPool = {
                usd: currentPrice * correctedPool.tokens,
                tokens: correctedPool.tokens || 2_000_000,
                k: currentPrice * (correctedPool.tokens || 2_000_000) * (correctedPool.tokens || 2_000_000),
            };
        }
        const newUsd = correctedPool.usd + effectiveUsd;
        const newTokens = correctedPool.k / newUsd;
        if (newTokens <= 0 || isNaN(newTokens)) {
            setLocalError('Невірна кількість токенів. Спробуйте ще раз.');
            return;
        }
        const tokensReceived = correctedPool.tokens - newTokens;
        if (tokensReceived <= 0 || isNaN(tokensReceived)) {
            setLocalError('Невірна кількість отриманих токенів. Спробуйте ще раз.');
            return;
        }
        const price = newUsd / newTokens;
        if (price < 0.0001 || isNaN(price) || price > 1_000_000) {
            setLocalError('Виявлено невірну ціну. Спробуйте ще раз.');
            return;
        }
        const formattedPrice = price.toFixed(6).replace(/^(\.\d+)/, '0$1');

        const newPool = { usd: newUsd, tokens: newTokens, k: newUsd * newTokens };
        const transactionId = Date.now().toString();
        const transaction = {
            id: transactionId,
            type: 'buy',
            wallet: wallet.address || userId,
            amount: usdAmount,
            tokens: tokensReceived,
            price: parseFloat(formattedPrice),
            tokenId: tokenId,
            tokenSymbol: token.symbol,
            tokenName: token.name,
            nickname: user.nickname || 'Unknown',
            _isLocal: true,
        };

        const newUserBalance = {
            usd: userBalance.usd - usdAmount,
            tokens: userBalance.tokens + tokensReceived,
        };

        const newToken = {
            ...token,
            currentPrice: parseFloat(formattedPrice),
            tokenSold: (token.tokenSold || 0) + tokensReceived,
            volume: calculatedVolume + usdAmount,
            priceHistory: [
                ...(token.priceHistory || []),
                {
                    time: Math.floor(Date.now() / 1000),
                    open: parseFloat(formattedPrice),
                    high: parseFloat(formattedPrice),
                    low: parseFloat(formattedPrice),
                    close: parseFloat(formattedPrice),
                    volume: usdAmount,
                },
            ],
            creatorNickname: token.creatorNickname || user.nickname || 'Unknown',
        };

        const newCandles = updateCandlesForTransaction(transaction, candles);

        setTimeout(() => {
            setPool(newPool);
            setPendingBalance(newUserBalance);
            setToken(newToken);
            setPendingTransactions((prev) => [...prev, transaction]);
            setWallet((prev) => ({
                ...prev,
                balance: newUserBalance.usd,
                tokens: prev.tokens || [],
                tokenBalances: { ...prev.tokenBalances, [tokenId]: newUserBalance.tokens },
                userId: userId,
            }));
            setNotifications((prev) => [{
                id: Date.now(),
                type: 'buy',
                amount: tokensReceived,
                currency: token.symbol,
                timestamp: Date.now(),
            }, ...prev]);
            setCandles(newCandles);
            setLastTradeTime(currentTime);
        }, 0);

        saveTokenToStorage(newToken);
        saveTransaction(transaction);
        saveState(newUserBalance, newPool, newCandles, cachedHolders);
    };

    const sellTokens = (tokenAmount) => {
        const currentTime = Date.now();
        if (currentTime - lastTradeTime < 5000) {
            setCooldownMessage('Wait 5 seconds before the next transaction');
            return;
        }
        if (tokenAmount <= 0 || tokenAmount > userBalance.tokens) {
            setLocalError('Невірна кількість токенів або недостатній баланс');
            return;
        }
        const fee = tokenAmount * 0.003;
        const effectiveTokens = tokenAmount - fee;
        let correctedPool = { ...pool };
        if (correctedPool.k !== correctedPool.usd * correctedPool.tokens || correctedPool.usd <= 0 || correctedPool.tokens <= 0) {
            const currentPrice = getPrice() || 0.01;
            correctedPool = {
                usd: currentPrice * correctedPool.tokens,
                tokens: correctedPool.tokens || 2_000_000,
                k: currentPrice * (correctedPool.tokens || 2_000_000) * (correctedPool.tokens || 2_000_000),
            };
        }
        const newTokens = correctedPool.tokens + effectiveTokens;
        if (newTokens <= 0 || isNaN(newTokens)) {
            setLocalError('Невірна кількість токенів. Спробуйте ще раз.');
            return;
        }
        const newUsd = correctedPool.k / newTokens;
        if (isNaN(newUsd)) {
            setLocalError('Невірна сума PROVE. Спробуйте ще раз.');
            return;
        }
        const usdReceived = correctedPool.usd - newUsd;
        if (usdReceived <= 0 || isNaN(usdReceived)) {
            setLocalError('Невірна сума отриманих PROVE. Спробуйте ще раз.');
            return;
        }
        const price = newUsd / newTokens;
        if (price < 0.0001 || isNaN(price) || price > 1_000_000) {
            setLocalError('Виявлено невірну ціну.');
            return;
        }
        const formattedPrice = price.toFixed(6).replace(/^(\.\d+)/, '0$1');

        const newPool = { usd: newUsd, tokens: newTokens, k: newUsd * newTokens };
        const transactionId = Date.now().toString();
        const transaction = {
            id: transactionId,
            type: 'sell',
            wallet: wallet.address || userId,
            amount: usdReceived,
            tokens: tokenAmount,
            price: parseFloat(formattedPrice),
            tokenId: tokenId,
            tokenSymbol: token.symbol,
            tokenName: token.name,
            nickname: user.nickname || 'Unknown',
            _isLocal: true,
        };

        const newUserBalance = {
            usd: userBalance.usd + usdReceived,
            tokens: userBalance.tokens - tokenAmount,
        };

        const newToken = {
            ...token,
            currentPrice: parseFloat(formattedPrice),
            tokenSold: (token.tokenSold || 0) - tokenAmount,
            volume: calculatedVolume + usdReceived,
            priceHistory: [
                ...(token.priceHistory || []),
                {
                    time: Math.floor(Date.now() / 1000),
                    open: parseFloat(formattedPrice),
                    high: parseFloat(formattedPrice),
                    low: parseFloat(formattedPrice),
                    close: parseFloat(formattedPrice),
                    volume: usdReceived,
                },
            ],
            creatorNickname: token.creatorNickname || user.nickname || 'Unknown',
        };

        const newCandles = updateCandlesForTransaction(transaction, candles);

        setTimeout(() => {
            setPool(newPool);
            setPendingBalance(newUserBalance);
            setToken(newToken);
            setPendingTransactions((prev) => [...prev, transaction]);
            setWallet((prev) => ({
                ...prev,
                balance: newUserBalance.usd,
                tokens: prev.tokens || [],
                tokenBalances: { ...prev.tokenBalances, [tokenId]: newUserBalance.tokens },
                userId: userId,
            }));
            setNotifications((prev) => [{
                id: Date.now(),
                type: 'sell',
                amount: tokenAmount,
                currency: token.symbol,
                timestamp: Date.now(),
            }, ...prev]);
            setCandles(newCandles);
            setLastTradeTime(currentTime);
        }, 0);

        saveTokenToStorage(newToken);
        saveTransaction(transaction);
        saveState(newUserBalance, newPool, newCandles, cachedHolders);
    };

    const handleTrade = () => {
        const amountValue = parseFloat(amount);
        if (isNaN(amountValue) || amountValue <= 0) {
            setLocalError('Будь ласка, введіть правильну суму');
            return;
        }
        if (tradeType === 'buy') {
            buyTokens(amountValue);
        } else {
            sellTokens(amountValue);
        }
        setAmount('');
    };

    const handleCommentSubmit = async () => {
        if (!newComment.trim()) return;
        const commentId = Date.now();
        const comment = {
            id: commentId,
            userId,
            username: user.nickname || 'Unknown',
            content: newComment,
            timestamp: serverTimestamp(),
        };
        try {
            await setDoc(doc(db, 'tokens', tokenId, 'comments', commentId.toString()), comment);
            setComments((prev) => {
                if (prev.some(c => c.id === comment.id)) {
                    return prev;
                }
                return [comment, ...prev].sort((a, b) => {
                    const aTime = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
                    const bTime = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
                    return bTime - aTime;
                });
            });
            setNewComment('');
            if (!nicknames[userId]) {
                fetchNicknames([userId]);
            }
        } catch (err) {
            setLocalError('Не вдалося зберегти коментар');
        }
    };

    const handleFastAction = (percentage) => {
        const balance = tradeType === 'buy' ? userBalance.usd : userBalance.tokens;
        const calculatedAmount = (balance * percentage) / 100;
        const formattedAmount = calculatedAmount.toFixed(2).replace(/^(\.\d+)/, '0$1');
        setAmount(formattedAmount);
    };

    const calculatePriceChange = React.useCallback(() => {
        if (!token.priceHistory || token.priceHistory.length < 2) return 0;
        const now = Math.floor(Date.now() / 1000);
        const twentyFourHoursAgo = now - 24 * 3600;
        const recentPrices = token.priceHistory.filter(
            (p) => p.time >= twentyFourHoursAgo && typeof p.close === 'number' && !isNaN(p.close)
        );
        if (recentPrices.length < 2) return 0;
        const oldestPrice = recentPrices[0].close;
        const newestPrice = recentPrices[recentPrices.length - 1].close;
        if (oldestPrice === 0) return 0;
        return ((newestPrice - oldestPrice) / oldestPrice) * 100;
    }, [token.priceHistory]);

    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const past = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
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
    const price = (token.currentPrice || 0).toFixed(6);
    const change24h = calculatePriceChange().toFixed(2);
    const displayBalance = pendingBalance || userBalance;

    return React.createElement(
        'div',
        { className: 'token-page-container container', style: { position: 'relative' } },
        React.createElement(
            'div',
            {
                className: 'notifications-container',
                style: {
                    position: 'absolute',
                    top: '0px',
                    right: '-175px',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                },
            },
            notifications.map((notification) =>
                React.createElement(NotificationWidget, {
                    key: notification.id,
                    notification,
                    onClose: () => setNotifications((prev) => prev.filter(n => n.id !== notification.id)),
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
                    {
                        className: 'token-info-container inner-container',
                        style: { padding: '15px', marginTop: '-30px', position: 'relative', transition: 'all 0.3s ease' },
                    },
                    React.createElement(
                        'button',
                        {
                            onClick: toggleAbout,
                            className: 'btn-about',
                            style: {
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                padding: '8px 12px',
                                fontFamily: 'Orbitron, sans-serif',
                                fontSize: '14px',
                            },
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
                                {
                                    style: {
                                        fontFamily: 'Orbitron, sans-serif',
                                        color: '#ffb6c1',
                                        fontSize: '24px',
                                        textShadow: '0 0 8px #ff00ff',
                                    },
                                },
                                `${token.name} `,
                                React.createElement('span', { style: { fontSize: '18px' } }, `(${token.symbol})`)
                            ),
                            React.createElement(
                                'ul',
                                { style: { fontFamily: 'Exo 2, sans-serif', marginLeft: '10px', listStyleType: 'none' } },
                                React.createElement(
                                    'li',
                                    null,
                                    'Created by: ',
                                    React.createElement('span', { style: { color: '#ff69b4' } }, getNickname(token.creatorId, token.creatorNickname))
                                ),
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
                isAboutOpen &&
                    React.createElement(
                        'div',
                        { className: 'about-modal' },
                        React.createElement(
                            'div',
                            { className: 'about-modal-content' },
                            React.createElement(
                                'h3',
                                {
                                    style: {
                                        fontFamily: 'Orbitron, sans-serif',
                                        color: '#ffb6c1',
                                        textShadow: '0 0 8px #ff00ff',
                                        marginBottom: '16px',
                                    },
                                },
                                `About ${token.name}`
                            ),
                            React.createElement(
                                'p',
                                { style: { fontFamily: 'Exo 2, sans-serif', fontSize: '14px' } },
                                token.about || 'No information available for this token.'
                            ),
                            React.createElement(
                                'button',
                                {
                                    onClick: toggleAbout,
                                    className: 'btn-simple',
                                    style: { marginTop: '16px', padding: '8px 12px', fontFamily: 'Orbitron, sans-serif' },
                                },
                                'Close'
                            )
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
                            ['1s', '1m', '5m', '15m', '1h'].map((tf) =>
                                React.createElement(
                                    'button',
                                    {
                                        key: tf,
                                        onClick: () => setTimeframe(tf),
                                        className: `btn-timeframe ${timeframe === tf ? 'btn-timeframe-active' : ''}`,
                                        style: { fontFamily: 'Orbitron, sans-serif' },
                                    },
                                    tf
                                )
                            )
                        )
                    ),
                    React.createElement(
                        'div',
                        {
                            className: 'chart-container',
                            style: { marginLeft: '-15px', width: '1000px', height: '600px', border: '2px solid #ff00ff', borderRadius: '16px', overflow: 'hidden' },
                        },
                        React.createElement('div', { ref: chartContainerRef })
                    )
                ),
                React.createElement(
                    'div',
                    { className: 'inner-container', style: { minHeight: '400px', padding: '15px', marginTop: '-10px', transition: 'all 0.3s ease' } },
                    React.createElement(
                        'h3',
                        {
                            style: {
                                fontFamily: 'Orbitron, sans-serif',
                                color: '#ffb6c1',
                                textShadow: '0 0 8px #ff00ff',
                                marginBottom: '8px',
                            },
                        },
                        'Transactions'
                    ),
                    cachedTransactions.length === 0
                        ? React.createElement('p', { style: { fontFamily: 'Exo 2, sans-serif' } }, 'No transactions yet.')
                        : React.createElement(
                              'div',
                              {
                                  className: 'transactions-container overflow-y-auto',
                                  style: { height: '534px', boxSizing: 'border-box', contain: 'strict' },
                              },
                              React.createElement(
                                  'div',
                                  {
                                      style: {
                                          display: 'grid',
                                          gridTemplateColumns: 'repeat(6, 1fr)',
                                          gap: '16px',
                                          borderBottom: '2px solid #ff69b4',
                                          paddingBottom: '8px',
                                      },
                                  },
                                  React.createElement('span', null, 'Type'),
                                  React.createElement('span', null, 'Wallet'),
                                  React.createElement('span', null, 'Time'),
                                  React.createElement('span', null, token.symbol),
                                  React.createElement('span', null, 'PROVE'),
                                  React.createElement('span', null, 'Price')
                              ),
                              cachedTransactions.map((tx) =>
                                  React.createElement(
                                      'div',
                                      {
                                          key: tx.id,
                                          style: {
                                              display: 'grid',
                                              gridTemplateColumns: 'repeat(6, 1fr)',
                                              gap: '16px',
                                              padding: '8px 0',
                                              borderBottom: '2px solid #ff69b4',
                                              transition: 'all 0.3s ease',
                                          },
                                      },
                                      React.createElement(
                                          'span',
                                          {
                                              style: {
                                                  padding: '4px 8px',
                                                  borderRadius: '4px',
                                                  background:
                                                      tx.type === 'buy'
                                                          ? '#28a745'
                                                          : tx.type === 'sell'
                                                          ? '#dc3545'
                                                          : '#00b7eb',
                                              },
                                          },
                                          tx.type.toUpperCase()
                                      ),
                                      React.createElement('span', null, getNickname(tx.wallet, tx.nickname)),
                                      React.createElement('span', null, formatTimeAgo(tx.timestamp)),
                                      React.createElement('span', null, formatTokens(tx.tokens) || 'N/A'),
                                      React.createElement('span', null, (tx.amount || 0).toFixed(2)),
                                      React.createElement('span', null, (tx.price || 0).toFixed(6))
                                  )
                              )
                          )
                )
            ),
            React.createElement(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' } },
                React.createElement(
                    'div',
                    { className: 'inner-container', style: { minHeight: '300px', padding: '15px', transition: 'all 0.3s ease', position: 'relative' } },
                    React.createElement(
                        'div',
                        { style: { display: 'flex' } },
                        React.createElement(
                            'button',
                            {
                                onClick: () => setTradeType('buy'),
                                className: `btn-buy ${tradeType === 'buy' ? 'active' : ''}`,
                                style: { width: '50%', padding: '8px', fontFamily: 'Orbitron, sans-serif' },
                            },
                            'Buy'
                        ),
                        React.createElement(
                            'button',
                            {
                                onClick: () => setTradeType('sell'),
                                className: `btn-sell ${tradeType === 'sell' ? 'active' : ''}`,
                                style: { width: '50%', padding: '8px', fontFamily: 'Orbitron, sans-serif' },
                            },
                            'Sell'
                        )
                    ),
                    React.createElement(
                        'div',
                        { style: { padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' } },
                        React.createElement(
                            'div',
                            { style: { display: 'flex', justifyContent: 'space-between' } },
                            React.createElement('label', { style: { fontFamily: 'Exo 2, sans-serif' } }, 'Amount'),
                            React.createElement(
                                'div',
                                { style: { fontFamily: 'Exo 2, sans-serif' } },
                                tradeType === 'buy'
                                    ? `Balance: ${displayBalance.usd.toFixed(2)} PROVE`
                                    : `Balance: ${formatTokens(displayBalance.tokens)} ${token.symbol}`
                            )
                        ),
                        React.createElement('input', {
                            type: 'number',
                            placeholder: '0.00',
                            value: amount,
                            onChange: (e) => {
                                let value = e.target.value;
                                if (value.startsWith('.')) {
                                    value = '0' + value;
                                }
                                setAmount(value);
                            },
                            className: 'trade-input',
                            style: { width: '100%', padding: '8px', borderRadius: '8px' },
                        }),
                        React.createElement(
                            'div',
                            { className: 'fast-action-buttons' },
                            [10, 25, 50, 100].map((perc) =>
                                React.createElement(
                                    'button',
                                    {
                                        key: perc,
                                        onClick: () => handleFastAction(perc),
                                        className: `fast-action-button btn-percentage-${perc}`,
                                        style: { fontFamily: 'Orbitron, sans-serif' },
                                    },
                                    `${perc}%`
                                )
                            )
                        ),
                        React.createElement(
                            'button',
                            {
                                onClick: handleTrade,
                                className: 'btn-trade',
                                style: { padding: '8px', fontFamily: 'Orbitron, sans-serif', borderRadius: '8px' },
                            },
                            'Place trade'
                        ),
                        cooldownMessage && React.createElement(
                            'p',
                            {
                                className: 'text-red-500 text-center',
                                style: {
                                    fontFamily: 'Exo 2, sans-serif',
                                    marginTop: '8px',
                                    position: 'absolute',
                                    bottom: '15px',
                                    left: '55%',
                                    transform: 'translateX(-50%)',
                                    width: '100%',
                                },
                            },
                            cooldownMessage
                        )
                    )
                ),
                React.createElement(
                    'div',
                    { className: 'inner-container', style: { minHeight: '485px', padding: '15px', transition: 'all 0.3s ease' } },
                    React.createElement(
                        'h3',
                        {
                            style: {
                                fontFamily: 'Orbitron, sans-serif',
                                color: '#ffb6c1',
                                textShadow: '0 0 8px #ff00ff',
                                marginBottom: '8px',
                            },
                        },
                        'Holders'
                    ),
                    React.createElement(
                        'div',
                        { className: 'holders-container overflow-y-auto', style: { height: 'calc(100% - 40px)' } },
                        React.createElement(
                            'div',
                            {
                                style: {
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr',
                                    gap: '8px',
                                    borderBottom: '2px solid #ff69b4',
                                    paddingBottom: '8px',
                                    fontFamily: 'Exo 2, sans-serif',
                                },
                            },
                            React.createElement('span', { style: { textAlign: 'center' } }, 'Wallet'),
                            React.createElement('span', { style: { textAlign: 'center' } }, 'Share'),
                            React.createElement('span', { style: { textAlign: 'center' } }, 'Amount')
                        ),
                        cachedHolders.length === 0
                            ? React.createElement(
                                  'p',
                                  { style: { fontFamily: 'Exo 2, sans-serif', textAlign: 'center' } },
                                  'No holders yet.'
                              )
                            : cachedHolders.map((holder) =>
                                  React.createElement(
                                      'div',
                                      {
                                          key: holder.id,
                                          style: {
                                              display: 'grid',
                                              gridTemplateColumns: '1fr 1fr 1fr',
                                              gap: '8px',
                                              borderBottom: '2px solid #ff69b4',
                                              padding: '8px 0',
                                              fontFamily: 'Exo 2, sans-serif',
                                              transition: 'all 0.3s ease',
                                          },
                                      },
                                      React.createElement(
                                          'span',
                                          { style: { textAlign: 'center', color: '#ff69b4' } },
                                          getNickname(holder.wallet)
                                      ),
                                      React.createElement(
                                          'span',
                                          { style: { textAlign: 'center', transition: 'all 0.3s ease' } },
                                          holder.share.toFixed(6) + '%'
                                      ),
                                      React.createElement(
                                          'span',
                                          { style: { textAlign: 'center', transition: 'all 0.3s ease' } },
                                          formatTokens(holder.amount)
                                      )
                                  )
                              )
                    )
                ),
                React.createElement(
                    'div',
                    { className: 'inner-container', style: { minHeight: '585px', padding: '15px', transition: 'all 0.3s ease' } },
                    React.createElement(
                        'h3',
                        {
                            style: {
                                fontFamily: 'Orbitron, sans-serif',
                                color: '#ffb6c1',
                                textShadow: '0 0 8px #ff00ff',
                                marginBottom: '8px',
                            },
                        },
                        'Comments'
                    ),
                    React.createElement(
                        'div',
                        { style: { display: 'flex', gap: '8px', marginBottom: '16px' } },
                        React.createElement('input', {
                            type: 'text',
                            value: newComment,
                            onChange: (e) => setNewComment(e.target.value),
                            placeholder: 'Send message',
                            style: { flexGrow: '1', padding: '8px', borderRadius: '8px' },
                        }),
                        React.createElement(
                            'button',
                            {
                                onClick: handleCommentSubmit,
                                className: 'btn-simple',
                                style: { padding: '8px', fontFamily: 'Orbitron, sans-serif', borderRadius: '8px' },
                            },
                            'Send'
                        )
                    ),
                    React.createElement(
                        'div',
                        { className: 'comments-container overflow-y-auto', style: { height: 'calc(100% - 80px)' } },
                        comments.length === 0
                            ? React.createElement(
                                  'p',
                                  { style: { fontFamily: 'Exo 2, sans-serif', fontSize: '14px' } },
                                  'No comments yet.'
                              )
                            : comments.map((comment) =>
                                  React.createElement(
                                      'div',
                                      {
                                          key: comment.id,
                                          style: { marginBottom: '16px' },
                                      },
                                      React.createElement(
                                          'div',
                                          { style: { display: 'flex', justifyContent: 'space-between', fontSize: '14px' } },
                                          React.createElement('span', { style: { color: '#ff69b4' } }, getNickname(comment.userId)),
                                          React.createElement('span', { style: { color: '#999' } }, formatTimeAgo(comment.timestamp))
                                      ),
                                      React.createElement(
                                          'p',
                                          { style: { fontFamily: 'Exo 2, sans-serif', fontSize: '14px' } },
                                          comment.content
                                      )
                                  )
                              )
                    )
                )
            )
        ),
        error && React.createElement('p', { className: 'text-red-500 text-center' }, error)
    );
}

export default TokenPage;