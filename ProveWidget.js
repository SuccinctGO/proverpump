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
        if (!isClickAllowed || currentTime - lastClickTime < 1000) {
            setMessage('Please wait 1 second between clicks');
            setTimeout(() => setMessage(''), 2000);
            return;
        }

        if (!userId) {
            setError('User not authenticated');
            setShowWidget(false);
            return;
        }

        try {
            setIsClickAllowed(false);
            setLastClickTime(currentTime);
            const token = localStorage.getItem('zkPumpToken');
            const response = await fetch(`http://localhost:3000/wallets/${userId}/add-prove`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            const updatedWallet = await response.json();
            if (!response.ok) {
                throw new Error(updatedWallet.error || 'Failed to add PROVE');
            }

            if (typeof setWallet === 'function') {
                setWallet(updatedWallet);
            }
            setMessage('Added 100 PROVE!');
            setTimeout(() => setMessage(''), 2000);
            setTimeout(() => setIsClickAllowed(true), 1000);
        } catch (err) {
            console.error('Clicker error:', err);
            setError('Failed to add PROVE');
            setMessage('');
            setIsClickAllowed(true);
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