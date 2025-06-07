import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { db } from './firebase-config.js';

function Auth({ setUser, setWallet, setView }) {
    const [isLogin, setIsLogin] = React.useState(true);
    const [nickname, setNickname] = React.useState('');
    const [error, setError] = React.useState('');

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        if (!nickname || nickname.length < 3) {
            setError('Nickname must be 3+ characters');
            return;
        }

        const auth = getAuth();
        console.log('Attempting anonymous sign-in with Firebase config:', auth.app.options);
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('nickname', '==', nickname));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                setError('Nickname taken');
                return;
            }

            const userCredential = await signInAnonymously(auth);
            const userId = userCredential.user.uid;
            console.log('Anonymous user signed in:', userId);

            const newUser = { userId, nickname };
            const newWallet = { userId, balance: 10000, tokens: [], tokenBalances: {} };

            await setDoc(doc(db, 'users', userId), newUser);
            await setDoc(doc(db, 'wallets', userId), newWallet);
            localStorage.setItem('zkPumpUserId', userId);

            const savedUser = (await getDoc(doc(db, 'users', userId))).data();
            console.log('User registered:', newUser);
            console.log('Stored in Firestore:', {
                zkPumpUsers: savedUser,
                zkPumpUser: savedUser,
                zkPumpWallet: (await getDoc(doc(db, 'wallets', userId))).data()
            });

            if (savedUser.userId !== userId || savedUser.nickname !== nickname) {
                console.error('Failed to save user:', savedUser);
                setError('Failed to save user. Try again.');
                return;
            }

            setUser(newUser);
            setWallet(newWallet);
            setView('dashboard');
        } catch (err) {
            console.error('Registration error:', err);
            console.log('Error details:', {
                code: err.code,
                message: err.message,
                stack: err.stack
            });
            setError(`Failed to register: ${err.message}`);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        if (!nickname) {
            setError('Nickname required');
            return;
        }

        const auth = getAuth();
        console.log('Attempting anonymous sign-in for login with Firebase config:', auth.app.options);
        try {
            const userCredential = await signInAnonymously(auth);
            const userId = userCredential.user.uid;

            localStorage.setItem('zkPumpUserId', userId);

            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('nickname', '==', nickname));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                setError('User not found');
                console.log('User not found:', nickname);
                return;
            }

            const storedUser = querySnapshot.docs[0].data();
            console.log('Stored user:', storedUser);

            const walletRef = doc(db, 'wallets', storedUser.userId);
            const walletSnap = await getDoc(walletRef);
            if (!walletSnap.exists()) {
                setError('Wallet not found');
                console.log('Wallet not found:', storedUser.userId);
                return;
            }

            const storedWallet = walletSnap.data();
            console.log('Login successful:', { user: storedUser, wallet: storedWallet });
            setUser(storedUser);
            setWallet(storedWallet);
            setView('dashboard');
        } catch (err) {
            console.error('Login error:', err);
            console.log('Error details:', {
                code: err.code,
                message: err.message,
                stack: err.stack
            });
            setError(`Failed to login: ${err.message}`);
        }
    };

    const handleDiscordLogin = () => {
        window.location.href = 'https://us-central1-prover-pump.cloudfunctions.net/api/login';
    };

    const handleToken = async (token) => {
        try {
            const auth = getAuth();
            const userCredential = await signInWithCustomToken(auth, token);
            const userId = userCredential.user.uid;

            const userDoc = await getDoc(doc(db, 'users', userId));
            const walletDoc = await getDoc(doc(db, 'wallets', userId));

            if (userDoc.exists() && walletDoc.exists()) {
                setUser(userDoc.data());
                setWallet(walletDoc.data());
                setView('dashboard');
            } else {
                setError('User or wallet not found');
            }
        } catch (err) {
            console.error('Discord login error:', err);
            setError(`Failed to login with Discord: ${err.message}`);
        }
    };

    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        if (token) {
            handleToken(token);
        }
    }, []);

    return React.createElement(
        'div',
        { className: 'zkpump-auth-wrapper' },
        React.createElement(
            'style',
            null,
            `
                @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Exo+2:wght@400;600&display=swap');

                .zkpump-auth-wrapper * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                .zkpump-auth-wrapper {
                    all: initial;
                    isolation: isolate;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    background: #000;
                    font-family: 'Exo 2', sans-serif;
                    color: #fff;
                }

                .zkpump-auth-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    width: 100%;
                }

                .zkpump-section-container {
                    background: #000;
                    padding: 15px;
                    border: none;
                    border-radius: 16px;
                }

                .zkpump-auth-form {
                    width: 100%;
                    max-width: 300px;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    align-items: center;
                }

                .zkpump-neon-title {
                    font-family: 'Orbitron', sans-serif;
                    font-weight: 700;
                    color: #ffb6c1;
                    font-size: 32px;
                    text-shadow: 0 0 10px rgba(255, 105, 180, 0.7);
                    text-align: center;
                    margin-bottom: 25px;
                }

                .zkpump-auth-input {
                    width: 100%;
                    max-width: 300px;
                    padding: 10px;
                    background: rgba(255, 105, 180, 0.1);
                    border: 2px solid #ff69b4;
                    border-radius: 16px;
                    color: #fff;
                    font-family: 'Exo 2', sans-serif;
                    font-size: 14px;
                    height: 40px;
                    outline: none;
                    transition: border-color 0.3s ease;
                }

                .zkpump-auth-input::placeholder {
                    color: #ffb6c1;
                    opacity: 0.7;
                }

                .zkpump-auth-input:focus {
                    border-color: #ff00ff;
                }

                .zkpump-auth-submit-button {
                    width: 100%;
                    max-width: 300px;
                    background: linear-gradient(45deg, #ff00ff, #ff69b4);
                    border: none;
                    border-radius: 16px;
                    color: #fff;
                    font-family: 'Orbitron', sans-serif;
                    font-size: 16px;
                    font-weight: 600;
                    padding: 10px;
                    cursor: pointer;
                    transition: background 0.3s ease, transform 0.3s ease;
                }

                .zkpump-auth-submit-button:hover {
                    background: linear-gradient(45deg, #e600e6, #ff4d94);
                    transform: scale(1.05);
                }

                .zkpump-simple-pink-button {
                    background: none;
                    border: none;
                    padding: 0;
                    font-family: 'Exo 2', sans-serif;
                    font-size: 14px;
                    color: #ff69b4;
                    cursor: pointer;
                    text-decoration: underline;
                    transition: color 0.3s ease;
                }

                .zkpump-simple-pink-button:hover {
                    color: #ffb6c1;
                }

                .zkpump-error {
                    font-family: 'Exo 2', sans-serif;
                    color: #ff5555;
                    font-size: 14px;
                    margin: 5px 0;
                    text-align: center;
                }

                .zkpump-text-center {
                    font-family: 'Exo 2', sans-serif;
                    color: #fff;
                    font-size: 14px;
                    margin: 5px 0;
                    text-align: center;
                }

                @media (max-width: 640px) {
                    .zkpump-auth-form {
                        max-width: 100%;
                        padding: 0 15px;
                    }

                    .zkpump-neon-title {
                        font-size: 24px;
                    }

                    .zkpump-auth-input {
                        max-width: 100%;
                    }

                    .zkpump-auth-submit-button {
                        max-width: 100%;
                    }
                }
            `
        ),
        React.createElement(
            'div',
            { className: 'zkpump-auth-container' },
            React.createElement(
                'div',
                { className: 'zkpump-section-container' },
                isLogin ? (
                    React.createElement(
                        'div',
                        null,
                        React.createElement('h2', { className: 'zkpump-neon-title' }, 'Login to ZK Pump'),
                        React.createElement(
                            'form',
                            { onSubmit: handleLogin, className: 'zkpump-auth-form' },
                            React.createElement('input', {
                                type: 'text',
                                value: nickname,
                                onChange: (e) => setNickname(e.target.value),
                                placeholder: 'Nickname',
                                className: 'zkpump-auth-input'
                            }),
                            error && React.createElement('p', { className: 'zkpump-error' }, error),
                            React.createElement('button', {
                                type: 'submit',
                                className: 'zkpump-auth-submit-button'
                            }, 'Login'),
                            React.createElement('button', {
                                type: 'button',
                                onClick: handleDiscordLogin,
                                className: 'zkpump-auth-submit-button'
                            }, 'Login with Discord'),
                            React.createElement(
                                'p',
                                { className: 'zkpump-text-center' },
                                "Don't have an account? ",
                                React.createElement('button', {
                                    type: 'button',
                                    onClick: () => { setIsLogin(false); setError(''); setNickname(''); },
                                    className: 'zkpump-simple-pink-button'
                                }, 'Register')
                            )
                        )
                    )
                ) : (
                    React.createElement(
                        'div',
                        null,
                        React.createElement('h2', { className: 'zkpump-neon-title' }, 'Register for ZK Pump'),
                        React.createElement(
                            'form',
                            { onSubmit: handleRegister, className: 'zkpump-auth-form' },
                            React.createElement('input', {
                                type: 'text',
                                value: nickname,
                                onChange: (e) => setNickname(e.target.value),
                                placeholder: 'Choose a nickname',
                                className: 'zkpump-auth-input'
                            }),
                            error && React.createElement('p', { className: 'zkpump-error' }, error),
                            React.createElement('button', {
                                type: 'submit',
                                className: 'zkpump-auth-submit-button'
                            }, 'Register'),
                            React.createElement('button', {
                                type: 'button',
                                onClick: handleDiscordLogin,
                                className: 'zkpump-auth-submit-button'
                            }, 'Register with Discord'),
                            React.createElement(
                                'p',
                                { className: 'zkpump-text-center' },
                                'Already have an account? ',
                                React.createElement('button', {
                                    type: 'button',
                                    onClick: () => { setIsLogin(true); setError(''); setNickname(''); },
                                    className: 'zkpump-simple-pink-button'
                                }, 'Login')
                            )
                        )
                    )
                )
            )
        )
    );
}

export default Auth;