
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

//URL Parameters:
//instant=true (uses IC meeting instead of Webex backend)

//Instant Connect:
//1. 5 minutes before you can join (and after - I don't belive this is configurable).
//2. Remote links lock down when hosts and users can join (as well as devices for that matter).
//3. I have to make 2 calls to mtg-broker (one now to get sip address, and one with actual start and end times).

//Webex:
// 1. You can join the meeting any time before is starts (and usually after too).
// 2. You need a middleware URL/Checkin for remote host link, because /join links max expire time is 60 minutes from when they're created.
// 3. You can get SIP address immediately for all future meetings, so don't need multiple API requests or middleware, nor a check in URL from the device.
// 4. You can use the weblink for guest joins.
// 5. Host join is more complicated - requires /join API call, but link max expire time is 60 minutes from request time.

//For Both:
//1. Joining the meeting number as the device joins me as the host if device is in the org (and the feature is allowed in CH).
//2. Host needs to admit Guests


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