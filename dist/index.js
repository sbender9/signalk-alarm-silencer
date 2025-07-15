"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
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
Object.defineProperty(exports, "__esModule", { value: true });
const ts_pgns_1 = require("@canboat/ts-pgns");
const SUCCESS_RES = { state: 'SUCCESS' };
const FAILURE_RES = { state: 'FAILURE' };
module.exports = function (app) {
    const plugin = {};
    let unsubscribes = [];
    let registered = [];
    plugin.id = 'alarmsilencer';
    plugin.name = 'Alarm Silencer';
    plugin.description = 'Plugin to silence SignalK Notifications';
    plugin.schema = {
        title: 'Alarm Silencer',
        type: 'object',
        required: [],
        properties: {}
    };
    plugin.start = function (_options) {
        const subscription = {
            context: 'vessels.self',
            subscribe: [
                {
                    path: 'notifications.*',
                    policy: 'instant'
                }
            ]
        };
        app.subscriptionmanager.subscribe(subscription, unsubscribes, subscription_error, (delta) => {
            delta.updates.forEach((update) => {
                if (update.values) {
                    update.values.forEach((pv) => {
                        const key = `${pv.path}:${update.$source}`;
                        if (pv.path.startsWith(`notifications.`) &&
                            registered.indexOf(key) == -1) {
                            app.registerPutHandler('vessels.self', pv.path + '.state', (context, path, value, cb) => {
                                return putState(context, path, value, update.$source, cb);
                            }, update.$source);
                            app.registerPutHandler('vessels.self', pv.path + '.method', (context, path, value, cb) => {
                                return putMethod(context, path, value, update.$source, cb);
                            }, update.$source);
                            registered.push(key);
                        }
                    });
                }
            });
        });
        return true;
    };
    function putState(context, path, value, source, _cb) {
        const parts = path.split('.');
        const notifPath = parts.slice(0, parts.length - 1).join('.');
        return clearNotification(notifPath, value, source)
            ? SUCCESS_RES
            : FAILURE_RES;
    }
    function putMethod(context, path, value, source, _cb) {
        const parts = path.split('.');
        const notifPath = parts.slice(0, parts.length - 1).join('.');
        return silenceNotification(notifPath, value, source)
            ? SUCCESS_RES
            : FAILURE_RES;
    }
    function subscription_error(err) {
        app.error(err);
    }
    plugin.registerWithRouter = function (router) {
        router.post('/silenceNotification', (req, res) => {
            const notification = req.body;
            if (typeof notification.path == 'undefined') {
                app.debug('invalid request: %j', notification);
                res.status(400);
                res.send('Invalid Request');
                return;
            }
            silenceNotification(notification.path);
            res.send('Alarm silenced');
        });
        router.put('/silenceNotification', (req, res) => {
            const notification = req.body;
            if (typeof notification.path == 'undefined') {
                app.debug('invalid request: %j', notification);
                res.status(400);
                res.send('Invalid Request');
                return;
            }
            silenceNotification(notification.path);
            res.send('Alarm silenced');
        });
        router.post('/clearNotification', (req, res) => {
            const notification = req.body;
            if (typeof notification.path == 'undefined') {
                app.debug('invalid request: %j', notification);
                res.status(400);
                res.send('Invalid Request');
                return;
            }
            clearNotification(notification.path);
            res.send('Alarm cleared');
        });
        router.post('/silenceAllNotifications', (req, res) => {
            const all = [];
            findNotifications('notifications', app.getSelfPath('notifications'), all);
            all.forEach((notification) => {
                if (notification.value.state !== 'normal' &&
                    notification.value.method &&
                    notification.value.method.find((m) => m === 'sound')) {
                    silenceNotification(notification.path);
                }
            });
            res.send('Notifications silenced');
        });
    };
    plugin.stop = function () {
        unsubscribes.forEach((f) => f());
        unsubscribes = [];
        registered = [];
    };
    function silenceNotification(npath, method = [], source = undefined) {
        let existing = app.getSelfPath(npath);
        if (typeof existing === 'undefined') {
            app.debug('path %s not found', npath);
            return false;
        }
        if (source) {
            if (!existing.values) {
                if (!existing.value || existing['$source'] !== source) {
                    app.debug('no values');
                    return false;
                }
            }
            else {
                existing = existing.values[source];
            }
            if (!existing) {
                app.debug("can't find source");
                return false;
            }
        }
        app.debug('method: %j', method);
        if (typeof existing.value !== 'object')
            existing.value = {};
        existing.value.method = Array.isArray(method) ? method : [];
        existing.timestamp = new Date().toISOString();
        const delta = {
            context: 'vessels.' + app.selfId,
            updates: [
                {
                    $source: source,
                    values: [
                        {
                            path: npath,
                            value: existing.value
                        }
                    ]
                }
            ]
        };
        app.handleMessage(plugin.id, delta);
        if (existing.pgn && existing.pgn == 65288) {
            const parts = npath.split('.');
            if (parts.length === 3) {
                const group = parts[1];
                const key = group.charAt(0).toUpperCase() + group.slice(1);
                const groupId = ts_pgns_1.SeatalkAlarmGroupValues[key];
                const alarmId = ts_pgns_1.SeatalkAlarmIdValues[existing.value.message];
                const pgn = (0, ts_pgns_1.convertCamelCase)(app, new ts_pgns_1.PGN_65361_SeatalkSilenceAlarm({
                    alarmId,
                    alarmGroup: groupId
                }));
                app.debug('sending silenced %j', pgn);
                app.emit('nmea2000JsonOut', pgn);
            }
        }
        else if (npath.startsWith('notifications.nmea') &&
            existing.value.acknowledgeSupport == 'Supported') {
            app.debug('The notification was received from NMEA Alerts and supports acknowledgement.');
            acknowledgeNmeaAlert(npath, existing);
        }
        app.debug('silenced alarm: %j', delta);
        return true;
    }
    function clearNotification(npath, state = 'normal', source = undefined) {
        const existing = app.getSelfPath(npath);
        if (typeof existing === 'undefined') {
            app.debug('path %s not found', npath);
            return false;
        }
        app.debug('state: %j', state);
        if (typeof existing.value !== 'object')
            existing.value = {};
        existing.value.state = typeof state === 'string' ? state : 'normal';
        existing.timestamp = new Date().toISOString();
        const delta = {
            context: 'vessels.' + app.selfId,
            updates: [
                {
                    $source: source,
                    values: [
                        {
                            path: npath,
                            value: existing.value
                        }
                    ]
                }
            ]
        };
        app.handleMessage(plugin.id, delta);
        if (existing.pgn && existing.pgn == 65288) {
            const parts = npath.split('.');
            if (parts.length === 3) {
                const group = parts[1];
                const key = group.charAt(0).toUpperCase() + group.slice(1);
                const groupId = ts_pgns_1.SeatalkAlarmGroupValues[key];
                const alarmId = ts_pgns_1.SeatalkAlarmIdValues[existing.value.message];
                const pgn = (0, ts_pgns_1.convertCamelCase)(app, new ts_pgns_1.PGN_65361_SeatalkSilenceAlarm({
                    alarmId,
                    alarmGroup: groupId
                }));
                app.debug('sending silenced %j', pgn);
                app.emit('nmea2000JsonOut', pgn);
            }
        }
        app.debug('silenced alarm: %j', delta);
        return true;
    }
    function acknowledgeNmeaAlert(npath, notification) {
        const pgn = (0, ts_pgns_1.convertCamelCase)(app, new ts_pgns_1.PGN_126984({
            alertType: notification.value.alertType,
            alertCategory: notification.value.alertCategory,
            alertSystem: notification.value.alertSystem,
            alertId: notification.value.alertId,
            dataSourceNetworkIdName: notification.value.dataSourceNetworkIDNAME,
            dataSourceInstance: notification.value.dataSourceInstance,
            dataSourceIndexSource: notification.value['dataSourceIndex-Source'],
            alertOccurrenceNumber: notification.value.alertOccurenceNumber,
            acknowledgeSourceNetworkIdName: notification.value.acknowledgeSourceNetworkIDNAME,
            responseCommand: ts_pgns_1.AlertResponseCommand.Acknowledge
        }));
        app.debug('sending command %j', pgn);
        app.emit('nmea2000JsonOut', pgn);
        return true;
    }
    return plugin;
};
function findNotifications(path, map, res) {
    if (map.value !== undefined) {
        res.push({ path: path, value: map.value });
        return;
    }
    Object.keys(map).forEach((key) => {
        const npath = path ? `${path}.${key}` : key;
        findNotifications(npath, map[key], res);
    });
}
//# sourceMappingURL=index.js.map