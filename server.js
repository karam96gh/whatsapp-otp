const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const app = express();
const port = 3698;
const fs = require('fs');
const { execSync } = require('child_process');

// First check where chrome/chromium is installed
let chromePath;
try {
  // Try to find various chrome/chromium executables
  const possiblePaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chrome'
  ];
  
  for (const path of possiblePaths) {
    if (fs.existsSync(path)) {
      chromePath = path;
      console.log(`Found browser at: ${chromePath}`);
      break;
    }
  }
  
  // If no browser found, try which command
  if (!chromePath) {
    try {
      chromePath = execSync('which chromium-browser || which chromium || which google-chrome').toString().trim();
      console.log(`Found browser via which command: ${chromePath}`);
    } catch (e) {
      console.log('Could not find browser with which command');
    }
  }
} catch (error) {
  console.error('Error finding Chrome/Chromium:', error);
}

// Log whether we found a browser path
if (chromePath) {
  console.log(`Using browser at: ${chromePath}`);
} else {
  console.log('No Chrome/Chromium browser found. Will use default.');
}

console.log('Checking session directory...');

// WhatsApp client configuration
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
        executablePath: chromePath
    }
});

// QR code generation
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Please scan the QR code with your WhatsApp');
});

// Connection ready event
client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
});

// Handle authentication failures
client.on('auth_failure', (msg) => {
    console.error('Authentication failure:', msg);
});

// Handle disconnection
client.on('disconnected', (reason) => {
    console.log('Client was disconnected:', reason);
});

// Send OTP function
function sendOTP(phoneNumber, otp) {
    const number = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
    const message = `Your OTP is: ${otp}`;
    console.log(number);
    return client.sendMessage(number, message)
        .then(response => {
            console.log('OTP sent successfully:', response);
            return response;
        })
        .catch(error => {
            console.error('Error sending OTP:', error);
            throw error;
        });
}

// Express middleware
app.use(express.json());

// OTP endpoint
app.post('/send-otp', async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;
        
        if (!phoneNumber || !otp) {
            return res.status(400).json({ error: 'Phone number and OTP are required' });
        }

        // Check if client is ready
        if (!client.info) {
            return res.status(503).json({ 
                error: 'WhatsApp client not ready yet',
                message: 'Please scan the QR code first to connect WhatsApp'
            });
        }
        if (phoneNumber.startsWith('+')) {
            await sendOTP(phoneNumber.substring(1), otp);

        }
        else
        {
            
            await sendOTP(phoneNumber, otp);

        }
        // Send OTP

        
        // Response
        res.status(200).json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error in /send-otp endpoint:', error);
        res.status(500).json({ 
            error: 'Failed to send OTP', 
            message: error.message 
        });
    }
});

// Status endpoint
app.get('/status', (req, res) => {
    res.json({
        status: client.info ? 'connected' : 'disconnected',
        info: client.info || null
    });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
    console.log('Starting WhatsApp client...');
    
    // Initialize client with error handling
    try {
        client.initialize().catch(err => {
            console.error('Error during client initialization:', err);
        });
    } catch (error) {
        console.error('Failed to initialize WhatsApp client:', error);
    }
});