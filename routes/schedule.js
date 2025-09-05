import crypto from "crypto";
import express from 'express';

import { config } from '../lib/config.js';
import { insertBooking } from '../lib/database.js';

import moment from 'moment-timezone';

const router = express.Router();

function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    for (let i = 0; i < 6; i++) {
        const randomIndex = crypto.randomInt(0, chars.length);
        result += chars[randomIndex];
    }
    
    return result;
}

class DateHandler {
    getStartDate(startTime, timezone) {
        // Parse the date string in MM/DD/YYYY HH:mm format in the specified timezone
        const startDate = moment.tz(startTime, 'MM/DD/YYYY HH:mm', timezone);
        // Convert to UTC
        const startDateUTC = startDate.utc();
        console.log(`start_date:${startDateUTC.format()}`);
        return startDateUTC;
    }

    getEndDate(startDate, duration) {
        // Add duration in minutes to start date
        const endDate = startDate.clone().add(duration, 'minutes');
        console.log(`end_date:${endDate.format()}`);
        return endDate;
    }

    getDates(startTime, duration, timezone) {
        const startDate = this.getStartDate(startTime, timezone);
        const endDate = this.getEndDate(startDate, duration);
        return [startDate.toISOString().replace('T', ' ').replace('.000Z', '+00:00'), 
                endDate.toISOString().replace('T', ' ').replace('.000Z', '+00:00')];
    }
}



router.post('/schedule', async (req, res) => {
  console.log('/schedule req.body:', req.body);
  try {
    let returnData;
    
    const startTime = req.body['startTime'];
    const duration = req.body['duration'];
    const timezone = req.body['timezone'];
    
    const dateHandler = new DateHandler();
    const [start, end] = dateHandler.getDates(startTime, duration, timezone);

    console.log('Final results:');
    console.log('Start:', start);
    console.log('End:', end);

    const guestCode = generateCode(); // e.g., "B4M8N1"
    const hostCode = generateCode();

    let body = {
      "title": `Room Meeting - ${guestCode}`,
      "start": start,
      "end": end,
      "meetingOptions": { "enabledChat": true }
    };

    let resp = await fetch('https://webexapis.com/v1/meetings',{
          method: "POST",
          headers: req.app.get('webexHeaders'),
          body: JSON.stringify(body)
    });
    console.log('Create Meeting Response Status', resp.status);
    let jresp = await resp.json();
    if(resp.status > 299 && jresp.errors && jresp.errors.length > 0){
      return res.status(resp.status).json({ error: jresp.errors[0].description });
    }
    console.log("Meeting Created:");
    console.log(jresp);

    let saveData = { 
      "meetingId": jresp.id, "meetingNumber": jresp.meetingNumber,
      "start": new Date(jresp.start), "end": new Date(jresp.end),
      "webLink": jresp.webLink, "sipAddress":jresp.sipAddress,
      "password": jresp.password,
      "guestCode": guestCode, "hostCode": hostCode 
    }

    console.log('saveData', saveData);
    await insertBooking(saveData);

    returnData = {
      "hostUrl": `${config.baseUri}/meeting/${hostCode}`, "guestUrl": `${config.baseUri}/meeting/${guestCode}`,
      "hostCode": hostCode, "guestCode": guestCode
    }

    //TODO:
    //Stretch ...Maybe also store the Host pin depending on if we manage to figure out Instant Connect

    if (!returnData) {
      return res.status(400).json({ error: "No data found" });
    }
    
    res.json(returnData);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;