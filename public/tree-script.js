document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const domainInput = document.getElementById('domain-input');
    const resolveBtn = document.getElementById('resolve-btn');
    const resetBtn = document.getElementById('reset-btn');
    const stepBtn = document.getElementById('step-btn');
    const autoBtn = document.getElementById('auto-btn');
    const dnsTree = document.getElementById('dns-tree');
    const resolutionDetails = document.getElementById('resolution-details');
    const dnssecToggle = document.getElementById('dnssec-toggle');
    const dnssecVisual = document.getElementById('dnssec-visual');
    const tooltip = document.getElementById('detail-tooltip');
    
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Deactivate all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Activate the selected button and pane
            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Simulation state
    let simulationSteps = [];
    let currentStep = 0;
    let autoPlayInterval = null;
    let isDnssecEnabled = true;
    let treeNodes = {};
    
    // DNS and DNSSEC data
    const dnsRecords = {
        'exemplo.pt': {
            'A': '192.0.2.1',
            'AAAA': '2001:db8::1',
            'MX': 'mail.exemplo.pt',
            'NS': 'ns1.exemplo.pt'
        },
        'exemplo2.pt': {
            'A': '192.0.2.2',
            'AAAA': '2001:db8::2',
            'MX': 'mail.exemplo2.pt',
            'NS': 'ns1.exemplo2.pt'
        },
        'google.pt': {
            'A': '142.250.185.78',
            'AAAA': '2a00:1450:4001:830::200e',
            'MX': 'mail.google.pt',
            'NS': 'ns1.google.pt'
        },
        'dns.pt': {
            'A': '193.136.192.1',
            'AAAA': '2001:690:a80:4001::1',
            'MX': 'mail.dns.pt',
            'NS': 'ns1.dns.pt',
            'DNSSEC': true
        }
    };
    
    // DNSSEC information
    const dnssecInfo = {
        'exemplo.pt': {
            enabled: false
        },
        'exemplo2.pt': {
            enabled: true,
            dnskey: {
                ksk: 'KSK-1234 RSA 2048 bits',
                zsk: 'ZSK-5678 RSA 1024 bits'
            },
            ds: 'SHA-256 43FD1B BC382B 9C1E7F 4809AF 8298A9 8ED63F F3',
            rrsig: true,
            nsec: 'NSEC3',
            cds: 'Presente e válido'
        },
        'google.pt': {
            enabled: true,
            dnskey: {
                ksk: 'KSK-9876 RSA 2048 bits',
                zsk: 'ZSK-5432 RSA 1024 bits'
            },
            ds: 'SHA-256 12AB3C 4D56E7 890F123 456789 ABCDEF 123456 789',
            rrsig: true,
            nsec: 'NSEC3',
            cds: 'Presente e válido'
        },
        'dns.pt': {
            enabled: true,
            dnskey: {
                ksk: 'KSK-7654 RSA 4096 bits',
                zsk: 'ZSK-3210 RSA 2048 bits'
            },
            ds: 'SHA-256 9876AB 543C21 DEF098 765432 109876 543210 ABC',
            rrsig: true,
            nsec: 'NSEC3',
            cds: 'Presente e válido'
        }
    };
    
    // Portuguese text for DNS resolution steps
    const stepTexts = {
        'browser-request': {
            title: 'Navegador Inicia a Consulta',
            description: 'O navegador precisa converter um nome de domínio em um endereço IP para conectar-se ao servidor web. Ele envia uma consulta ao resolver DNS local.'
        },
        'resolver-check-cache': {
            title: 'Verificação de Cache',
            description: 'O resolver DNS local verifica primeiro seu cache para ver se já possui o endereço IP para este domínio de uma consulta anterior.'
        },
        'resolver-cache-miss': {
            title: 'Cache Não Encontrado',
            description: 'O resolver não encontrou o domínio em seu cache. Será necessário realizar uma consulta recursiva completa.'
        },
        'resolver-to-root': {
            title: 'Consulta aos Servidores Raiz',
            description: 'O resolver envia uma consulta aos servidores raiz do DNS para descobrir quem é responsável pelo TLD (Top-Level Domain) solicitado.'
        },
        'root-response': {
            title: 'Resposta dos Servidores Raiz',
            description: 'Os servidores raiz respondem com informações sobre quais servidores são responsáveis pelo TLD especificado (ex: .pt).'
        },
        'root-ds-check': {
            title: 'Verificação DS na Raiz',
            description: 'O resolver obtém o registro DS (Delegation Signer) da zona raiz, que contém um hash da chave KSK da zona TLD.'
        },
        'resolver-to-tld': {
            title: 'Consulta aos Servidores TLD',
            description: 'O resolver consulta os servidores TLD (.pt) para descobrir quais servidores são responsáveis pelo domínio específico.'
        },
        'tld-response': {
            title: 'Resposta dos Servidores TLD',
            description: 'Os servidores TLD respondem com informações sobre os servidores autoritativos para o domínio solicitado.'
        },
        'tld-ds-check': {
            title: 'Verificação DS no TLD',
            description: 'O resolver obtém o registro DS do TLD, que contém um hash da chave KSK do domínio solicitado.'
        },
        'resolver-to-authoritative': {
            title: 'Consulta ao Servidor Autoritativo',
            description: 'O resolver consulta o servidor autoritativo para obter os registros específicos do domínio.'
        },
        'authoritative-response': {
            title: 'Resposta do Servidor Autoritativo',
            description: 'O servidor autoritativo responde com os registros DNS solicitados (ex: registro A com o endereço IP).'
        },
        'dnskey-verification': {
            title: 'Verificação do DNSKEY',
            description: 'O resolver obtém e verifica os registros DNSKEY do domínio, que contêm chaves públicas usadas para verificar assinaturas.'
        },
        'rrsig-verification': {
            title: 'Verificação das Assinaturas RRSIG',
            description: 'O resolver verifica as assinaturas digitais (RRSIG) dos registros recebidos usando a chave DNSKEY.'
        },
        'resolver-update-cache': {
            title: 'Atualização do Cache',
            description: 'O resolver atualiza seu cache com as informações obtidas, incluindo o tempo de vida (TTL) dos registros.'
        },
        'resolver-to-browser': {
            title: 'Resposta ao Navegador',
            description: 'O resolver retorna o endereço IP para o navegador.'
        },
        'browser-to-webserver': {
            title: 'Conexão ao Servidor Web',
            description: 'O navegador inicia uma conexão HTTP/HTTPS com o servidor web usando o endereço IP recebido.'
        },
        'webserver-response': {
            title: 'Resposta do Servidor Web',
            description: 'O servidor web responde com o conteúdo da página solicitada.'
        },
        'browser-render': {
            title: 'Renderização da Página',
            description: 'O navegador processa e exibe o conteúdo recebido do servidor web.'
        },
        'authoritative-nxdomain': {
            title: 'Domínio Inexistente (NXDOMAIN)',
            description: 'O servidor autoritativo responde que o domínio solicitado não existe.'
        },
        'resolver-error-to-browser': {
            title: 'Erro Retornado ao Navegador',
            description: 'O resolver informa ao navegador que o domínio não existe.'
        },
        'browser-error': {
            title: 'Erro no Navegador',
            description: 'O navegador exibe uma mensagem de erro informando que não foi possível encontrar o domínio.'
        },
        'dnssec-validation-success': {
            title: 'Validação DNSSEC Bem-Sucedida',
            description: 'Todas as assinaturas DNSSEC foram verificadas com sucesso, garantindo a autenticidade e integridade dos registros DNS.'
        },
        'dnssec-validation-failure': {
            title: 'Falha na Validação DNSSEC',
            description: 'A validação DNSSEC falhou, indicando possível adulteração ou problema de configuração dos registros DNS.'
        }
    };
    
    // Initialize
    function init() {
        isDnssecEnabled = dnssecToggle.checked;
        
        // Event listener for DNSSEC toggle
        dnssecToggle.addEventListener('change', function() {
            isDnssecEnabled = this.checked;
            if (simulationSteps.length > 0) {
                resetSimulation();
                startSimulation(domainInput.value.trim().toLowerCase());
            }
        });
        
        // Add tooltip functionality to tree nodes
        document.addEventListener('mousemove', function(e) {
            tooltip.style.left = (e.pageX + 15) + 'px';
            tooltip.style.top = (e.pageY - 15) + 'px';
        });
        
        // Initial message
        resolutionDetails.innerHTML = `
            <div class="detail-step">
                <h4>Bem-vindo ao Simulador de Resolução DNS</h4>
                <p>Digite um domínio e clique em "Resolver" para visualizar o processo de resolução DNS.</p>
                <p>Qualquer domínio pode ser utilizado para simulação!</p>
                <p>Este simulador usa registros DNS reais da internet.</p>
                <p>O toggle DNSSEC permite visualizar o processo de validação de segurança do DNS.</p>
            </div>
        `;
        
        // Initialize components with a slight delay to ensure DOM is ready
        setTimeout(() => {
            // Initialize DNSSEC visual
            renderDnssecVisual();
            
            // Create initial DNS tree layout
            createDnsTree();
        }, 200);
    }
    
    // Create tree view with a modern flow layout
    function createDnsTree() {
        dnsTree.innerHTML = '';
        treeNodes = {};
        
        // Create flow structure container
        const processFlow = document.createElement('div');
        processFlow.className = 'process-flow';
        dnsTree.appendChild(processFlow);
        
        // Create connector container
        const connectorContainer = document.createElement('div');
        connectorContainer.className = 'connector-container';
        processFlow.appendChild(connectorContainer);
        
        // Create node definitions
        const nodeGroups = [
            { id: 'browser', label: 'Navegador', description: 'Inicia a consulta DNS e processa a resposta HTTP' },
            { id: 'resolver', label: 'Resolver DNS Local', description: 'Realiza a resolução recursiva de DNS' },
            { id: 'root', label: 'Servidores Raiz DNS', description: 'Fornecem informações sobre servidores TLD' },
            { id: 'tld', label: 'Servidores TLD (.PT)', description: 'Fornecem informações sobre servidores autoritativos do domínio' },
            { id: 'authoritative', label: 'Servidor DNS Autoritativo', description: 'Fornece os registros específicos do domínio' },
            { id: 'webserver', label: 'Servidor Web', description: 'Responde às solicitações HTTP com conteúdo web' }
        ];
        
        // Create nodes
        nodeGroups.forEach(group => {
            const node = document.createElement('div');
            node.id = `node-${group.id}`;
            node.className = 'tree-node';
            node.innerHTML = `
                <h3>${group.label}</h3>
                <p>${group.description}</p>
                <div class="node-content"></div>
            `;
            
            // Add tooltip functionality
            node.addEventListener('mouseenter', function() {
                showTooltip(group.id);
            });
            
            node.addEventListener('mouseleave', function() {
                hideTooltip();
            });
            
            processFlow.appendChild(node);
            treeNodes[group.id] = node;
        });
        
        // Create data packet indicators for animation
        createDataPackets(connectorContainer);
        
        // Create enhanced connectors between nodes
        createConnectors(connectorContainer);
    }
    
    // Create data packet indicators for animation
    function createDataPackets(container) {
        // Define all the packet animations we'll need
        const packets = [
            { id: 'browser-to-resolver', className: 'query', label: 'DNS' },
            { id: 'resolver-to-browser', className: 'response', label: 'IP' },
            { id: 'resolver-to-root', className: 'query', label: '.PT?' },
            { id: 'root-to-resolver', className: 'response', label: 'TLD' },
            { id: 'resolver-to-tld', className: 'query', label: 'exemplo.pt?' },
            { id: 'tld-to-resolver', className: 'response', label: 'NS' },
            { id: 'resolver-to-authoritative', className: 'query', label: 'A?' },
            { id: 'authoritative-to-resolver', className: 'response', label: 'IP' },
            { id: 'browser-to-webserver', className: 'query', label: 'HTTP' },
            { id: 'webserver-to-browser', className: 'response', label: 'HTML' }
        ];
        
        packets.forEach(packet => {
            const element = document.createElement('div');
            element.id = `packet-${packet.id}`;
            element.className = `data-packet ${packet.className}`;
            element.innerHTML = `<span class="packet-label">${packet.label}</span>`;
            container.appendChild(element);
        });
    }
    
    // Create enhanced connectors between nodes
    function createConnectors(container) {
        // Define all connections with labels
        const connections = [
            { 
                from: 'browser', to: 'resolver', 
                label: 'Consulta DNS', 
                direction: 'down', 
                packetId: 'browser-to-resolver'
            },
            { 
                from: 'resolver', to: 'browser', 
                label: 'Resposta DNS', 
                direction: 'up',
                packetId: 'resolver-to-browser' 
            },
            { 
                from: 'resolver', to: 'root', 
                label: 'Onde está .PT?', 
                direction: 'down-left',
                packetId: 'resolver-to-root' 
            },
            { 
                from: 'root', to: 'resolver', 
                label: 'Info do TLD', 
                direction: 'up-right',
                packetId: 'root-to-resolver'
            },
            { 
                from: 'resolver', to: 'tld', 
                label: 'Onde está exemplo.pt?', 
                direction: 'down',
                packetId: 'resolver-to-tld'
            },
            { 
                from: 'tld', to: 'resolver', 
                label: 'Info do Autoritativo', 
                direction: 'up',
                packetId: 'tld-to-resolver'
            },
            { 
                from: 'resolver', to: 'authoritative', 
                label: 'IP de exemplo.pt?', 
                direction: 'down-right',
                packetId: 'resolver-to-authoritative'
            },
            { 
                from: 'authoritative', to: 'resolver', 
                label: 'IP: 192.0.2.1', 
                direction: 'up-left',
                packetId: 'authoritative-to-resolver'
            },
            { 
                from: 'browser', to: 'webserver', 
                label: 'HTTP Request', 
                direction: 'none',
                packetId: 'browser-to-webserver'
            },
            { 
                from: 'webserver', to: 'browser', 
                label: 'HTTP Response', 
                direction: 'none',
                packetId: 'webserver-to-browser'
            }
        ];
        
        // Create all connectors
        connections.forEach((conn, index) => {
            createEnhancedConnector(
                container, 
                conn.from, 
                conn.to, 
                conn.direction, 
                conn.label,
                `connector-${index}`,
                conn.packetId
            );
        });
    }
    
    // Create an enhanced connector between two nodes
    function createEnhancedConnector(container, fromId, toId, direction, label, connectorId, packetId) {
        const fromNode = treeNodes[fromId];
        const toNode = treeNodes[toId];
        
        if (!fromNode || !toNode) return;
        
        // Skip drawing connector lines for "none" direction
        if (direction === 'none') {
            // Only create label and set up packet animation
            // Create label
            const labelElement = document.createElement('div');
            labelElement.className = 'connector-label';
            labelElement.textContent = label;
            
            // Calculate positions after a small delay to ensure CSS grid layout is complete
            setTimeout(() => {
                const fromRect = fromNode.getBoundingClientRect();
                const toRect = toNode.getBoundingClientRect();
                
                // Adjust for scrolling
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                
                // Set precise connection points on the boxes
                const fromCenterX = fromRect.left + (fromRect.width / 2);
                const fromCenterY = fromRect.top + scrollTop + (fromRect.height / 2);
                const toCenterX = toRect.left + (toRect.width / 2);
                const toCenterY = toRect.top + scrollTop + (toRect.height / 2);
                
                // Position label in middle
                const labelX = (fromCenterX + toCenterX) / 2;
                const labelY = (fromCenterY + toCenterY) / 2;
                
                // Apply label position
                labelElement.style.left = `${labelX}px`;
                labelElement.style.top = `${labelY}px`;
                
                // Configure the data packet for this connection if provided
                if (packetId) {
                    const packet = document.getElementById(`packet-${packetId}`);
                    if (packet) {
                        // Position packet at the start node
                        packet.style.left = `${fromCenterX - 12}px`; // Half of packet width
                        packet.style.top = `${fromCenterY - 12}px`; // Half of packet height
                        
                        // Store end coordinates as CSS variables for the animation
                        packet.style.setProperty('--tx', `${toCenterX - fromCenterX}px`);
                        packet.style.setProperty('--ty', `${toCenterY - fromCenterY}px`);
                    }
                }
            }, 200);
            
            // Add label to container
            container.appendChild(labelElement);
            return;
        }
        
        // Create connector
        const connector = document.createElement('div');
        connector.id = connectorId;
        connector.className = 'connector';
        
        // Create arrow
        const arrow = document.createElement('div');
        arrow.className = 'connector-arrow';
        
        // Create label
        const labelElement = document.createElement('div');
        labelElement.className = 'connector-label';
        labelElement.textContent = label;
        
        // Calculate positions after a small delay to ensure CSS grid layout is complete
        setTimeout(() => {
            const fromRect = fromNode.getBoundingClientRect();
            const toRect = toNode.getBoundingClientRect();
            
            // Adjust for scrolling
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // Position based on direction
            let startX, startY, endX, endY, length, angle, labelX, labelY;
            
            // Set precise connection points on the boxes
            // We'll use center points of edges for better alignment
            const fromCenterX = fromRect.left + (fromRect.width / 2);
            const fromCenterY = fromRect.top + scrollTop + (fromRect.height / 2);
            const toCenterX = toRect.left + (toRect.width / 2);
            const toCenterY = toRect.top + scrollTop + (toRect.height / 2);
            
            // Calculate positions based on the grid layout and direction
            switch(direction) {
                case 'down':
                    // From bottom center of fromNode to top center of toNode
                    startX = fromCenterX;
                    startY = fromRect.top + scrollTop + fromRect.height;
                    endX = toCenterX;
                    endY = toRect.top + scrollTop;
                    break;
                    
                case 'up':
                    // From top center of fromNode to bottom center of toNode
                    startX = fromCenterX;
                    startY = fromRect.top + scrollTop;
                    endX = toCenterX;
                    endY = toRect.top + scrollTop + toRect.height;
                    break;
                
                case 'down-left':
                    // From middle left of fromNode to middle right of toNode
                    startX = fromRect.left + 2; // Slight inset
                    startY = fromCenterY;
                    endX = toRect.left + toRect.width - 2; // Slight inset
                    endY = toCenterY;
                    break;
                
                case 'up-right':
                    // From middle right of fromNode to middle left of toNode
                    startX = fromRect.left + fromRect.width - 2; // Slight inset
                    startY = fromCenterY;
                    endX = toRect.left + 2; // Slight inset
                    endY = toCenterY;
                    break;
                
                case 'down-right':
                    // From middle right of fromNode to middle left of toNode
                    startX = fromRect.left + fromRect.width - 2; // Slight inset
                    startY = fromCenterY;
                    endX = toRect.left + 2; // Slight inset
                    endY = toCenterY;
                    break;
                
                case 'up-left':
                    // From middle left of fromNode to middle right of toNode
                    startX = fromRect.left + 2; // Slight inset
                    startY = fromCenterY;
                    endX = toRect.left + toRect.width - 2; // Slight inset
                    endY = toCenterY;
                    break;
                
                case 'bottom-curve':
                    // Browser to webserver - use consistent edge points
                    if (window.innerWidth < 768) {
                        // Mobile: direct line from bottom of browser to top of webserver
                        startX = fromCenterX;
                        startY = fromRect.top + scrollTop + fromRect.height;
                        endX = toCenterX;
                        endY = toRect.top + scrollTop;
                    } else {
                        // Desktop: make a longer path around the side
                        startX = fromCenterX + (fromRect.width / 3); // Offset from center
                        startY = fromRect.top + scrollTop + fromRect.height;
                        endX = toCenterX + (toRect.width / 3); // Offset from center
                        endY = toRect.top + scrollTop;
                    }
                    break;
                
                case 'top-curve':
                    // Webserver to browser - use consistent edge points
                    if (window.innerWidth < 768) {
                        // Mobile: direct line from top of webserver to bottom of browser
                        startX = fromCenterX;
                        startY = fromRect.top + scrollTop;
                        endX = toCenterX;
                        endY = toRect.top + scrollTop + toRect.height;
                    } else {
                        // Desktop: make a longer path around the other side
                        startX = fromCenterX - (fromRect.width / 3); // Offset from center
                        startY = fromRect.top + scrollTop;
                        endX = toCenterX - (toRect.width / 3); // Offset from center
                        endY = toRect.top + scrollTop + toRect.height;
                    }
                    break;
            }
            
            // Calculate length and angle for the connector
            length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
            
            // Apply calculated styles
            connector.style.width = `${length}px`;
            connector.style.left = `${startX}px`;
            connector.style.top = `${startY}px`;
            connector.style.transform = `rotate(${angle}deg)`;
            
            // Position arrow at end of connector
            arrow.style.left = `${length - 12}px`;
            arrow.style.top = `0`;
            
            // Position label slightly offset from the center of the connector
            const offsetAngle = (angle + 90) % 360; // Perpendicular to connector
            const offsetDistance = 15; // Pixels to offset the label
            
            labelX = startX + (endX - startX) / 2 + Math.cos(offsetAngle * Math.PI / 180) * offsetDistance;
            labelY = startY + (endY - startY) / 2 + Math.sin(offsetAngle * Math.PI / 180) * offsetDistance;
            
            // Apply label position
            labelElement.style.left = `${labelX}px`;
            labelElement.style.top = `${labelY}px`;
            
            // Configure the data packet for this connection if provided
            if (packetId) {
                const packet = document.getElementById(`packet-${packetId}`);
                if (packet) {
                    // Position packet at the start of the connector
                    // Offset to center on the connector with larger packet size
                    packet.style.left = `${startX - 12}px`; // Half of packet width
                    packet.style.top = `${startY - 12}px`; // Half of packet height
                    
                    // Store end coordinates as CSS variables for the animation
                    packet.style.setProperty('--tx', `${endX - startX}px`);
                    packet.style.setProperty('--ty', `${endY - startY}px`);
                }
            }
            
        }, 200); // Increased delay to ensure CSS grid is fully rendered
        
        // Add arrow to connector
        connector.appendChild(arrow);
        
        // Add connector and label to container
        container.appendChild(connector);
        container.appendChild(labelElement);
    }
    
    // Animate a data packet along a path
    function animatePacket(packetId, type = 'query') {
        const packet = document.getElementById(`packet-${packetId}`);
        if (!packet) return;
        
        // Remove any existing animation
        packet.classList.remove('active');
        
        // Set type class
        packet.classList.remove('query', 'response', 'error');
        packet.classList.add(type);
        
        // Ensure packet is visible and properly positioned
        // Get current position to force layout calculation
        const _ = packet.offsetWidth; 
        
        // Trigger animation with small delay
        setTimeout(() => {
            packet.classList.add('active');
        }, 50);
        
        // Remove animation class after animation completes
        setTimeout(() => {
            packet.classList.remove('active');
        }, 1900); // Slightly longer than animation duration
    }
    
    // Show tooltip with detailed information
    function showTooltip(nodeId) {
        let content = '';
        
        switch(nodeId) {
            case 'browser':
                content = `
                    <h4>Navegador</h4>
                    <p>O navegador é onde começa o processo de resolução DNS.</p>
                    <p>Quando você digita um URL, o navegador precisa converter o nome do domínio em um endereço IP para estabelecer uma conexão.</p>
                    <p>Sequência de eventos:</p>
                    <ol>
                        <li>O navegador verifica seu próprio cache</li>
                        <li>Em seguida, consulta o resolver DNS local</li>
                        <li>Após receber o IP, inicia uma conexão HTTP com o servidor web</li>
                    </ol>
                `;
                break;
            case 'resolver':
                content = `
                    <h4>Resolver DNS Local</h4>
                    <p>O resolver DNS local é responsável pela resolução recursiva de nomes de domínio.</p>
                    <p>Geralmente é fornecido pelo seu ISP ou pode ser configurado manualmente (ex: 8.8.8.8 do Google).</p>
                    <p>Funções principais:</p>
                    <ul>
                        <li>Verificar cache local para respostas anteriores</li>
                        <li>Realizar consultas recursivas a servidores DNS</li>
                        <li>Validar respostas DNSSEC (se habilitado)</li>
                        <li>Retornar resultados ao navegador</li>
                    </ul>
                `;
                break;
            case 'root':
                content = `
                    <h4>Servidores Raiz DNS</h4>
                    <p>Os servidores raiz são o primeiro passo na resolução de nomes de domínio hierárquicos.</p>
                    <p>Existem 13 conjuntos de servidores raiz (A-M) distribuídos globalmente.</p>
                    <p>Eles contêm informações sobre os servidores de TLD (como .com, .pt, .org).</p>
                    <p>Com DNSSEC, os servidores raiz fornecem a âncora de confiança para a cadeia de validação.</p>
                `;
                break;
            case 'tld':
                content = `
                    <h4>Servidores TLD (.PT)</h4>
                    <p>Os servidores TLD (Top-Level Domain) gerenciam todos os domínios sob um determinado TLD.</p>
                    <p>No caso de .PT, são geridos pela Associação DNS.PT.</p>
                    <p>Eles contêm informações sobre os servidores autoritativos para cada domínio .PT.</p>
                    <p>Com DNSSEC, os servidores TLD mantêm registros DS que estabelecem a cadeia de confiança com os domínios.</p>
                `;
                break;
            case 'authoritative':
                content = `
                    <h4>Servidor DNS Autoritativo</h4>
                    <p>Os servidores autoritativos contêm os registros oficiais para um domínio específico.</p>
                    <p>Geralmente gerenciados pela entidade que registrou o domínio ou seu provedor DNS.</p>
                    <p>Tipos de registros comuns:</p>
                    <ul>
                        <li>A/AAAA: Endereço IPv4/IPv6</li>
                        <li>MX: Servidor de e-mail</li>
                        <li>NS: Servidores de nomes</li>
                        <li>DNSKEY/RRSIG: Registros DNSSEC</li>
                    </ul>
                `;
                break;
            case 'webserver':
                content = `
                    <h4>Servidor Web</h4>
                    <p>O servidor web é o destino final após a resolução DNS.</p>
                    <p>Recebe requisições HTTP/HTTPS na porta 80/443 e envia de volta o conteúdo solicitado.</p>
                    <p>A conexão só é possível depois que o endereço IP foi obtido através da resolução DNS.</p>
                `;
                break;
        }
        
        tooltip.innerHTML = content;
        tooltip.style.display = 'block';
    }
    
    // Hide tooltip
    function hideTooltip() {
        tooltip.style.display = 'none';
    }
    
    // Render DNSSEC visual components
    function renderDnssecVisual() {
        dnssecVisual.innerHTML = '';
        
        const chainContainer = document.createElement('div');
        chainContainer.className = 'dnssec-chain';
        
        const chainLinks = [
            { id: 'root-key', label: 'Raiz', description: 'Âncora de confiança do DNSSEC' },
            { id: 'tld-key', label: '.PT', description: 'Chave DNSKEY da zona .PT' },
            { id: 'domain-key', label: 'Domínio', description: 'Chave DNSKEY do domínio' },
            { id: 'records', label: 'Registros', description: 'Registros DNS assinados' }
        ];
        
        chainLinks.forEach(link => {
            const chainLink = document.createElement('div');
            chainLink.className = 'chain-link';
            chainLink.id = link.id;
            chainLink.textContent = link.label;
            chainLink.setAttribute('data-description', link.description);
            
            chainLink.addEventListener('mouseenter', function() {
                tooltip.innerHTML = `<h4>${link.label}</h4><p>${link.description}</p>`;
                tooltip.style.display = 'block';
            });
            
            chainLink.addEventListener('mouseleave', function() {
                hideTooltip();
            });
            
            chainContainer.appendChild(chainLink);
        });
        
        dnssecVisual.appendChild(chainContainer);
    }
    
    // Update DNSSEC component statuses
    function updateDnssecComponents(domain) {
        // Reset all components
        document.querySelectorAll('.dnssec-component .component-status').forEach(status => {
            status.className = 'component-status';
            status.textContent = '';
        });
        
        if (!isDnssecEnabled) {
            document.getElementById('dnskey').querySelector('.component-status').className = 'component-status status-error';
            document.getElementById('dnskey').querySelector('.component-status').textContent = 'DNSSEC não está habilitado para esta simulação.';
            return;
        }
        
        const domainInfo = dnssecInfo[domain];
        
        if (!domainInfo || !domainInfo.enabled) {
            document.getElementById('dnskey').querySelector('.component-status').className = 'component-status status-error';
            document.getElementById('dnskey').querySelector('.component-status').textContent = 'DNSSEC não está configurado para este domínio.';
            return;
        }
        
        // Update DNSKEY component
        const dnskeyStatus = document.getElementById('dnskey').querySelector('.component-status');
        dnskeyStatus.className = 'component-status status-active';
        dnskeyStatus.innerHTML = `
            <strong>KSK (Key Signing Key):</strong> ${domainInfo.dnskey.ksk}<br>
            <strong>ZSK (Zone Signing Key):</strong> ${domainInfo.dnskey.zsk}
            <div class="key-box">
                ${domain}. 3600 IN DNSKEY 257 3 8 (${domainInfo.dnskey.ksk.substring(4)})
            </div>
        `;
        
        // Update DS component
        const dsStatus = document.getElementById('ds').querySelector('.component-status');
        dsStatus.className = 'component-status status-active';
        dsStatus.innerHTML = `
            <strong>DS Record Hash:</strong> ${domainInfo.ds}
            <div class="key-box">
                ${domain}. 3600 IN DS 12345 8 2 (${domainInfo.ds})
            </div>
        `;
        
        // Update RRSIG component
        const rrsigStatus = document.getElementById('rrsig').querySelector('.component-status');
        rrsigStatus.className = 'component-status status-active';
        rrsigStatus.innerHTML = `
            <strong>Estado:</strong> Assinaturas válidas para todos os registros
            <div class="signature-box">
                ${domain}. 3600 IN RRSIG A 8 3 3600 (
                20230615000000 20230601000000
                12345 ${domain}.
                a1b2c3d4e5f6...)
            </div>
        `;
        
        // Update NSEC component
        const nsecStatus = document.getElementById('nsec').querySelector('.component-status');
        nsecStatus.className = 'component-status status-active';
        nsecStatus.innerHTML = `
            <strong>Tipo:</strong> ${domainInfo.nsec}
            <div class="key-box">
                ${domain}. 3600 IN NSEC3 1 0 10 ab12cd ${domainInfo.nsec === 'NSEC3' ? 'H(próximo-domínio)' : 'próximo-domínio'} A NS MX RRSIG NSEC3
            </div>
        `;
        
        // Update CDS component
        const cdsStatus = document.getElementById('cds').querySelector('.component-status');
        cdsStatus.className = 'component-status status-active';
        cdsStatus.innerHTML = `
            <strong>Estado:</strong> ${domainInfo.cds}
            <div class="key-box">
                ${domain}. 3600 IN CDS 12345 8 2 (${domainInfo.ds})
            </div>
        `;
    }
    
    // Reset simulation state
    function resetSimulation() {
        clearAllStatuses();
        simulationSteps = [];
        currentStep = 0;
        
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
            autoBtn.textContent = 'Reprodução Automática';
        }
        
        // Reset tree
        Object.values(treeNodes).forEach(node => {
            node.classList.remove('active', 'highlighted', 'error');
            const content = node.querySelector('.node-content');
            if (content) content.textContent = '';
        });
        
        // Reset DNSSEC components
        document.querySelectorAll('.dnssec-component .component-status').forEach(status => {
            status.className = 'component-status';
            status.textContent = '';
        });
        
        // Clear resolution details
        resolutionDetails.innerHTML = `
            <div class="detail-step">
                <h4>Simulação reiniciada</h4>
                <p>Digite um domínio e clique em "Resolver" para iniciar uma nova simulação.</p>
            </div>
        `;
    }
    
    // Clear element statuses
    function clearAllStatuses() {
        Object.values(treeNodes).forEach(node => {
            node.classList.remove('active', 'highlighted', 'error');
        });
    }
    
    // Generate simulation steps for a domain
    function generateSimulation(domain) {
        const steps = [];
        const domainParts = domain.split('.');
        const tld = domainParts[domainParts.length - 1];
        
        // Check if DNSSEC is enabled for this domain
        const hasDnssec = isDnssecEnabled && dnssecInfo[domain] && dnssecInfo[domain].enabled;
        
        // Step 1: Browser initiates request
        steps.push({
            action: 'browser-request',
            elements: ['browser'],
            nodeContent: `Iniciando consulta DNS para ${domain}`
        });
        
        // Step 2: Check resolver cache
        steps.push({
            action: 'resolver-check-cache',
            elements: ['resolver'],
            nodeContent: `Verificando cache para ${domain}`
        });
        
        // Step 3: Cache miss (we'll always simulate a miss for now)
        steps.push({
            action: 'resolver-cache-miss',
            elements: ['resolver'],
            nodeContent: `Cache não encontrado para ${domain}`
        });
        
        // Step 4: Resolver queries root servers
        steps.push({
            action: 'resolver-to-root',
            elements: ['resolver', 'root'],
            nodeContent: `Consultando servidores raiz para ${domain}`
        });
        
        // Step 5: Root DNS servers respond
        steps.push({
            action: 'root-response',
            elements: ['root', 'resolver'],
            nodeContent: `Resposta: NS para .${tld}`
        });
        
        // DNSSEC validation steps for root zone if enabled
        if (hasDnssec) {
            steps.push({
                action: 'root-ds-check',
                elements: ['root', 'resolver'],
                nodeContent: `Verificando registros DS para .${tld}`
            });
        }
        
        // Step 6: Resolver queries TLD servers
        steps.push({
            action: 'resolver-to-tld',
            elements: ['resolver', 'tld'],
            nodeContent: `Consultando servidores TLD .${tld}`
        });
        
        // Step 7: TLD servers respond
        steps.push({
            action: 'tld-response',
            elements: ['tld', 'resolver'],
            nodeContent: `Resposta: NS para ${domain}`
        });
        
        // DNSSEC validation steps for TLD zone if enabled
        if (hasDnssec) {
            steps.push({
                action: 'tld-ds-check',
                elements: ['tld', 'resolver'],
                nodeContent: `Verificando registros DS para ${domain}`
            });
        }
        
        // Step 8: Resolver queries authoritative server
        steps.push({
            action: 'resolver-to-authoritative',
            elements: ['resolver', 'authoritative'],
            nodeContent: `Consultando servidor autoritativo para ${domain}`
        });
        
        // Step 9: Authoritative server responds
        // Use real DNS records via server-side DNS lookup
        let ip;
        let records;
        // Perform a real DNS lookup using server-side DNS
        const dnsRequest = new XMLHttpRequest();
        dnsRequest.open('GET', `/dns-lookup?domain=${domain}`, false); // Synchronous request
        dnsRequest.send();
        
        if (dnsRequest.status === 200) {
            try {
                const response = JSON.parse(dnsRequest.responseText);
                if (response.ip) {
                    ip = response.ip;
                    // Create records with real IP
                    records = {
                        'A': ip,
                        'AAAA': response.ipv6 || `2001:db8::1`,
                        'MX': `mail.${domain}`,
                        'NS': `ns1.${domain}`
                    };
                } else {
                    throw new Error("No IP in response");
                }
            } catch (e) {
                console.error("Error parsing DNS lookup response:", e);
                ip = "0.0.0.0";
                records = {
                    'A': ip,
                    'AAAA': `2001:db8::1`,
                    'MX': `mail.${domain}`,
                    'NS': `ns1.${domain}`
                };
            }
        } else {
            ip = "0.0.0.0";
            records = {
                'A': ip,
                'AAAA': `2001:db8::1`,
                'MX': `mail.${domain}`,
                'NS': `ns1.${domain}`
            };
        }
        
        steps.push({
            action: 'authoritative-response',
            elements: ['authoritative', 'resolver'],
            nodeContent: `Resposta: ${domain} A ${ip}`,
            data: {
                ip: ip,
                records: records
            }
        });
            
            // DNSSEC validation if enabled
            if (hasDnssec) {
                steps.push({
                    action: 'dnskey-verification',
                    elements: ['resolver'],
                    nodeContent: `Verificando registros DNSKEY para ${domain}`
                });
                
                steps.push({
                    action: 'rrsig-verification',
                    elements: ['resolver'],
                    nodeContent: `Verificando assinaturas RRSIG dos registros`
                });
                
                steps.push({
                    action: 'dnssec-validation-success',
                    elements: ['resolver'],
                    nodeContent: `Validação DNSSEC bem-sucedida para ${domain}`
                });
            }
            
            // Step 10: Resolver updates cache
            steps.push({
                action: 'resolver-update-cache',
                elements: ['resolver'],
                nodeContent: `Atualizando cache: ${domain} → ${ip} (TTL: 300s)`,
                data: {
                    domain: domain,
                    ip: ip
                }
            });
            
            // Step 11: Resolver returns IP to browser
            steps.push({
                action: 'resolver-to-browser',
                elements: ['resolver', 'browser'],
                nodeContent: `Enviando IP ${ip} para o navegador`,
                data: {
                    ip: ip
                }
            });
            
            // Step 12: Browser initiates HTTP request
            steps.push({
                action: 'browser-to-webserver',
                elements: ['browser', 'webserver'],
                nodeContent: `Iniciando conexão HTTP com ${ip}`,
                data: {
                    ip: ip
                }
            });
            
            // Step 13: Web server responds
            steps.push({
                action: 'webserver-response',
                elements: ['webserver', 'browser'],
                nodeContent: `Resposta HTTP com conteúdo`
            });
            
            // Step 14: Browser renders page
            steps.push({
                action: 'browser-render',
                elements: ['browser'],
                nodeContent: `Renderizando a página web`
            });
        
        return steps;
    }
    
    // Execute a single simulation step
    function executeStep(step) {
        clearAllStatuses();
        
        // Update tree nodes
        step.elements.forEach(elementId => {
            const node = treeNodes[elementId];
            if (node) {
                node.classList.add('active');
                const content = node.querySelector('.node-content');
                if (content) content.textContent = step.nodeContent || '';
            }
        });
        
        // Highlight appropriate connectors and animate data packets
        highlightConnectorsForStep(step);
        
        // Update resolution details
        const stepInfo = stepTexts[step.action] || {
            title: step.action,
            description: 'No description available'
        };
        
        const detailStep = document.createElement('div');
        detailStep.className = 'detail-step';
        detailStep.innerHTML = `
            <h4>${stepInfo.title}</h4>
            <p>${stepInfo.description}</p>
        `;
        
        // Add additional information based on step action
        if (step.action === 'authoritative-response' && step.data && step.data.records) {
            const records = step.data.records;
            let recordsHtml = `
                <div class="records-table-container">
                    <table class="records-table">
                        <tr>
                            <th>Tipo</th>
                            <th>Valor</th>
                            <th>TTL</th>
                        </tr>
            `;
            
            for (const [type, value] of Object.entries(records)) {
                if (type !== 'DNSSEC') {
                    recordsHtml += `
                        <tr>
                            <td>${type}</td>
                            <td>${value}</td>
                            <td>3600</td>
                        </tr>
                    `;
                }
            }
            
            recordsHtml += `</table></div>`;
            detailStep.innerHTML += recordsHtml;
        } else if (step.action === 'dnskey-verification') {
            detailStep.innerHTML += `
                <div class="key-box">
                    DNSKEY KSK: Algoritmo RSA, 2048 bits<br>
                    DNSKEY ZSK: Algoritmo RSA, 1024 bits
                </div>
            `;
        } else if (step.action === 'rrsig-verification') {
            detailStep.innerHTML += `
                <div class="signature-box">
                    Verificando assinaturas RRSIG com chave DNSKEY...<br>
                    Timestamp válido, assinatura válida
                </div>
            `;
        }
        
        resolutionDetails.innerHTML = '';
        resolutionDetails.appendChild(detailStep);
        
        // Special handling for certain steps
        if (step.action === 'dnssec-validation-success') {
            // Highlight the DNSSEC chain
            document.querySelectorAll('.chain-link').forEach(link => {
                link.style.backgroundColor = '#2ecc71';
            });
        } else if (step.action === 'dnssec-validation-failure') {
            // Highlight failure in the DNSSEC chain
            document.querySelectorAll('.chain-link').forEach(link => {
                link.style.backgroundColor = '#e74c3c';
            });
        } else {
            // Reset DNSSEC chain colors
            document.querySelectorAll('.chain-link').forEach(link => {
                link.style.backgroundColor = '#3498db';
            });
        }
    }
    
    // Highlight appropriate connectors and animate data packets for each step
    function highlightConnectorsForStep(step) {
        // Reset all connectors and packets
        document.querySelectorAll('.connector').forEach(conn => {
            conn.classList.remove('active');
        });
        
        document.querySelectorAll('.connector-arrow').forEach(arrow => {
            arrow.classList.remove('active');
        });
        
        // Map step actions to connector animations
        switch(step.action) {
            case 'browser-request':
                animatePacket('browser-to-resolver', 'query');
                activateConnector(0); // Browser to Resolver
                break;
                
            case 'resolver-check-cache':
            case 'resolver-cache-miss':
                // No connector animation for cache checks
                break;
                
            case 'resolver-to-root':
                animatePacket('resolver-to-root', 'query');
                activateConnector(2); // Resolver to Root
                break;
                
            case 'root-response':
            case 'root-ds-check':
                animatePacket('root-to-resolver', 'response');
                activateConnector(3); // Root to Resolver
                break;
                
            case 'resolver-to-tld':
                animatePacket('resolver-to-tld', 'query');
                activateConnector(4); // Resolver to TLD
                break;
                
            case 'tld-response':
            case 'tld-ds-check':
                animatePacket('tld-to-resolver', 'response');
                activateConnector(5); // TLD to Resolver
                break;
                
            case 'resolver-to-authoritative':
                animatePacket('resolver-to-authoritative', 'query');
                activateConnector(6); // Resolver to Authoritative
                break;
                
            case 'authoritative-response':
            case 'authoritative-nxdomain':
                if (step.action === 'authoritative-nxdomain') {
                    animatePacket('authoritative-to-resolver', 'error');
                } else {
                    animatePacket('authoritative-to-resolver', 'response');
                }
                activateConnector(7); // Authoritative to Resolver
                break;
                
            case 'dnskey-verification':
            case 'rrsig-verification':
            case 'dnssec-validation-success':
            case 'dnssec-validation-failure':
            case 'resolver-update-cache':
                // No connector animation for DNSSEC checks or cache updates
                break;
                
            case 'resolver-to-browser':
            case 'resolver-error-to-browser':
                if (step.action === 'resolver-error-to-browser') {
                    animatePacket('resolver-to-browser', 'error');
                } else {
                    animatePacket('resolver-to-browser', 'response');
                }
                activateConnector(1); // Resolver to Browser
                break;
                
            case 'browser-to-webserver':
                animatePacket('browser-to-webserver', 'query');
                activateConnector(8); // Browser to Webserver
                break;
                
            case 'webserver-response':
                animatePacket('webserver-to-browser', 'response');
                activateConnector(9); // Webserver to Browser
                break;
                
            case 'browser-render':
            case 'browser-error':
                // No connector animation for final browser states
                break;
        }
    }
    
    // Activate a specific connector by index
    function activateConnector(index) {
        const connector = document.getElementById(`connector-${index}`);
        const arrow = connector?.querySelector('.connector-arrow');
        
        if (connector) {
            connector.classList.add('active');
        }
        
        if (arrow) {
            arrow.classList.add('active');
        }
    }
    
    // Advance to the next step
    function nextStep() {
        if (currentStep < simulationSteps.length) {
            executeStep(simulationSteps[currentStep]);
            currentStep++;
            return true;
        }
        return false;
    }
    
    // Start simulation for a domain
    function startSimulation(domain) {
        resetSimulation();
        
        // Validate domain
        if (!domain) {
            resolutionDetails.innerHTML = `
                <div class="detail-step">
                    <h4>Erro</h4>
                    <p>Por favor, digite um nome de domínio.</p>
                </div>
            `;
            return;
        }
        
        // Create tree structure
        createDnsTree();
        
        // Update DNSSEC components
        updateDnssecComponents(domain);
        
        // Generate steps
        simulationSteps = generateSimulation(domain);
        
        // Execute first step
        nextStep();
    }
    
    // Event listeners
    resolveBtn.addEventListener('click', function() {
        const domain = domainInput.value.trim().toLowerCase();
        if (domain) {
            startSimulation(domain);
        } else {
            resolutionDetails.innerHTML = `
                <div class="detail-step">
                    <h4>Erro</h4>
                    <p>Por favor, digite um nome de domínio.</p>
                </div>
            `;
        }
    });
    
    domainInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            resolveBtn.click();
        }
    });
    
    resetBtn.addEventListener('click', resetSimulation);
    
    stepBtn.addEventListener('click', function() {
        if (simulationSteps.length === 0) {
            resolutionDetails.innerHTML = `
                <div class="detail-step">
                    <h4>Nenhuma simulação ativa</h4>
                    <p>Por favor, inicie uma simulação primeiro.</p>
                </div>
            `;
            return;
        }
        
        if (!nextStep()) {
            resolutionDetails.innerHTML += `
                <div class="detail-step">
                    <h4>Simulação concluída</h4>
                    <p>Todos os passos foram executados.</p>
                </div>
            `;
        }
    });
    
    autoBtn.addEventListener('click', function() {
        if (autoPlayInterval) {
            // Stop auto-play
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
            autoBtn.textContent = 'Reprodução Automática';
        } else {
            // Start auto-play
            if (simulationSteps.length === 0) {
                resolutionDetails.innerHTML = `
                    <div class="detail-step">
                        <h4>Nenhuma simulação ativa</h4>
                        <p>Por favor, inicie uma simulação primeiro.</p>
                    </div>
                `;
                return;
            }
            
            autoBtn.textContent = 'Parar';
            autoPlayInterval = setInterval(function() {
                if (!nextStep()) {
                    clearInterval(autoPlayInterval);
                    autoPlayInterval = null;
                    autoBtn.textContent = 'Reprodução Automática';
                    resolutionDetails.innerHTML += `
                        <div class="detail-step">
                            <h4>Simulação concluída</h4>
                            <p>Todos os passos foram executados.</p>
                        </div>
                    `;
                }
            }, 2000); // 2 second interval between steps
        }
    });
    
    // Initialize the simulator
    init();
});