# Meeting Room Scheduler — Device Macro & Flows

This repository contains the **device-side** and **flow** assets for a Webex meeting-join experience: a RoomOS macro for Cisco room devices and Webex Connect workflow exports for booking and launching meetings by passcode.

## Demo
[![Vidcast Overview](https://github.com/user-attachments/assets/38c72119-39be-4fc0-818d-97d807c8d9f3)](https://app.vidcast.io/share/39ba4605-e0cc-4ad1-8e58-2a2c75d51c93)


## What’s in this repo

- **`deviceMacro.js`** — A RoomOS (xAPI) macro that runs on a Webex room device. It adds a “Meeting Join” button to the touch UI, lets users enter a meeting passcode, and joins the meeting by initiating a POST request to the Webex Connect flow's url.  The flow then commands the device to dial in.
- **`webex-connect-flows/`** — Exported Webex Connect workflows:
  - **`ic_book.workflow`** — Flow for booking a meeting (e.g. Instant Connect booking).
  - **`ic_booking_launch.workflow`** — Flow for joining a meeting (e.g. tell the device to start/launch the Instant Connect meeting associated with the user entered passcode).

These flows are intended to be imported and used in Webex Connect together with your own scheduling system.

## How it works

1. **Backend**  
   You run a separate scheduling service (not in this repo) that:
   - Issues or maps meeting codes with locations/times.

2. **Room device (macro)**  
   - On the room device, deploy and run `deviceMacro.js`.
   - Set `baseUrl` in the macro to the URL of the `webex-connect-flow/ic_booking_launch.workflow`.
   - The macro enables the device HTTP client (and if needed, Allow Insecure HTTPS for non-HTTPS servers).
   - It adds a “Meeting Join” panel to the UI. When the user enters a meeting code, the macro calls `{baseUrl}` which corresponds to your imported `ic_booking_launch.workflow)`
   - The workflow uses the [xAPI](https://roomos.cisco.com/xapi/Command.Dial/) and a `botToken` to tell the device to [dial](https://roomos.cisco.com/xapi/Command.Dial/) the meeting.

3. **Webex Connect flows**  
   - Import `ic_book.workflow` and `ic_booking_launch.workflow` into your Webex Connect tenant.
   - They should each have a unique url in their first node.
     - `ic_book.workflow` should be used to "save" meeting bookings for future use.
     - `ic_booking_launch.workflow` is called by the RoomOS devices for joining the booked meetings.

## Setup (device macro)

1. Open `deviceMacro.js` and set `baseUrl` to your imported `ic_booking_launch.workflow)`'s url.
   ```javascript
   const baseUrl = "";
   ```
2. In the room device’s configuration, ensure the HTTP client is allowed to reach that URL.
3. Deploy and activate the macro on the device (e.g. via Control Hub or the device's web UI).

## Setup (Webex Connect flows)

1. In Webex Control Hub, go to **Contact Center** -> [**Webex Connect**](https://admin.webex.com/wxcc/ccoverview).
2. Import the flows using the provided `.workflow` files:
   - Use `ic_book.workflow` for the booking flow.
   - Use `ic_booking_launch.workflow` for the launch/join flow.
3. Configure any variables, triggers, and integrations in those flows.


## License

All contents are licensed under the MIT license. Please see [license](LICENSE) for details.

## Disclaimer

<!-- Keep the following here -->  
Everything included is for demo and Proof of Concept purposes only. Use of the site is solely at your own risk. This site may contain links to third party content, which we do not warrant, endorse, or assume liability for. These demos are for Cisco Webex usecases, but are not Official Cisco Webex Branded demos.
