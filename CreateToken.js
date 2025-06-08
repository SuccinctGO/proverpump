function CreateToken({ user, wallet, setWallet, setError, setView, setShowWidget }) {
    const [name, setName] = React.useState('');
    const [symbol, setSymbol] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [image, setImage] = React.useState(null);
    const [cooldownMessage, setCooldownMessage] = React.useState('');
    const [lastTokenCreationTime, setLastTokenCreationTime] = React.useState(() => {
        const savedTime = localStorage.getItem('lastTokenCreationTime');
        return savedTime ? parseInt(savedTime, 10) : 0;
    });

    React.useEffect(() => {
        if (cooldownMessage) {
            const timer = setTimeout(() => {
                setCooldownMessage('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [cooldownMessage]);

    const validateInputs = () => {
        if (!name.trim() || name.length > 50) {
            setError('Token name is required and must be 50 characters or less');
            return false;
        }
        if (!symbol.trim() || symbol.length > 10) {
            setError('Token symbol is required and must be 10 characters or less');
            return false;
        }
        if (!description.trim() || description.length > 500) {
            setError('Description is required and must be 500 characters or less');
            return false;
        }
        if (image && !image.type.match(/image\/(png|jpe?g|gif)/)) {
            setError('Image must be a PNG, JPG, JPEG, or GIF file');
            return false;
        }
        return true;
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        setImage(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const currentTime = Date.now();
        const cooldownMs = 30 * 60 * 1000;
        if (currentTime - lastTokenCreationTime < cooldownMs) {
            const remainingSeconds = Math.ceil((cooldownMs - (currentTime - lastTokenCreationTime)) / 1000);
            setCooldownMessage(`Please wait ${Math.floor(remainingSeconds / 60)} minutes and ${remainingSeconds % 60} seconds before creating another token`);
            return;
        }

        if (!validateInputs()) return;

        const token = localStorage.getItem('zkPumpToken');
        if (!token) {
            setError('User not authenticated');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('name', name.trim());
            formData.append('symbol', symbol.trim().toUpperCase());
            formData.append('description', description.trim());
            if (image) {
                formData.append('image', image);
            }

            const response = await fetch('http://localhost:3000/tokens', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            const newToken = await response.json();

            if (!response.ok) {
                throw new Error(newToken.error || 'Failed to create token');
            }

            setWallet({
                ...wallet,
                tokenBalances: {
                    ...wallet.tokenBalances,
                    [newToken.id]: 0,
                },
            });

            setName('');
            setSymbol('');
            setDescription('');
            setImage(null);
            setError('');
            setLastTokenCreationTime(currentTime);
            localStorage.setItem('lastTokenCreationTime', currentTime.toString());
            setShowWidget(true);
            console.log('Token created:', newToken);
        } catch (err) {
            setError(`Failed to create token: ${err.message}`);
            console.error('CreateToken error:', err);
        }
    };

    const TokenCreationWidget = ({ show, setShow }) => {
        if (!show) return null;
        return React.createElement(
            'div',
            { className: 'widget-container', style: { background: 'black', border: '2px solid #ff69b4', padding: '20px', width: '600px', margin: 'auto' } },
            React.createElement('p', { style: { color: '#ff69b4', fontFamily: 'Orbitron, sans-serif' } }, 'Minting your token on the blockchain!'),
            React.createElement('div', { className: 'loading-circle', style: { border: '4px solid #ff69b4', borderTop: '4px solid transparent', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '20px auto' } }),
            React.createElement('button', { onClick: () => setShow(false), style: { background: '#ff69b4', color: 'white', padding: '10px', borderRadius: '5px', fontFamily: 'Orbitron, sans-serif' } }, 'Continue')
        );
    };

    return React.createElement(
        'div',
        { className: 'create-token-wrapper' },
        React.createElement(
            'div',
            { className: 'create-token-container', style: { position: 'relative' } },
            React.createElement('h2', { className: 'neon-title' }, 'Create New Token'),
            React.createElement(
                'form',
                { onSubmit: handleSubmit, className: 'form-content' },
                React.createElement('label', null, 'Token Name'),
                React.createElement('input', {
                    type: 'text',
                    value: name,
                    onChange: (e) => setName(e.target.value),
                    placeholder: 'Enter token name',
                    className: 'input-field p-2 rounded',
                }),
                React.createElement('label', null, 'Symbol'),
                React.createElement('input', {
                    type: 'text',
                    value: symbol,
                    onChange: (e) => setSymbol(e.target.value),
                    placeholder: 'Enter token symbol',
                    className: 'input-field p-2 rounded',
                }),
                React.createElement('label', null, 'Description'),
                React.createElement('textarea', {
                    value: description,
                    onChange: (e) => setDescription(e.target.value),
                    placeholder: 'Enter token description',
                    className: 'input-field p-2 rounded',
                    rows: '4',
                }),
                React.createElement('label', null, 'Image (optional)'),
                React.createElement('input', {
                    type: 'file',
                    accept: 'image/png,image/jpeg,image/gif',
                    onChange: handleImageChange,
                    className: 'input-field p-2 rounded',
                }),
                React.createElement('button', {
                    type: 'submit',
                    className: 'bg-pink-500 text-white p-2 rounded',
                }, 'Create Token'),
                cooldownMessage && React.createElement(
                    'p',
                    {
                        className: 'text-red-500 text-center',
                        style: {
                            fontFamily: 'Exo 2, sans-serif',
                            marginTop: '8px',
                            position: 'absolute',
                            bottom: '-30px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '100%',
                        },
                    },
                    cooldownMessage
                )
            )
        ),
        React.createElement(TokenCreationWidget, {
            show: false,
            setShow: setShowWidget,
        })
    );
}

export default CreateToken;