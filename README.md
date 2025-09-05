# Meeting Room Scheduler
This is a custom utility for scheduling a Webex meeting that will allow a guest user to join remotely from a browser, and a host to join from a RoomOS device.


## Installation

###  1. Set up the .env file
- a. Inside this project's root folder, rename the file ```.env.example``` to ```.env```
- b. In a text editor, open the ```.env```
- c. Choose a ```MY_APP_PORT``` or use the default port if you are not sure what to use.
- d. Paste your base url for your server between the double quotes of ```BASE_URI=""```. If using an IP address, then this should include the port.  Examples:  
    - ```BASE_URI="https://subdomain.domain.com"```
    - ```BASE_URI="http://192.168.1.101:5000"```
- e. The current solution will also require values for the following variables, which are also listed in the ```.env.example```  
```
WEBEX_SA_CLIENT_ID=""
WEBEX_SA_CLIENT_SECRET=""
WEBEX_SA_REFRESH_TOKEN=""

MONGODB_SRV=""
MONGODB="meetingRoom"
MONGODB_COL="bookings"
```
For information about how to create a Service App Token in webex, please review:  
https://developer.webex.com/create/docs/service-apps


### 2.a. Run the webserver as a container (Docker) (recommended)

- If you prefer to run this through ```npm```, skip this step and proceed to 2.b.
- Otherwise, run the following commands from the terminal inside your project's root directory:
- `docker build -t meeting-room-scheduler .`
- `docker run -p 5000:5000 -i -t meeting-room-scheduler`
  - replace `5000` in both places with the ```MY_APP_PORT``` used in your `.env` file.  

### 2.b. Run the webserver (npm)
_Node.js version >= 21.5 must be installed on the system in order to run this through npm._

- It is recommended that you run this as a container (step 2.a.).
- If you do not wish to run the webserver as a container (Docker), proceed with this step:
- Inside this project on your terminal type: `npm install`
- Then inside this project on your terminal type: `npm run build`
- Then inside this project on your terminal type: `npm run dev`
- This should run the app on your ```MY_APP_PORT``` (from .env file)

  
## License

All contents are licensed under the MIT license. Please see [license](LICENSE) for details.

## Disclaimer

<!-- Keep the following here -->  
Everything included is for demo and Proof of Concept purposes only. Use of the site is solely at your own risk. This site may contain links to third party content, which we do not warrant, endorse, or assume liability for. These demos are for Cisco Webex usecases, but are not Official Cisco Webex Branded demos.
