"use strict";
function NativeBarAPI(componentInfo, logger) {
if (! componentInfo || ! (componentInfo.package_ instanceof BarPlatform.ComponentPackage))
throw new CustomErrors.EArgType("componentInfo", "ComponentInfo", componentInfo);
this._componentInfo = componentInfo;
if (! logger)
throw new CustomErrors.EArgType("logger", "Object", logger);
this._logger = logger;
["Async", "Autocomplete", "Browser", "Controls", "Database", "DistrData", "Environment", "Files", "Localization", "Network", "Package", "Promise", "Protocols", "Services", "Settings", "Statistics", "StrUtils", "SysUtils", "Task", "XMLUtils"].forEach(function inst(apiName) {
sysutils.defineLazyGetter(this,apiName,function lazyGetter() {
return new NativeBarAPI[apiName](this._componentInfo, this._logger, this);
}
);
}
,this);
}

;
NativeBarAPI.CONSTS = {
NOT_A_WIDGET: "This component is not a widget."};
function NoCompInfo(package_) {
this._package = package_;
}

NoCompInfo.prototype = {
get id() {
throw new Error(this._NO_COMP_INFO);
}
,
get type() {
throw new Error(this._NO_COMP_INFO);
}
,
get component() {
throw new Error(this._NO_COMP_INFO);
}
,
get package_() {
return this._package;
}
,
_NO_COMP_INFO: "Shareable API can't access component information!"};
NativeBarAPI.prototype = {
get componentID() {
return this._componentInfo.id;
}
,
get componentType() this._componentInfo.type,
get componentCore() this._componentInfo.component.nativeModule.core,
get logger() {
return this._logger;
}
,
queryAPIVersion: function NativeAPI_queryAPIVersion(version) {
var apiVer = Number(version);
if (apiVer > 0 && apiVer <= this.Environment.barPlatform.version)
return this;
throw new Error(strutils.formatString("API version %1 is not available",[version]));
}
,
get shareableAPI() {
var logger = Log4Moz.repository.getLogger(appCore.appName + ".NativeAPI." + this._componentInfo.package_.id);
var shareableAPI = new NativeBarAPI(new NoCompInfo(this._componentInfo.package_), logger);
this.__defineGetter__("shareableAPI",function _shareableAPI() shareableAPI);
return this.shareableAPI;
}
,
finalize: function NativeAPI_finalize() {
try {
NativeComponents._unregisterServices(this.componentID);
}
catch (e) {
this._logger.error("NativeComponents._unregisterServices failed. " + strutils.formatError(e));
}

try {
NativeComponents._releaseServices(this.Services);
}
catch (e) {
this._logger.error("NativeComponents._releaseServices failed. " + strutils.formatError(e));
}

this.Settings._finalize();
this.Autocomplete._finalize();
this.Browser._finalize();
this.SysUtils._finalize();
this._componentInfo = null;
}
};
NativeBarAPI.Services = function Services(componentInfo) {
this._componentInfo = componentInfo;
}
;
NativeBarAPI.Services.prototype = {
registerService: function NativeAPI_registerService(serviceName, serviceObject) {
return NativeComponents.registerService(this._componentInfo.id,serviceName,serviceObject);
}
,
notifyServiceUsers: function NativeAPI_notifyServiceUsers(serviceName, topic, data) {
NativeComponents.notifyServiceUsers(this._componentInfo.id,serviceName,topic,data);
}
,
unregisterService: function NativeAPI_unregisterService(serviceName) {
return NativeComponents.unregisterService(this._componentInfo.id,serviceName);
}
,
obtainService: function NativeAPI_obtainService(providerID, serviceName, eventListener) {
return NativeComponents.obtainService(providerID,serviceName,eventListener,this);
}
,
releaseService: function NativeAPI_releaseService(providerID, serviceName, eventListener) {
NativeComponents.releaseService(providerID,serviceName,eventListener);
}
};
NativeBarAPI.Environment = function Environment() {

}
;
NativeBarAPI.Environment.prototype = {
os: {
get name() {
return sysutils.platformInfo.os.name;
}
},
browser: {
get name() {
return sysutils.platformInfo.browser.name;
}
,
get version() {
return sysutils.platformInfo.browser.version;
}
},
addon: {
get id() {
var id = AddonManager.getAddonId(appCore.extensionPathFile);
this.__defineGetter__("id",function NativeAPI_Env_addon_id() id);
return this.id;
}
,
get version() {
var version = AddonManager.getAddonVersion(appCore.extensionPathFile);
this.__defineGetter__("version",function NativeAPI_Env_addon_version() version);
return this.version;
}
,
get locale() {
var localeString = application.localeString;
var localeComponents = application.locale;
var locale = {
toString: function NativeAPI_locale_toString() localeString,
language: localeComponents.language || "",
country: localeComponents.country || "",
region: localeComponents.region || ""};
this.__defineGetter__("locale",function NativeAPI_locale() locale);
return this.locale;
}
,
get userID() {
return application.addonStatus.guidString;
}
,
get goingToUninstall() {
return application.addonManager.isAddonUninstalling;
}
,
get type() {
return appCore.CONFIG.APP.TYPE;
}
},
barPlatform: {
get name() {
return appCore.appName;
}
,
get version() {
return appCore.CONFIG.PLATFORM.VERSION;
}
,
get soundsEnabled() {
return application.soundsEnabled;
}
}};
NativeBarAPI.Environment.__proto__ = NativeBarAPI.Environment.prototype;
NativeBarAPI.Controls = function Controls(componentInfo, logger, api) {
this._componentInfo = componentInfo;
this._logger = logger;
this._api = api;
}
;
NativeBarAPI.Controls.prototype = {
openSettingsDialog: function NativeAPI_openSettingsDialog(browserWindow, setupID, paneType) {
application.openSettingsDialog(browserWindow,setupID,paneType);
}
,
openAboutDialog: function NativeApi_openAboutDialog() {
application.openAboutDialog();
}
,
navigateBrowser: function NativeAPI_navigateBrowser(navigateData) {
return BarPlatform.navigateBrowser(navigateData);
}
,
addWidget: function NativeAPI_addWidget(widgetID, browserWindow, relativeTo, placeAfter) {
if (! browserWindow)
browserWindow = misc.getTopBrowserWindow(); else
if (! (browserWindow instanceof Ci.nsIDOMWindow))
throw new TypeError("XUL window required " + browserWindow);
var wndController = NativeComponents._getWindowController(browserWindow);
widgetID = widgetID || this._componentInfo.id;
var [, widgetElement] = wndController.placeWidget(widgetID,relativeTo,placeAfter,undefined,true);
return [widgetElement.wdgtInstanceID, widgetElement];
}
,
removeWidget: function NativeAPI_removeWidget(WIIDorElement, browserWindow) {
if (! browserWindow)
{
if (WIIDorElement instanceof Ci.nsIDOMElement)
browserWindow = WIIDorElement.ownerDocument.defaultView; else
browserWindow = misc.getTopBrowserWindow();
}

if (! (browserWindow instanceof Ci.nsIDOMWindow))
throw new TypeError("XUL window required " + browserWindow);
NativeComponents._getWindowController(browserWindow).removeItem(WIIDorElement);
}
,
get allWidgetInstanceIDs() {
if (this._componentInfo.type != "widget")
throw new Error(NativeBarAPI.CONSTS.NOT_A_WIDGET);
return this._componentInfo.component.spawnedIDs;
}
,
getAllWidgetItems: function NativeAPI_getAllWidgetItems() {
if (this._componentInfo.type != "widget")
throw new Error(NativeBarAPI.CONSTS.NOT_A_WIDGET);
return this._componentInfo.component.getAllWidgetItems();
}
,
getAllWidgetItemsOfInstance: function NativeAPI_getAllWidgetItemsOfInstance(WIID) {
if (this._componentInfo.type != "widget")
throw new Error(NativeBarAPI.CONSTS.NOT_A_WIDGET);
return this._componentInfo.component.getAllWidgetItemsOfInstance(WIID);
}
,
enablePlugin: function NativeAPI_enablePlugin(pluginID) {
application.widgetLibrary.getPlugin(pluginID).enable();
}
,
disablePlugin: function NativeAPI_disablePlugin(pluginID) {
application.widgetLibrary.getPlugin(pluginID).disable();
}
,
createSlice: function NativeAPI_createSlice(sliceProps, WIID) {
return createSliceWrapper(sliceProps,this._api,WIID);
}
};
NativeBarAPI.Statistics = function Statistics(componentInfo, logger) {
this._componentInfo = componentInfo;
this._logger = logger;
this._componentsUsage = application.componentsUsage;
}
;
NativeBarAPI.Statistics.prototype = {
logShortAction: function NativeAPI_logShortAction(eventID) {
this._componentsUsage.logShortAction(eventID);
}
,
logCustomAction: function NativeAPI_logCustomAction(eventID) {
this._componentsUsage.logCustomAction(this._componentInfo.id,eventID);
}
,
logButtonClick: function NativeAPI_logButtonClick() {

}
,
logMenuClick: function NativeAPI_logMenuClick() {

}
,
logAddonEvents: function NativeAPI_logAddonEvents(eventsMap) {
application.addonStatus.logAddonEvents(eventsMap);
}
,
fetchBarNavigStat: function NativeAPI_fetchBarNavigStat() {
return this._componentsUsage.readActions();
}
,
get barnavigR1String() {
return application.barnavig.barnavigR1String || "";
}
,
set barnavigR1String(aR1String) {
if (typeof aR1String != "string")
throw new TypeError("aR1String must be a string");
application.barnavig.barnavigR1String = aR1String;
}
,
get alwaysSendUsageStat() {
return application.barnavig.alwaysSendUsageStat;
}
,
BarNavig: {
addDataProvider: function NativeAPI_addDataProvider(aProvider) {
application.barnavig.addDataProvider(aProvider);
}
,
removeDataProvider: function NativeAPI_removeDataProvider(aProvider) {
application.barnavig.removeDataProvider(aProvider);
}
,
sendRequest: function NativeAPI_sendRequest(aRequestParams, aCallback) {
application.barnavig.sendRequest(aRequestParams,aCallback);
}
,
forceRequest: function NativeAPI_sendRequestAlways(aRequestParams, aCallback) {
application.barnavig.forceRequest(aRequestParams,aCallback);
}
}};
NativeBarAPI.Settings = function Settings(componentInfo, logger) {
this._componentInfo = componentInfo;
this._logger = logger;
this._allSettingsObservers = {
};
this._compSettingsObservers = [];
}
;
NativeBarAPI.Settings.prototype = {
getValue: function NativeAPI_getValue(settingName, WIID) {
if (this._componentInfo.type == "widget")
return this._componentInfo.component.lookupGetSettingValue(settingName,WIID);
return this._componentInfo.component.getSettingValue(settingName);
}
,
setValue: function NativeAPI_setValue(settingName, newValue, WIID) {
if (this._componentInfo.type == "widget")
this._componentInfo.component.lookupSetSettingValue(settingName,WIID,newValue); else
this._componentInfo.component.applySetting(settingName,newValue);
}
,
observeChanges: function NativeAPI_observeChanges(observer, WIID) {
if (! observer || typeof observer.onSettingChange != "function")
throw new TypeError("Observer must be an object with 'onSettingChange' method");
this._watchSettings();
if (! WIID)
{
let observers = this._compSettingsObservers;
if (observers.indexOf(observer) == - 1)
{
observers.push(observer);
}

}
 else
{
let observers = this._allSettingsObservers[WIID];
if (! observers)
{
this._watchInstSettings(WIID);
observers = this._allSettingsObservers[WIID] = [];
}

if (observers.indexOf(observer) == - 1)
{
observers.push(observer);
}

}

}
,
ignoreChanges: function NativeAPI_ignoreChanges(observer, WIID) {
if (WIID)
{
if (this._allSettingsObservers[WIID])
{
let index = this._allSettingsObservers[WIID].indexOf(observer);
if (index != - 1)
{
this._allSettingsObservers[WIID].splice(index,1);
if (! this._allSettingsObservers[WIID].length)
{
delete this._allSettingsObservers[WIID];
this._ignoreInstSettings(WIID);
}

}

}

}
 else
{
let ind = this._compSettingsObservers.indexOf(observer);
if (ind != - 1)
{
this._compSettingsObservers.splice(ind,1);
}

}

var isEmpty = function isEmpty(object) {
for(let x in object) {
return false;
}

return true;
}
;
if (! this._compSettingsObservers.length && isEmpty(this._allSettingsObservers))
{
this._ignoreSettings();
}

}
,
get PrefsModule() {
return Preferences;
}
,
getPackageBranchPath: function NativeAPI_getPackageBranchPath() {
return this._pbp || (this._pbp = NativeComponents.makePackagePrefPath(this._componentInfo.package_.id));
}
,
getComponentBranchPath: function NativeAPI_getComponentBranchPath() {
return this._cbp || (this._cbp = NativeComponents.makeWidgetPrefPath(this._componentInfo.id));
}
,
getInstanceBranchPath: function NativeAPI_getInstanceBranchPath(WIID) {
return NativeComponents.makeInstancePrefPath(this._componentInfo.id,WIID);
}
,
getStaticBranchPath: function NativeAPI_getStaticBranchPath(WIID) {
return NativeComponents.makeStaticBranchPath(this._componentInfo.id,WIID);
}
,
get addonBranchPath() {
return application.preferencesBranch;
}
,
_allSettingsObservers: null,
_compSettingsObservers: null,
_watchingCommonSettings: false,
_finalize: function NativeAPI__finalize() {
for(let WIID in this._allSettingsObservers) {
try {
this._ignoreInstSettings(WIID);
}
catch (e) {

}

}

this._ignoreSettings();
delete this._allSettingsObservers;
delete this._compSettingsObservers;
}
,
observe: function NativeAPI_observe(subject, topic, data) {
if (topic != "nsPref:changed")
return;
try {
let prefProperties = BarPlatform.parsePrefPath(data,this._componentInfo.component.id);
if (this._isRelevantPrefChange(prefProperties))
{
this._logger.debug("Setting changed: " + sysutils.dump(prefProperties));
this._notifyRelevantObservers(prefProperties);
}

}
catch (e) {
this._logger.error("nsIObserver.observe failed. " + strutils.formatError(e));
}

}
,
_watchSettings: function NativeAPI__watchSettings() {
if (this._watchingCommonSettings)
return;
var component = this._componentInfo.component;
Preferences.observe2(NativeComponents.makePackagePrefPath(component.pkg.id),this);
Preferences.observe2(NativeComponents.makeWidgetPrefPath(component.id),this);
this._watchingCommonSettings = true;
}
,
_watchInstSettings: function NativeAPI__watchInstSettings(WIID) {
if (WIID in this._allSettingsObservers)
throw new Error("Widget instance " + WIID + " settings are already being watched");
Preferences.observe2(NativeComponents.makeInstancePrefPath(this._componentInfo.component.id,WIID),this);
}
,
_ignoreSettings: function NativeAPI__ignoreSettings() {
var component = this._componentInfo.component;
Preferences.ignore2(NativeComponents.makePackagePrefPath(component.pkg.id),this);
Preferences.ignore2(NativeComponents.makeWidgetPrefPath(component.id),this);
this._watchingCommonSettings = false;
}
,
_ignoreInstSettings: function NativeAPI__ignoreInstSettings(WIID) {
Preferences.ignore2(NativeComponents.makeInstancePrefPath(this._componentInfo.component.id,WIID),this);
}
,
_isRelevantPrefChange: function NativeAPI__isRelevantPrefChange(prefProperties) {
var component = this._componentInfo.component;
var settingName = prefProperties.settingName;
if (this._componentInfo.type == "widget")
{
return prefProperties.isInstancePref && settingName in component._instSettings || prefProperties.isComponentPref && settingName in component.widgetSettings || prefProperties.isPackagePref && settingName in component.packageSettings;
}
 else
{
return prefProperties.isComponentPref && settingName in component.pluginSettings || prefProperties.isPackagePref && settingName in component.packageSettings;
}

}
,
_notifyRelevantObservers: function NativeAPI__notifyRelevantObservers(prefProperties) {
var settingName = prefProperties.settingName;
var newValue = this.getValue(settingName,prefProperties.instanceID);
if (! prefProperties.isInstancePref)
this._notifyCompSettingsObservers(settingName,newValue);
this._notifyAllSettingsObservers(settingName,newValue,prefProperties.instanceID);
}
,
_notifyAllSettingsObservers: function NativeAPI__notifyAllSettingsObservers(settingName, newValue, instanceID) {
var observersList;
if (instanceID)
{
observersList = this._allSettingsObservers[instanceID];
}
 else
{
observersList = [];
for each(let instList in this._allSettingsObservers) observersList = observersList.concat(instList);
}

this._callEachOnSettingChange(observersList,[settingName, newValue, instanceID]);
}
,
_notifyCompSettingsObservers: function NativeAPI__notifyCompSettingsObservers(settingName, newValue) {
this._callEachOnSettingChange(this._compSettingsObservers,[settingName, newValue]);
}
,
_callEachOnSettingChange: function NativeAPI__callEachOnSettingChange(observersList, args) {
for each(let observer in observersList) {
try {
if (observersList.indexOf(observer) != - 1)
observer.onSettingChange.apply(observer,args);
}
catch (e) {
this._logger.error("Settings observer failed in 'onSettingChange'. " + strutils.formatError(e));
this._logger.debug(e.stack);
}

}

}
};
NativeBarAPI.Package = function Package(componentInfo, logger) {
this._package = componentInfo.package_;
this._logger = logger;
}
;
NativeBarAPI.Package.prototype = {
get id() {
return this._package.id;
}
,
resolvePath: function NativeAPI_resolvePath(path, basePath) {
return this._package.resolvePath(path,basePath);
}
,
fileExists: function NativeAPI_fileExists(path) {
return ! ! this._package.findFile(path);
}
,
getFileInputChannel: function NativeAPI_getFileInputChannel(path) {
return this._package.newChannelFromPath(path);
}
,
readTextFile: function NativeAPI_readTextFile(path) {
var fileStream = this.getFileInputChannel(path).contentStream;
var fileContent = fileutils.readStringFromStream(fileStream);
fileStream.close();
return fileContent;
}
};
NativeBarAPI.Files = function Files(componentInfo, logger) {
this._componentInfo = componentInfo;
this._logger = logger;
}
;
NativeBarAPI.Files.prototype = {
getPackageStorage: function NativeAPI_getPackageStorage(create) {
var result = NativeComponents.getPackageStorage(this._componentInfo.package_.id);
this.getPackageStorage = function NativeAPI_getPackageStorage(inCreate) {
if (inCreate)
fileutils.forceDirectories(result);
return result.clone();
}
;
return this.getPackageStorage(create);
}
,
getWidgetStorage: function NativeAPI_getWidgetStorage(create) {
var result = NativeComponents.getComponentStorage(this._componentInfo.id);
this.getWidgetStorage = function NativeAPI_getWidgetStorage(inCreate) {
if (inCreate)
fileutils.forceDirectories(result);
return result.clone();
}
;
return this.getWidgetStorage(create);
}
,
getInstanceStorage: function NativeAPI_getInstanceStorage(WIID, create) {
var result = this.getWidgetStorage();
result.append(WIID);
if (create)
fileutils.forceDirectories(result);
return result;
}
,
forceDirectories: function NativeAPI_forceDirectories(file) {
fileutils.forceDirectories(file);
}
,
writeStreamToFile: function NativeAPI_writeStreamToFile(inputStream, destFile, accessRights, modeFlags) {
return fileutils.writeStreamToFile(inputStream,destFile,accessRights,modeFlags);
}
,
readTextFile: function NativeAPI_readTextFile(file) {
return fileutils.readTextFile(file);
}
,
writeTextFile: function NativeAPI_writeTextFile(file, text, accessRights, modeFlags) {
return fileutils.writeTextFile(file,text,accessRights,modeFlags);
}
,
jsonFromFile: function NativeAPI_jsonFromFile(file) {
return fileutils.jsonFromFile(file);
}
,
jsonToFile: function NativeAPI_jsonToFile(json, file, accessRights, modeFlags) {
fileutils.jsonToFile(json,file,accessRights,modeFlags);
}
};
NativeBarAPI.Database = function NativeBarAPI_Database(componentInfo, logger) {

}
;
NativeBarAPI.Database.prototype = {
createInstance: function NativeAPI_Database_createInstance(storageFile, initStatements) {
return new Database(storageFile, initStatements);
}
};
NativeBarAPI.Async = function NativeBarAPI_Async(componentInfo, logger) {

}
;
NativeBarAPI.Async.prototype = {
parallel: function NativeAPI_Async_parallel() async.parallel.apply(async,arguments),
series: function NativeAPI_Async_series() async.series.apply(async,arguments),
waterfall: function NativeAPI_Async_waterfall() async.waterfall.apply(async,arguments),
nextTick: function NativeAPI_Async_nextTick() async.nextTick.apply(async,arguments)};
NativeBarAPI.Promise = function NativeBarAPI_Promise(componentInfo, logger) {

}
;
NativeBarAPI.Promise.prototype = {
defer: function NativeAPI_Promise_defer() promise.defer.apply(promise,arguments),
resolve: function NativeAPI_Promise_resolve() promise.resolve.apply(promise,arguments),
reject: function NativeAPI_Promise_reject() promise.reject.apply(promise,arguments),
promised: function NativeAPI_Promise_promised() promise.promised.apply(promise,arguments)};
NativeBarAPI.Task = function NativeBarAPI_Task(componentInfo, logger) {

}
;
NativeBarAPI.Task.prototype = {
spawn: function NativeAPI_Task_spawn() task.spawn.apply(task,arguments),
Result: function NativeAPI_Task_Result() task.Result.apply(task,arguments)};
NativeBarAPI.XMLUtils = function XMLUtils(componentInfo, logger) {
this._logger = logger;
}
;
NativeBarAPI.XMLUtils.prototype = {
xmlDocFromStream: function NativeAPI_xmlDocFromStream(stream, docURI, baseURI, privileged) {
return fileutils.xmlDocFromStream(stream,docURI,baseURI,privileged);
}
,
xmlDocFromFile: function NativeAPI_xmlDocFromFile(localFile, privileged) {
return fileutils.xmlDocFromFile(localFile,privileged);
}
,
xmlDocToFile: function NativeAPI_xmlDocToFile(xmlDocument, destFile, accessRights, modeFlags) {
return fileutils.xmlDocToFile(xmlDocument,destFile,accessRights,modeFlags);
}
,
transformXMLToFragment: function NativeAPI_transformXMLToFragment(sourceNode, stylesheet, destDoc, oParams) {
return xmlutils.transformXMLToFragment(sourceNode,stylesheet,destDoc,oParams);
}
,
queryXMLDoc: function NativeAPI_queryXMLDoc(xpathExpr, contextNode, extNSResolver) {
return xmlutils.queryXMLDoc(xpathExpr,contextNode,extNSResolver);
}
,
getDOMParser: function NativeAPI_getDOMParser(docURI, baseURI, withSystemPrincipal) {
return xmlutils.getDOMParser(docURI,baseURI,withSystemPrincipal);
}
};
NativeBarAPI.StrUtils = function StrUtils(componentInfo, logger) {
this._logger = logger;
}
;
NativeBarAPI.StrUtils.prototype = {
readStringFromStream: function NativeAPI_readStringFromStream(inputStream) {
return fileutils.readStringFromStream(inputStream);
}
,
formatError: function NativeAPI_formatError(error) {
this._logger.error("NativeAPI.StrUtils.formatError is obsolete.");
return strutils.formatError(error);
}
,
dumpValue: function NativeBarAPI_dumpValue(value, depth) {
return sysutils.dump(value,depth);
}
};
NativeBarAPI.Localization = function Localization(componentInfo, logger) {
this._componentInfo = componentInfo;
this._logger = logger;
this.__messagesHash = null;
}
;
NativeBarAPI.Localization.prototype = {
createStringBundle: function Localization_createStringBundle(aURL) {
var url = /^[a-z]+:\/\//.test(aURL) ? aURL : this._componentInfo.package_.resolvePath(aURL);
return new application.appStrings.StringBundle(url);
}
,
getString: function Localization_getString(key) {
return this._messagesHash[key] || "";
}
,
__messagesHash: null,
get _messagesHash() {
if (this.__messagesHash === null)
{
this.__messagesHash = Object.create(null);
let xmlDoc = this._getMessagesXMLDoc(this._componentInfo.component.unit.name + ".messages.xml") || this._getMessagesXMLDoc("messages.xml");
let nodes = xmlDoc && xmlutils.queryXMLDoc("/Messages/Message",xmlDoc) || [];
for (let i = 0, node;node = nodes[i++];) {
let key = node.getAttribute("key");
if (key)
this.__messagesHash[key] = node.getAttribute("value");
}

}

return this.__messagesHash;
}
,
_getMessagesXMLDoc: function Localization__getMessagesXMLDoc(fileName) {
try {
let package_ = this._componentInfo.package_;
if (! package_.findFile(fileName))
return null;
return package_.getXMLDocument(fileName);
}
catch (ex) {
this._logger.warn("Could not parse " + fileName + ". " + e);
return null;
}

}
};
NativeBarAPI.SysUtils = function SysUtils(componentInfo, logger) {
this._logger = logger;
this._createdDataContainers = [];
}
;
NativeBarAPI.SysUtils.prototype = {
Timer: function SysUtils_Timer(aCallback, aDelay, aRepeating, aMaxTimes) {
return new sysutils.Timer(aCallback, aDelay, aRepeating, aMaxTimes);
}
,
createDataContainer: function SysUtils_createDataContainer(aDataContainerProperties) {
var dc = new sysutils.DataContainer(aDataContainerProperties);
this._createdDataContainers.push(dc);
return dc;
}
,
_createdDataContainers: null,
_finalize: function SysUtils__finalize() {
for each(let dc in this._createdDataContainers) {
try {
dc.finalize();
}
catch (e) {
this._logger.error("Error finalizing DataContainer. " + e);
this._logger.debug(e.stack);
}

}

}
};
NativeBarAPI.Browser = function Browser(componentInfo, logger) {
this._componentInfo = componentInfo;
this._logger = logger;
}
;
NativeBarAPI.Browser.prototype = {
getWindowListener: function NativeAPI_getWindowListener(window) {
return NativeComponents._getWindowController(window).windowListener;
}
,
getWindowDataIsland: function NativeAPI_getWindowDataIsland(window) {
return NativeComponents._getWindowController(window).windowDataIsland;
}
,
get globalHiddenWindow() {
return misc.hiddenWindows.getWindow(this.HIDDEN_CHROME_WINDOW_URL);
}
,
getHiddenFrame: function NativeAPI_getHiddenFrame() {
this._hiddenFrameAccessed = true;
return misc.hiddenWindows.getFrame(this._componentInfo.id,this.HIDDEN_CHROME_WINDOW_URL);
}
,
removeHiddenFrame: function NativeAPI_removeHiddenFrame() {
return misc.hiddenWindows.removeFrame(this._componentInfo.id);
}
,
HIDDEN_CHROME_WINDOW_URL: "chrome://" + application.name + "/content/overlay/hiddenwindow.xul",
_hiddenFrameAccessed: false,
_finalize: function NativeAPI_Browser__finalize() {
if (this._hiddenFrameAccessed)
this.removeHiddenFrame();
}
};
NativeBarAPI.Network = function Network() {

}
;
NativeBarAPI.Network.prototype = {
Cookie: netutils.Cookie,
findCookieValue: function Network_findCookieValue(URLorURI, cookieName, incHttpOnly, checkExpired, strictMatch) {
return netutils.findCookieValue.apply(netutils,arguments);
}
,
findCookies: function Network_findCookies(URLorURI, cookieName, incHttpOnly, checkExpired, strictMatch) {
return netutils.findCookies.apply(netutils,arguments);
}
,
getCookiesFromHost: function Network_getCookiesFromHost(aHost) {
return netutils.getCookiesFromHost.apply(netutils,arguments);
}
,
cookieMatchesURI: function Network_cookieMatchesURL(cookie, uri, strictMatch) {
return netutils.cookieMatchesURI.apply(netutils,arguments);
}
,
getCachedResource: function Network_getCachedResource(descrData) {
return BarPlatform.CachedResources.getResource(new BarPlatform.CachedResources.ResDescriptor(descrData));
}
};
NativeBarAPI.Autocomplete = function Autocomplete(componentInfo, logger) {
this._componentInfo = componentInfo;
this._logger = logger;
this._providers = Object.create(null);
}
;
NativeBarAPI.Autocomplete.prototype = {
commonHistoryCategory: appCore.appName + "-history",
searchComponentName: appCore.appName + "-autocomplete",
addSearchProvider: function NativeAPI_Autocomplete_addSearchProvider(aSearchId, aProvider) {
var ok = this._autocompleteSearchService.addSearchProvider(aSearchId,aProvider);
if (! ok)
throw new Error(strutils.formatString("Could not add search provider '%1'",[aSearchId]));
this._providers[aSearchId] = aProvider;
}
,
removeSearchProvider: function NativeAPI_Autocomplete_removeSearchProvider(aSearchId) {
var ok = this._autocompleteSearchService.removeSearchProvider(aSearchId,this._providers[aSearchId]);
delete this._providers[aSearchId];
if (! ok)
throw new Error(strutils.formatString("Could not remove search provider '%1'",[aSearchId]));
}
,
_providers: null,
get _autocompleteSearchService() {
var serviceId = "@mozilla.org/autocomplete/search;1?name=" + this.searchComponentName;
var autocompleteSearchService = Cc[serviceId].getService().wrappedJSObject;
this.__defineGetter__("_autocompleteSearchService",function NativeAPI_Autocomplete__autocompleteSearchService() autocompleteSearchService);
return this._autocompleteSearchService;
}
,
_finalize: function NativeAPI_Autocomplete__finalize() {
for(let [id, provider] in Iterator(this._providers)) {
this._logger.warn("Removing dangling autocomplete provider " + id);
this._autocompleteSearchService.removeSearchProvider(id,provider);
}

}
};
NativeBarAPI.DistrData = function DistrData() {

}
;
NativeBarAPI.DistrData.prototype = {
getRecord: function NativeAPI_DistrData_getRecord(id) {
return application.clids.vendorData[id] || null;
}
};
NativeBarAPI.Protocols = function Protocols() {

}
;
NativeBarAPI.Protocols.prototype = {
addBarHandler: function NativeAPI_Protocols_addBarHandler(protocolHandler) {
appCore.protocols.bar.addDataProvider(protocolHandler);
}
,
removeBarHandler: function NativeAPI_Protocols_removeBarHandler(protocolHandler) {
appCore.protocols.bar.removeDataProvider(protocolHandler);
}
};
