import { collection, getDocs, query, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { db } from './firebase-config.js';
import ProveWidget from './ProveWidget.js';

const React = window.React;

function Dashboard({ setSelectedTokenId, setView, tokens, user, setWallet }) {
    const [search, setSearch] = React.useState('');
    const [sortBy, setSortBy] = React.useState('createdAt');
    const [currentPage, setCurrentPage] = React.useState(1);
    const [recentTransactions, setRecentTransactions] = React.useState([]);
    const [nicknames, setNicknames] = React.useState({});
    const [isLoadingNicknames, setIsLoadingNicknames] = React.useState(true);
    const [error, setError] = React.useState('');
    const [showWidget, setShowWidget] = React.useState(false);
    const [buttonPosition, setButtonPosition] = React.useState(() => {
        const savedPosition = localStorage.getItem('proveButtonPosition');
        return savedPosition ? JSON.parse(savedPosition) : { bottom: '20px', left: '20px' };
    });
    const [isDragging, setIsDragging] = React.useState(false);
    const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
    const tokensPerPage = 16;

    const cacheToken = (token) => {
        localStorage.setItem(`token_${token.id}`, JSON.stringify(token));
    };

    const getCachedToken = (tokenId) => {
        const cached = localStorage.getItem(`token_${tokenId}`);
        return cached ? JSON.parse(cached) : null;
    };

    React.useEffect(() => {
        const loadTransactions = async () => {
            try {
                const transactionsQuery = query(
                    collection(db, 'transactions'),
                    orderBy('timestamp', 'desc'),
                    limit(3)
                );
                const snapshot = await getDocs(transactionsQuery);
                const allTransactions = snapshot.docs.map(doc => doc.data());
                setRecentTransactions(allTransactions);
            } catch (err) {
                setError('Failed to load transactions');
            }
        };

        const fetchNicknames = async () => {
            try {
                const userIds = [
                    ...new Set([
                        ...(Array.isArray(tokens) ? tokens.map(token => token.creatorId) : []),
                        ...recentTransactions.map(tx => tx.wallet),
                    ]),
                ].filter(id => id);
                if (userIds.length === 0) {
                    setIsLoadingNicknames(false);
                    return;
                }
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
                setIsLoadingNicknames(false);
            } catch (err) {
                setError('Failed to load nicknames');
                setIsLoadingNicknames(false);
            }
        };

        loadTransactions();
        if (Array.isArray(tokens) && tokens.length > 0) {
            fetchNicknames();
        } else {
            setIsLoadingNicknames(false);
        }
    }, [tokens, user]);

    React.useEffect(() => {
        if (recentTransactions.length > 0) {
            const fetchNicknamesForTransactions = async () => {
                try {
                    const userIds = [
                        ...new Set([
                            ...(Array.isArray(tokens) ? tokens.map(token => token.creatorId) : []),
                            ...recentTransactions.map(tx => tx.wallet),
                        ]),
                    ].filter(id => id);
                    if (userIds.length === 0) {
                        setIsLoadingNicknames(false);
                        return;
                    }
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
                    setIsLoadingNicknames(false);
                } catch (err) {
                    setError('Nickname loading failed');
                    setIsLoadingNicknames(false);
                }
            };
            fetchNicknamesForTransactions();
        }
    }, [recentTransactions, tokens, user]);

    React.useEffect(() => {
        localStorage.setItem('proveButtonPosition', JSON.stringify(buttonPosition));
    }, [buttonPosition]);

    const handleMouseDown = (e) => {
        if (e.button === 0) {
            setIsDragging(true);
            setDragStart({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            const deltaX = e.clientX - dragStart.x;
            const deltaY = e.clientY - dragStart.y;
            const button = e.target.getBoundingClientRect();
            const newLeft = parseFloat(buttonPosition.left) + deltaX;
            const newBottom = parseFloat(buttonPosition.bottom) - deltaY;
            setButtonPosition({
                left: `${Math.max(0, Math.min(newLeft, window.innerWidth - button.width))}px`,
                bottom: `${Math.max(0, Math.min(newBottom, window.innerHeight - button.height))}px`,
            });
            setDragStart({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Remove duplicate tokens based on token.id
    const uniqueTokens = Array.isArray(tokens)
        ? [...new Map(tokens.map(token => [token.id, token])).values()]
        : [];

    const filteredTokens = uniqueTokens.filter(
        (token) =>
            token.name?.toLowerCase().includes(search.toLowerCase()) ||
            token.symbol?.toLowerCase().includes(search.toLowerCase())
    );

    const sortedTokens = [...filteredTokens].sort((a, b) => {
        if (sortBy === 'marketCap') {
            return (b.currentPrice * b.totalSupply) - (a.currentPrice * a.totalSupply);
        } else if (sortBy === 'volume') {
            return (b.volume || 0) - (a.volume || 0);
        } else {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
                return dateB.getTime() - dateA.getTime();
            }
            return b.id.localeCompare(a.id);
        }
    });

    const indexOfLastToken = currentPage * tokensPerPage;
    const indexOfFirstToken = indexOfLastToken - tokensPerPage;
    const currentTokens = sortedTokens.slice(indexOfFirstToken, indexOfLastToken);
    const totalPages = Math.ceil(sortedTokens.length / tokensPerPage);

    const tokenOfTheDay = Array.isArray(uniqueTokens) && uniqueTokens.length > 0
        ? uniqueTokens.reduce((prev, curr) =>
            (curr.volume || 0) > (prev.volume || 0) ? curr : prev,
            uniqueTokens[0]
        )
        : null;

    const handleTokenClick = (tokenId) => {
        setSelectedTokenId(tokenId);
        setView('token');
    };

    const handleProveClick = () => {
        setShowWidget(!showWidget);
    };

    const formatMarketCap = (value) => {
        if (value >= 1_000_000_000) {
            const billions = value / 1_000_000_000;
            return `${billions.toFixed(2)}b`;
        } else if (value >= 1_000_000) {
            const millions = value / 1_000_000;
            return `${millions.toFixed(2)}m`;
        } else if (value >= 1_000) {
            const thousands = value / 1_000;
            return `${thousands.toFixed(2)}k`;
        } else {
            return value.toFixed(2);
        }
    };

    const formatVolume = (value) => {
        if (value >= 1_000_000) {
            const millions = value / 1_000_000;
            return `${millions.toFixed(0)}m`;
        } else if (value >= 1_000) {
            const thousands = value / 1_000;
            return `${thousands.toFixed(0)}k`;
        } else {
            return value.toFixed(0);
        }
    };

    const getNickname = (tx) => {
        return tx.creatorNickname || nicknames[tx.wallet] || 'Unknown';
    };

    const formatTransactionAmount = (value) => {
        if (value >= 1_000_000) {
            const millions = value / 1_000_000;
            return `${millions.toFixed(0)}m`;
        } else if (value >= 1_000) {
            const thousands = value / 1_000;
            return `${thousands.toFixed(0)}k`;
        } else {
            return value.toFixed(0);
        }
    };

    const formatTransaction = (tx) => {
        const nickname = getNickname(tx);
        if (tx.type === 'create') {
            return `${nickname} created ${tx.tokenName}`;
        }
        const formattedAmount = formatTransactionAmount(tx.amount || 0);
        return `${nickname} ${tx.type} ${formattedAmount} ${tx.tokenSymbol}`;
    };

    const cachedTransactions = React.useMemo(() => {
        return recentTransactions.map(tx => ({
            id: tx.id,
            text: formatTransaction(tx),
            type: tx.type
        }));
    }, [recentTransactions, nicknames]);

    return React.createElement(
        'div',
        { className: 'inner-container' },
        error && React.createElement('p', { className: 'text-red-500 text-center' }, error),
        tokenOfTheDay &&
            React.createElement(
                'div',
                { className: 'token-of-day-container' },
                React.createElement(
                    'div',
                    {
                        className: 'token-of-day-card cursor-pointer',
                        onClick: () => handleTokenClick(tokenOfTheDay.id),
                    },
                    React.createElement('img', {
                        src: tokenOfTheDay.image,
                        alt: tokenOfTheDay.name,
                        className: 'token-of-day-image',
                        loading: 'lazy',
                    }),
                    React.createElement(
                        'div',
                        { className: 'token-info' },
                        React.createElement(
                            'div',
                            { className: 'token-title' },
                            React.createElement('span', { className: 'token-name' }, tokenOfTheDay.name),
                            React.createElement('span', { className: 'token-ticker' }, tokenOfTheDay.symbol)
                        ),
                        React.createElement(
                            'p',
                            { className: 'token-creator' },
                            'Created by ',
                            React.createElement(
                                'span',
                                { className: 'creator-name' },
                                getNickname({ wallet: tokenOfTheDay.creatorId, creatorNickname: tokenOfTheDay.creatorNickname })
                            )
                        ),
                        React.createElement(
                            'p',
                            { className: 'token-market-cap' },
                            'Market Cap: ',
                            formatMarketCap(tokenOfTheDay.currentPrice * tokenOfTheDay.totalSupply)
                        ),
                        React.createElement(
                            'p',
                            { className: 'token-volume' },
                            'Volume: ',
                            formatVolume(tokenOfTheDay.volume || 0)
                        )
                    )
                )
            ),
        React.createElement(
            'div',
            { className: 'flex justify-between items-center mb-6 mt-8' },
            React.createElement('input', {
                type: 'text',
                value: search,
                onChange: (e) => setSearch(e.target.value),
                placeholder: 'Search tokens...',
                className: 'search-input',
            }),
            React.createElement(
                'div',
                { className: 'transaction-history' },
                isLoadingNicknames
                    ? React.createElement('div', { className: 'transaction-item' }, 'Loading transactions...')
                    : cachedTransactions.length > 0
                    ? cachedTransactions.map((tx) =>
                          React.createElement(
                              'div',
                              { key: tx.id, className: `transaction-item ${tx.type}` },
                              tx.text
                          )
                      )
                    : React.createElement('div', { className: 'transaction-item' }, 'No recent transactions')
            ),
            React.createElement(
                'div',
                { className: '_wrapper_husch_9' },
                React.createElement(
                    'select',
                    {
                        value: sortBy,
                        onChange: (e) => setSortBy(e.target.value),
                        className: '_select_husch_18',
                    },
                    React.createElement('option', { value: 'createdAt' }, 'Sort by: Newest'),
                    React.createElement('option', { value: 'marketCap' }, 'Sort by: Market Cap'),
                    React.createElement('option', { value: 'volume' }, 'Sort by: Volume')
                ),
                React.createElement('span', { className: '_label_husch_29' }, '▼ - ')
            )
        ),
        React.createElement(
            'div',
            { className: 'token-list' },
            currentTokens.map((token) =>
                React.createElement(
                    'div',
                    {
                        key: token.id,
                        className: 'token-card cursor-pointer',
                        onClick: () => handleTokenClick(token.id),
                    },
                    React.createElement('img', {
                        src: token.image,
                        alt: token.name,
                        className: 'token-image',
                        loading: 'lazy',
                    }),
                    React.createElement(
                        'div',
                        { className: 'token-info' },
                        React.createElement(
                            'div',
                            { className: 'token-title' },
                            React.createElement('span', { className: 'token-name' }, token.name),
                            React.createElement('span', { className: 'token-ticker' }, token.symbol)
                        ),
                        React.createElement(
                            'p',
                            { className: 'token-creator' },
                            'Created by ',
                            React.createElement('span', { className: 'creator-name' }, getNickname({ wallet: token.creatorId, creatorNickname: token.creatorNickname }))
                        ),
                        React.createElement(
                            'p',
                            { className: 'token-market-cap' },
                            'Market Cap: ',
                            formatMarketCap(token.currentPrice * token.totalSupply)
                        ),
                        React.createElement(
                            'p',
                            { className: 'token-volume' },
                            'Volume: ',
                            formatVolume(token.volume || 0)
                        )
                    )
                )
            )
        ),
        React.createElement(
            'div',
            { className: 'pagination' },
            Array.from({ length: totalPages }, (_, index) =>
                React.createElement('button', {
                    key: index + 1,
                    onClick: () => setCurrentPage(index + 1),
                    className: `pagination-button ${currentPage === index + 1 ? 'active' : ''}`,
                }, index + 1)
            )
        ),
        React.createElement(
            'button',
            {
                className: 'prove-button',
                onClick: handleProveClick,
                onMouseDown: handleMouseDown,
                onMouseMove: handleMouseMove,
                onMouseUp: handleMouseUp,
                onMouseLeave: handleMouseUp,
                style: buttonPosition,
            },
            'PROVE'
        ),
        React.createElement(ProveWidget, { userId: user?.userId, setWallet, showWidget, setShowWidget, setError })
    );
}

export default Dashboard;

// Inline styles for the Prove button
const styles = `
    .prove-button {
        width: 150px;
        height: 150px;
        background: linear-gradient(145deg, #ff69b4, #ff1493);
        color: #ffffff;
        font-family: Arial, sans-serif;
        font-size: 24px;
        font-weight: bold;
        border: none;
        border-radius: 50%;
        cursor: move;
        transition: all 0.2s ease;
        user-select: none;
        overflow: hidden;
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
        text-align: center;
        position: fixed;
    }

    .prove-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 50%;
        height: 100%;
        background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
        );
        transition: 0.5s;
    }

    .prove-button:hover::before {
        left: 100%;
    }

    .prove-button:hover {
        background: linear-gradient(145deg, #ff85c0, #ff3399);
        transform: translateY(-2px);
    }

    .prove-button:active {
        background: linear-gradient(145deg, #ff1493, #c71585);
        transform: translateY(2px);
    }

    .prove-button:focus {
        outline: none;
    }
`;

// Inject styles into the document
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);