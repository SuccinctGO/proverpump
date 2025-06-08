const React = window.React;

function Auth({ onAuth }) {
    const [isLogin, setIsLogin] = React.useState(true);
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');

    const SERVER_URL = window.location.hostname === 'proverpump.vercel.app' 
        ? 'https://proverpump-server.vercel.app'
        : 'https://proverpump-server-ewqtdbfip-istzzzs-projects.vercel.app';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        console.log('\n=== Auth Request ===');
        console.log('Time:', new Date().toISOString());
        console.log('Mode:', isLogin ? 'Login' : 'Register');
        console.log('Username:', username);
        console.log('Password length:', password.length);
        console.log('Server URL:', SERVER_URL);

        try {
            console.log('Sending request to:', `${SERVER_URL}/users/${isLogin ? 'login' : 'register'}`);
            console.log('Request headers:', {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Origin': window.location.origin
            });
            console.log('Request credentials:', 'include');
            console.log('Request mode:', 'cors');

            const response = await fetch(`${SERVER_URL}/users/${isLogin ? 'login' : 'register'}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Origin': window.location.origin
                },
                credentials: 'include',
                mode: 'cors',
                body: JSON.stringify({
                    username,
                    password
                })
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const data = await response.json();
                console.error('Error response:', data);
                throw new Error(data.error || 'Authentication failed');
            }

            const data = await response.json();
            console.log('Success response:', data);
            console.log('=== End Auth Request ===\n');
            onAuth(data);
        } catch (err) {
            console.error(`${isLogin ? 'Login' : 'Registration'} error:`, err);
            console.error('Error details:', {
                name: err.name,
                message: err.message,
                stack: err.stack
            });
            console.log('=== End Auth Request with Error ===\n');
            setError(err.message);
        }
    };

    const styles = `
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
            opacity: ${isLogin ? 0.7 : 1};
            pointer-events: ${isLogin ? 'none' : 'auto'};
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
    `;

    return React.createElement(
        'div',
        { className: 'zkpump-auth-wrapper' },
        React.createElement(
            'style',
            null,
            styles
        ),
        React.createElement(
            'div',
            { className: 'zkpump-auth-container' },
            React.createElement(
                'div',
                { className: 'zkpump-section-container' },
                React.createElement(
                    'form',
                    { className: 'zkpump-auth-form', onSubmit: handleSubmit },
                    React.createElement('h1', { className: 'zkpump-neon-title' }, 'ProverPump'),
                    React.createElement('input', {
                        type: 'text',
                        className: 'zkpump-auth-input',
                        placeholder: 'Enter your username',
                        value: username,
                        onChange: (e) => setUsername(e.target.value),
                        required: true
                    }),
                    React.createElement('input', {
                        type: 'password',
                        className: 'zkpump-auth-input',
                        placeholder: 'Enter your password',
                        value: password,
                        onChange: (e) => setPassword(e.target.value),
                        required: true
                    }),
                    error && React.createElement('div', { className: 'zkpump-error' }, error),
                    React.createElement('button', {
                        type: 'submit',
                        className: 'zkpump-auth-submit-button',
                        disabled: false
                    }, isLogin ? 'Login' : 'Register'),
                    React.createElement('div', { className: 'zkpump-text-center' },
                        React.createElement('button', {
                            type: 'button',
                            className: 'zkpump-simple-pink-button',
                            onClick: () => setIsLogin(!isLogin)
                        }, isLogin ? 'Need an account? Register' : 'Already have an account? Login')
                    )
                )
            )
        )
    );
}

export default Auth;