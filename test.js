import { doc, getDoc, setDoc, collection, getDocs, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { db, auth } from './firebase-config.js';
import TokenPage from './TokenPage.js';
import CreateToken from './CreateToken.js';
import Auth from './Auth.js';
import NavBar from './NavBar.js';
import Dashboard from './Dashboard.js';
import MyTokens from './MyTokens.js';
import TokenCreationWidget from './widget1.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const React = window.React;

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

function App() {
    const [user, setUser] = React.useState(null);
    const [wallet, setWallet] = React.useState(null);
    const [error, setError] = React.useState('');
    const [view, setView] = React.useState('loading');
    const [selectedTokenId, setSelectedTokenId] = React.useState(null);
    const [showWidget, setShowWidget] = React.useState(false);
    const [tokens, setTokens] = React.useState([]); // Гарантуємо, що tokens завжди масив

    React.useEffect(() => {
        const tokensRef = collection(db, 'tokens');
        const unsubscribeTokens = onSnapshot(tokensRef, (snapshot) => {
            const tokenList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTokens(tokenList || []); // Гарантуємо, що tokenList є масивом
        }, (err) => {
            setError('Failed to load tokens');
            console.error('Token fetch error:', err);
        });

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            const storedUserId = localStorage.getItem('zkPumpUserId');
            if (firebaseUser && storedUserId) {
                try {
                    const userRef = doc(db, 'users', storedUserId);
                    const walletRef = doc(db, 'wallets', storedUserId);
                    const [userSnap, walletSnap] = await Promise.all([
                        getDoc(userRef),
                        getDoc(walletRef),
                    ]);

                    if (userSnap.exists() && walletSnap.exists()) {
                        const storedUser = userSnap.data();
                        const storedWallet = walletSnap.data();

                        if (
                            storedUser.userId === storedUserId &&
                            storedUser.nickname &&
                            storedUser.mnemonic
                        ) {
                            const validatedWallet = {
                                userId: storedUserId,
                                balance: typeof storedWallet.balance === 'number' ? storedWallet.balance : 10000,
                                tokenBalances: storedWallet.tokenBalances || {},
                                address: storedUserId,
                                tokens: storedWallet.tokens || []
                            };

                            setUser(storedUser);
                            setWallet(validatedWallet);
                            setView('dashboard');
                        } else {
                            setError('Invalid user data. Please log in again.');
                            setView('auth');
                        }
                    } else {
                        setError('Failed to load session. Please log in again.');
                        setView('auth');
                        localStorage.removeItem('zkPumpUserId');
                    }
                } catch (err) {
                    setError('Failed to load session. Please log in again.');
                    setView('auth');
                    localStorage.removeItem('zkPumpUserId');
                    console.error('Auth error:', err);
                }
            } else {
                setView('auth');
                localStorage.removeItem('zkPumpUserId');
            }
        }, (err) => {
            setError('Authentication error. Please log in again.');
            setView('auth');
            localStorage.removeItem('zkPumpUserId');
            console.error('Auth state error:', err);
        });

        return () => {
            unsubscribeTokens();
            unsubscribeAuth();
        };
    }, []);

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
                            React.createElement(Dashboard, { setSelectedTokenId, setView, tokens, user }) // Додаємо user
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

export default App;