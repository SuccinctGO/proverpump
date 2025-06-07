function App() {
    const [view, setView] = React.useState('auth');

    return React.createElement(
        'div',
        { className: 'container mx-auto p-4' },
        view === 'auth' ? React.createElement('h1', null, 'Auth Page') : React.createElement('h1', null, 'Dashboard')
    );
}

export default App;