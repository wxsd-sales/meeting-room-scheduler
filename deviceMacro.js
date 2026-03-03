import xapi from 'xapi';

const connectUrl = "";

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

xapi.event.on('UserInterface Message TextInput Response', (event) => {
  switch(event.FeedbackId){
    case 'enter_code':
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