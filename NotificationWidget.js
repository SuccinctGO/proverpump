const React = window.React;

const NotificationWidget = ({ notification, onClose }) => {
    const { id, type, amount, currency, timestamp } = notification;
    const [isExiting, setIsExiting] = React.useState(false);

    // Форматування дати
    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    // Автоматичне зникнення через 3 секунди
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true); // Починаємо анімацію зникнення
            setTimeout(() => onClose(id), 300); // Видаляємо сповіщення за його id після завершення анімації (300 мс)
        }, 3000); // 3 секунди до початку зникнення

        return () => clearTimeout(timer); // Очищаємо таймер при демонтажі
    }, [id, onClose]);

    return React.createElement(
        'div',
        null,
        // Додаємо style елемент із CSS
        React.createElement(
            'style',
            null,
            `
                .transaction-widget {
                    width: 250px;
                    height: 120px;
                    background: #000;
                    border: 2px solid #ff00ff;
                    border-radius: 16px;
                    padding: 15px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    animation: slideInRight 0.3s ease-out forwards;
                    position: relative; /* Змінено з fixed на relative для прив’язки до батьківського контейнера */
                }

                .transaction-widget.exit {
                    animation: slideOutRight 0.3s ease-in forwards;
                }

                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                @keyframes slideOutRight {
                    from {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                }

                .transaction-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .transaction-type {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 16px;
                    font-weight: 700;
                    color: #ff00ff;
                }

                .transaction-details {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .amount {
                    font-family: 'Exo 2', sans-serif;
                    font-size: 16px;
                    font-weight: 600;
                }

                .date {
                    font-family: 'Exo 2', sans-serif;
                    font-size: 12px;
                    color: #999;
                }

                .buy .amount {
                    color: #00ff00;
                }

                .sell .amount {
                    color: #ff4040;
                }

                @media (max-width: 640px) {
                    .transaction-widget {
                        width: 100%;
                        max-width: 300px;
                        height: auto;
                        padding: 10px;
                    }

                    .transaction-type {
                        font-size: 14px;
                    }

                    .amount {
                        font-size: 14px;
                    }

                    .date {
                        font-size: 11px;
                    }
                }
            `
        ),
        // Основний контейнер віджета
        React.createElement(
            'div',
            {
                className: `transaction-widget ${type.toLowerCase()} ${isExiting ? 'exit' : ''}`,
                style: {
                    zIndex: 9999,
                    pointerEvents: 'none', // Кліки проходять крізь віджет
                },
            },
            React.createElement(
                'div',
                { className: 'transaction-header' },
                React.createElement(
                    'span',
                    {
                        className: 'transaction-type',
                        style: { pointerEvents: 'none' },
                    },
                    type.toUpperCase()
                )
            ),
            React.createElement(
                'div',
                { className: 'transaction-details' },
                React.createElement(
                    'span',
                    {
                        className: 'amount',
                        style: { pointerEvents: 'none' },
                    },
                    `${type.toLowerCase() === 'buy' ? '+' : '-'}${amount.toFixed(2)} ${currency}`
                ),
                React.createElement(
                    'span',
                    {
                        className: 'date',
                        style: { pointerEvents: 'none' },
                    },
                    formatDate(timestamp)
                )
            )
        )
    );
};

export default NotificationWidget;