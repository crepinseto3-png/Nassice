import mqtt from 'https://unpkg.com/mqtt/dist/mqtt.esm.js';

// ============ CONFIGURATION ============
const BROKER_URL = 'wss://0c55afee7a364e47947154c09e33702c.s1.eu.hivemq.cloud:8884/mqtt';
const USERNAME = 'esp32';
const PASSWORD = 'Esp32_1234';

// ============ STATE ============
const devices = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    displayName: `Système ${i + 1}`,
    mqttName: `system-${String(i + 1).padStart(3, '0')}`,
    poste: `Poste ${i + 1}`,
    online: false,
    state: 'OFF',
    lastSeen: null,
    rssi: 0,
    uptime: '0j 00h'
}));

let client = null;
let isConnected = false;
let terminalHistory = [];
let terminalHistoryIndex = -1;

// ============ DOM ELEMENTS ============
const elements = {
    brokerStatus: document.getElementById('brokerStatus'),
    brokerText: document.getElementById('brokerText'),
    onlineCount: document.getElementById('onlineCount'),
    lastUpdate: document.getElementById('lastUpdate'),
    devicesGrid: document.getElementById('devicesGrid'),
    searchInput: document.getElementById('searchInput'),
    toastContainer: document.getElementById('toastContainer'),
    sidebar: document.querySelector('.sidebar'),
    menuToggle: document.querySelector('.menu-toggle'),
    overlay: document.querySelector('.overlay'),
    terminalOutput: document.getElementById('terminalOutput'),
    terminalInput: document.getElementById('terminalInput'),
    terminalBody: document.getElementById('terminalBody')
};

// ============ MQTT FUNCTIONS ============
function connectMQTT() {
    updateBrokerStatus('connecting', 'Connexion...');
    addTerminalLine('Tentative de connexion à HiveMQ Cloud...', 'info');

    client = mqtt.connect(BROKER_URL, {
        username: USERNAME,
        password: PASSWORD,
        clientId: 'hivemanager-' + Math.random().toString(16).substr(2, 8),
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30000
    });

    client.on('connect', () => {
        isConnected = true;
        updateBrokerStatus('online', 'Connecté');
        showToast('Connecté à HiveMQ Cloud', 'success');
        addTerminalLine('✅ Connecté avec succès au broker HiveMQ', 'success');

        // Souscrire aux topics
        devices.forEach(d => {
            client.subscribe(`etat/${d.mqttName}`);
            client.subscribe(`status/${d.mqttName}`);
            addTerminalLine(`📡 Abonnement au topic: etat/${d.mqttName}`, 'info');
        });
        
        addTerminalLine(`📊 Abonné à ${devices.length * 2} topics MQTT`, 'info');
    });

    client.on('message', (topic, payload) => {
        handleMessage(topic, payload.toString());
    });

    client.on('error', (err) => {
        console.error('[MQTT] Erreur:', err);
        updateBrokerStatus('offline', 'Erreur');
        showToast('Erreur MQTT: ' + err.message, 'error');
        addTerminalLine(`❌ Erreur MQTT: ${err.message}`, 'error');
    });

    client.on('offline', () => {
        isConnected = false;
        updateBrokerStatus('offline', 'Déconnecté');
        addTerminalLine('🔴 Déconnecté du broker', 'error');
    });

    client.on('reconnect', () => {
        updateBrokerStatus('connecting', 'Reconnexion...');
        addTerminalLine('🔄 Tentative de reconnexion...', 'warning');
    });
}

function handleMessage(topic, message) {
    const parts = topic.split('/');
    if (parts.length < 2) return;

    const mqttName = parts[1];
    const device = devices.find(d => d.mqttName === mqttName);
    if (!device) return;

    const timestamp = new Date().toLocaleTimeString('fr-FR');
    
    if (parts[0] === 'etat') {
        device.state = message;
        device.lastSeen = new Date();
        addTerminalLine(`📥 [${timestamp}] État reçu: ${device.displayName} → ${message}`, 'success');
    } else if (parts[0] === 'status') {

    device.online = message === 'online';

    // SI OFFLINE → FORCE OFF
    if(message === 'offline') {

        device.state = 'OFF';

        // PUBLIE OFF AUTOMATIQUEMENT
        client.publish(`etat/${device.mqttName}`, 'OFF', {
            qos: 1,
            retain: true
        });

        addTerminalLine(
            `⚡ ${device.displayName} forcé à OFF car hors ligne`,
            'warning'
        );
    }

    device.lastSeen = new Date();

    addTerminalLine(
        `📥 [${timestamp}] Status reçu: ${device.displayName} → ${message}`,
        'info'
    );
}

    renderDevices(elements.searchInput.value);
    updateStats();
}

// ============ UI FUNCTIONS ============
function updateBrokerStatus(state, text) {
    elements.brokerStatus.className = `status-indicator ${state}`;
    elements.brokerText.textContent = text;
}

function updateStats() {
    const online = devices.filter(d => d.online).length;
    const active = devices.filter(d => d.state === 'ON').length;
    const offline = devices.filter(d => !d.online).length;

    document.getElementById('statOnline').textContent = online;
    document.getElementById('statActive').textContent = active;
    document.getElementById('statWarnings').textContent = offline;
    document.getElementById('onlineCount').textContent = `${online} / ${devices.length}`;
    document.getElementById('navDeviceCount').textContent = devices.length;

    elements.lastUpdate.textContent = new Date().toLocaleTimeString('fr-FR');
}

function renderDevices(filter = '') {
    const filtered = devices.filter(d => 
        d.displayName.toLowerCase().includes(filter.toLowerCase()) ||
        d.poste.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
        elements.devicesGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fa-solid fa-server"></i>
                <p>Aucun système trouvé</p>
            </div>`;
        return;
    }

    elements.devicesGrid.innerHTML = filtered.map(device => `
        <div class="device-card ${device.online ? 'online' : ''}">
            <div class="device-header">
                <div class="device-info">
                    <div class="device-avatar">
                        <i class="fa-solid fa-server"></i>
                    </div>
                    <div class="device-meta">
                        <h4>${device.displayName}</h4>
                        <span>
                            <i class="fa-solid fa-location-dot"></i>
                            ${device.poste}
                        </span>
                    </div>
                </div>
                <div class="device-status-badge ${device.online ? 'online' : 'offline'}">
                    <i class="fa-solid fa-circle" style="font-size: 0.5rem;"></i>
                    ${device.online ? 'En ligne' : 'Hors ligne'}
                </div>
            </div>

            <div class="device-metrics">
                <div class="metric">
                    <div class="metric-value" style="color: ${device.state === 'ON' ? 'var(--success)' : 'var(--text-muted)'};">
                        ${device.state}
                    </div>
                    <div class="metric-label">État</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${device.rssi || '--'} dBm</div>
                    <div class="metric-label">Signal</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${device.uptime}</div>
                    <div class="metric-label">Uptime</div>
                </div>
            </div>

            <div class="device-actions">
                <button class="device-btn on" 
                    onclick="sendCommand('${device.mqttName}', 'ON')" 
                    ${!isConnected || !device.online ? 'disabled' : ''}>
                    <i class="fa-solid fa-power-off"></i>
                    ON
                </button>
                <button class="device-btn off" 
                    onclick="sendCommand('${device.mqttName}', 'OFF')" 
                    ${!isConnected || !device.online ? 'disabled' : ''}>
                    <i class="fa-solid fa-ban"></i>
                    OFF
                </button>
            </div>
        </div>
    `).join('');
}

// ============ COMMAND FUNCTIONS ============
window.sendCommand = function(mqttName, command) {
    const device = devices.find(d => d.mqttName === mqttName);
    if (!device) return;

    if (!isConnected || !client) {
        showToast('Non connecté au broker', 'error');
        addTerminalLine('❌ Erreur: Non connecté au broker', 'error');
        return;
    }

    if (!device.online) {
        showToast(`${device.displayName} est hors ligne`, 'error');
        addTerminalLine(`❌ Erreur: ${device.displayName} est hors ligne`, 'error');
        return;
    }

    const topic = `commande/${mqttName}`;
    const timestamp = new Date().toLocaleTimeString('fr-FR');
    
    client.publish(topic, command, { qos: 0, retain: false }, (err) => {
        if (err) {
            showToast(`Erreur ${device.displayName}: ${err.message}`, 'error');
            addTerminalLine(`❌ [${timestamp}] Erreur envoi vers ${device.displayName}: ${err.message}`, 'error');
        } else {
            showToast(`${device.displayName} → ${command}`, 'success');
            addTerminalLine(`📤 [${timestamp}] Commande envoyée: ${device.displayName} → ${command}`, 'success');
            device.state = command;
            renderDevices(elements.searchInput.value);
            updateStats();
        }
    });
};

window.toggleConnected = function(command) {
    if (!isConnected) {
        showToast('Non connecté au broker', 'error');
        addTerminalLine('❌ Erreur: Non connecté au broker', 'error');
        return;
    }

    const connectedDevices = devices.filter(d => d.online);
    if (connectedDevices.length === 0) {
        showToast('Aucun système en ligne', 'warning');
        addTerminalLine('⚠️ Aucun système connecté trouvé', 'warning');
        return;
    }

    connectedDevices.forEach(d => {
        sendCommand(d.mqttName, command);
    });

    showToast(`${command} envoyé à ${connectedDevices.length} système(s) connecté(s)`, 'info');
    addTerminalLine(`📤 Commande ${command} envoyée à ${connectedDevices.length} systèmes`, 'info');
};

// ============ TERMINAL FUNCTIONS ============
function addTerminalLine(text, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('fr-FR');
    const line = document.createElement('div');
    line.className = `terminal-line ${type}`;
    
    if (text.startsWith('>') || text.includes('Commande envoyée') || text.includes('Tentative')) {
        line.classList.add('command');
    }
    
    line.textContent = `[${timestamp}] ${text}`;
    elements.terminalOutput.appendChild(line);
    
    // Auto-scroll to bottom
    elements.terminalBody.scrollTop = elements.terminalBody.scrollHeight;
    
    // Limit history to 100 lines
    const lines = elements.terminalOutput.querySelectorAll('.terminal-line');
    if (lines.length > 100) {
        lines[0].remove();
    }
}

function executeTerminalCommand(command) {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) return;
    
    addTerminalLine(`> ${trimmedCommand}`, 'command');
    
    // Parse command
    const parts = trimmedCommand.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    switch (cmd) {
        case 'help':
            addTerminalLine('Commandes disponibles:', 'info');
            addTerminalLine('  help - Afficher cette aide', 'info');
            addTerminalLine('  status - Afficher le statut de la connexion', 'info');
            addTerminalLine('  send <device> <command> - Envoyer une commande', 'info');
            addTerminalLine('  list - Lister tous les systèmes', 'info');
            addTerminalLine('  online - Lister les systèmes en ligne', 'info');
            addTerminalLine('  publish <topic> <message> - Publier un message MQTT', 'info');
            addTerminalLine('  subscribe <topic> - S\'abonner à un topic', 'info');
            addTerminalLine('  clear - Effacer le terminal', 'info');
            break;
            
        case 'status':
            addTerminalLine(`Statut de connexion: ${isConnected ? 'Connecté' : 'Déconnecté'}`, isConnected ? 'success' : 'error');
            addTerminalLine(`Broker: ${BROKER_URL}`, 'info');
            addTerminalLine(`Systèmes totaux: ${devices.length}`, 'info');
            addTerminalLine(`Systèmes en ligne: ${devices.filter(d => d.online).length}`, 'info');
            break;
            
        case 'send':
            if (args.length < 2) {
                addTerminalLine('Usage: send <device> <command>', 'error');
                addTerminalLine('Exemples:', 'info');
                addTerminalLine('  send 1 ON - Envoyer ON au système 1', 'info');
                addTerminalLine('  send system-001 OFF - Envoyer OFF au system-001', 'info');
                addTerminalLine('  send Système 5 ON - Rechercher par nom', 'info');
                return;
            }
            const deviceName = args[0];
            const deviceCommand = args[1].toUpperCase();
            
            // Try different matching strategies
            let targetDevice = null;
            
            // 1. Exact number match
            if (/^\d+$/.test(deviceName)) {
                const deviceNum = parseInt(deviceName);
                if (deviceNum >= 1 && deviceNum <= devices.length) {
                    targetDevice = devices[deviceNum - 1];
                }
            }
            
            // 2. Partial name match
            if (!targetDevice) {
                targetDevice = devices.find(d => 
                    d.displayName.toLowerCase().includes(deviceName.toLowerCase()) ||
                    d.mqttName.toLowerCase().includes(deviceName.toLowerCase()) ||
                    d.poste.toLowerCase().includes(deviceName.toLowerCase())
                );
            }
            
            if (!targetDevice) {
                addTerminalLine(`❌ Système "${deviceName}" non trouvé`, 'error');
                addTerminalLine('💡 Systèmes disponibles:', 'info');
                devices.slice(0, 10).forEach(d => {
                    const status = d.online ? '🟢' : '🔴';
                    addTerminalLine(`  ${status} ${d.id} - ${d.displayName} (${d.mqttName})`, 'info');
                });
                if (devices.length > 10) {
                    addTerminalLine(`  ... et ${devices.length - 10} autres systèmes`, 'info');
                }
                return;
            }
            
            if (deviceCommand !== 'ON' && deviceCommand !== 'OFF') {
                addTerminalLine(`❌ Commande invalide: ${deviceCommand}. Utilisez ON ou OFF`, 'error');
                return;
            }
            
            sendCommand(targetDevice.mqttName, deviceCommand);
            break;
            
        case 'list':
            addTerminalLine('Liste des systèmes:', 'info');
            devices.forEach(d => {
                const status = d.online ? '🟢' : '🔴';
                addTerminalLine(`  ${status} ${d.displayName} (${d.mqttName}) - ${d.state}`, d.online ? 'success' : 'error');
            });
            break;
            
        case 'online':
            const onlineDevices = devices.filter(d => d.online);
            addTerminalLine(`Systèmes en ligne (${onlineDevices.length}):`, 'success');
            onlineDevices.forEach(d => {
                addTerminalLine(`  🟢 ${d.displayName} (${d.mqttName}) - ${d.state}`, 'success');
            });
            break;
            
        case 'publish':
            if (args.length < 2) {
                addTerminalLine('Usage: publish <topic> <message>', 'error');
                return;
            }
            const topic = args[0];
            const message = args.slice(1).join(' ');
            
            if (!isConnected) {
                addTerminalLine('❌ Non connecté au broker', 'error');
                return;
            }
            
            client.publish(topic, message, (err) => {
                if (err) {
                    addTerminalLine(`❌ Erreur publication: ${err.message}`, 'error');
                } else {
                    addTerminalLine(`✅ Message publié sur ${topic}: ${message}`, 'success');
                }
            });
            break;
            
        case 'subscribe':
            if (args.length < 1) {
                addTerminalLine('Usage: subscribe <topic>', 'error');
                return;
            }
            const subTopic = args[0];
            
            if (!isConnected) {
                addTerminalLine('❌ Non connecté au broker', 'error');
                return;
            }
            
            client.subscribe(subTopic, (err) => {
                if (err) {
                    addTerminalLine(`❌ Erreur abonnement: ${err.message}`, 'error');
                } else {
                    addTerminalLine(`✅ Abonné au topic: ${subTopic}`, 'success');
                }
            });
            break;
            
        case 'clear':
            elements.terminalOutput.innerHTML = '';
            addTerminalLine('Terminal effacé', 'info');
            break;
            
        default:
            addTerminalLine(`Commande inconnue: ${cmd}. Tapez "help" pour l'aide.`, 'error');
    }
}

// ============ EVENT LISTENERS ============
elements.searchInput.addEventListener('input', (e) => {
    renderDevices(e.target.value);
});

elements.terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const command = elements.terminalInput.value;
        if (command.trim()) {
            terminalHistory.push(command);
            terminalHistoryIndex = terminalHistory.length;
            executeTerminalCommand(command);
            elements.terminalInput.value = '';
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (terminalHistoryIndex > 0) {
            terminalHistoryIndex--;
            elements.terminalInput.value = terminalHistory[terminalHistoryIndex];
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (terminalHistoryIndex < terminalHistory.length - 1) {
            terminalHistoryIndex++;
            elements.terminalInput.value = terminalHistory[terminalHistoryIndex];
        } else {
            terminalHistoryIndex = terminalHistory.length;
            elements.terminalInput.value = '';
        }
    }
});

// Mobile menu toggle
elements.menuToggle.addEventListener('click', () => {
    elements.sidebar.classList.toggle('active');
    elements.overlay.classList.toggle('active');
});

elements.overlay.addEventListener('click', () => {
    elements.sidebar.classList.remove('active');
    elements.overlay.classList.remove('active');
});

// ============ UTILITY FUNCTIONS ============
window.refreshAll = function() {
    renderDevices(elements.searchInput.value);
    updateStats();
    showToast('Actualisation effectuée', 'success');
    addTerminalLine('🔄 Actualisation manuelle', 'info');
};

window.addDevice = function() {
    showToast('Fonctionnalité à venir', 'info');
    addTerminalLine('ℹ️ Fonctionnalité d\'ajout en développement', 'info');
};

window.switchView = function(view) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    // Update breadcrumb
    const currentSpan = document.querySelector('.breadcrumb .current');
    const viewNames = {
        'dashboard': 'Tableau de bord',
        'devices': 'Systèmes',
        'analytics': 'Analytiques',
        'logs': 'Logs',
        'settings': 'Paramètres',
        'help': 'Aide'
    };
    currentSpan.textContent = viewNames[view] || view;
    
    // Show/hide content based on view
    const content = document.querySelector('.content');
    
    switch(view) {
        case 'dashboard':
            showDashboard();
            break;
        case 'devices':
            showAllDevices();
            break;
        case 'analytics':
            showAnalytics();
            break;
        case 'logs':
            showLogs();
            break;
        case 'settings':
            showSettings();
            break;
        case 'help':
            showHelp();
            break;
        default:
            showDashboard();
    }
    
    // Close mobile menu
    if (window.innerWidth <= 768) {
        elements.sidebar.classList.remove('active');
        elements.overlay.classList.remove('active');
    }
    
    showToast(`Vue ${viewNames[view] || view} sélectionnée`, 'info');
    addTerminalLine(`🔄 Changement de vue: ${view}`, 'info');
};

// ============ VIEW FUNCTIONS ============
function showDashboard() {
    const content = document.querySelector('.content');
    const onlineDevices = devices.filter(d => d.online);
    
    content.innerHTML = `
        <!-- Stats -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon blue">
                    <i class="fa-solid fa-server"></i>
                </div>
                <div class="stat-info">
                    <h3 id="statTotal">${devices.length}</h3>
                    <p>Total Systèmes</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green">
                    <i class="fa-solid fa-signal"></i>
                </div>
                <div class="stat-info">
                    <h3 id="statOnline">${onlineDevices.length}</h3>
                    <p>En ligne</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <div class="stat-info">
                    <h3 id="statWarnings">${devices.length - onlineDevices.length}</h3>
                    <p>Hors ligne</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon red">
                    <i class="fa-solid fa-power-off"></i>
                </div>
                <div class="stat-info">
                    <h3 id="statActive">${devices.filter(d => d.state === 'ON').length}</h3>
                    <p>Actifs (ON)</p>
                </div>
            </div>
        </div>

        <!-- Online Devices Section -->
        <div class="section-header">
            <h2 class="section-title">
                <i class="fa-solid fa-layer-group" style="margin-right: 8px; color: var(--primary);"></i>
                Systèmes Connectés
            </h2>
            <div class="section-actions">
                <button class="btn btn-ghost" onclick="toggleConnected('ON')">
                    <i class="fa-solid fa-power-off"></i>
                    Allumer connectés
                </button>
                <button class="btn btn-ghost" onclick="toggleConnected('OFF')">
                    <i class="fa-solid fa-ban"></i>
                    Éteindre connectés
                </button>
            </div>
        </div>

        <div class="devices-grid" id="devicesGrid">
            ${onlineDevices.length === 0 ? `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fa-solid fa-server"></i>
                    <p>Aucun système connecté</p>
                </div>
            ` : onlineDevices.map(device => createDeviceCard(device)).join('')}
        </div>

        <!-- Terminal Section -->
        <div class="terminal-container">
            <div class="terminal-header">
                <div class="terminal-title">
                    <i class="fa-solid fa-terminal"></i>
                    Terminal MQTT - Test HiveMQ
                </div>
                <div class="terminal-controls">
                    <button class="terminal-btn close"></button>
                    <button class="terminal-btn minimize"></button>
                    <button class="terminal-btn maximize"></button>
                </div>
            </div>
            <div class="terminal-body" id="terminalBody">
                <div class="terminal-output" id="terminalOutput">
                    <!-- Terminal output injected by JS -->
                </div>
                <div class="terminal-input-container">
                    <span class="terminal-prompt">$</span>
                    <input type="text" class="terminal-input" id="terminalInput" 
                           placeholder="Tapez 'help' pour voir les commandes disponibles..." 
                           autocomplete="off">
                </div>
            </div>
        </div>
    `;
    
    // Re-attach event listeners
    reattachEventListeners();
    updateStats();
}

function showAllDevices() {
    const content = document.querySelector('.content');
    
    content.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">
                <i class="fa-solid fa-server" style="margin-right: 8px; color: var(--primary);"></i>
                Tous les Systèmes
            </h2>
            <div class="section-actions">
                <div class="search-box" style="position: relative; margin-right: 1rem;">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <input type="text" placeholder="Rechercher un système..." id="devicesSearchInput"
                           style="background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); 
                                  padding: 0.6rem 0.75rem 0.6rem 2.5rem; color: var(--text); font-size: 0.85rem; 
                                  width: 300px; outline: none; transition: var(--transition);">
                </div>
                <button class="btn btn-primary" onclick="addDevice()">
                    <i class="fa-solid fa-plus"></i>
                    Ajouter
                </button>
            </div>
        </div>

        <div class="devices-grid" id="allDevicesGrid">
            ${devices.map(device => createDeviceCard(device)).join('')}
        </div>
    `;
    
    // Add search functionality
    const searchInput = document.getElementById('devicesSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const filtered = devices.filter(d => 
                d.displayName.toLowerCase().includes(e.target.value.toLowerCase()) ||
                d.poste.toLowerCase().includes(e.target.value.toLowerCase())
            );
            
            const grid = document.getElementById('allDevicesGrid');
            grid.innerHTML = filtered.map(device => createDeviceCard(device)).join('');
        });
    }
}

function showAnalytics() {
    const content = document.querySelector('.content');
    content.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">
                <i class="fa-solid fa-chart-line" style="margin-right: 8px; color: var(--primary);"></i>
                Analytiques
            </h2>
        </div>
        <div class="empty-state">
            <i class="fa-solid fa-chart-line"></i>
            <p>Analytiques en développement</p>
        </div>
    `;
}

function showLogs() {
    const content = document.querySelector('.content');
    content.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">
                <i class="fa-solid fa-file-lines" style="margin-right: 8px; color: var(--primary);"></i>
                Logs Système
            </h2>
        </div>
        <div class="empty-state">
            <i class="fa-solid fa-file-lines"></i>
            <p>Logs en développement</p>
        </div>
    `;
}

function showSettings() {
    const content = document.querySelector('.content');
    content.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">
                <i class="fa-solid fa-gear" style="margin-right: 8px; color: var(--primary);"></i>
                Paramètres
            </h2>
        </div>
        <div class="empty-state">
            <i class="fa-solid fa-gear"></i>
            <p>Paramètres en développement</p>
        </div>
    `;
}

function showHelp() {
    const content = document.querySelector('.content');
    content.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">
                <i class="fa-solid fa-circle-question" style="margin-right: 8px; color: var(--primary);"></i>
                Aide
            </h2>
        </div>
        <div style="max-width: 800px; margin: 0 auto;">
            <div class="stat-card" style="margin-bottom: 1rem;">
                <h3 style="margin-bottom: 1rem; color: var(--primary);">📋 Commandes Terminal</h3>
                <div style="font-family: monospace; font-size: 0.9rem; line-height: 1.6;">
                    <p><code>help</code> - Afficher l'aide</p>
                    <p><code>status</code> - État de la connexion</p>
                    <p><code>send &lt;system&gt; &lt;command&gt;</code> - Envoyer une commande</p>
                    <p><code>list</code> - Lister tous les systèmes</p>
                    <p><code>online</code> - Lister les systèmes en ligne</p>
                    <p><code>publish &lt;topic&gt; &lt;message&gt;</code> - Publier un message</p>
                    <p><code>subscribe &lt;topic&gt;</code> - S'abonner à un topic</p>
                    <p><code>clear</code> - Effacer le terminal</p>
                </div>
            </div>
            <div class="stat-card">
                <h3 style="margin-bottom: 1rem; color: var(--primary);">🔧 MQTT Topics</h3>
                <div style="font-family: monospace; font-size: 0.9rem; line-height: 1.6;">
                    <p><code>status/system-001</code> - État de connexion</p>
                    <p><code>etat/system-001</code> - État ON/OFF</p>
                    <p><code>commande/system-001</code> - Commandes de contrôle</p>
                </div>
            </div>
        </div>
    `;
}

function createDeviceCard(device) {
    return `
        <div class="device-card ${device.online ? 'online' : ''}">
            <div class="device-header">
                <div class="device-info">
                    <div class="device-avatar">
                        <i class="fa-solid fa-server"></i>
                    </div>
                    <div class="device-meta">
                        <h4>${device.displayName}</h4>
                        <span>
                            <i class="fa-solid fa-location-dot"></i>
                            ${device.poste}
                        </span>
                    </div>
                </div>
                <div class="device-status-badge ${device.online ? 'online' : 'offline'}">
                    <i class="fa-solid fa-circle" style="font-size: 0.5rem;"></i>
                    ${device.online ? 'En ligne' : 'Hors ligne'}
                </div>
            </div>

            <div class="device-metrics">
                <div class="metric">
                    <div class="metric-value" style="color: ${device.state === 'ON' ? 'var(--success)' : 'var(--text-muted)'};">
                        ${device.state}
                    </div>
                    <div class="metric-label">État</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${device.rssi || '--'} dBm</div>
                    <div class="metric-label">Signal</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${device.uptime}</div>
                    <div class="metric-label">Uptime</div>
                </div>
            </div>

            <div class="device-actions">
                <button class="device-btn on" 
                    onclick="sendCommand('${device.mqttName}', 'ON')" 
                    ${!isConnected || !device.online ? 'disabled' : ''}>
                    <i class="fa-solid fa-power-off"></i>
                    ON
                </button>
                <button class="device-btn off" 
                    onclick="sendCommand('${device.mqttName}', 'OFF')" 
                    ${!isConnected || !device.online ? 'disabled' : ''}>
                    <i class="fa-solid fa-ban"></i>
                    OFF
                </button>
            </div>
        </div>
    `;
}

function reattachEventListeners() {
    // Re-attach terminal event listeners
    const terminalInput = document.getElementById('terminalInput');
    const terminalOutput = document.getElementById('terminalOutput');
    
    if (terminalInput) {
        terminalInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const command = terminalInput.value;
                if (command.trim()) {
                    terminalHistory.push(command);
                    terminalHistoryIndex = terminalHistory.length;
                    executeTerminalCommand(command);
                    terminalInput.value = '';
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (terminalHistoryIndex > 0) {
                    terminalHistoryIndex--;
                    terminalInput.value = terminalHistory[terminalHistoryIndex];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (terminalHistoryIndex < terminalHistory.length - 1) {
                    terminalHistoryIndex++;
                    terminalInput.value = terminalHistory[terminalHistoryIndex];
                } else {
                    terminalHistoryIndex = terminalHistory.length;
                    terminalInput.value = '';
                }
            }
        });
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-circle-xmark',
        info: 'fa-circle-info',
        warning: 'fa-triangle-exclamation'
    };
    
    const colors = {
        success: 'var(--success)',
        error: 'var(--danger)',
        info: 'var(--primary)',
        warning: 'var(--warning)'
    };
    
    toast.innerHTML = `
        <i class="fa-solid ${icons[type]}" style="color: ${colors[type]};"></i>
        <span>${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ============ INITIALIZATION ============
function init() {
    connectMQTT();
    
    // Show dashboard by default
    showDashboard();
    
    // Initialize terminal
    addTerminalLine('🚀 Terminal HiveMQ initialisé', 'success');
    addTerminalLine('Tapez "help" pour voir les commandes disponibles', 'info');
    addTerminalLine('⏳ En attente des connexions ESP32...', 'info');
}

// Start the application
init();
