[![clasp](https://img.shields.io/badge/built%20with-clasp-4285f4.svg)](https://github.com/google/clasp)
![ci](https://github.com/k2tzumi/slack-jma-bot/workflows/ci/badge.svg)


What is this?
==============================

 This bot can run slack slash commands and get various weather information from the [JMA(Japan Meteorological Agency)](https://www.jma.go.jp/jma/index.html) api.  
 This bot runs as a web app within a Google app script.  
You can make this bot work by registering it as a request URL for the [Slack API](https://api.slack.com/apps) slash command.
 
Slack slash command
--------------------

* To get the weather forecast  
```
/jma tenki {place}
```


REQUIREMENTS
--------------------
- `npm`
- [clasp](https://github.com/google/clasp)  
`npm install -g @google/clasp`

- `make`

USAGE
--------------------

To use it, you need to set up Google apps scripts, and Slack API.

### Install Google apps scripts

1. Enable Google Apps Script API  
https://script.google.com/home/usersettings
2. make push  
3. make deploy  
4. Grant the necessary privileges  
make open  
Publish > Deploy as web app.. > Update  
Grant access

The URL of the current web app after deployment will be used as the request URL for the OAuth authentication screen and Slack message action.

### Register with the Slack API

* Create New App  
https://api.slack.com/apps  
Please make a note of `App Credentials` displayed after registration.

### Setting Script properties

In order to run the application and change its behavior, you need to set the following Google Apps scripts property.

|Property name|Required|Setting Value|Description|
|--|--|--|--|
|VERIFICATION_TOKEN|○|Basic Information > App Credentials > Verification Token|A token that easily authenticates the source of a hooked request|

1. Open Project  
`$ make open`
2. Add Scirpt properties  
File > Project properties > Scirpt properties > Add row  
Setting Property & Value

### Settings Slash Commands & Slack APP install

* Create New Command  
Setting Request URL.  
For example) https://script.google.com/macros/s/miserarenaiyo/exec  

* Slack APP install  
Settings > Install App  
