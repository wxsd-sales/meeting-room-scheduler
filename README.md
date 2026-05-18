# Meeting Room Scheduler — Device Macro & Flows

This repository contains the **device-side** and **flow** assets for a Webex meeting-join experience: a RoomOS macro for Cisco room devices and Webex Connect workflow exports for booking and launching **Instant Connect** meetings using a **host code** (passcode).

## Demo

[![Vidcast Overview](https://github.com/user-attachments/assets/38c72119-39be-4fc0-818d-97d807c8d9f3)](https://app.vidcast.io/share/39ba4605-e0cc-4ad1-8e58-2a2c75d51c93)

## What’s in this repo

| Asset | Role |
| --- | --- |
| **`deviceMacro.js`** | RoomOS macro: intercepts IC calendar **Join** (stub SIP dial), prompts for host code, POSTs to the launch flow. |
| **`deviceMacro.js.old`** | Earlier variant: custom **Meeting Join** status-bar button (no IC Join intercept). |
| **`webex-connect-flows/ic_book.workflow`** | **Book** flow: provisions Instant Connect, stores host code + booking metadata, sends SMS (demo). |
| **`webex-connect-flows/ic_booking_launch.workflow`** | **Launch** flow: validates host code + device serial + time window, then dials via device xAPI. |

A **third-party scheduling system** (not in this repo) should call the book flow when a room is reserved. The room device calls the launch flow when someone enters the host code.

> **Note:** `.workflow` files are **encrypted Webex Connect exports** (opaque in git; you cannot diff or edit them as text). API fields and variable names below match the **current** exported flows. After pulling a newer `ic_book.workflow` from this repo, **re-import** that flow in Connect, re-publish, and confirm trigger URLs and custom variables still match this README.

## Join UX on the device

### Current approach (`deviceMacro.js`) — Instant Connect calendar Join

1. The **book** flow schedules a meeting on the device via Instant Connect; the booking shows on the room UI with a **Join** control.
2. Configure that Join action to dial a **stub SIP address** that is not a real destination (demo uses `a@b.c`). The device UI only supports dial-style actions for Join, not arbitrary macro hooks.
3. `deviceMacro.js` watches `Status.Call`. When an outbound call’s `RemoteNumber` matches **`stubSipAddress`** (must match the Connect flow variable and the IC Join target), the macro:
   - **Disconnects** the stub call immediately.
   - Shows a **numeric** passcode prompt (`enter_code_join`).
4. On submit, the macro POSTs `deviceSerial` + `hostCode` to **`ic_booking_launch`**. Success/failure feedback is delivered on the device via **xAPI from the flow** (not via the HTTP response body).

Set the same stub value in three places:

| Location | Setting |
| --- | --- |
| Instant Connect / room booking Join target | Stub SIP URI (e.g. `a@b.c`) |
| `deviceMacro.js` | `const stubSipAddress = "a@b.c"` |
| Both Connect flows | Custom variable `stubSipAddress` |

### Alternate approach (`deviceMacro.js.old`) — custom macro button

- Adds a **Meeting Join** panel on the status bar; user enters the host code without using the IC Join button.
- Use this file instead if you prefer not to configure the stub-SIP Join hack.
- See `deviceMacro.js.old` for the panel XML and `enter_code` feedback id.

## How it works

### Architecture

```text
[Calendaring / booking app]  --POST-->  ic_book (Webex Connect)
                                              |
                                              v
                                    Instant Connect meeting on device calendar
                                    + host code stored per device serial
                                    + SMS (or other channel) with links / code
                                              |
[User taps IC Join]  --stub SIP dial-->  deviceMacro.js (disconnect + prompt)
                                              |
                         host code POST -->  ic_booking_launch (Connect)
                                              |
                                              v
                                    xAPI on device (Dial / alerts) via BOT_TOKEN
                                              |
                                              v
                                    User in Instant Connect meeting
```

### Instant Connect and host codes

- Meetings are created on **Instant Connect** (suited to guests who are not licensed Webex users).
- The book flow persists a **host code** tied to the room device **serial number** and the meeting **time window**.
- The host code is what the user types on the device (the macro sends it as `hostCode` in JSON).
- SMS in the demo delivers host/guest URLs and the host code; production systems often split host vs guest notifications.

### Book flow (`ic_book.workflow`) — lifecycle

1. Your scheduler POSTs meeting details to the flow’s **webhook/trigger URL** (see [API: book meeting](#api-book-meeting-ic_bookworkflow)).
2. Connect provisions an Instant Connect meeting (uses **`INSTANT_CONNECT_AUD`** and related nodes).
3. Booking data is parsed/stored; a **host code** is generated and tied to **`deviceSerial`** and the **`start`** / **`end`** window.
4. An SMS node sends meeting links and the host code to **`phoneNumber`** (swap this node for email or other channels in Connect if needed).

### Launch flow (`ic_booking_launch.workflow`) — lifecycle

1. `deviceMacro.js` POSTs `deviceSerial` + `hostCode` to the launch flow URL.
2. The flow checks that the serial is known and matches the host code for that room.
3. The flow checks the meeting is **scheduled for now** (not expired or in the future).
4. If invalid: the flow sends **alert** commands so the device shows an error (invalid code, wrong time, etc.).
5. If valid: the flow uses **`BOT_TOKEN`** and [xAPI `Call Dial`](https://roomos.cisco.com/xapi/Command.Dial/) so the room joins the Instant Connect meeting.

### HTTP responses from Connect

Connect trigger nodes return an **async acknowledgment**, not join/booking outcome. Example:

```json
{
  "response": [
    {
      "code": "1002",
      "description": "Queued",
      "transid": "3d617d7d-15e1-4f66-beb3-fba01fae0a0d"
    }
  ]
}
```

Treat `1002` / `Queued` as “accepted for processing.” **Do not** use the HTTP body to confirm the user joined or that booking succeeded; rely on SMS, scheduler logs, and **device-side xAPI** (alerts, dial, call state) driven by the flows.

## API: book meeting (`ic_book.workflow`)

**Method:** `POST`  
**URL:** The flow’s inbound trigger URL from Webex Connect (first node after import — not a file path).

**Headers:**

```http
Content-Type: application/json
```

**Request body (JSON):**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `start` | number | Yes | Meeting start, **UTC Unix epoch** (seconds). |
| `end` | number | Yes | Meeting end, **UTC Unix epoch** (seconds). |
| `deviceSerial` | string | Yes | Serial of the room device that will host the meeting; scopes the host code to that room. |
| `phoneNumber` | string | No* | E.164 or Connect-supported destination for SMS delivery in the demo. |
| `title` | string | No* | Label shown on the device booking UI (e.g. `User's Meeting`). |

\*Optional in the flow, but `title` is needed if you want a friendly name on the device; `phoneNumber` is required for the demo SMS path.

**Example request:**

```json
{
  "start": 1714550400,
  "end": 1714551300,
  "deviceSerial": "ABCDEFG123",
  "phoneNumber": "+14071235555",
  "title": "User's Meeting"
}
```

In Connect manual tests, bind `start` / `end` from flow variables such as `{{startTimestamp}}` and `{{endTimestamp}}` (epoch seconds, UTC).

**HTTP response:** See [HTTP responses from Connect](#http-responses-from-connect). Booking result is not returned in this payload.

## API: join meeting (`ic_booking_launch.workflow`)

**Method:** `POST`  
**URL:** Copy from the launch flow’s trigger node in Connect; set the same value as `connectUrl` in `deviceMacro.js`.

**Headers:**

```http
Content-Type: application/json
```

**Request body (JSON):** (matches `deviceMacro.js`)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `deviceSerial` | string | Yes | From `xStatus SystemUnit Hardware Module SerialNumber` on the device. |
| `hostCode` | string | Yes | Code entered by the user (from SMS or booking). |

**Example request:**

```json
{
  "deviceSerial": "ABCDEFG123",
  "hostCode": "2475887"
}
```

**HTTP response:** Same queued acknowledgment as booking (e.g. `code` `1002`, `description` `Queued`). The macro logs `result.Body` but **join success or validation errors are shown on the device** via xAPI from the flow. The macro only shows *Could not join the meeting* if the **HTTP client** call itself fails.

## Setup (Webex Connect flows)

1. Open **Webex Control Hub** and go to your tenant’s **Webex Connect** area (path varies; common entry: **Services** → **Webex Connect**, or **Contact Center** → **Webex Connect** for WXCC-linked tenants).
2. **Import** (or **re-import** after a repo update) the workflow files from `webex-connect-flows/`:
   - `ic_book.workflow` — booking / scheduler integration.
   - `ic_booking_launch.workflow` — room device join.
3. Open each flow and copy the **inbound HTTP trigger URL** from the first node. That URL is what schedulers and `connectUrl` must call — it is **not** derived from the filename.
4. Set these **custom variables on both flows** (exact names required by the export):

   | Variable | Purpose |
   | --- | --- |
   | `BOT_TOKEN` | Token used to call device xAPI (dial, UI alerts) from Connect. |
   | `INSTANT_CONNECT_AUD` | Instant Connect API audience / tenant identifier for meeting provisioning. |
   | `stubSipAddress` | Placeholder SIP URI for IC Join (must match `stubSipAddress` in `deviceMacro.js` and the device IC Join dial target). |

5. **Verify in the Connect editor** (exports cannot be reviewed in git):
   - **`ic_book`:** inbound JSON uses `start`, `end`, `deviceSerial`, `phoneNumber`, `title`; Instant Connect + SMS nodes are present.
   - **`ic_booking_launch`:** inbound JSON uses `deviceSerial`, `hostCode`; validation branches and device xAPI dial/alert nodes are present.
6. **Publish** both flows and wire URLs:
   - Book trigger URL → your scheduling service.
   - Launch trigger URL → `connectUrl` in `deviceMacro.js`.

## Setup (device macro)

1. Edit `deviceMacro.js`:

   ```javascript
   const connectUrl = "https://hooks.<region>.webexconnect.io/...";  // ic_booking_launch trigger URL
   const stubSipAddress = "a@b.c";  // same as Connect stubSipAddress and IC Join dial target
   ```

2. Configure **Instant Connect** on the device so the scheduled booking’s **Join** action dials **`stubSipAddress`** (not a real meeting URI).
3. On the room device (Control Hub or local admin UI):
   - **Macros:** upload/enable `deviceMacro.js` (not `deviceMacro.js.old` unless using the custom button UX).
   - **HTTP client:** allow outbound HTTPS to the Connect host (the macro sets `HttpClient Mode` to `On` if it was `Off`).
   - If you must use HTTP or a private CA: enable **Allow Insecure HTTPS** only in lab environments.
4. Confirm the macro logs the device serial on startup — it is sent as `deviceSerial` on every join attempt.
5. Test: `POST` to `ic_book` → SMS/host code → on device open the IC booking → tap **Join** → enter host code at the numeric prompt → room joins.

## Setup (scheduling integration)

Your calendaring or coworking app should:

1. On room reservation, `POST` to **`ic_book`** with `start`, `end`, `deviceSerial`, `phoneNumber`, and `title` as needed.
2. Deliver the **host code** to the booker (SMS in the demo).
3. Ensure room users join via **IC Join** + `deviceMacro.js` (or swap in `deviceMacro.js.old` for a dedicated macro button).

## License

All contents are licensed under the MIT license. Please see [license](LICENSE) for details.

## Disclaimer

<!-- Keep the following here -->  
Everything included is for demo and Proof of Concept purposes only. Use of the site is solely at your own risk. This site may contain links to third party content, which we do not warrant, endorse, or assume liability for. These demos are for Cisco Webex usecases, but are not Official Cisco Webex Branded demos.
