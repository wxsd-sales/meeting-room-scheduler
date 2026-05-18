// Intercepts Instant Connect calendar Join (stub SIP dial), prompts for host code, POSTs to ic_booking_launch.
// Set connectUrl (launch flow) and stubSipAddress to match Connect variable stubSipAddress and IC Join target.

import xapi from 'xapi';

const connectUrl = "";
const stubSipAddress = "a@b.c"
var serialNumber;
xapi.Status.SystemUnit.Hardware.Module.SerialNumber.get().then(value => {
  console.log("Serial Number:", value);
  serialNumber = value;
})

// Enable the HTTP client if it isn't already
xapi.Config.HttpClient.Mode.get().then(value => {
  console.log('HTTP Client is : ' + value);
  if(value == 'Off'){
    console.log('Enabling HTTP Client');
    xapi.Config.HttpClient.Mode.set('On');
  }
});

xapi.Status.Call.on((event) => {
  console.log('Status.Call', event);
  if(event.RemoteNumber && event.RemoteNumber == stubSipAddress){
    console.log('match');
    xapi.Command.Call.Disconnect({ CallId: event.id });
    xapi.command('UserInterface Message TextInput Display', {
        FeedbackId: 'enter_code_join',
        Text: 'Please enter your meeting code',
        InputType: 'Numeric',
        Placeholder: ' ',
        Duration: 0,
      }).catch((error) => { console.error(error); });
  }
});

xapi.event.on('UserInterface Message TextInput Response', (event) => {
  switch(event.FeedbackId){
    case 'enter_code_join':
      requestDial(event.Text);
  }
});


function requestDial(code){
  console.log('Code: ' + code);
  let payload = {
    "deviceSerial":serialNumber,
    "hostCode":code
  }
  xapi.command('HttpClient Post', { 
    Header: ["Content-Type: application/json"], 
    Url: connectUrl,
    ResultBody: 'plaintext'
  }, JSON.stringify(payload)).then((result) => {
    console.log("WebexConnect Response:");
    console.log(result.Body);
  }).catch((err) => {
    console.error("requestDial Error: ");
    console.error(err);
    // Should close panel and display errors
    xapi.Command.UserInterface.Message.Alert.Display
        ({ Duration: 3,
           Text: 'Could not join the meeting',
           Title: 'Error'});
  });
}

