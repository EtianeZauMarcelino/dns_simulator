const http = require('http');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const url = require('url');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// DNS lookup function
function performDnsLookup(domain) {
    return new Promise((resolve, reject) => {
        dns.lookup(domain, { all: true }, (err, addresses) => {
            if (err) {
                console.error(`DNS lookup error for ${domain}:`, err);
                reject(err);
                return;
            }
            
            // Find IPv4 and IPv6 addresses
            let ipv4 = null;
            let ipv6 = null;
            
            for (const addr of addresses) {
                if (addr.family === 4 && !ipv4) {
                    ipv4 = addr.address;
                } else if (addr.family === 6 && !ipv6) {
                    ipv6 = addr.address;
                }
            }
            
            resolve({
                ip: ipv4 || "0.0.0.0",
                ipv6: ipv6 || null
            });
        });
    });
}

const server = http.createServer(async (req, res) => {
    console.log(`Request: ${req.method} ${req.url}`);
    
    // Parse the URL
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Handle DNS lookup API request
    if (pathname === '/dns-lookup') {
        const domain = parsedUrl.query.domain;
        
        if (!domain) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Domain parameter is required' }));
            return;
        }
        
        try {
            const dnsResult = await performDnsLookup(domain);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(dnsResult));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'DNS lookup failed',
                message: error.message 
            }));
        }
        return;
    }
    
    // Handle request for static files
    let filePath = pathname === '/' 
        ? path.join(__dirname, '../public/index.html')
        : path.join(__dirname, '../public', pathname);
    
    const extname = path.extname(filePath);
    const contentType = MIME_TYPES[extname] || 'text/plain';
    
    // Read the file
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // File not found
                console.error(`File not found: ${filePath}`);
                res.writeHead(404);
                res.end('404 Not Found');
            } else {
                // Server error
                console.error(`Server error: ${err.code}`);
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            // Success
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Press Ctrl+C to stop the server`);
});