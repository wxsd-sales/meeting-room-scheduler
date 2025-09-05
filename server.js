
import cors from "cors";
import express from "express";
import fetch from "node-fetch";
import http from "http";
import path from "path";

import { fileURLToPath } from "url";
import { dirname } from "path";

import { config } from './lib/config.js';
import { connectDatabase } from './lib/database.js';

import mainRoutes from './routes/main.js';
import scheduleRoutes from './routes/schedule.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);


// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'static')));
app.use(express.json());

// Routes
app.use('/', mainRoutes);
app.use('/', scheduleRoutes);


//TODOS
//2. Build a macro for the g2g device behind you taht prompts for the host code.

//Stretch goal - save the meeting as a booking on the device?  
// This may depend on whether we get IC to work with a host pin or can PW protect the Webex meeting.

//Last. delete commented code.
//Last. check github repo is correct and package.json is accurate


async function tokenRefresh(){
  console.log('refreshing serviceApp token...');
  let resp = await fetch('https://webexapis.com/v1/access_token',{
      method: "POST",
      headers:{
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'client_id': config.webex.serviceApp.clientId,
        'client_secret': config.webex.serviceApp.clientSecret,
        'grant_type': 'refresh_token',
        'refresh_token': config.webex.serviceApp.refreshToken
    })
  });
  let json = await resp.json();
  console.log('tokenRefresh response json:', json);
  app.set('serviceAppToken', json.access_token);
  app.set('webexHeaders', {"Authorization": `Bearer ${json.access_token}`,
                           "Content-Type": "application/json"});
}

// Initialize application
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    
    // Start server
    server.listen(config.port, async () => {
      await tokenRefresh();
      setInterval(async () => {
        await tokenRefresh();
      }, 86400 * 1000); 
      console.log(`Server listening on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();

export default app;