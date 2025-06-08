function initProverPumpWidget({ containerId, onContinue, apiUrl = 'http://localhost:3000/prover-status', onComplete }) {
    function waitForContainer(attempts = 50, interval = 100) {
        return new Promise((resolve, reject) => {
            let currentAttempt = 0;
            const checkContainer = () => {
                const container = document.getElementById(containerId);
                if (container) {
                    resolve(container);
                } else if (currentAttempt >= attempts) {
                    reject(new Error(`Container with ID ${containerId} not found after ${attempts} attempts.`));
                } else {
                    currentAttempt++;
                    setTimeout(checkContainer, interval);
                }
            };
            checkContainer();
        });
    }

    waitForContainer()
        .then((container) => {
            const style = document.createElement('style');
            style.textContent = `
                #${containerId} * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                #${containerId} .prover-pump-widget {
                    background: #000;
                    border: 2px solid #ff00ff;
                    border-radius: 16px;
                    padding: 30px;
                    width: 100%;
                    max-width: 600px;
                    text-align: center;
                    margin: 0 auto;
                    font-family: 'Exo 2', sans-serif;
                    color: #fff;
                }

                #${containerId} .prover-pump-loader {
                    width: 60px;
                    height: 60px;
                    margin: 0 auto 20px;
                    border: 6px solid #000;
                    border-top: 6px solid #ff00ff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                #${containerId} .prover-pump-status-text {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 28px;
                    font-weight: 700;
                    color: #ffb6c1;
                    margin-bottom: 15px;
                }

                #${containerId} .prover-pump-fun-message {
                    font-family: 'Exo 2', sans-serif;
                    font-size: 18px;
                    color: #ff66b2;
                    margin-top: 15px;
                    display: none;
                }

                #${containerId} .prover-pump-continue-button {
                    width: 100%;
                    max-width: 250px;
                    padding: 15px;
                    background: linear-gradient(45deg, #ff00ff, #ff69b4);
                    border: 2px solid #ff00ff;
                    border-radius: 10px;
                    color: #fff;
                    font-family: 'Orbitron', sans-serif;
                    font-size: 18px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.3s ease, background 0.3s ease;
                    display: none;
                    margin: 20px auto 0;
                }

                #${containerId} .prover-pump-continue-button:hover {
                    background: linear-gradient(45deg, #e600e6, #ff4d94);
                    transform: scale(1.05);
                }
            `;
            document.head.appendChild(style);

            if (!document.querySelector('link[href*="Orbitron"]')) {
                const fontLink = document.createElement('link');
                fontLink.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Exo+2:wght@400;600&display=swap';
                fontLink.rel = 'stylesheet';
                document.head.appendChild(fontLink);
            }

            const widget = document.createElement('div');
            widget.className = 'prover-pump-widget';
            widget.innerHTML = `
                <div class="prover-pump-loader" id="proverPumpLoader"></div>
                <div class="prover-pump-status-text" id="proverPumpStatusText">Pumping your PROVER status!</div>
                <div class="prover-pump-fun-message" id="proverPumpFunMessage"></div>
                <button class="prover-pump-continue-button" id="proverPumpContinueButton">Continue</button>
            `;
            container.innerHTML = '';
            container.appendChild(widget);

            const statusText = document.getElementById('proverPumpStatusText');
            const loader = document.getElementById('proverPumpLoader');
            const funMessage = document.getElementById('proverPumpFunMessage');
            const continueButton = document.getElementById('proverPumpContinueButton');

            const jokes = [
                "Your proof is pumping the blockchain to new heights",
                "Verified PROVER Pump Star ready to dominate the market",
                "Your ZK-proof is fueling the ultimate memecoin surge",
                "Pumping proofs like a PROVER Pump heavyweight champ"
            ];

            function completeVerification() {
                loader.style.display = 'none';
                statusText.textContent = "Boom! You're a Verified PROVER Pump Star!";
                funMessage.textContent = jokes[Math.floor(Math.random() * jokes.length)];
                funMessage.style.display = 'block';
                continueButton.style.display = 'block';
            }

            continueButton.addEventListener('click', () => {
                if (onContinue && typeof onContinue === 'function') {
                    onContinue();
                } else {
                    console.log('Continue clicked!');
                }
            });

            async function checkProverStatus() {
                try {
                    const token = localStorage.getItem('zkPumpToken');
                    const response = await fetch(apiUrl, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const data = await response.json();
                    if (!response.ok) {
                        throw new Error(data.error || 'Failed to check PROVER status');
                    }
                    if (onComplete && typeof onComplete === 'function') {
                        await onComplete();
                    }
                    completeVerification();
                } catch (error) {
                    console.error('Verification error:', error);
                    statusText.textContent = 'Oops, something went wrong. Try again!';
                }
            }

            checkProverStatus();
        })
        .catch((error) => {
            console.error(error.message);
        });
}

window.initProverPumpWidget = initProverPumpWidget;