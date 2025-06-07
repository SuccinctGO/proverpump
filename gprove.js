document.addEventListener('DOMContentLoaded', () => {
    console.log('gprove.js: Script started');

    // Перевіряємо, чи це перше відвідування
    const hasVisited = localStorage.getItem('hasVisitedProverPump');
    console.log('gprove.js: hasVisitedProverPump:', hasVisited);

    if (!hasVisited) {
        console.log('gprove.js: First visit, showing welcome screen');

        // Очищаємо вміст #root
        const root = document.getElementById('root');
        if (!root) {
            console.error('gprove.js: #root element not found');
            return;
        }
        root.innerHTML = '';

        // Додаємо стилі з ізоляцією
        const style = document.createElement('style');
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Exo+2:wght@400&display=swap');

            #welcome-container * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            #welcome-container {
                all: initial;
                isolation: isolate;
                display: flex;
                background: #000;
                min-height: 100vh;
                padding: 20px;
                overflow-x: hidden;
                align-items: center;
                justify-content: center;
            }

            #welcome-container .welcome-container {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
                text-align: center;
                margin-top: -100px; /* Попередній зсув контейнера */
            }

            #welcome-container .welcome-title {
                font-family: 'Orbitron', sans-serif;
                font-weight: 700;
                font-size: 52px;
                color: #ff1493;
                margin-top: -50px; /* Додатково піднімаємо заголовок на 50px */
            }

            #welcome-container .welcome-title::after {
                content: '|';
                display: inline-block;
            }

            #welcome-container .welcome-blink-cursor::after {
                animation: welcome-blink 1s step-end infinite;
            }

            @keyframes welcome-blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0; }
            }

            #welcome-container .welcome-press-enter {
                font-family: 'Exo 2', sans-serif;
                font-weight: 400;
                font-size: 24px;
                color: #fff;
                position: absolute;
                top: calc(50% + 125px);
                transform: translateY(-50%);
                opacity: 0;
                display: block;
                cursor: pointer;
            }

            #welcome-container .welcome-fade-in {
                animation: welcome-fadeIn 1.5s ease-in forwards;
            }

            @keyframes welcome-fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            #welcome-container .welcome-blink {
                animation: welcome-fadeBlink 1.5s ease-in-out infinite;
            }

            @keyframes welcome-fadeBlink {
                0%, 100% { opacity: 0.4; }
                50% { opacity: 1; }
            }

            @media (max-width: 640px) {
                #welcome-container .welcome-title {
                    font-size: 36.4px;
                    margin-top: -50px; /* Зберігаємо зсув для мобільних */
                }
                #welcome-container .welcome-press-enter {
                    font-size: 18px;
                    top: calc(50% + 50px);
                }
            }
        `;
        document.head.appendChild(style);

        // Додаємо HTML для привітання
        root.innerHTML = `
            <div id="welcome-container" class="welcome-container">
                <h1 class="welcome-title" id="typing-text"></h1>
                <p class="welcome-press-enter" id="press-enter">Press Enter</p>
            </div>
        `;

        // Логіка ефекту друкування
        const text = "Gprove, newcomer!";
        const typingText = document.getElementById('typing-text');
        const pressEnter = document.getElementById('press-enter');
        let index = 0;

        function type() {
            if (index < text.length) {
                typingText.textContent = text.slice(0, index + 1);
                index++;
                setTimeout(type, 150);
            } else {
                console.log('gprove.js: Typing effect completed');
                typingText.classList.add('welcome-blink-cursor');
                setTimeout(() => {
                    pressEnter.classList.add('welcome-fade-in', 'welcome-blink');
                    console.log('gprove.js: Press Enter shown');
                }, 1000);
            }
        }

        console.log('gprove.js: Starting typing effect');
        setTimeout(type, 500);

        // Обробники подій для переходу до React
        function proceedToApp() {
            console.log('gprove.js: Proceeding to render App');
            localStorage.setItem('hasVisitedProverPump', 'true');
            root.innerHTML = ''; // Очищаємо привітальну сторінку
            if (typeof window.renderApp === 'function') {
                window.renderApp();
            } else {
                console.error('gprove.js: window.renderApp is not defined');
            }
        }

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                console.log('gprove.js: Enter key pressed, proceeding to App');
                proceedToApp();
            }
        });

        pressEnter.addEventListener('click', () => {
            console.log('gprove.js: Press Enter clicked, proceeding to App');
            proceedToApp();
        });
    } else {
        console.log('gprove.js: Not first visit, rendering App');
        window.renderApp();
    }
});