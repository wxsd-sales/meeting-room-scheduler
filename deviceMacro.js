import xapi from 'xapi';

//This will most likely match the BASE_URL in your server's .env file
const baseUrl = "";

// Enable the HTTP client if it isn't already
xapi.Config.HttpClient.Mode.get().then(value => {
  console.log('HTTP Client is : ' + value);
  if(value == 'Off'){
    console.log('Enabling HTTP Client');
    xapi.Config.HttpClient.Mode.set('On');
  }
});

// You can remove this section if your webserver is secure.
xapi.Config.HttpClient.AllowInsecureHTTPS.get().then(value => {
  console.log('AllowInsecureHTTPS : ' + value);
  if(value == 'False'){
    console.log('Enabling AllowInsecureHTTPS');
    xapi.Config.HttpClient.AllowInsecureHTTPS.set('True');
  }
});

// Add the Button to the touch panel
xapi.command('UserInterface Extensions Panel Save', {
    PanelId: 'meeting_join'
    }, `<Extensions>
      <Version>1.8</Version>
      <Panel>
        <Order>1</Order>
        <Type>Statusbar</Type>
        <Icon>Input</Icon>
        <Color>#A866FF</Color>
        <Name>Meeting Join</Name>
        <ActivityType>Custom</ActivityType>
      </Panel>
    </Extensions>`);



// Listen for the meeting_join panel and display initial prompt
xapi.event.on('UserInterface Extensions Panel Clicked', (event) => {
    if(event.PanelId == 'meeting_join'){
      console.log('Meeting Join Selected')
      // Creating the default panel
      xapi.command('UserInterface Message TextInput Display', {
        FeedbackId: 'enter_code',
        Text: 'Please enter your meeting code',
        InputType: 'SingleLine',
        Placeholder: ' ',
        Duration: 0,
      }).catch((error) => { console.error(error); });

    }
});

// Handle all the SMS Invite preparation screens
xapi.event.on('UserInterface Message TextInput Response', (event) => {
  switch(event.FeedbackId){
    case 'enter_code':
      dialMeeting(event.Text);
  }
});


function dialMeeting(code){

  console.log('Code: ' + code);
  let url = `${baseUrl}/sip/${code}`;
  console.log('Url:', url);
  xapi.command('HttpClient Get', { 
    Header: ["Content-Type: application/json"], 
    Url: url,
    ResultBody: 'plaintext'
  }).then((result) => {
    console.log(result.Body);
    var body = JSON.parse(result.Body)
    if(body.sipAddress){
      if(body.minutesEarly > 10){
        xapi.Command.UserInterface.Message.Alert.Display
          ({ Duration: 3,
             Text: 'Meeting starts in more than 10 minutes',
             Title: 'Error'});
      } else {
        console.log("Dialing...");
        xapi.Command.Dial({Number:body.sipAddress, Protocol:"SIP"});
      }

    } else {
      xapi.Command.UserInterface.Message.Alert.Display
          ({ Duration: 3,
             Text: 'Meeting not found',
             Title: 'Error'});
    }
  }).catch((err) => {
    console.log("Error: ");
    console.log(err);
        
    // Should close panel and display errors
    xapi.Command.UserInterface.Message.Alert.Display
        ({ Duration: 3,
           Text: 'Could not join the meeting',
           Title: 'Error'});
  });
}