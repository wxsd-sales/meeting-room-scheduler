# Webex Connect — Device Macro & Flows

This repository contains the **device-side** and **flow** assets for a Webex meeting-join experience: a RoomOS macro for Cisco room devices and Webex Connect workflow exports for booking and launching meetings by code.

## What’s in this repo

- **`deviceMacro.js`** — A RoomOS (xAPI) macro that runs on a Webex room device. It adds a “Meeting Join” control to the touch UI, lets users enter a meeting code, and joins the meeting by calling your backend and dialing the returned SIP address.
- **`webex-connect-flows/`** — Exported Webex Connect workflows:
  - **`ic_book.workflow`** — Flow for booking a meeting (e.g. Instant Connect booking).
  - **`ic_booking_launch.workflow`** — Flow for launching or joining a booking (e.g. start/launch an Instant Connect meeting).

These flows are intended to be imported and used in Webex Connect (Control Hub) together with your own backend and scheduling system.

## How it works

1. **Backend**  
   You run a separate scheduling/join service (not in this repo) that:
   - Issues or maps meeting codes.
   - Exposes an HTTP endpoint (e.g. `GET /sip/{code}`) that returns JSON with at least:
     - `sipAddress` — SIP URI to dial.
     - Optionally `minutesEarly` — how many minutes before start the device is allowed to join (the macro uses 10 minutes).

2. **Room device (macro)**  
   - On the room device, deploy and run `deviceMacro.js`.
   - Set `baseUrl` in the macro to the base URL of your backend (e.g. `https://your-server.example.com`).
   - The macro enables the device HTTP client (and if needed, Allow Insecure HTTPS for non-HTTPS servers).
   - It adds a “Meeting Join” panel to the UI. When the user enters a meeting code, the macro calls `{baseUrl}/sip/{code}`, parses the JSON, and:
     - If `sipAddress` is present and `minutesEarly <= 10`, it dials the SIP address.
     - Otherwise it shows an error (e.g. “Meeting not found” or “Meeting starts in more than 10 minutes”).

3. **Webex Connect flows**  
   - Import `ic_book.workflow` and `ic_booking_launch.workflow` into Webex Connect as needed for your org.
   - Use them to implement or extend the booking and “launch meeting” experiences that align with the same meeting codes and backend your macro uses.

## Setup (device macro)

1. Open `deviceMacro.js` and set `baseUrl` to your backend’s base URL (no trailing slash), for example:
   ```javascript
   const baseUrl = "https://your-scheduler.example.com";
   ```
2. In the room device’s configuration, ensure the HTTP client is allowed to reach that URL (and enable “Allow Insecure HTTPS” only if you use HTTP or self-signed HTTPS for testing).
3. Deploy and activate the macro on the device (e.g. via Control Hub or room device macro editor).
4. Optionally adjust the “minutes early” check (currently 10) or error messages in the macro to match your policy.

## Setup (Webex Connect flows)

1. In Webex Control Hub, go to **Webex Connect** (or your org’s flow editor).
2. Import or create flows using the provided `.workflow` files:
   - Use `ic_book.workflow` for the booking flow.
   - Use `ic_booking_launch.workflow` for the launch/join flow.
3. Configure any variables, triggers, and integrations in those flows to point at your backend and scheduling system so that meeting codes and SIP details stay in sync with what the device macro expects.

## Requirements

- **Room device:** Webex device running RoomOS with xAPI (macro execution) and HTTP client enabled.
- **Backend:** A service that implements the `/sip/{code}` contract (or equivalent) and returns `sipAddress` and optional `minutesEarly`.
- **Webex Connect:** Access to import and run the provided workflows in your organization.

## License

All contents are licensed under the MIT license. Please see [license](LICENSE) for details.

## Disclaimer

<!-- Keep the following here -->  
Everything included is for demo and Proof of Concept purposes only. Use of the site is solely at your own risk. This site may contain links to third party content, which we do not warrant, endorse, or assume liability for. These demos are for Cisco Webex usecases, but are not Official Cisco Webex Branded demos.
