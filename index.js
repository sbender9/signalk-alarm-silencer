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

module.exports = function(app) {
  var plugin = {}
  var unsubscribes = []

  plugin.id = "alarmsilencer"
  plugin.name = "Alarm Silencer"
  plugin.description = "Plugin to silence SignalK Alarms"

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
    /*
    var command = {
      context: "vessels.self",
      subscribe: [{
        path: "requested.notifications.*",
        policy: 'instant'
      }]
    }
    
    app.subscriptionmanager.subscribe(command, unsubscribes, subscription_error, got_delta)
    */
    
    return true
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

      silenceAlarm(notification.path)
      
      res.send("Alarm silenced")
    })
  }
  

  plugin.stop = function() {
  }

  function silenceAlarm(path) {
    var existing = app.getSelfPath(path)
    app.debug("existing: " + existing.method)
    existing.method = []
        
    existing.timestamp = (new Date()).toISOString()
    
    const delta = {
      context: "vessels." + app.selfId,
      updates: [
        {
          source: {
            label: "self.notificationhandler"
          },
          values: [{
            path: notification.path,
            value: existing
          }]
        }
      ]
    }
    app.handleMessage(plugin.id, delta)
    
    app.debug("silenced alarm: %j", delta)
  }

  return plugin
}
