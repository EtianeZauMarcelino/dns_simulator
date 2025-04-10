document.addEventListener('DOMContentLoaded', function() {
    const domainInput = document.getElementById('domain-input');
    const resolveBtn = document.getElementById('resolve-btn');
    const resetBtn = document.getElementById('reset-btn');
    const stepBtn = document.getElementById('step-btn');
    const autoBtn = document.getElementById('auto-btn');
    const logElement = document.getElementById('log');
    
    // Network elements
    const browser = document.getElementById('browser');
    const resolver = document.getElementById('resolver');
    const root = document.getElementById('root');
    const tld = document.getElementById('tld');
    const authoritative = document.getElementById('authoritative');
    const webserver = document.getElementById('webserver');
    
    let simulationSteps = [];
    let currentStep = 0;
    let autoPlayInterval = null;
    
    // Simulation data
    const dnsRecords = {
        'example.pt': {
            'A': '192.0.2.1',
            'AAAA': '2001:db8::1',
            'MX': 'mail.example.pt',
            'NS': 'ns1.example.pt'
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
            'NS': 'ns1.dns.pt'
        }
    };
    
    // Initialize simulation
    function resetSimulation() {
        clearAllStatuses();
        simulationSteps = [];
        currentStep = 0;
        clearLog();
        
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
            autoBtn.textContent = 'Auto Play';
        }
    }
    
    // Clear statuses from all network elements
    function clearAllStatuses() {
        document.querySelectorAll('.network-element').forEach(el => {
            el.classList.remove('active');
            const status = el.querySelector('.status');
            status.textContent = '';
            status.className = 'status';
        });
        
        // Clear cache
        resolver.querySelector('.cache-content').textContent = 'Empty';
    }
    
    // Add an entry to the log
    function log(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logElement.appendChild(entry);
        logElement.scrollTop = logElement.scrollHeight;
    }
    
    // Clear the log
    function clearLog() {
        logElement.innerHTML = '';
    }
    
    // Update element status
    function updateStatus(element, message, statusClass = '') {
        element.classList.add('active');
        const status = element.querySelector('.status');
        status.textContent = message;
        if (statusClass) {
            status.className = `status ${statusClass}`;
        }
    }
    
    // Generate simulation steps for a domain
    function generateSimulation(domain) {
        const steps = [];
        const domainParts = domain.split('.');
        const tld = domainParts[domainParts.length - 1];
        
        // Step 1: Browser initiates request
        steps.push({
            action: 'browser-request',
            description: `Browser initiates DNS lookup for ${domain}`,
            elements: ['browser'],
            logMessage: `Browser requests resolution of ${domain}`,
            logType: 'request'
        });
        
        // Step 2: Check resolver cache
        steps.push({
            action: 'resolver-check-cache',
            description: `Local DNS resolver checks cache for ${domain}`,
            elements: ['resolver'],
            logMessage: `Local DNS resolver checks cache for ${domain}`,
            logType: 'request'
        });
        
        // Simulate cache miss for now (we'll handle cache hits later)
        steps.push({
            action: 'resolver-cache-miss',
            description: `Cache miss for ${domain}`,
            elements: ['resolver'],
            logMessage: `Cache miss for ${domain}`,
            logType: 'response'
        });
        
        // Step 3: Resolver queries root DNS servers
        steps.push({
            action: 'resolver-to-root',
            description: `Resolver queries root DNS servers for ${domain}`,
            elements: ['resolver', 'root'],
            logMessage: `Resolver queries root DNS servers for ${domain}`,
            logType: 'request'
        });
        
        // Step 4: Root DNS server responds with TLD DNS server info
        steps.push({
            action: 'root-response',
            description: `Root DNS servers respond with .${tld} TLD server information`,
            elements: ['root', 'resolver'],
            logMessage: `Root DNS servers: "I don't know ${domain}, but here's who manages .${tld} domains"`,
            logType: 'response'
        });
        
        // Step 5: Resolver queries TLD DNS servers
        steps.push({
            action: 'resolver-to-tld',
            description: `Resolver queries .${tld} TLD DNS servers for ${domain}`,
            elements: ['resolver', 'tld'],
            logMessage: `Resolver queries .${tld} TLD DNS servers for ${domain}`,
            logType: 'request'
        });
        
        // Step 6: TLD DNS server responds with authoritative DNS server info
        steps.push({
            action: 'tld-response',
            description: `TLD DNS servers respond with authoritative server information for ${domain}`,
            elements: ['tld', 'resolver'],
            logMessage: `TLD DNS servers: "I don't know the exact IP, but here's the authoritative server for ${domain}"`,
            logType: 'response'
        });
        
        // Step 7: Resolver queries authoritative DNS server
        steps.push({
            action: 'resolver-to-authoritative',
            description: `Resolver queries authoritative DNS server for ${domain}`,
            elements: ['resolver', 'authoritative'],
            logMessage: `Resolver queries authoritative DNS server for ${domain}`,
            logType: 'request'
        });
        
        // Step 8: Authoritative DNS server responds with IP
        const hasRecord = dnsRecords[domain] !== undefined;
        if (hasRecord) {
            const ip = dnsRecords[domain]['A'];
            steps.push({
                action: 'authoritative-response',
                description: `Authoritative DNS server responds with IP address: ${ip}`,
                elements: ['authoritative', 'resolver'],
                logMessage: `Authoritative DNS server: "${domain} resolves to ${ip}"`,
                logType: 'response',
                ip: ip
            });
            
            // Step 9: Resolver updates cache
            steps.push({
                action: 'resolver-update-cache',
                description: `Resolver updates cache with ${domain} → ${ip}`,
                elements: ['resolver'],
                logMessage: `Resolver caches: ${domain} → ${ip}`,
                logType: 'info',
                domain: domain,
                ip: ip
            });
            
            // Step 10: Resolver returns IP to browser
            steps.push({
                action: 'resolver-to-browser',
                description: `Resolver returns IP address to browser: ${ip}`,
                elements: ['resolver', 'browser'],
                logMessage: `Resolver to browser: "${domain} resolves to ${ip}"`,
                logType: 'response',
                ip: ip
            });
            
            // Step 11: Browser initiates HTTP request
            steps.push({
                action: 'browser-to-webserver',
                description: `Browser initiates HTTP request to ${ip}`,
                elements: ['browser', 'webserver'],
                logMessage: `Browser sends HTTP request to ${ip}`,
                logType: 'request'
            });
            
            // Step 12: Web server responds
            steps.push({
                action: 'webserver-response',
                description: `Web server responds with HTTP content`,
                elements: ['webserver', 'browser'],
                logMessage: `Web server responds with HTTP content`,
                logType: 'response'
            });
            
            // Step 13: Browser renders page
            steps.push({
                action: 'browser-render',
                description: `Browser renders the web page`,
                elements: ['browser'],
                logMessage: `Browser renders the web page from ${domain}`,
                logType: 'info'
            });
        } else {
            // Handle domain not found
            steps.push({
                action: 'authoritative-nxdomain',
                description: `Authoritative DNS server responds with NXDOMAIN (domain does not exist)`,
                elements: ['authoritative', 'resolver'],
                logMessage: `Authoritative DNS server: "NXDOMAIN - ${domain} does not exist"`,
                logType: 'error'
            });
            
            // Resolver returns error to browser
            steps.push({
                action: 'resolver-error-to-browser',
                description: `Resolver returns NXDOMAIN error to browser`,
                elements: ['resolver', 'browser'],
                logMessage: `Resolver to browser: "NXDOMAIN - ${domain} does not exist"`,
                logType: 'error'
            });
            
            // Browser displays error
            steps.push({
                action: 'browser-error',
                description: `Browser displays "DNS resolution failed" error`,
                elements: ['browser'],
                logMessage: `Browser: "DNS resolution failed for ${domain}"`,
                logType: 'error'
            });
        }
        
        return steps;
    }
    
    // Execute a single simulation step
    function executeStep(step) {
        clearAllStatuses();
        
        step.elements.forEach(elementId => {
            const element = document.getElementById(elementId);
            updateStatus(element, step.description, 'working');
        });
        
        log(step.logMessage, step.logType);
        
        // Handle special actions
        switch(step.action) {
            case 'resolver-update-cache':
                const cacheContent = resolver.querySelector('.cache-content');
                cacheContent.textContent = `${step.domain} → ${step.ip} (TTL: 300s)`;
                break;
                
            case 'browser-render':
                browser.querySelector('.status').className = 'status success';
                break;
                
            case 'browser-error':
                browser.querySelector('.status').className = 'status error';
                break;
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
            log('Please enter a domain name', 'error-log');
            return;
        }
        
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
            log('Please enter a domain name', 'error-log');
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
            log('Please start a simulation first', 'error-log');
            return;
        }
        
        if (!nextStep()) {
            log('Simulation complete', 'info');
        }
    });
    
    autoBtn.addEventListener('click', function() {
        if (autoPlayInterval) {
            // Stop auto-play
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
            autoBtn.textContent = 'Auto Play';
        } else {
            // Start auto-play
            if (simulationSteps.length === 0) {
                log('Please start a simulation first', 'error-log');
                return;
            }
            
            autoBtn.textContent = 'Stop';
            autoPlayInterval = setInterval(function() {
                if (!nextStep()) {
                    clearInterval(autoPlayInterval);
                    autoPlayInterval = null;
                    autoBtn.textContent = 'Auto Play';
                    log('Simulation complete', 'info');
                }
            }, 2000); // 2 second interval between steps
        }
    });
    
    // Add some example domains to the UI
    log('Welcome to DNS Resolution Simulator! Try resolving example.pt, google.pt, or dns.pt', 'info');
    log('Or enter a custom domain to see how it would resolve', 'info');
    log('Start by entering a domain name and clicking "Resolve"', 'info');
    
    // Initialize resolver cache as empty
    resolver.querySelector('.cache-content').textContent = 'Empty';
});