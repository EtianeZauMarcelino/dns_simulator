# DNS Resolution Simulator

An interactive GUI simulator to understand how DNS resolution works, from browser to web server.

## Overview

This simulator demonstrates the complete process of DNS resolution and HTTP requests:

1. Browser initiates a DNS lookup
2. Local DNS resolver checks its cache
3. DNS resolution process through Root servers → TLD servers → Authoritative servers
4. Browser connects to the web server using the resolved IP
5. Web server responds with content

## Features

- Interactive GUI showing each component in the DNS resolution process
- Step-by-step simulation with detailed explanations
- Auto-play mode for continuous demonstration
- Request/response logging
- DNS cache simulation

## Getting Started

### Prerequisites

- Node.js (version 14 or higher recommended)

### Installation

1. Clone this repository
2. Install dependencies (if you want to use nodemon for development):
   ```
   npm install nodemon --save-dev
   ```

### Running the Simulator

Start the server:
```
npm start
```

For development with auto-reload:
```
npm run dev
```

Then open your browser to [http://localhost:3000](http://localhost:3000)

## Usage

1. Enter a domain name (e.g., example.pt, google.pt, dns.pt)
2. Click "Resolve" to start the simulation
3. Use the "Step Through" button to advance the simulation one step at a time
4. Or click "Auto Play" to watch the simulation automatically progress
5. The "Reset" button clears the current simulation

## Educational Value

This simulator helps understand:

- The hierarchical nature of DNS
- How DNS resolvers work with caching
- The step-by-step process from domain name to IP address
- How HTTP requests follow DNS resolution

## License

MIT