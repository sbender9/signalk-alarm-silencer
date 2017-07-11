const debug = require('debug')('alarm-silencer')
const util = require('util')

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
    return true
  }

  plugin.registerWithRouter = function(router) {
    router.post("/silenceNotification", (req, res) => {

      notification = req.body
      if ( typeof notification.path == 'undefined' )
      {
        debug("invalid request: " + util.inspect(notification, {showHidden: false, depth: 1}))
        res.status(400)
        res.send("Invalid Request")
        return
      }

      var existing = _.get(app.signalk.self, notification.path)
      debug("existing: " + existing.method)
      if ( typeof existing.method == "undefined"
           || existing.method == null
           || existing.method.indexOf("sound") != -1 )
      {
        if  ( typeof existing.method != "undefined" && existing.method != null )
        {
          //existing.method = existing.method.filter(function(method) { return method != "sound" })
          var idx = existing.method.indexOf("sound")
          if ( idx != -1 )
            existing.method.splice(idx, 1)
        }
        else
          existing.method = ['visual']
        
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
        app.signalk.addDelta(delta)

        debug("silenced alarm: " + notification.path)
      }
      res.send("Alarm silenced")
    })
  }
  

  plugin.stop = function() {
  }

  return plugin
}
