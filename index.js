/**
 * Copyright 2018 Scott Bender (scott@scottbender.net)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const _ = require('lodash')
const util = require('util')

const raymarine_silence =  "%s,7,65361,%s,255,8,3b,9f,%s,%s,00,00,00,00"

const raymarineAlarmGroupCodes = {
  "instrument": 0x00,
  "autopilot": 0x01,
  "radar": 0x02,
  "chartplotter": 0x03,
  "ais": 0x04
};
  
const raymarineAlarmCodes = {
  "No Alarm": 0x00,
  "Shallow Depth": 0x01,
  "Deep Depth": 0x02,
  "Shallow Anchor": 0x03,
  "Deep Anchor": 0x04,
  "Off Course": 0x05,
  "AWA High": 0x06,
  "AWA Low": 0x07,
  "AWS High": 0x08,
  "AWS Low": 0x09,
  "TWA High": 0x0A,
  "TWA Low": 0x0B,
  "TWS High": 0x0C,
  "TWS Low": 0x0D,
  "WP Arrival": 0x0E,
  "Boat Speed High": 0x0F,
  "Boat Speed Low": 0x10,
  "Sea Temp High": 0x11,
  "Sea Temp Low": 0x12,
  "Pilot Watch": 0x13,
  "Pilot Off Course": 0x14,
  "Pilot Wind Shift": 0x15,
  "Pilot Low Battery": 0x16,
  "Pilot Last Minute Of Watch": 0x17,
  "Pilot No NMEA Data": 0x18,
  "Pilot Large XTE": 0x19,
  "Pilot NMEA DataError": 0x1A,
  "Pilot CU Disconnected": 0x1B,
  "Pilot Auto Release": 0x1C,
  "Pilot Way Point Advance": 0x1D,
  "Pilot Drive Stopped": 0x1E,
  "Pilot Type Unspecified": 0x1F,
  "Pilot Calibration Required": 0x20,
  "Pilot Last Heading": 0x21,
  "Pilot No Pilot": 0x22,
  "Pilot Route Complete": 0x23,
  "Pilot Variable Text": 0x24,
  "GPS Failure": 0x25,
  "MOB": 0x26,
  "Seatalk1 Anchor": 0x27,
  "Pilot Swapped Motor Power": 0x28,
  "Pilot Standby Too Fast To Fish": 0x29,
  "Pilot No GPS Fix": 0x2A,
  "Pilot No GPS COG": 0x2B,
  "Pilot Start Up": 0x2C,
  "Pilot Too Slow": 0x2D,
  "Pilot No Compass": 0x2E,
  "Pilot Rate Gyro Fault": 0x2F,
  "Pilot Current Limit": 0x30,
  "Pilot Way Point Advance Port": 0x31,
  "Pilot Way Point Advance Stbd": 0x32,
  "Pilot No Wind Data": 0x33,
  "Pilot No Speed Data": 0x34,
  "Pilot Seatalk Fail1": 0x35,
  "Pilot Seatalk Fail2": 0x36,
  "Pilot Warning Too Fast To Fish": 0x37,
  "Pilot Auto Dockside Fail": 0x38,
  "Pilot Turn Too Fast": 0x39,
  "Pilot No Nav Data": 0x3A,
  "Pilot Lost Waypoint Data": 0x3B,
  "Pilot EEPROM Corrupt": 0x3C,
  "Pilot Rudder Feedback Fail": 0x3D,
  "Pilot Autolearn Fail1": 0x3E,
  "Pilot Autolearn Fail2": 0x3F,
  "Pilot Autolearn Fail3": 0x40,
  "Pilot Autolearn Fail4": 0x41,
  "Pilot Autolearn Fail5": 0x42,
  "Pilot Autolearn Fail6": 0x43,
  "Pilot Warning Cal Required": 0x44,
  "Pilot Warning OffCourse": 0x45,
  "Pilot Warning XTE": 0x46,
  "Pilot Warning Wind Shift": 0x47,
  "Pilot Warning Drive Short": 0x48,
  "Pilot Warning Clutch Short": 0x49,
  "Pilot Warning Solenoid Short": 0x4A,
  "Pilot Joystick Fault": 0x4B,
  "Pilot No Joystick Data": 0x4C,
  "Pilot Invalid Command": 0x50,
  "AIS TX Malfunction": 0x51,
  "AIS Antenna VSWR fault": 0x52,
  "AIS Rx channel 1 malfunction": 0x53,
  "AIS Rx channel 2 malfunction": 0x54,
  "AIS No sensor position in use": 0x55,
  "AIS No valid SOG information": 0x56,
  "AIS No valid COG information": 0x57,
  "AIS 12V alarm": 0x58,
  "AIS 6V alarm": 0x59,
  "AIS Noise threshold exceeded channel A": 0x5A,
  "AIS Noise threshold exceeded channel B": 0x5B,
  "AIS Transmitter PA fault": 0x5C,
  "AIS 3V3 alarm": 0x5D,
  "AIS Rx channel 70 malfunction": 0x5E,
  "AIS Heading lost/invalid": 0x5F,
  "AIS internal GPS lost": 0x60,
  "AIS No sensor position": 0x61,
  "AIS Lock failure": 0x62,
  "AIS Internal GGA timeout": 0x63,
  "AIS Protocol stack restart": 0x64,
  "Pilot No IPS communications": 0x65,
  "Pilot Power-On or Sleep-Switch Reset While Engaged     ": 0x66,
  "Pilot Unexpected Reset While Engaged": 0x67,
  "AIS Dangerous Target": 0x68,
  "AIS Lost Target": 0x69,
  "AIS Safety Related Message (used to silence)": 0x6A,
  "AIS Connection Lost": 0x6B,
  "No Fix": 0x6C
}

module.exports = function(app) {
  var plugin = {}
  var unsubscribes = []
  var registered = []

  plugin.id = "alarmsilencer"
  plugin.name = "Alarm Silencer"
  plugin.description = "Plugin to silence SignalK Notifications"

  plugin.schema = {
    title: "Alarm Silencer",
    type: "object",
    required: [
    ],
    properties: {
    }
  }


  plugin.start = function(options)
  {
    var subscription = {
      context: "vessels.self",
      subscribe: [{
        path: "notifications.*",
        policy: 'instant'
      }]
    }
    
    app.subscriptionmanager.subscribe(subscription, unsubscribes, subscription_error, delta => {
        delta.updates.forEach(update => {
          update.values.forEach(pv => {
            if ( pv.path.startsWith(`notifications.`) && registered.indexOf(pv.path) == -1 ) {
              app.registerPutHandler('vessels.self',
                                     pv.path + '.value.state',
                                     putState)
              app.registerPutHandler('vessels.self',
                                     pv.path + '.value.method',
                                     putMethod)
              registered.push(pv.path)
            }
          })
        })
    })
    
    return true
  }

  function putState(context, path, value, cb)
  {
    const parts = path.split('.')
    const notifPath = parts.slice(0, parts.length-2).join('.')
    clearNotification(notifPath, value)
  }

  function putMethod(context, path, value, cb)
  {
    const parts = path.split('.')
    const notifPath = parts.slice(0, parts.length-2).join('.')
    silenceNotification(notifPath, value)
  }

  function subscription_error(err)
  {
    app.error(err)
  }

  plugin.registerWithRouter = function(router) {
    router.post("/silenceNotification", (req, res) => {

      var notification = req.body
      if ( typeof notification.path == 'undefined' )
      {
        app.debug("invalid request: %j", notification)
        res.status(400)
        res.send("Invalid Request")
        return
      }

      silenceNotification(notification.path)
      
      res.send("Alarm silenced")
    })

    router.put("/silenceNotification", (req, res) => {

      var notification = req.body
      if ( typeof notification.path == 'undefined' )
      {
        app.debug("invalid request: %j", notification)
        res.status(400)
        res.send("Invalid Request")
        return
      }

      silenceNotification(notification.path)
      
      res.send("Alarm silenced")
    })

    router.post("/clearNotification", (req, res) => {

      var notification = req.body
      if ( typeof notification.path == 'undefined' )
      {
        app.debug("invalid request: %j", notification)
        res.status(400)
        res.send("Invalid Request")
        return
      }

      clearNotification(notification.path)
      
      res.send("Alarm cleared")
    })

    router.post("/silenceAllNotifications", (req, res) => {

      let all = []
      var notifications = findNotifications('notifications', app.getSelfPath('notifications'), all)
      all.forEach(notification => {
        if ( notification.value.state !== 'normal'
             && notification.value.method
             && notification.value.method.find(m => m === 'sound') ) {
          silenceNotification(notification.path)
        }
      })
      
      res.send("Notifications silenced")
    })
  }

  plugin.stop = function() {
    unsubscribes.forEach(f => f())
    unsubscribes = []
  }

  function silenceNotification(npath, method=[]) {
    var existing = app.getSelfPath(npath + '.value')
    app.debug("existing: " + existing.method)
    existing.method = method
        
    existing.timestamp = (new Date()).toISOString()
    
    const delta = {
      context: "vessels." + app.selfId,
      updates: [
        {
          values: [{
            path: npath,
            value: existing
          }]
        }
      ]
    }
    app.handleMessage(plugin.id, delta)

    if ( existing.pgn && existing.pgn == 65288 ) {
      let parts = npath.split('.')
	  
      if ( parts.length === 3 )
      {
	let group = parts[1];
		
	let groupId = raymarineAlarmGroupCodes[group];
	let alarmId = raymarineAlarmCodes[existing.message];


        let n2k = util.format(raymarine_silence, (new Date()).toISOString(),
                              0,
                              padd(alarmId.toString(16),2),
                              padd(groupId.toString(16),2))
        app.emit('nmea2000out', msg)
      }
    }
    
    app.debug("silenced alarm: %j", delta)
  }


  function clearNotification(npath, state='normal') {
    var existing = app.getSelfPath(npath + '.value')
    existing.state = state
    //existing.method = []
        
    existing.timestamp = (new Date()).toISOString()
    
    const delta = {
      context: "vessels." + app.selfId,
      updates: [
        {
          source: {
            label: "self.notificationhandler"
          },
          values: [{
            path: npath,
            value: existing
          }]
        }
      ]
    }
    app.handleMessage(plugin.id, delta)

    if ( existing.pgn && existing.pgn == 65288 ) {
      let parts = npath.split('.')
	  
      if ( parts.length === 3 )
      {
	let group = parts[1];
		
	let groupId = raymarineAlarmGroupCodes[group];
	let alarmId = raymarineAlarmCodes[existing.message];


        let n2k = util.format(raymarine_silence, (new Date()).toISOString(),
                              0,
                              padd(alarmId.toString(16),2),
                              padd(groupId.toString(16),2))
        app.emit('nmea2000out', msg)
      }
    }
    
    app.debug("silenced alarm: %j", delta)
  }
  
  return plugin
}

function findNotifications(path, map, res) {

  if ( !_.isUndefined(map.value) ) {
    res.push({path: path, value:map.value})
    return
  }
  
  _.keys(map).forEach(key => {
    let npath = path ? `${path}.${key}` : key
    findNotifications(npath, map[key], res)
  })
}
