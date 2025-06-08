import TokenPage from './TokenPage.js';
import CreateToken from './CreateToken.js';
import Auth from './Auth.js';
import NavBar from './NavBar.js';
import Dashboard from './Dashboard.js';
import MyTokens from './MyTokens.js';
import TokenCreationWidget from './widget1.js';

// Імпортуємо React з глобального об'єкта
const React = window.React;
const io = window.io;

// Конфігурація сервера
const SERVER_URL = window.location.hostname === 'proverpump.vercel.app' 
    ? 'https://proverpump-server.vercel.app'
    : 'https://proverpump-server-ewqtdbfip-istzzzs-projects.vercel.app';

// Функція для очікування завантаження bip39
const waitForBip39 = () => {
    return new Promise((resolve) => {
        const maxAttempts = 50;
        let attempts = 0;
        const checkBip39 = () => {
            if (typeof bip39 !== 'undefined' && typeof bip39.generateMnemonic === 'function') {
                resolve(bip39);
            } else if (attempts >= maxAttempts) {
                resolve({ generateMnemonic: generateFallbackMnemonic });
            } else {
                attempts++;
                setTimeout(checkBip39, 100);
            }
        };
        checkBip39();
    });
};

// Функція для генерації мнемонічної фрази
const generateFallbackMnemonic = () => {
    const words = [
        'apple', 'banana', 'cat', 'dog', 'elephant', 'fish', 'grape', 'horse',
        'ice', 'jungle', 'kite', 'lemon', 'moon', 'nest', 'orange', 'pig',
        'queen', 'rabbit', 'star', 'tree', 'umbrella', 'violet', 'wolf', 'zebra'
    ];
    let mnemonic = '';
    for (let i = 0; i < 12; i++) {
        mnemonic += words[Math.floor(Math.random() * words.length)] + ' ';
    }
    return mnemonic.trim();
};

// Головний компонент додатку
function App() {
    const [user, setUser] = React.useState(null);
    const [wallet, setWallet] = React.useState(null);
    const [error, setError] = React.useState('');
    const [view, setView] = React.useState('loading');
    const [selectedTokenId, setSelectedTokenId] = React.useState(null);
    const [showWidget, setShowWidget] = React.useState(false);
    const [tokens, setTokens] = React.useState([]);

    React.useEffect(() => {
        const token = localStorage.getItem('zkPumpToken');
        if (token) {
            fetch(`${SERVER_URL}/users/me`, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data.user && data.wallet) {
                        setUser(data.user);
                        setWallet(data.wallet);
                        setView('dashboard');
                    } else {
                        setError('Failed to load session. Please log in again.');
                        setView('auth');
                        localStorage.removeItem('zkPumpToken');
                    }
                })
                .catch((err) => {
                    setError('Failed to load session. Please log in again.');
                    setView('auth');
                    localStorage.removeItem('zkPumpToken');
                    console.error('Auth error:', err);
                });
        } else {
            setView('auth');
        }

        // Завантаження токенів
        const fetchTokens = async () => {
            try {
                const response = await fetch(`${SERVER_URL}/tokens`, {
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Origin': window.location.origin
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch tokens');
                }
                
                const data = await response.json();
                setTokens(data || []);
            } catch (error) {
                console.error('Token fetch error:', error);
                setError('Failed to load tokens');
            }
        };

        fetchTokens();

        // WebSocket для оновлення токенів
        const socket = io(SERVER_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        socket.on('connect', () => {
            console.log('Socket connected successfully');
            socket.emit('subscribeTokens');
        });

        socket.on('newToken', (newToken) => {
            setTokens((prev) => [...prev, newToken]);
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    // Рендеринг компонента
    return React.createElement(
        'div',
        { className: 'container mx-auto p-4' },
        view === 'loading' && React.createElement('p', { className: 'text-center' }, 'Loading...'),
        error && React.createElement('p', { className: 'text-red-500 text-center mb-4' }, error),
        view !== 'loading' && (
            user ? (
                React.createElement(
                    'div',
                    null,
                    view === 'dashboard' && (
                        React.createElement(
                            'div',
                            null,
                            React.createElement(NavBar, { user, wallet, setView, setUser, setWallet, activeTab: 'dashboard' }),
                            React.createElement(Dashboard, { setSelectedTokenId, setView, tokens, user, setWallet })
                        )
                    ),
                    view === 'create' && (
                        React.createElement(
                            'div',
                            null,
                            React.createElement(NavBar, { user, wallet, setView, setUser, setWallet, activeTab: 'create' }),
                            React.createElement(CreateToken, {
                                user,
                                wallet,
                                setWallet,
                                setError,
                                setView,
                                setShowWidget
                            })
                        )
                    ),
                    view === 'myTokens' && (
                        React.createElement(
                            'div',
                            null,
                            React.createElement(NavBar, { user, wallet, setView, setUser, setWallet, activeTab: 'myTokens' }),
                            React.createElement(MyTokens, {
                                user,
                                wallet,
                                setSelectedTokenId,
                                setView
                            })
                        )
                    ),
                    view === 'token' && (
                        React.createElement(
                            'div',
                            null,
                            React.createElement(NavBar, { user, wallet, setView, setUser, setWallet, activeTab: 'dashboard' }),
                            React.createElement(TokenPage, {
                                tokenId: selectedTokenId || 'token1',
                                userId: user.userId,
                                user,
                                wallet,
                                setWallet,
                                setError,
                                setView
                            })
                        )
                    ),
                    React.createElement(TokenCreationWidget, {
                        show: showWidget,
                        setShow: setShowWidget,
                        onContinue: () => setView('dashboard'),
                        setView
                    })
                )
            ) : (
                React.createElement(Auth, { setUser, setWallet, setView })
            )
        )
    );
}

// Експортуємо компонент
export default App;