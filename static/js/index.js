var myHostUrl;
var myGuestUrl;
var meetingStartTime = null;
var meetingDuration = null;

function makeDanger(){
  $('#main-notification').removeClass('is-primary');
  $('#main-notification').addClass('is-danger');
}

function makePrimary(){
  $('#main-notification').addClass('is-primary');
  $('#main-notification').removeClass('is-danger');
}

function makeDefault(){
  $('#main-notification').removeClass('is-primary');
  $('#main-notification').removeClass('is-danger');
}


async function scheduleInstantMeeting(){
  $('#host-code').text("");
  $('#guest-code').text("");
  meetingStartTime = $('.my-calendar').val();
  meetingDuration = parseInt($('#duration').val())
  let options = {duration: meetingDuration,
                 startTime: meetingStartTime,
                 timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                 deviceId: $('#locations').val()}
  console.log(options);
  let path = 'schedule';
  if(instant){
    path = 'instant';
  }
  let response = await fetch(`/${path}`, {
    method: 'POST', 
    headers: {
      "Content-Type":"application/json"
    },
    body: JSON.stringify(options)
  })
  let data = await response.json()
  console.log(data);
  if(data && !data.error){
    console.log(data["hostUrl"]);
    console.log(data["guestUrl"]);
    myHostUrl = data["hostUrl"];
    myGuestUrl = data["guestUrl"];
    $('#host-code').text(data["hostCode"]);
    $('#guest-code').text(data["guestCode"]);
    $('#main-notification').text('Created Meeting successfully.');
    $('#host-join-buttons').show();
    $('#guest-join-buttons').show();
    $('#meeting-buttons').css('visibility', 'visible');
  } else {
    makeDanger();
    if(data && data.error){
      $('#main-notification').text(data.error);
    } else {
      $('#main-notification').text('Failed to create Meeting.');
    }
  }
  $('#create').removeClass('is-loading');
}


$('document').ready(async function() {
  let response = await fetch(`/devices`, {
    method: 'GET', 
    headers: {
      "Content-Type":"application/json"
    },
  })
  const devices = await response.json()
  console.log(devices);
  if(devices?.items?.length > 0){
    for(let d of devices.items){
      $('#locations').append(
        $(`<option value="${d.id}">${d.displayName}</option>`)
      )
    }
  }

  $("#create").on('click', async function(e) {
    $('#meeting-buttons').css('visibility', 'hidden');
    $('#create').addClass('is-loading');
    makeDefault();
    $('#main-notification').text('Creating Meeting.');
    $('#main-notification').css('visibility', 'visible');
    await scheduleInstantMeeting();
  });

  $("#host-copy").on('click', function(e) {
    navigator.clipboard.writeText(myHostUrl);
    makeDefault();
    $('#main-notification').text('Copied Host Meeting URL to clipboard.');
  });

  $("#guest-copy").on('click', function(e) {
    navigator.clipboard.writeText(myGuestUrl);
    makeDefault();
    $('#main-notification').text('Copied Guest Meeting URL to clipboard.');
  });

  $('#host-join').on('click', function(e){
    window.open(myHostUrl, "_blank");
  })

  $('#guest-join').on('click', function(e){
    window.open(myGuestUrl, "_blank");
  })

})