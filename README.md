# signals-alarm-silencer

[![Greenkeeper badge](https://badges.greenkeeper.io/sbender9/signalk-alarm-silencer.svg)](https://greenkeeper.io/)

Plugin to silence SignalK Alarms

This plugin provides the ability for clients/apps to change the state and method of existing alarms. 

For example, an app can clear an alarm by setting the `state` to `normal` or silence and alarm by setting the `method` to `[]`


# API

All messages to plugin are done using PUT requests. These can be done via HTTP or over WebSockets.

Detailed info on [PUT](https://signalk.org/specification/1.3.0/doc/put.html) and [Request/Response](https://signalk.org/specification/1.3.0/doc/request_response.html)

Http:

```
PUT http://localhost:3000/signalk/v1/api/vessels/self/propulsion/port/lowOilLevel/state
{
  "value": 'normal',
}
```

Delta:

```
{
  "context": "vessels.self",
  "requestId": "184743-434373-348483",
  "put": {
    "path": "propulsion.port.lowOilLevel.state",
    "value": 'normal'
  }
}
```


## Set Notifcation State
```
PUT http://localhost:3000/signalk/v1/api/vessels/self/propulsion/port/lowOilLevel/state
{
  "value": 'normal',
}
```

## Notification Method

The `value` can be a set of `visual`, `sound` or blank states to change or remove the `method` of notification.

```
PUT http://localhost:3000/signalk/v1/api/vessels/self/propulsion/port/lowOilLevel/method
{
  "value": [ "visual" ],
}
```
