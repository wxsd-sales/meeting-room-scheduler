import crypto from "crypto";
import fetch from "node-fetch";
import { config } from './config.js';

async function joseEncrypt(jwtDict){
    const joseUrl = `${config.instant.mtgBrokerUrl}/joseencrypt`;
    let payload = { "aud": config.instant.aud, "jwt": jwtDict, "provideShortUrls": true}; //"loginUrlForHost": False, "numGuest": 1, "numHost": 1,}
    console.log("joseEncrypt- url:", joseUrl);
    console.log("joseEncrypt- payload:");
    console.log(payload);
    let joseResp = await fetch(joseUrl,{
      method: "POST",
      headers:{
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.botToken}`
      },
      body: JSON.stringify(payload)
    });
    let response = await joseResp.json();
    return response;
}

export async function createMeeting(startTimestamp, endTimestamp){
    let result = {'reason':"Unable to Encrypt Data", 'code':400};
    

    const subId = crypto.randomUUID();

    let jwtDict = {"sub": subId, 'nbf':startTimestamp, 'exp':endTimestamp};
    console.log(`createMeeting - jwtDict:`);
    console.log(jwtDict);
    let response = await joseEncrypt(jwtDict);
    console.log(`createMeeting - response:`);
    console.log(response);

    let now = parseInt(new Date().getTime()/1000);
    let nowJwtDict = {"sub": subId, 'nbf':now, 'exp':now+900};
    console.log(`createMeeting - nowJwtDict:`);
    console.log(nowJwtDict);
    let nowResponse = await joseEncrypt(nowJwtDict);
    console.log(`createMeeting - nowResponse:`);
    console.log(nowResponse);
    
    const hostData = response?.host?.[0]?.short;
    const guestData = response?.guest?.[0]?.short;
    const baseUrl = response?.baseUrl;
    const hostUrl = baseUrl + hostData
    const guestUrl = baseUrl + guestData
    const longHostData = nowResponse?.host?.[0]?.cipher;
    result = {
      "hostUrl": hostUrl, "guestUrl": guestUrl,
      "startTimestamp": startTimestamp, "endTimestamp": endTimestamp
    }
    if(longHostData){
        try{
            const spaceUrl = `https://mtg-broker-a.wbx2.com/api/v1/space/?int=jose&v=1&data=${longHostData}`;//&env=testing&registrationType=NONPROD`;
            let mtgBrokerResp = await fetch(spaceUrl,{
                method: "GET",
                headers:{
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.botToken}`
                }
            });
            let mtgResponse = await mtgBrokerResp.json();
            console.log(`createMeeting - mtgResponse:`);
            console.log(mtgResponse);
            result = {...result, ...mtgResponse};
        }catch(e){
            console.log("createMeeting - Couldn't get Meeting Details:")
            console.log(e);
            console.log(details_resp)
        }
    }
    return result;
}