import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { db } from './firebase-config.js';

function MyTokens({ user, wallet, setSelectedTokenId, setView }) {
    const [tokens, setTokens] = React.useState([]);
    const [error, setError] = React.useState(null);

    const formatNumberWithCommas = (number) => {
        if (!number) return '0';
        return Number(number).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    React.useEffect(() => {
        const fetchTokens = async () => {
            try {
                const auth = getAuth();
                const currentUser = auth.currentUser;

                if (!currentUser) {
                    setError('User not authenticated');
                    return;
                }

                if (!wallet || !wallet.tokenBalances) {
                    setError('Wallet data is not available');
                    return;
                }

                const q = query(
                    collection(db, 'tokens'),
                    where('creatorId', '==', currentUser.uid)
                );
                const querySnapshot = await getDocs(q);
                const userTokens = querySnapshot.docs.map(doc => doc.data());

                // Filter tokens with balance > 0 and sort by balance in descending order
                const filteredAndSortedTokens = userTokens
                    .filter(token => wallet.tokenBalances[token.id] > 0)
                    .sort((a, b) => wallet.tokenBalances[b.id] - wallet.tokenBalances[a.id]);

                setTokens(filteredAndSortedTokens);
                setError(null);
            } catch (err) {
                setError('Failed to load tokens');
                console.error('Error fetching tokens:', err);
            }
        };

        fetchTokens();
    }, [user, wallet]);

    const handleTokenClick = (tokenId) => {
        setSelectedTokenId(tokenId);
        setView('token');
    };

    if (error) {
        return React.createElement(
            'div',
            { className: 'my-tokens-wrapper' },
            React.createElement(
                'div',
                { className: 'inner-container' },
                React.createElement('h2', { className: 'text-3xl font-bold mb-6 neon-title' }, 'My Tokens'),
                React.createElement('p', { className: 'text-center text-red-500' }, error)
            )
        );
    }

    return React.createElement(
        'div',
        { className: 'my-tokens-wrapper' },
        React.createElement(
            'div',
            { className: 'inner-container' },
            React.createElement('h2', { className: 'text-3xl font-bold mb-6 neon-title' }, 'My Tokens'),
            tokens.length === 0
                ? React.createElement('p', { className: 'text-center' }, "You haven't created any tokens with a balance yet.")
                : React.createElement(
                      'div',
                      { className: 'token-list' },
                      tokens.map((token) =>
                          React.createElement(
                              'div',
                              {
                                  key: token.id,
                                  className: 'token-card cursor-pointer',
                                  onClick: () => handleTokenClick(token.id),
                              },
                              React.createElement('img', {
                                  src: token.image || 'https://placehold.co/132x132/FF69B4/FFF',
                                  alt: token.name,
                                  className: 'token-image',
                              }),
                              React.createElement(
                                  'div',
                                  { className: 'token-info' },
                                  React.createElement(
                                      'div',
                                      { className: 'token-title' },
                                      React.createElement('span', { className: 'token-name' }, token.name || 'Unknown'),
                                      React.createElement('span', { className: 'token-ticker' }, token.symbol || 'N/A')
                                  ),
                                  React.createElement(
                                      'p',
                                      { className: 'token-quantity', 'data-token-id': token.id },
                                      wallet.tokenBalances[token.id]
                                          ? formatNumberWithCommas(wallet.tokenBalances[token.id])
                                          : '0',
                                      ' ',
                                      React.createElement(
                                          'span',
                                          { className: 'token-ticker-white' },
                                          token.symbol || 'N/A'
                                      )
                                  )
                              )
                          )
                      )
                  )
        )
    );
}

export default MyTokens;