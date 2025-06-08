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
        console.log('Current origin:', window.location.origin);

        try {
            const requestUrl = `${SERVER_URL}/users/${isLogin ? 'login' : 'register'}`;
            console.log('Sending request to:', requestUrl);
            
            const requestHeaders = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Origin': window.location.origin
            };
            console.log('Request headers:', requestHeaders);

            const response = await fetch(requestUrl, {
                method: 'POST',
                headers: requestHeaders,
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
                let errorMessage;
                try {
                    const data = await response.json();
                    console.error('Error response:', data);
                    errorMessage = data.error || 'Authentication failed';
                } catch (parseError) {
                    console.error('Failed to parse error response:', parseError);
                    errorMessage = `Server error: ${response.status}`;
                }
                throw new Error(errorMessage);
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
            setError(err.message || 'An unexpected error occurred');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-form">
                <h2>{isLogin ? 'Login' : 'Register'}</h2>
                {error && <div className="error">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div>
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit">
                        {isLogin ? 'Login' : 'Register'}
                    </button>
                </form>
                <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="switch-mode"
                >
                    {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
                </button>
            </div>
        </div>
    );
}

// Додаємо базові стилі
const style = document.createElement('style');
style.textContent = `
    .auth-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background: #f5f5f5;
    }
    .auth-form {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        width: 100%;
        max-width: 400px;
    }
    .auth-form h2 {
        text-align: center;
        margin-bottom: 1.5rem;
    }
    .auth-form input {
        width: 100%;
        padding: 0.5rem;
        margin-bottom: 1rem;
        border: 1px solid #ddd;
        border-radius: 4px;
    }
    .auth-form button {
        width: 100%;
        padding: 0.75rem;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    .auth-form button:hover {
        background: #0056b3;
    }
    .error {
        color: red;
        margin-bottom: 1rem;
        text-align: center;
    }
    .switch-mode {
        background: none !important;
        color: #007bff !important;
        margin-top: 1rem;
    }
    .switch-mode:hover {
        text-decoration: underline;
    }
`;
document.head.appendChild(style);

export default Auth;