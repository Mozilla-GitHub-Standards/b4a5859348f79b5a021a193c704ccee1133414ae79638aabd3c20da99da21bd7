"use strict";
const EXPORTED_SYMBOLS = ["addonStatus"];
const GLOBAL = this;
const {
    classes: Cc,
    interfaces: Ci,
    utils: Cu
} = Components;
Cu.import("resource://gre/modules/Services.jsm");
function isErrorRequest(aReq) {
    return !aReq || aReq.type === "error" || !aReq.target || aReq.target.status !== 200;
}
const addonStatus = {
    init: function addonStatus_init(aApplication) {
        this._application = aApplication;
        aApplication.core.Lib.sysutils.copyProperties(aApplication.core.Lib, GLOBAL);
        this._logger = aApplication.getLogger("AddonStatus");
        this._database = new this._application.core.Lib.Database(this._logsFile, [
            this._consts.INIT_QUERIES_TABLE_QUERY,
            this._consts.INIT_ADDONEVENTS_TABLE_QUERY
        ]);
    },
    finalize: function addonStatus_finalize(aDoCleanup, callback) {
        if (this._collectTimer) {
            this._collectTimer.cancel();
            this._collectTimer = null;
        }
        if (this._requestTimer) {
            this._requestTimer.cancel();
            this._requestTimer = null;
        }
        if (aDoCleanup) {
            this._sendRequestOnUninstall();
        }
        if (this._database) {
            let logsFile = this._logsFile;
            this._database.close(function addonStatus__onDBClosed() {
                if (aDoCleanup) {
                    fileutils.removeFileSafe(logsFile);
                }
                callback();
            });
            return true;
        }
        this._database = null;
        this._guidString = null;
        return false;
    },
    onApplicationInitialized: function addonStatus_onApplicationInitialized() {
        if (this._application.addonManager.info.isFreshAddonInstall) {
            this._logData({ stat: "install" });
        }
        this._startTimers();
    },
    get guidString() {
        if (this._guidString !== null) {
            return this._guidString;
        }
        const preferences = this._application.preferences;
        const guidPrefName = "guid.value";
        let guidStr = "";
        let uiFile = this._uiFile;
        if (uiFile.exists()) {
            try {
                guidStr = this._getGuidDataFromString(this._application.core.Lib.fileutils.readTextFile(uiFile));
            } catch (e) {
                this._logger.error("Can not get ui from file. Error: " + e);
            }
        } else {
            const WinReg = Cu.import("resource://" + this._application.name + "-mod/WinReg.jsm", {}).WinReg;
            let uiWasCreated = false;
            let currentWinUser;
            if (this._appType !== "barffport") {
                currentWinUser = WinReg.read("HKCU", "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer", "Logon User Name");
                if (currentWinUser) {
                    uiWasCreated = Boolean(WinReg.read("HKCU", "Software\\Yandex", "UICreated_" + currentWinUser));
                }
            }
            if (!uiWasCreated) {
                if (preferences.has(guidPrefName)) {
                    guidStr = this._getGuidDataFromString(preferences.get(guidPrefName, ""));
                } else {
                    guidStr = Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator).generateUUID().toString();
                }
                if (guidStr) {
                    try {
                        this._application.core.Lib.fileutils.writeTextFile(uiFile, guidStr);
                        if (currentWinUser) {
                            WinReg.write("HKCU", "Software\\Yandex", "UICreated_" + currentWinUser, 1, "int");
                        }
                    } catch (e) {
                        this._logger.error("Can not write ui to file. Error: " + e);
                    }
                }
            }
        }
        if (guidStr) {
            preferences.set(guidPrefName, guidStr);
        }
        return this._guidString = guidStr || "";
    },
    _startTimers: function addonStatus__startTimers() {
        this._collectTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
        let nextCollectInterval = this._consts.CHECK_INTERVAL - Math.abs(this._lastCollectTime * 1000 - Date.now());
        nextCollectInterval = Math.max(nextCollectInterval, 1 * 60 * 1000);
        this._collectTimer.initWithCallback(this, nextCollectInterval, this._collectTimer.TYPE_ONE_SHOT);
        this._setRequestTimer(2 * 60 * 1000);
    },
    notify: function addonStatus_notify(aTimer) {
        if (!aTimer) {
            return;
        }
        switch (aTimer) {
        case this._requestTimer:
            let [
                id,
                query
            ] = this._getDataForSend();
            this._sendingLogId = id;
            if (query) {
                this._sendRequest(this._appendTimeParamsToURLString(query));
            }
            break;
        case this._collectTimer:
            this._logData({ stat: "dayuse" });
            this._collectTimer.initWithCallback(this, this._consts.CHECK_INTERVAL * 1000, this._collectTimer.TYPE_ONE_SHOT);
            break;
        default:
            break;
        }
    },
    logAddonEvents: function addonStatus_logAddonEvents(aEvents) {
        this._database.execQuery("BEGIN TRANSACTION");
        for (let [
                    key,
                    value
                ] in Iterator(aEvents)) {
            this._database.execQuery("INSERT OR REPLACE INTO addonevents (key, value) VALUES (:key, :value)", {
                key: String(key),
                value: String(value)
            });
        }
        this._database.execQuery("COMMIT TRANSACTION");
    },
    fetchAddonEvents: function addonStatus_fetchAddonEvents() {
        let rows = this._database.execQuery("SELECT * FROM addonevents");
        this.clearAddonEvents();
        return rows;
    },
    clearAddonEvents: function addonStatus_clearAddonEvents() {
        this._database.executeQueryAsync({ query: "DELETE FROM addonevents" });
    },
    testSendStat: function addonStatus_testSendStat() {
        this.notify(this._requestTimer);
    },
    testCollectStat: function addonStatus_testCollectStat() {
        this.notify(this._collectTimer);
    },
    _collectTimer: null,
    _requestTimer: null,
    _sendingLogId: null,
    _database: null,
    _guidString: null,
    _consts: {
        LAST_COLLECT_TIME_PREF_NAME: "daylyaddonstat.collect",
        LAST_SEND_TIME_PREF_NAME: "daylyaddonstat.send",
        CLIDS_DATE_PREF_NAME: "clids.creationDate",
        CHECK_INTERVAL: 24 * 60 * 60 * 1000,
        STAT_URL: "https://soft.export.yandex.ru/status.xml",
        INIT_QUERIES_TABLE_QUERY: "CREATE TABLE IF NOT EXISTS queries (" + " id INTEGER PRIMARY KEY," + " query BLOB," + " timeCreated INTEGER," + " sendAttempts INTEGER" + ")",
        INIT_ADDONEVENTS_TABLE_QUERY: "CREATE TABLE IF NOT EXISTS addonevents (" + " key TEXT," + " value BLOB" + ")"
    },
    _appendTimeParamsToURLString: function addonsStatus__appendTimeParamsToURLString(aQuery) {
        let query = aQuery + "&tl=" + encodeURIComponent(this._lastSendTime);
        let clidsCreationDate = this._clidsCreationDate;
        if (clidsCreationDate !== null) {
            if (!clidsCreationDate) {
                clidsCreationDate = strutils.formatDate(new Date(), "%Y.%M.%D");
            }
            query += "&fd=" + encodeURIComponent(clidsCreationDate);
        }
        return query;
    },
    get _logsFile() {
        let logsFile = this._application.directories.appRootDir;
        logsFile.append("addonstat.sqlite");
        return logsFile;
    },
    _logData: function addonStatus__logData(aData) {
        this._lastCollectTime = Date.now();
        let onDataInserted = function onDataInserted() {
            this._cleanupLoggedData();
            this._setRequestTimer();
        }.bind(this);
        this._database.executeQueryAsync({
            query: "INSERT INTO queries (query, timeCreated, sendAttempts) " + "VALUES (:query, :timeCreated, :sendAttempts)",
            parameters: {
                query: this._collectData(aData),
                timeCreated: Date.now(),
                sendAttempts: 0
            },
            callback: onDataInserted
        });
    },
    _cleanupLoggedData: function addonsStatus__cleanupLoggedData() {
        this._database.executeQueryAsync({
            query: "DELETE FROM queries " + "WHERE (timeCreated < :timeCreated OR sendAttempts > :sendAttempts)",
            parameters: {
                timeCreated: Date.now() - 2 * 24 * 60 * 60 * 1000,
                sendAttempts: 5
            }
        });
    },
    _collectData: function addonStatus__collectData(aData) {
        let data = this._versionData;
        let rows = this.fetchAddonEvents();
        if (rows && rows.length) {
            for (let i = 0, len = rows.length; i < len; i++) {
                data[rows[i].key] = rows[i].value;
            }
        }
        let defender = this._application.defender;
        if (defender) {
            let defenceTimesData = defender.changesTime;
            if (defenceTimesData) {
                for (let [
                            propName,
                            propValue
                        ] in Iterator(defenceTimesData)) {
                    data[propName] = propValue;
                }
                defender.changesTime = null;
            }
        }
        if (!(aData && aData.stat) || aData.stat === "dayuse") {
            let mailruStat = this._application.mailruStat;
            if (mailruStat) {
                let mailruData = mailruStat.getParam();
                for (let key in mailruData) {
                    data[key] = mailruData[key];
                }
            }
        }
        if (aData) {
            for (let [
                        propName,
                        propValue
                    ] in Iterator(aData)) {
                data[propName] = propValue;
            }
        }
        let dataArray = [];
        for (let [
                    propName,
                    propValue
                ] in Iterator(data)) {
            dataArray.push(propName + "=" + encodeURIComponent(propValue));
        }
        return dataArray.join("&");
    },
    _getDataForSend: function addonStatus__getDataForSend() {
        let id = null;
        let query = null;
        let queryData = this._database.execQuery("SELECT id, query FROM queries LIMIT 1")[0];
        if (queryData) {
            id = queryData.id;
            query = queryData.query;
        }
        return [
            id,
            query
        ];
    },
    _setRequestTimer: function addonStatus__setRequestTimer(aTimeout) {
        if (this._requestTimer) {
            this._requestTimer.cancel();
        } else {
            this._requestTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
        }
        this._requestTimer.initWithCallback(this, aTimeout || 1000, this._requestTimer.TYPE_ONE_SHOT);
    },
    _sendRequestOnUninstall: function addonStatus__sendRequestOnUninstall() {
        let url = this._consts.STAT_URL + "?";
        let versionData = this._versionData;
        let data2Server = [];
        [
            "yasoft",
            "brandID",
            "ui",
            "ver",
            "os",
            "clid",
            "lang",
            "bn",
            "bv"
        ].forEach(function (prop) {
            if (versionData[prop]) {
                data2Server.push(prop + "=" + encodeURIComponent(versionData[prop]));
            }
        });
        data2Server.push("stat=uninstall");
        url += data2Server.join("&");
        url = this._appendTimeParamsToURLString(url);
        let req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);
        req.open("GET", url, false);
        req.send(null);
    },
    _sendRequest: function addonStatus__sendRequest(aQuery) {
        let request = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);
        request.mozBackgroundRequest = true;
        request.open("GET", this._consts.STAT_URL + "?" + aQuery, true);
        request.setRequestHeader("Cache-Control", "no-cache");
        let callbackFunc = this._onResponse.bind(this);
        let target = request.QueryInterface(Ci.nsIDOMEventTarget);
        target.addEventListener("load", callbackFunc, false);
        target.addEventListener("error", callbackFunc, false);
        request.send(null);
    },
    _onResponse: function addonStatus__onResponse(aRequest) {
        if (!this._sendingLogId) {
            throw new Error("Unexpected ID of sended log data.");
        }
        if (isErrorRequest(aRequest)) {
            this._database.executeQueryAsync({
                query: "UPDATE queries SET sendAttempts = sendAttempts + 1 WHERE id = :id",
                parameters: { id: this._sendingLogId }
            });
        } else {
            this._database.executeQueryAsync({
                query: "DELETE FROM queries WHERE id = :id",
                parameters: { id: this._sendingLogId }
            });
            this._lastSendTime = Date.now();
            this._clidsCreationDate = new Date();
        }
        this._sendingLogId = null;
        this._setRequestTimer(5 * 60 * 1000);
        this._cleanupLoggedData();
    },
    get _versionData() {
        let appInfo = Services.appinfo;
        let versionData = {
            stat: "dayuse",
            ui: this.guidString,
            ver: this._application.addonManager.addonVersion,
            lang: this._application.locale.language,
            bn: appInfo.name,
            bv: appInfo.version,
            os: appInfo.OS,
            yasoft: this._appType,
            brandID: this._appBrandID
        };
        let clidData = this._application.clids.vendorData.clid1;
        if (clidData && clidData.clidAndVid) {
            versionData.clid = clidData.clidAndVid;
        }
        return versionData;
    },
    get _appType() {
        let appType = this._application.core.CONFIG.APP.TYPE;
        this.__defineGetter__("_AppType", function _AppType() {
            return appType;
        });
        return this._AppType;
    },
    get _appBrandID() {
        return this._application.branding.brandID;
    },
    get _lastCollectTime() {
        let collectTimePrefValue = this._application.preferences.get(this._consts.LAST_COLLECT_TIME_PREF_NAME, 0);
        return parseInt(collectTimePrefValue, 10) || 0;
    },
    set _lastCollectTime(aTimestamp) {
        let secondsSinceUnixEpoch = Math.floor((aTimestamp || Date.now()) / 1000);
        this._application.preferences.set(this._consts.LAST_COLLECT_TIME_PREF_NAME, secondsSinceUnixEpoch);
    },
    get _lastSendTime() {
        let sendTimePrefValue = this._application.preferences.get(this._consts.LAST_SEND_TIME_PREF_NAME, 0);
        let lastSendTime = parseInt(sendTimePrefValue, 10) || 0;
        if (!lastSendTime && this._appType === "barff") {
            let oldBarSendTime = this._application.preferences.get("guid.time", 0);
            oldBarSendTime = oldBarSendTime && new Date(parseInt(oldBarSendTime, 10)).valueOf();
            lastSendTime = Math.floor(oldBarSendTime && oldBarSendTime / 1000 || 0);
        }
        return lastSendTime;
    },
    set _lastSendTime(aTimestamp) {
        let secondsSinceUnixEpoch = Math.floor((aTimestamp || Date.now()) / 1000);
        this._application.preferences.set(this._consts.LAST_SEND_TIME_PREF_NAME, secondsSinceUnixEpoch);
    },
    get _clidsCreationDate() {
        let dateString = this._application.preferences.get(this._consts.CLIDS_DATE_PREF_NAME, "");
        if (!dateString && this._appType === "barff") {
            dateString = this._application.preferences.get("guid.clids.creationDate", "");
        }
        if (!dateString) {
            return "";
        }
        dateString = dateString.split(this._clidsCreationDatePrefPrefix)[1];
        return (dateString && /^\d{4}\.\d{2}\.\d{2}$/.test(dateString) ? dateString : null) || null;
    },
    set _clidsCreationDate(aDate) {
        if (this._clidsCreationDate) {
            return;
        }
        if (!(aDate instanceof Date) || isNaN(aDate.getTime())) {
            this._logger.error("Bad Date for clidsCreationDate setter.");
            return;
        }
        let dateString = strutils.formatDate(aDate, "%Y.%M.%D");
        this._application.preferences.set(this._consts.CLIDS_DATE_PREF_NAME, this._clidsCreationDatePrefPrefix + dateString);
    },
    get _clidsCreationDatePrefPrefix() {
        let clidData = this._application.clids.vendorData.clid1;
        let clid = clidData && clidData.clid || "";
        let prefix = [
            clid,
            this.guidString,
            this._appType
        ].join(":") + ":";
        this.__defineGetter__("_clidsCreationDatePrefPrefix", function _clidsCreationDatePrefPrefix() {
            return prefix;
        });
        return this._clidsCreationDatePrefPrefix;
    },
    get _uiFile() {
        let vendorFile = this._application.directories.userDir;
        vendorFile.append("ui");
        return vendorFile;
    },
    _getGuidDataFromString: function addonStatus__getGuidDataFromString(aGuidString) {
        let guid = aGuidString && aGuidString.toString();
        return guid && /^\{[0-9a-f]{2,8}(\-[0-9a-f]{2,4}){2}\-[0-9a-f]{1,4}\-[0-9a-f]{2,12}\}$/i.test(guid) ? guid : false;
    }
};
