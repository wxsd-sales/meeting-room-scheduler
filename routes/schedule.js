import crypto from "crypto";
import express from 'express';

import { config } from '../lib/config.js';
import { insertBooking } from '../lib/database.js';
import { createMeeting } from '../lib/instant-connect.js';

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
        console.log(`getStartDate start_date:${startDateUTC.format()}`);
        return startDateUTC;
    }

    getEndDate(startDate, duration) {
        // Add duration in minutes to start date
        const endDate = startDate.clone().add(duration, 'minutes');
        console.log(`getEndDate end_date:${endDate.format()}`);
        return endDate;
    }

    getDates(startTime, duration, timezone) {
        const startDate = this.getStartDate(startTime, timezone);
        const endDate = this.getEndDate(startDate, duration);
        return [startDate.toISOString().replace('T', ' ').replace('.000Z', '+00:00'), 
                endDate.toISOString().replace('T', ' ').replace('.000Z', '+00:00')];
    }

    getTimestamps(startTime, duration, timezone){
        const startDate = moment.tz(startTime, 'MM/DD/YYYY HH:mm', timezone).unix();
        const endDate = startDate + (duration*60);
        return [startDate, endDate];
    }
}


async function saveData(body, guestCode, hostCode, startDate, endDate, meetingPlatform){
  let id = body.id;
  if(!id){
    id = body.meetingId;
  }
  if(!meetingPlatform){
    meetingPlatform = "webex";
  }

  let saveData = { 
      "meetingId": id, "meetingNumber": body.meetingNumber,
      "start": new Date(startDate), "end": new Date(endDate),
      "webLink": body.webLink, "sipAddress":body.sipAddress,
      "password": body.password, "platform": meetingPlatform,
      "guestCode": guestCode, "hostCode": hostCode
  }

  if(meetingPlatform === "instant"){
    saveData.hostUrl = body.hostUrl;
    saveData.guestUrl = body.guestUrl;
  }

  console.log('saveData', saveData);
  await insertBooking(saveData);
}


async function bookDevice(deviceId, duration, sipAddress, startTime, title){
  let body = {
    "deviceId": deviceId,
    "arguments": {
      "Duration": duration,
      "MeetingPlatform": "Webex",
      "Number": sipAddress,
      // "OrganizerEmail": "user@email.com",
      // "OrganizerName": "First Last",
      "Protocol": "SIP",
      "StartTime": new Date(startTime).toISOString(),// Format: "2025-09-26T18:55:00Z"
      "Title": title
    }
  }
  console.log("bookDevice body:");
  console.log(body);
  let resp = await fetch('https://webexapis.com/v1/xapi/command/Bookings.Book',{
      method: "POST",
      headers:{
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.botToken}`
      },
      body: JSON.stringify(body)
  });
  console.log('bookDevice response status:', resp.status);
  let jresp = await resp.json();
  return jresp;
}


router.post('/schedule', async (req, res) => {
  console.log('/schedule req.body:', req.body);
  try {
    let returnData;
    const [start, end] = new DateHandler().getDates(req.body['startTime'], req.body['duration'], req.body['timezone']);

    console.log('/schedule Start:', start);
    console.log('/schedule End:', end);

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
    console.log('/schedule Create Meeting Response Status', resp.status);
    let jresp = await resp.json();
    if(resp.status > 299 && jresp.errors && jresp.errors.length > 0){
      return res.status(resp.status).json({ error: jresp.errors[0].description });
    }
    console.log("/schedule Meeting Created:");
    console.log(jresp);

    if(["", "none", null, undefined].indexOf(req.body['deviceId']) < 0){
      await bookDevice(req.body['deviceId'], req.body['duration'], jresp.sipAddress, jresp.start, jresp.title);
    }

    await saveData(jresp, guestCode, hostCode, jresp.start, jresp.end, "webex");

    returnData = {
      "hostUrl": `${config.baseUri}/meeting/${hostCode}`, "guestUrl": `${config.baseUri}/meeting/${guestCode}`,
      "hostCode": hostCode, "guestCode": guestCode
    }

    if (!returnData) {
      return res.status(400).json({ error: "No data found" });
    }
    
    res.json(returnData);
  } catch (error) {
    console.error('/schedule general error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});



router.post('/instant', async (req, res) => {
  console.log('/instant req.body:', req.body);
  try {
    let returnData;
    const [start, end] = new DateHandler().getTimestamps(req.body['startTime'], req.body['duration'], req.body['timezone']);

    console.log('/instant Start:', start);
    console.log('/instant End:', end);

    // let now = new Date();
    // now = parseInt(now.getTime()/1000);
    // let startTimestamp = now;
    // let endTimestamp = now + 3600;

    // console.log('Old Start:', startTimestamp);
    // console.log('Old End:', endTimestamp);

    let result = await createMeeting(start,end);
    const startDate = result.startTimestamp * 1000;
    const endDate = result.endTimestamp * 1000;
    if(["", "none", null, undefined].indexOf(req.body['deviceId']) < 0){
      await bookDevice(req.body['deviceId'], req.body['duration'], result.sipAddress, startDate, "Instant Meeting");
    }

    const guestCode = generateCode(); // e.g., "B4M8N1"
    const hostCode = generateCode();

    await saveData(result, guestCode, hostCode, startDate, endDate, "instant");

    returnData = {
      "hostUrl": result.hostUrl, "guestUrl": result.guestUrl,
      "hostCode": hostCode, "guestCode": guestCode
    }
    

    if (!returnData) {
      return res.status(400).json({ error: "No data found" });
    }
    
    res.json(returnData);
  } catch (error) {
    console.error('/instant general error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});


export default router;