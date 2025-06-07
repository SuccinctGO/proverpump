function TokenCreationWidget({ show, setShow, onContinue, setView }) {
    const [status, setStatus] = React.useState('Proving your token into existence!');
    const [funMessage, setFunMessage] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(true);
    const [showContinue, setShowContinue] = React.useState(false);

    const jokes = [
        "Your token is ready to moon like a memecoin rocket",
        "Congrats! Your token's about to pump the DeFi charts",
        "Token minted! Time to HODL or flip for lambos",
        "Your memecoin's so hot, it's trending on DEX already"
    ];

    React.useEffect(() => {
        if (show) {
            setStatus('Proving your token into existence!');
            setFunMessage('');
            setIsLoading(true);
            setShowContinue(false);

            const timer = setTimeout(() => {
                setIsLoading(false);
                setStatus("Boom! Your token is live!");
                setFunMessage(jokes[Math.floor(Math.random() * jokes.length)]);
                setShowContinue(true);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [show]);

    const handleContinue = () => {
        setShow(false);
        if (onContinue) onContinue();
        if (setView) setView('dashboard');
    };

    if (!show) return null;

    return React.createElement(
        'div',
        {
            style: {
                background: 'rgba(0, 0, 0, 0.5)',
                minHeight: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1000,
                backdropFilter: 'blur(5px)',
            },
        },
        React.createElement(
            'div',
            {
                style: {
                    background: '#000',
                    border: '2px solid #ff00ff',
                    borderRadius: '16px',
                    padding: '30px',
                    width: '100%',
                    maxWidth: '600px',
                    textAlign: 'center',
                    fontFamily: "'Exo 2', sans-serif",
                },
            },
            isLoading && React.createElement('div', {
                style: {
                    width: '60px',
                    height: '60px',
                    margin: '0 auto 20px',
                    border: '6px solid #000',
                    borderTop: '6px solid #ff00ff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                },
            }),
            React.createElement(
                'div',
                {
                    style: {
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: '28px',
                        fontWeight: 700,
                        color: '#ffb6c1',
                        marginBottom: '15px',
                    },
                },
                status
            ),
            funMessage && React.createElement(
                'div',
                {
                    style: {
                        fontFamily: "'Exo 2', sans-serif",
                        fontSize: '18px',
                        color: '#ff66b2',
                        marginTop: '15px',
                    },
                },
                funMessage
            ),
            showContinue && React.createElement('button', {
                style: {
                    width: '100%',
                    maxWidth: '250px',
                    padding: '15px',
                    background: 'linear-gradient(45deg, #ff00ff, #ff69b4)',
                    border: '2px solid #ff00ff',
                    borderRadius: '10px',
                    color: '#fff',
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: '18px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'transform 0.3s ease, background 0.3s ease',
                    margin: '20px auto 0',
                    display: 'block',
                },
                onMouseOver: (e) => {
                    e.target.style.background = 'linear-gradient(45deg, #e600e6, #ff4d94)';
                    e.target.style.transform = 'scale(1.05)';
                },
                onMouseOut: (e) => {
                    e.target.style.background = 'linear-gradient(45deg, #ff00ff, #ff69b4)';
                    e.target.style.transform = 'scale(1)';
                },
                onClick: handleContinue,
            }, 'Continue'),
            React.createElement('style', null, `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `)
        )
    );
}

export default TokenCreationWidget;