# Agent Sidebar
  
Embedded Sidebar application that reacts to inbound calls on Webex Calling.  This app can do database lookups for information about the customer or called queue number and display corresponding information to the Agent.

<!--[![Vidcast Overview](https://github-production-user-asset-6210df.s3.amazonaws.com/19175490/249649420-980de741-1a2c-4aea-883e-4da629bc8701.png)](https://app.vidcast.io/share/677cc9bc-b0bb-4419-9338-5f4bbe0100a3)-->

## Overview

The PSTN Flow:
- Caller dials a PSTN number that routes to a Webex Agent (Call Queue).
- The Sidebar App passes the information to its webserver, which does a DB lookup.
- The Sidebar App displays information to the Agent about the called queue, if the DB request was successful.


## Setup

### Prerequisites & Dependencies:

- Developed on MacOS Sequoia (15.5)
- Developed on Python 3.8.3
    - Other OS and Python versions may work but have not been tested
- Webex Calling
- MongoDB
- [Sidebar App](https://developer.webex.com/docs/embedded-apps-framework-sidebar-api-quick-start)
- [Webex Integration](https://developer.webex.com/create/docs/integrations)

<!-- GETTING STARTED -->

## Getting Started

- Clone this repository:
- ```git clone https://github.com/wxsd-sales/agent-sidebar.git```

### 1. Setting up the Webex Integration

* a. [Create a new Webex Oauth "Integration"](https://developer.webex.com/my-apps/new)
  * i. The creator/owner of the integration does not matter, but must have a Webex account.
  * ii. You can give it any name ("Agent Integration") and any 512x512 icon - the Agents signing into it will only ever see the name and icon the first time signing in.
* b. The redirect URI of the integration must be ```YOURSERVERURL/oauth```, examples:
  * i. ```http://localhost:5000/oauth```
  * ii. ```https://your.server.com/oauth```
* c. Whatever your server address, you will need this again in the next steps (just the base url, NOT including "/oauth").
* d. The Scopes selected must be:
* ```
    spark:calls_read
    spark:calls_write
    spark:telephony_config_read
    spark:telephony_config_write
    spark:all
    spark:xapi_statuses
    spark:xapi_commands
    spark:devices_read
    spark:devices_write
    spark:webrtc_calling
    spark:xsi
    spark-admin:licenses_read
    ```
* e. Save the client_id, and client_secret for the next step

### 2. Setting up the .env file
* Rename ```.env.example``` in the repo's root directory to ```.env```.
* Populate the following environment variables in the .env file:
```
MY_APP_PORT=5000
CLIENT_ID=
CLIENT_SECRET=
BASE_URI=""
SCOPES="spark%3Acalls_write%20spark%3Atelephony_config_write%20spark%3Aall%20spark%3Acalls_read%20spark%3Axapi_statuses%20spark%3Adevices_write%20spark%3Atelephony_config_read%20spark%3Adevices_read%20spark%3Axapi_commands%20spark%3Akms%20spark%3Awebrtc_calling%20spark%3Axsi%20spark-admin%3Alicenses_read"

ORG_ID=""

MERCURY_MODE=true
WEBHOOK_TITLE="Agent Sidebar Webhook - DO NOT DELETE"

MONGODB_SRV=""
MONGODB="agentSidebar"
USER_COL="customers"
QUEUE_COL="companies"
```
* ```MY_APP_PORT``` - change if you prefer a different port for your webserver
* ```CLIENT_ID```, ```CLIENT_SECRET``` - use values provided after you created the Webex integration (step 1).
* ```BASE_URI``` - the uri of your integration **without** the /oauth path.
* ```SCOPES``` - leave as default unless you used different scopes in step 1.
* ```ORG_ID``` - populate this value with the ID of your Webex org. Leaving blank will allow any Webex user to access your application.
* ```MERCURY_MODE``` - true, default - this means the events for the agents will come through the Webex SDK in the embededd browser.  Changing to false will mean that a webhook will be created for every agent, and the data will be sent to your webserver.  Leave this value as **true** unless you are aware of the consequences and are prepared to scale the backend.
* ```WEBHOOK_TITLE``` - the title of the webhooks for agents.  Only relevant if ```MERCURY_MODE``` is changed to false.
* ```MONGODB_SRV``` - the srv of your mongo cluster.  For example, it might look like this: "mongodb+srv://agentSidebarApp:12345678@democluster.123abc.mongodb.net/?retryWrites=true&w=majority&appName=MyCluster"
* ```MONGODB``` - the name of the DB you wish to use within your MongoDB cluster.
* ```USER_COL```, ```QUEUE_COL``` - the names of the collections to use within the ```MONGODB```.

### 3. Sidebar App Setup
1. Create a new app while signed in [here](https://developer.webex.com/my-apps), and choose Embedded App.  
2. Select Sidebar and give it a name. You will need to request admin approval once created.  
![Screenshot 2023-06-28 at 12 43 25 PM](https://github.com/wxsd-sales/call-notifications-sidebar/assets/19175490/70491bae-260b-47dc-a882-9eb80ffe55ae)

3. Supply the domain and URL of the publicly accessible webserver where you plan to deploy this (most likely this is your BASE_URL).  
![Screenshot 2023-06-28 at 12 43 11 PM](https://github.com/wxsd-sales/call-notifications-sidebar/assets/19175490/9b308946-8a21-482a-a1a8-7b6e0dd03126)

### 4.a. Running the webserver as a container (Docker) (recommended)

- If you prefer to run this through ```npm```, skip this step and proceed to 4.b.
- Otherwise, run the following commands from the terminal inside your project's root directory:
- `docker build -t agent-sidebar .`
- `docker run -p 5000:5000 -i -t agent-sidebar`
  - replace `5000` in both places with the ```MY_APP_PORT``` used in your `.env` file.  

### 4.b. Running the webserver (npm)
_Node.js version >= 23 must be installed on the system in order to run this through npm._

- It is recommended that you run this as a container (step 4.a.).
- If you do not wish to run the webserver as a container (Docker), proceed with this step:
- Inside this project on your terminal type: `npm install`
- Then inside this project on your terminal type: `npm start`
- This should run the app on your ```MY_APP_PORT``` (from .env file)


## Live Demo

<!-- Update your vidcast link -->
<!--Check out our Vidcast recording, [here](https://app.vidcast.io/share/677cc9bc-b0bb-4419-9338-5f4bbe0100a3)!-->

<!-- Keep the following statement -->
*For more demos & PoCs like this, check out our [Webex Labs site](https://collabtoolbox.cisco.com/webex-labs).

## License

All contents are licensed under the MIT license. Please see [license](LICENSE) for details.

## Disclaimer

<!-- Keep the following here -->  
Everything included is for demo and Proof of Concept purposes only. Use of the site is solely at your own risk. This site may contain links to third party content, which we do not warrant, endorse, or assume liability for. These demos are for Cisco Webex usecases, but are not Official Cisco Webex Branded demos.
 
 
## Support

Please contact the Webex SD team at [wxsd@external.cisco.com](mailto:wxsd@external.cisco.com?subject=AgentSidebar) for questions. Or for Cisco internal, reach out to us on Webex App via our bot globalexpert@webex.bot & choose "Engagement Type: API/SDK Proof of Concept Integration Development". 
