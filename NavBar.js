const REFERENCE_WIDTH = 1600;
const NAVBAR_X = 0;
const USER_INFO_X = 30;
const DASHBOARD_X = 185;
const CREATE_TOKEN_1_X = 175;
const CREATE_TOKEN_2_X = 165;
const DISCONNECT_X = 0;

const scalePx = (px, navbarWidth) => {
    return `${(px * (navbarWidth / REFERENCE_WIDTH)).toFixed(2)}px`;
};

function NavBar({ user, wallet, setView, setUser, setWallet, activeTab }) {
    const [navbarWidth, setNavbarWidth] = React.useState(Math.min(window.innerWidth * 0.9, 1500));

    React.useEffect(() => {
        const handleResize = () => {
            const newWidth = Math.min(window.innerWidth * 0.9, 1500);
            setNavbarWidth(newWidth);
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    React.useEffect(() => {
        if (user?.id) {
            const walletKey = `zkPumpWallet_${user.id}`;
            const storedWallet = JSON.parse(localStorage.getItem(walletKey) || '{}');
            const storedBalance = storedWallet.balance || 10000;
            setWallet((prev) => ({
                ...prev,
                balance: storedBalance,
                tokenBalances: storedWallet.tokenBalances || prev?.tokenBalances || {},
                address: user.id,
            }));
        }
    }, [user?.id, setWallet]);

    const disconnect = () => {
        localStorage.removeItem('zkPumpUserId');
        localStorage.removeItem('zkPumpUser');
        localStorage.removeItem(`zkPumpWallet_${user?.id}`);
        setUser(null);
        setWallet(null);
        setView('auth');
    };

    return React.createElement(
        'div',
        null,
        React.createElement('style', null, `
            .zk-pump-title:hover {
                text-shadow: 0 0 ${scalePx(12.65, navbarWidth)} #ff00ff, 0 0 ${scalePx(25.3, navbarWidth)} #ff00ff;
            }
            .zk-pump-underline {
                transition: width 0.4s ease-in-out;
            }
            .zk-pump-underline:hover {
                width: calc(150% - ${scalePx(25.3, navbarWidth)});
            }
            @keyframes glow {
                0% { text-shadow: 0 0 ${scalePx(7.59, navbarWidth)} #ff00ff, 0 0 ${scalePx(15.18, navbarWidth)} #ff00ff80; }
                50% { text-shadow: 0 0 ${scalePx(12.65, navbarWidth)} #ff00ff, 0 0 ${scalePx(25.3, navbarWidth)} #ff00ff; }
                100% { text-shadow: 0 0 ${scalePx(7.59, navbarWidth)} #ff00ff, 0 0 ${scalePx(15.18, navbarWidth)} #ff00ff80; }
            }
            .zk-pump-title:hover {
                animation: glow 1.5s ease-in-out infinite;
            }
            @media (max-width: 640px) {
                .nav-bar {
                    flex-direction: column;
                    gap: ${scalePx(10, navbarWidth)};
                    padding: ${scalePx(15, navbarWidth)};
                    height: auto;
                }
                .nav-buttons-container {
                    flex-direction: column;
                    align-items: center;
                    gap: ${scalePx(10, navbarWidth)};
                }
                .nav-button, .btn-disconnect {
                    width: 100%;
                    text-align: center;
                    transform: scale(0.85);
                }
                .user-info {
                    align-items: center;
                    transform: scale(0.85);
                }
                .zk-pump-title {
                    font-size: ${scalePx(28, navbarWidth)} !important;
                }
            }
        `),
        React.createElement(
            'div',
            {
                className: 'nav-bar',
                style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: `${navbarWidth}px`,
                    margin: `${scalePx(18.975, navbarWidth)} auto`,
                    paddingTop: scalePx(24, navbarWidth),
                    paddingBottom: scalePx(24, navbarWidth),
                    paddingLeft: scalePx(25.3, navbarWidth),
                    paddingRight: scalePx(25.3, navbarWidth),
                    height: scalePx(88.55, navbarWidth),
                    borderRadius: scalePx(12, navbarWidth),
                    background: '#000',
                    border: `${scalePx(2, navbarWidth)} solid #ff69b4`,
                    boxShadow: 'none',
                    boxSizing: 'border-box',
                    transform: `translateX(${scalePx(NAVBAR_X, navbarWidth)})`,
                },
            },
            React.createElement(
                'div',
                {
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        height: '100%',
                        position: 'relative',
                    },
                },
                React.createElement(
                    'h1',
                    {
                        className: 'zk-pump-title',
                        style: {
                            fontSize: scalePx(35.42, navbarWidth),
                            fontFamily: "'Orbitron', sans-serif",
                            color: '#ffffff',
                            textShadow: `0 0 ${scalePx(7.59, navbarWidth)} #ff00ff, 0 0 ${scalePx(15.18, navbarWidth)} #ff00ff80`,
                            lineHeight: '1',
                            margin: '0',
                            padding: `0 ${scalePx(12.65, navbarWidth)}`,
                            position: 'relative',
                            transition: 'text-shadow 0.4s ease-in-out',
                        },
                    },
                    'ProverPump',
                    React.createElement('span', {
                        className: 'zk-pump-underline',
                        style: {
                            position: 'absolute',
                            bottom: scalePx(-6.325, navbarWidth),
                            left: scalePx(12.65, navbarWidth),
                            width: '0',
                            height: scalePx(2.53, navbarWidth),
                            background: '#ff00ff',
                            boxShadow: `0 0 ${scalePx(6.325, navbarWidth)} #ff00ff`,
                        },
                    })
                )
            ),
            React.createElement(
                'div',
                {
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: scalePx(4.6, navbarWidth),
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)',
                    },
                },
                React.createElement('button', {
                    onClick: () => setView('dashboard'),
                    className: `nav-button dashboard ${activeTab === 'dashboard' ? 'active' : ''}`,
                    style: {
                        padding: `${scalePx(7.49, navbarWidth)} ${scalePx(17.47, navbarWidth)}`,
                        fontSize: scalePx(17.47, navbarWidth),
                        fontWeight: '500',
                        borderRadius: scalePx(19.2, navbarWidth),
                        border: 'none',
                        cursor: 'pointer',
                        transform: `translateX(${scalePx(DASHBOARD_X, navbarWidth)}) scale(0.85)`,
                    },
                }, 'Dashboard'),
                React.createElement('button', {
                    onClick: () => setView('create'),
                    className: `nav-button create ${activeTab === 'create' ? 'active' : ''}`,
                    style: {
                        padding: `${scalePx(7.49, navbarWidth)} ${scalePx(17.47, navbarWidth)}`,
                        fontSize: scalePx(17.47, navbarWidth),
                        fontWeight: '500',
                        borderRadius: scalePx(19.2, navbarWidth),
                        border: 'none',
                        cursor: 'pointer',
                        transform: `translateX(${scalePx(CREATE_TOKEN_1_X, navbarWidth)}) scale(0.85)`,
                    },
                }, 'Create Token'),
                React.createElement('button', {
                    onClick: () => setView('myTokens'),
                    className: `nav-button my-tokens ${activeTab === 'myTokens' ? 'active' : ''}`,
                    style: {
                        padding: `${scalePx(7.49, navbarWidth)} ${scalePx(17.47, navbarWidth)}`,
                        fontSize: scalePx(17.47, navbarWidth),
                        fontWeight: '500',
                        borderRadius: scalePx(19.2, navbarWidth),
                        border: 'none',
                        cursor: 'pointer',
                        transform: `translateX(${scalePx(CREATE_TOKEN_2_X, navbarWidth)}) scale(0.85)`,
                    },
                }, 'My Tokens')
            ),
            React.createElement(
                'div',
                {
                    className: 'nav-buttons-container',
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: scalePx(4.6, navbarWidth),
                    },
                },
                React.createElement(
                    'div',
                    {
                        className: 'user-info',
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            margin: '0',
                            padding: `${scalePx(7.68, navbarWidth)} ${scalePx(11.52, navbarWidth)}`,
                            transform: `translateX(${scalePx(USER_INFO_X, navbarWidth)}) scale(0.85)`,
                        },
                    },
                    React.createElement('p', {
                        className: 'nickname',
                        style: {
                            fontSize: scalePx(17.47, navbarWidth),
                            fontWeight: '500',
                            fontFamily: "'Orbitron', sans-serif",
                            color: '#fff',
                            margin: '0',
                            textShadow: `0 0 ${scalePx(3.84, navbarWidth)} rgba(255, 105, 180, 0.5)`,
                        },
                    }, user?.nickname || 'Guest'),
                    React.createElement('p', {
                        className: 'balance',
                        style: {
                            fontSize: scalePx(17.47, navbarWidth),
                            fontFamily: "'Orbitron', sans-serif",
                            color: '#fff',
                            margin: '0',
                            textShadow: `0 0 ${scalePx(3.84, navbarWidth)} rgba(255, 105, 180, 0.5)`,
                        },
                    }, `Balance: ${(wallet?.balance || 0).toFixed(2)} PROVE`)
                ),
                React.createElement('button', {
                    onClick: disconnect,
                    className: 'btn-disconnect',
                    style: {
                        padding: `${scalePx(7.49, navbarWidth)} ${scalePx(17.47, navbarWidth)}`,
                        fontSize: scalePx(17.47, navbarWidth),
                        fontWeight: '500',
                        borderRadius: scalePx(19.2, navbarWidth),
                        border: 'none',
                        cursor: 'pointer',
                        transform: `translateX(${scalePx(DISCONNECT_X, navbarWidth)}) scale(0.85)`,
                    },
                }, 'Disconnect')
            )
        )
    );
}

export default NavBar;