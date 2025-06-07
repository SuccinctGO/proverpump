import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { db } from './firebase-config.js';

const React = window.React;

const styles = {
    widget: {
        background: '#000',
        border: '2px solid #ff00ff',
        borderRadius: '16px',
        padding: '20px',
        width: '300px',
        color: '#fff',
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        textAlign: 'center',
        fontFamily: 'Exo 2, sans-serif',
    },
    widgetHeader: {
        textAlign: 'center',
    },
    widgetHeaderH2: {
        fontSize: '20px',
        margin: '0 0 10px 0',
        color: '#ffb6c1',
        fontFamily: 'Orbitron, sans-serif',
    },
    clickButton: {
        background: 'linear-gradient(45deg, #ff00ff, #ff69b4)',
        border: 'none',
        borderRadius: '8px',
        padding: '10px 20px',
        fontSize: '16px',
        color: '#fff',
        cursor: 'pointer',
        fontFamily: 'Orbitron, sans-serif',
        transition: 'transform 0.2s ease, background 0.3s ease',
    },
    clickButtonHover: {
        background: 'linear-gradient(45deg, #e600e6, #ff4d94)',
        transform: 'scale(1.05)',
    },
    clickButtonDisabled: {
        background: 'linear-gradient(45deg, #666, #999)',
        cursor: 'not-allowed',
        transform: 'none',
    },
    message: {
        fontSize: '14px',
        color: '#ffb6c1',
        marginTop: '10px',
    },
};

const ProveWidget = ({ userId, setWallet, showWidget, setShowWidget, setError }) => {
    const [message, setMessage] = React.useState('');
    const [isClickAllowed, setIsClickAllowed] = React.useState(true);
    const [lastClickTime, setLastClickTime] = React.useState(0);

    const handleClick = async () => {
        const currentTime = Date.now();
        console.log('handleClick started, userId:', userId, 'setWallet type:', typeof setWallet, 'currentTime:', currentTime, 'lastClickTime:', lastClickTime);
        
        if (!isClickAllowed || currentTime - lastClickTime < 1000) {
            console.log('Click rate limit exceeded');
            setMessage('Please wait 1 second between clicks');
            setTimeout(() => setMessage(''), 2000);
            return;
        }

        if (!userId) {
            console.log('No userId, setting error');
            setError('User not authenticated');
            setShowWidget(false);
            return;
        }

        try {
            setIsClickAllowed(false);
            setLastClickTime(currentTime);
            const walletRef = doc(db, 'wallets', userId);
            console.log('Fetching wallet for userId:', userId);
            const walletSnap = await getDoc(walletRef);
            let walletData = { balance: 10000, tokenBalances: {}, tokens: [], userId };
            if (walletSnap.exists()) {
                walletData = walletSnap.data();
                console.log('Wallet data:', walletData);
            } else {
                console.log('No wallet found, using default');
            }
            const newBalance = (walletData.balance || 10000) + 100;
            console.log('New balance:', newBalance);

            console.log('Saving wallet to Firestore');
            await setDoc(walletRef, {
                balance: newBalance,
                tokenBalances: walletData.tokenBalances || {},
                tokens: walletData.tokens || [],
                userId,
            }, { merge: true });
            console.log('Wallet saved successfully');

            if (typeof setWallet === 'function') {
                console.log('Updating local wallet state');
                setWallet((prev) => ({
                    ...prev,
                    balance: newBalance,
                    tokenBalances: walletData.tokenBalances || {},
                    tokens: walletData.tokens || [],
                }));
            } else {
                console.warn('setWallet is not a function, skipping local update');
            }
            setMessage('Added 100 PROVE!');
            setTimeout(() => setMessage(''), 2000);
            setTimeout(() => setIsClickAllowed(true), 1000); // Re-enable clicking after 1 second
        } catch (err) {
            console.error('Clicker error:', err.message, err);
            setError('Failed to add PROVE');
            setMessage('');
            setIsClickAllowed(true); // Re-enable clicking if there's an error
        }
    };

    if (!userId || !showWidget) {
        return null;
    }

    return React.createElement(
        'div',
        { style: styles.widget },
        React.createElement(
            'div',
            { style: styles.widgetHeader },
            React.createElement('h2', { style: styles.widgetHeaderH2 }, 'PROVE Clicker')
        ),
        React.createElement(
            'button',
            {
                onClick: handleClick,
                style: isClickAllowed ? styles.clickButton : { ...styles.clickButton, ...styles.clickButtonDisabled },
                onMouseOver: (e) => isClickAllowed && Object.assign(e.target.style, styles.clickButtonHover),
                onMouseOut: (e) => isClickAllowed && Object.assign(e.target.style, styles.clickButton),
                disabled: !isClickAllowed,
            },
            'Click for 100 PROVE'
        ),
        message && React.createElement('p', { style: styles.message }, message)
    );
};

export default ProveWidget;