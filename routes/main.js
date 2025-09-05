import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getBooking, updateBooking } from '../lib/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

function requestLogger(req, res, next) {
  if (req.url !== "/status") {
    console.log('%s %s', req.method, req.url);
  }
  next();
}

router.use(requestLogger);

function getMinutesEarly(meetingStart){
  let currentDT = new Date();
  let diff = meetingStart - currentDT;
  return Math.round((diff / 1000) / 60);
}


router.get('/', async (req, res) => {
  try {
    res.sendFile(path.join(__dirname, '..', 'static', 'main.html'));
  } catch (error) {
    console.error('Error setting cookies:', error);
    res.status(500).send('Internal server error');
  }
});


router.get('/error', async (req, res) => {
  try {
    res.sendFile(path.join(__dirname, '..', 'static', 'invalid.html'));
  } catch (error) {
    res.status(500).send('Internal server error');
  }
});


router.get('/meeting/:code', async (req, res) => {
  let response = {};
  console.log('/meeting/:code params:');
  console.log(req.params);
  try{
    if (req.params.code){
      let booking = await getBooking(req.params.code);
      console.log('booking:');
      console.log(booking);
      if(booking){
        let diff = getMinutesEarly(booking.start);
        console.log(diff);
        if(diff > 10){
          res.redirect(`/error?early=${booking.start.getTime()}`);
          return;
        } else {
          let redirectUrl;
          if(req.params.code === booking.hostCode) {//If Host code is passed
              if(!booking.weblinks || (!booking.weblinks.host)){
                const linkBody = {
                    "meetingId": booking.meetingId,
                    "joinDirectly": false,
                    "createJoinLinkAsWebLink": false,
                    "createStartLinkAsWebLink": false,
                    "expirationMinutes": 60,
                    "displayName": "Host", // TODO: This should be the name of the signed in user...
                    "email": req.params.code + "@mydomain.com" // TODO: This should be the email of the signed in user...
                }
                let linkResp = await fetch('https://webexapis.com/v1/meetings/join',{
                      method: "POST",
                      headers: req.app.get('webexHeaders'),
                      body: JSON.stringify(linkBody)
                });
                console.log('Get Links Response Status', linkResp.status);
                let webexLinks = await linkResp.json();
                console.log('webexLinks:');
                console.log(webexLinks);

                let updateWeblinks = {host : webexLinks.startLink+"&launchApp=true"};
                await updateBooking(booking._id, {weblinks: updateWeblinks});
                booking.weblinks = updateWeblinks;
              }
              redirectUrl = booking.weblinks.host;
          } else {//If Guest code is passed          
            redirectUrl = booking.webLink+"&launchApp=true";
          }
          
          if(redirectUrl){
            console.log(`Redirecting user to: ${redirectUrl}`);
            res.redirect(redirectUrl);
            return;
          }
        }
      } else {
        res.redirect('/error?notFound=true');
        return;
      }
    }
  }catch(e){
    console.error('/meeting/:code error:');
    console.error(e);
  }
  res.status(500).send('Something went wrong');
});

router.get('/sip/:code', async (req, res) => {
  let response = {};
  console.log('/sip/:code params:');
  console.log(req.params);
  if (req.params.code){
    let booking = await getBooking(req.params.code.toUpperCase());
    console.log('booking:');
    console.log(booking);
    if(booking && booking.sipAddress){
      response = {"sipAddress": booking.sipAddress,
                  "minutesEarly": getMinutesEarly(booking.start)
      };
    }
  }
  console.log('response:');
  console.log(response);    
  res.setHeader('Content-Type',"application/json");
  res.send(response);
});


export default router;