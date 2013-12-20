"use strict";
const EXPORTED_SYMBOLS = ["fastdial"];
const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;
const GLOBAL = this;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/PlacesUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
[["SESSION_STORE_SVC", "@mozilla.org/browser/sessionstore;1", "nsISessionStore"], ["DOWNLOAD_MANAGER_SVC", "@mozilla.org/download-manager-ui;1", "nsIDownloadManagerUI"], ["UUID_SVC", "@mozilla.org/uuid-generator;1", "nsIUUIDGenerator"]].forEach(function ([name, contract, intf]) XPCOMUtils.defineLazyServiceGetter(GLOBAL,name,contract,intf));
const FILE_PROTOCOL_HANDLER = Services.io.getProtocolHandler("file").QueryInterface(Ci.nsIFileProtocolHandler);
const WINDOW_DESTROY_EVENT = "dom-window-destroyed";
const CLEAR_HISTORY_THUMBS_INTERVAL = 3600;
const RECENTLY_CLOSED_TABS = 15;
const BAR_EXTENSION_ID = "yasearch@yandex.ru";
const NATIVE_RESTORETAB_PREFIX = "current-";
const fastdial = {
init: function Fastdial_init(application) {
application.core.Lib.sysutils.copyProperties(application.core.Lib,GLOBAL);
this._application = application;
this._logger = application.getLogger("Fastdial");
var dataProvider = this._barnavigDataProvider.init(this._application);
this._application.barnavig.addDataProvider(dataProvider);
Services.obs.addObserver(this,WINDOW_DESTROY_EVENT,false);
Services.obs.addObserver(this,this._application.core.eventTopics.CLOUD_DATA_RECEIVED_EVENT,false);
this._clearHistoryThumbsTimer = new sysutils.Timer((function () {
this._historyThumbs = {
};
}
).bind(this), CLEAR_HISTORY_THUMBS_INTERVAL * 1000, true);
}
,
finalize: function Fastdial_finalize(doCleanup, callback) {
this._application.core.protocol.removeDataProvider(this);
Services.obs.removeObserver(this,WINDOW_DESTROY_EVENT);
Services.obs.removeObserver(this,this._application.core.eventTopics.CLOUD_DATA_RECEIVED_EVENT);
if (this._clearHistoryThumbsTimer)
this._clearHistoryThumbsTimer.cancel();
this._barnavigDataProvider.finalize();
this._application.barnavig.removeDataProvider(this._barnavigDataProvider);
this._registeredListeners = null;
this._historyThumbs = null;
this._application = null;
this._logger = null;
}
,
observe: function Fastdial_observe(aSubject, aTopic, aData) {
switch (aTopic) {
case WINDOW_DESTROY_EVENT:
if (String(aSubject.vb) == "[object Object]")
{
let utils = aSubject.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
let outerWindowID = utils.outerWindowID;
delete this._registeredListeners[outerWindowID];
}

break;
case this._application.core.eventTopics.CLOUD_DATA_RECEIVED_EVENT:
aData = JSON.parse(aData);
for(let [url, historyThumbData] in Iterator(this._historyThumbs)) {
let historyThumbHost = this.getDecodedUrlHost(url);
if (! historyThumbHost || historyThumbHost !== aData.domain)
continue;
sysutils.copyProperties(aData,historyThumbData.cloud);
this.sendRequest("historyThumbChanged",this._application.frontendHelper.getDataForThumb(historyThumbData));
}

break;
case "status":
break;
}

}
,
setListenersForWindow: function Fastdial_setListenersForWindow(outerWindowId, command, callback) {
this._registeredListeners[outerWindowId] = this._registeredListeners[outerWindowId] || {
};
var listeners = this._registeredListeners[outerWindowId];
if (! listeners[command])
return listeners[command] = [callback];
if (listeners[command].indexOf(callback) === - 1)
{
listeners[command].push(callback);
}

}
,
removeListenersForWindow: function Fastdial_removeListenersForWindow(outerWindowId, command, callback) {
var listeners = this._registeredListeners[outerWindowId];
if (! listeners || ! listeners[command])
return;
if (callback === undefined)
{
delete listeners[command];
}
 else
{
let index = listeners[command].indexOf(callback);
if (index !== - 1)
{
listeners[command].splice(index,1);
}

}

}
,
hasListenerForWindow: function Fastdial_hasListenerForWindow(outerWindowId, command, callback) {
var listeners = this._registeredListeners[outerWindowId];
return listeners[command] && listeners[command].indexOf(callback) !== - 1;
}
,
sendRequest: function Fastdial_sendRequest(command, data) {
for(let outerWindowId in this._registeredListeners) {
this.sendRequestToTab(outerWindowId,command,data);
}

}
,
sendRequestToTab: function Fastdial_sendRequestToTab(outerWindowId, command, data) {
var listeners = this._registeredListeners[outerWindowId];
if (! listeners || ! listeners[command])
return;
this._logger.trace("SendRequest [" + command + "]: outer_window_id " + outerWindowId + ": " + JSON.stringify(data));
listeners[command].forEach(function (callback) {
if (! (outerWindowId in this._registeredListeners))
return;
data = sysutils.copyObj(data,true);
try {
callback(data);
}
catch (ex) {

}

}
,this);
}
,
openExternalWindow: function Fastdial_openExternalWindow(externalWindowName, window) {
if (["downloads", "bookmarks", "history"].indexOf(externalWindowName) === - 1)
throw new Error("Wrong window type selected");
if (externalWindowName === "downloads")
{
DOWNLOAD_MANAGER_SVC.show(window);
return;
}

var leftPaneRoot;
if (externalWindowName === "bookmarks")
leftPaneRoot = "AllBookmarks"; else
if (externalWindowName === "history")
leftPaneRoot = "History";
var organizer = misc.getTopWindowOfType("Places:Organizer");
if (! organizer)
{
let topWindow = misc.getTopBrowserWindow();
topWindow.openDialog("chrome://browser/content/places/places.xul","","chrome,toolbar=yes,dialog=no,resizable",leftPaneRoot);
}
 else
{
organizer.PlacesOrganizer.selectLeftPaneQuery(leftPaneRoot);
organizer.focus();
}

}
,
requestInit: function Fastdial_requestInit(outerWindowId, ignoreBookmarks) {
var self = this;
var backboneXY = this._application.layout.getThumbsNumXY();
var maxThumbIndex = backboneXY[0] * backboneXY[1];
var showBookmarks = this._application.preferences.get("ftabs.showBookmarks");
var requestData = {
debug: this._application.preferences.get("ftabs.debug",false),
x: backboneXY[0],
y: backboneXY[1],
showBookmarks: showBookmarks,
backgroundImage: this._application.backgroundImages.currentSelectedURL,
thumbs: this._application.frontendHelper.fullStructure,
hasClosedTabs: this._recentlyClosedTabs.length > 0,
hasApps: false,
sync: this._application.sync.state};
var brandingLogo = this.brandingXMLDoc.querySelector("logo");
var brandingSearch = this.brandingXMLDoc.querySelector("search");
var brandingSearchURL = brandingSearch.getAttribute("url");
var searchURL = this._application.branding.expandBrandTemplates(brandingSearchURL);
var imgFile = this._application.branding.brandPackage.findFile("fastdial/" + brandingLogo.getAttribute("img_clear")) || "";
if (imgFile)
imgFile = FILE_PROTOCOL_HANDLER.getURLSpecFromFile(imgFile);
requestData.branding = {
logo: {
url: this.expandBrandingURL(brandingLogo.getAttribute("url")),
img: imgFile,
alt: brandingLogo.getAttribute("alt"),
title: brandingLogo.getAttribute("title")},
search: {
url: searchURL,
placeholder: brandingSearch.getAttribute("placeholder"),
example: this._application.searchExample.current,
navigateTitle: brandingSearch.getAttribute("navigate_title") || ""}};
var onSearchStatusReady = (function Fastdial_requestInit_onSearchStatusReady(searchStatus) {
requestData.searchStatus = searchStatus;
if (outerWindowId !== undefined)
{
this.sendRequestToTab(outerWindowId,"init",requestData);
}
 else
{
this.sendRequest("init",requestData);
}

if (showBookmarks && ! ignoreBookmarks)
{
this._application.bookmarks.requestBranch("",function (bookmarks) {
if (outerWindowId !== undefined)
{
self.sendRequestToTab(outerWindowId,"bookmarksStateChanged",bookmarks);
}
 else
{
self.sendRequest("bookmarksStateChanged",bookmarks);
}

}
);
}

if (outerWindowId !== undefined && ! this._outerWindowIdList[outerWindowId])
{
this._outerWindowIdList[outerWindowId] = true;
if (this._logTabShowFlag)
{
this._application.usageHistory.logAction("show");
this._tabsShownCounter++;
}

this._logTabShowFlag = true;
}

}
).bind(this);
var searchStatusInternal = this._application.preferences.get("ftabs.searchStatus") === 1 ? false : true;
var searchStudyOmni = this._application.preferences.get("ftabs.searchStudyOmnibox");
if (searchStatusInternal)
{
onSearchStatusReady(2);
return;
}

if (! searchStudyOmni)
{
onSearchStatusReady(1);
return;
}

AddonManager.gre_AddonManager.getAddonByID(BAR_EXTENSION_ID,function (addonData) {
var isBarInstalled = addonData !== null && addonData.installDate && addonData.isActive;
onSearchStatusReady(isBarInstalled ? 3 : 1);
}
);
}
,
requestSettings: function Fastdial_requestSettings(callback) {
var maxLayoutNum = this._application.layout.getMaxThumbLayout();
var productInfo = this._application.branding.productInfo;
var possibleLayouts = this._application.layout.getPossibleLayouts();
callback({
bgImages: this._application.backgroundImages.list,
userImage: this._application.backgroundImages.userImageURL,
showBookmarks: this._application.preferences.get("ftabs.showBookmarks"),
sendStat: this._application.preferences.get("stat.usage.send",false),
isHomePage: Preferences.get("browser.startup.homepage").split("|").indexOf(this._application.protocolSupport.url) !== - 1,
showSearchForm: [0, 2].indexOf(this._application.preferences.get("ftabs.searchStatus")) !== - 1,
selectedBgImage: this._application.backgroundImages.currentSelectedURL,
maxLayoutX: maxLayoutNum,
layouts: possibleLayouts.layouts,
currentLayout: possibleLayouts.current,
maxLayoutY: maxLayoutNum,
licenseURL: productInfo.LicenseURL.fx,
copyright: productInfo.Copyright.fx,
rev: this._application.addonManager.addonVersion,
build: this._application.core.CONFIG.BUILD.REVISION,
buildDate: Math.round((new Date(this._application.core.CONFIG.BUILD.DATE)).getTime() / 1000),
sync: this._application.sync.state});
}
,
getLocalizedString: function Fastdial_getLocalizedString(key) {
var node = this.i18nXMLDoc.querySelector("key[name='" + key + "']");
if (node === null)
{
throw new Error("Unknown i18n key: " + key);
}

return this.expandBrandingURL(node.getAttribute("value"));
}
,
applySettings: function Fastdial_applySettings(layout, showBookmarks, showSearchForm, bgImage) {
var self = this;
var maxNum = this._application.layout.getMaxThumbLayout();
var oldThumbsNum = this._application.layout.getThumbsNum();
var layoutXY = this._application.layout.getThumbsXYOfThumbsNum(layout);
var pickupNeeded = this._application.layout.layoutX !== layoutXY[0] || this._application.layout.layoutY !== layoutXY[1];
var ignoreBookmarks;
if (! this._application.preferences.get("ftabs.showBookmarks") && showBookmarks)
{
ignoreBookmarks = false;
}
 else
{
ignoreBookmarks = true;
}

this._application.preferences.set("ftabs.showBookmarks",showBookmarks);
this._application.backgroundImages.select(bgImage);
this._application.preferences.set("ftabs.searchStatus",showSearchForm ? 0 : 1);
if (pickupNeeded)
{
this._application.layout.layoutX = layoutXY[0];
this._application.layout.layoutY = layoutXY[1];
}

this.requestInit(undefined,ignoreBookmarks);
}
,
requestRecentlyClosedTabs: function Fastdial_requestRecentlyClosedTabs(callback) {
var self = this;
var tasks = [];
this._recentlyClosedTabs.forEach(function (tabData) {
tasks.push(function (callback) {
var output = {
id: NATIVE_RESTORETAB_PREFIX + tabData.index,
title: tabData.tab.title || tabData.tab.url};
if (tabData.tab.image)
{
output.favicon = tabData.tab.image;
callback(null,output);
}
 else
{
self._application.favicons.requestFaviconForURL(tabData.uri,function (faviconData, dominantColor) {
output.favicon = faviconData || "";
callback(null,output);
}
);
}

}
);
}
);
async.parallel(tasks,function (err, results) {
callback(results);
}
);
}
,
restoreTab: function Fastdial_restoreTab(id) {
var isNativeTabRegexp = new RegExp("^" + NATIVE_RESTORETAB_PREFIX);
var isNativeTab = isNativeTabRegexp.test(id);
var aWindow = misc.getTopBrowserWindow();
if (isNativeTab)
id = parseInt(id.replace(isNativeTabRegexp,""),10);
if (isNativeTab)
{
if (id >= SESSION_STORE_SVC.getClosedTabCount(aWindow))
throw new Error("Tab doesn't exist: #" + id);
SESSION_STORE_SVC.undoCloseTab(aWindow,id);
}

this.sendRequest("closedTabsListChanged",{
empty: this._recentlyClosedTabs.length === 0});
}
,
onTabClose: function Fastdial_onTabClose() {
this.sendRequest("closedTabsListChanged",{
empty: this._recentlyClosedTabs.length === 0});
}
,
requestLastVisited: function Fastdial_requestLastVisited(offset, callback) {
var self = this;
async.parallel({
blacklist: function (callback) {
self._application.blacklist.getAll(callback);
}
,
tabs: function Fastdial_requestLastVisited_tabs(callback) {
var urls = [];
misc.getBrowserWindows().forEach(function (chromeWin) {
var tabBrowser = chromeWin.gBrowser;
var tabs = tabBrowser && tabBrowser.tabContainer && Array.slice(tabBrowser.tabContainer.childNodes);
if (! Array.isArray(tabs))
return;
tabs.forEach(function (tab) {
try {
let browser = tabBrowser.getBrowserForTab(tab);
let currentURI = browser.currentURI.spec;
if (/^(chrome|about|yafd|bar):/.test(currentURI))
return;
urls.push({
url: currentURI,
title: browser.contentTitle});
}
catch (e) {

}

}
);
}
);
callback(null,urls);
}
,
pickup: function Fastdial_requestLastVisited_pickup(callback) {
var output = {
pages: [],
domains: {
},
pinned: []};
var maxThumbIndex = self._application.layout.getThumbsNum();
self._application.internalStructure.iterate({
nonempty: true},function (thumbData, i) {
if (i < maxThumbIndex)
{
try {
let host = thumbData.location.asciiHost.replace(/^www\./,"");
output.domains[host] = 1;
}
catch (ex) {

}

}
 else
{
let pushData = {
url: thumbData.source};
if (thumbData.thumb.title)
pushData.title = thumbData.thumb.title;
if (thumbData.pinned)
{
output.pinned.push(pushData);
}
 else
{
output.pages.push(pushData);
}

}

}
);
callback(null,output);
}
,
lastVisited: function Fastdial_requestLastVisited_lastVisited(callback) {
var urls = [];
var query = PlacesUtils.history.getNewQuery();
var options = PlacesUtils.history.getNewQueryOptions();
query.minVisits = 2;
options.maxResults = 100;
options.sortingMode = options.SORT_BY_DATE_DESCENDING;
var result = PlacesUtils.history.executeQuery(query,options);
result.root.containerOpen = true;
for (let i = 0;i < result.root.childCount;i++) {
let node = result.root.getChild(i);
if (! node.title)
continue;
if (! /^(https?|ftp):\/\//.test(node.uri))
continue;
urls.push({
url: node.uri,
title: node.title,
favicon: node.icon});
}

result.root.containerOpen = false;
callback(null,urls);
}
},function (err, results) {
if (err)
throw new Error(err);
const MAX_VISITED_NUM = 24;
var excludeDomains = results.pickup.domains;
var output = [];
var pages = {
};
Array.concat(results.pickup.pinned,results.tabs,results.pickup.pages,results.lastVisited).forEach(function (page) {
pages[page.url] = pages[page.url] || {
};
sysutils.copyProperties(page,pages[page.url]);
}
);
for(let [, page] in Iterator(pages)) {
let pageHost = self.getDecodedUrlHost(page.url);
if (pageHost && (results.blacklist.domains.indexOf(pageHost) !== - 1 || excludeDomains[pageHost]))
continue;
let isDeniedByRegexp = results.blacklist.regexps.some(function (regexpString) {
var regex = new RegExp(regexpString);
return regex.test(page.url);
}
);
if (isDeniedByRegexp)
continue;
if (pageHost)
{
excludeDomains[pageHost] = 1;
}

if (! self._historyThumbs[page.url])
{
self._historyThumbs[page.url] = self._application.internalStructure.convertDbRow(page,false);
self._application.thumbs.getMissingData(self._historyThumbs[page.url],{
historyOnly: true});
}
 else
{
sysutils.copyProperties(page,self._historyThumbs[page.url].thumb);
}

output.push(page.url);
if (output.length >= MAX_VISITED_NUM)
{
break;
}

}

if (offset)
{
output = output.splice(offset,9);
}
 else
{
output.length = Math.min(output.length,9);
}

var outputData = output.map(function (url) {
var cacheData = self._historyThumbs[url];
return self._application.frontendHelper.getDataForThumb(cacheData);
}
);
callback(outputData);
}
);
}
,
thumbOpened: function Fastdial_thumbOpened(outerWindowId, url, index, navigateCode) {
async.nextTick(function Fastdial_thumbOpened_openSpeculativeConnect() {
this.openSpeculativeConnect(url);
}
,this);
if (this._application.barnavig.alwaysSendUsageStat === false)
return;
this._barnavigDataProvider.addURLData(url,{
vtbNum: index + 1});
}
,
openSpeculativeConnect: function Fastdial_openSpeculativeConnect(url) {
if (! ("nsISpeculativeConnect" in Ci))
return;
var uri;
try {
uri = netutils.newURI(url);
}
catch (e) {

}

if (! uri)
return;
Services.io.QueryInterface(Ci.nsISpeculativeConnect).speculativeConnect(uri,null,null);
}
,
onShortcutPressed: function Fastdial_onShortcutPressed(thumbIndex) {
var thumb = this._application.internalStructure.getItem(thumbIndex);
if (thumb && thumb.source)
{
misc.navigateBrowser({
url: thumb.source,
target: "current tab"});
}

}
,
navigateUrlWithReferer: function Fastdial_navigateUrlWithReferer(url, navigateCode) {
var brandingLogoURL = this.brandingXMLDoc.querySelector("logo").getAttribute("url");
brandingLogoURL = this._application.branding.expandBrandTemplates(brandingLogoURL);
var target = {
1: "current tab",
2: "new window",
3: "new tab"}[navigateCode];
misc.navigateBrowser({
url: url,
target: target,
referrer: brandingLogoURL});
}
,
setAsHomePage: function Fastdial_setAsHomePage() {
var currentHomePages = Preferences.get("browser.startup.homepage").split("|");
if (currentHomePages.length > 1)
{
currentHomePages.unshift(this._application.protocolSupport.url);
Preferences.set("browser.startup.homepage",currentHomePages.join("|"));
}
 else
{
Preferences.set("browser.startup.homepage",this._application.protocolSupport.url);
}

}
,
onHiddenTabAction: function Fastdial_onHiddenTabAction(action) {
switch (action) {
case "hide":
this._logTabShowFlag = false;
break;
case "show":
this._application.usageHistory.logAction("show");
this._tabsShownCounter++;
Services.obs.notifyObservers(this,this._application.core.eventTopics.APP_TAB_SHOWN,this._tabsShownCounter);
break;
}

}
,
getDecodedUrlHost: function Fastdial_getDecodedUrlHost(url) {
var decodedURL = this._decodeURL(url);
var uri;
try {
uri = netutils.newURI(decodedURL);
}
catch (ex) {

}

return uri ? uri.asciiHost.replace(/^www\./,"") : null;
}
,
getDecodedLocation: function Fastdial_getDecodedLocation(url) {
var decodedURL = this._decodeURL(url);
var uriObj;
try {
uriObj = netutils.newURI(decodedURL);
try {
uriObj.QueryInterface(Ci.nsIURL);
}
catch (ex) {

}

}
catch (ex) {

}

return {
source: url,
location: uriObj || null};
}
,
get cachedHistoryThumbs() {
return this._historyThumbs;
}
,
get brandingXMLDoc() {
delete this.brandingXMLDoc;
return this.brandingXMLDoc = this._application.branding.brandPackage.getXMLDocument("fastdial/config.xml");
}
,
get brandingClckrDoc() {
delete this.brandingClckrDoc;
return this.brandingClckrDoc = this._application.branding.brandPackage.getXMLDocument("fastdial/clckr.xml");
}
,
get i18nXMLDoc() {
delete this.i18nXMLDoc;
var stream = this._application.addonFS.getStream("$content/fastdial/i18n.xml");
return this.i18nXMLDoc = fileutils.xmlDocFromStream(stream);
}
,
get _sessionStoreFileData() {
var tabsData = [];
var sessionstoreData;
var sessionFile = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD",Ci.nsIFile);
sessionFile.append("sessionstore.js");
if (! sessionFile.exists() || ! sessionFile.isFile() || ! sessionFile.isReadable())
return tabsData;
try {
sessionstoreData = fileutils.jsonFromFile(sessionFile);
}
catch (e) {
this._logger.warn(e.message);
return tabsData;
}

return tabsData;
return tabsData;
}
,
get _recentlyClosedTabs() {
var tabsData = [];
var output = [];
try {
let tabsDataJSON = SESSION_STORE_SVC.getClosedTabData(misc.getTopBrowserWindow());
tabsData = JSON.parse(tabsDataJSON);
}
catch (e) {

}

if (Preferences.get("browser.startup.page",1) !== 3)
tabsData.push(this._sessionStoreFileData);
for (let i = 0;i < tabsData.length;i++) {
if (! tabsData[i].state || ! tabsData[i].state.entries)
continue;
let lastTabEntry = tabsData[i].state.entries.pop();
if (lastTabEntry.url === this._application.protocolSupport.url)
continue;
output.push({
index: i,
uri: netutils.newURI(lastTabEntry.url),
tab: lastTabEntry});
if (output.length === RECENTLY_CLOSED_TABS)
{
break;
}

}

return output;
}
,
_barnavigDataProvider: {
init: function Fastdial_BNDP_init() {
this._dataContainer = new sysutils.DataContainer({
expirationTime: 1 * 60 * 60 * 1000});
return this;
}
,
finalize: function Fastdial_BNDP_finalize() {
this._dataContainer.finalize();
this._dataContainer = null;
return this;
}
,
addURLData: function Fastdial_BNDP_addURLData(aURL, aThumbData) {
if (typeof aURL == "string" && typeof aThumbData == "object")
this._dataContainer.set(aURL,aThumbData);
}
,
onWindowLocationChange: function Fastdial_BNDP_onWindowLocationChange() {

}
,
onPageLoad: function Fastdial_BNDP_onPageLoad(aParams) {
var url = aParams.barNavigParams.oldurl || aParams.url;
var thumbData = url && this._dataContainer.get(url);
if (thumbData)
{
this._dataContainer.remove(url);
aParams.barNavigParams.vtbNum = thumbData.vtbNum;
return this;
}

return false;
}
,
onBarNavigResponse: function Fastdial_BNDP_onBarNavigResponse() {

}
,
_dataContainer: null},
requestTitleForURL: function Fastdial_requestTitleForURL(url, callback) {
var self = this;
var seriesTasks = {
};
var locationObj = this.getDecodedLocation(url);
var titleFound;
if (! locationObj.location)
return callback("URL is not valid: " + url);
seriesTasks.history = function Fastdial_requestTitleForURL_historySeriesTask(callback) {
try {
PlacesUtils.asyncHistory.getPlacesInfo(locationObj.location,{
handleResult: function handleResult(aPlaceInfo) {
titleFound = aPlaceInfo.title;
if (titleFound)
return callback("stop");
callback();
}
,
handleError: function handleError(aResultCode, aPlaceInfo) {
if (aResultCode !== Cr.NS_ERROR_NOT_AVAILABLE)
self._logger.error("Error in asyncHistory.getPlacesInfo (" + JSON.stringify(locationObj.location) + "): " + aResultCode);
callback();
}
});
}
catch (ex) {
titleFound = PlacesUtils.history.getPageTitle(locationObj.location);
if (titleFound)
return callback("stop");
callback();
}

}
;
seriesTasks.request = function Fastdial_requestTitleForURL_requestSeriesTask(callback) {
var isStandardURL = true;
try {
locationObj.location.QueryInterface(Ci.nsIURL);
}
catch (ex) {
isStandardURL = false;
}

if (! isStandardURL || ! locationObj.location.host)
return callback("Not a valid nsIURL: " + url);
if (self._application.isYandexHost(locationObj.location.host))
{
try {
locationObj.location.QueryInterface(Ci.nsIURL);
let parsedQuery = netutils.querystring.parse(locationObj.location.query);
parsedQuery.nugt = "vbff-" + self._application.addonManager.addonVersion;
locationObj.location.query = netutils.querystring.stringify(parsedQuery);
}
catch (ex) {
self._logger.error("URI is not URL: " + url);
}

}

var xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);
xhr.overrideMimeType("text/plain; charset=x-user-defined");
xhr.mozBackgroundRequest = true;
xhr.QueryInterface(Ci.nsIDOMEventTarget);
xhr.open("GET",locationObj.location.spec,true);
var timer = new sysutils.Timer(function () {
xhr.abort();
}
, 25000);
xhr.setRequestHeader("Cache-Control","no-cache");
xhr.addEventListener("load",function () {
timer.cancel();
var responseText = (xhr.responseText || "").replace(/<\/head>[\s\S]*/i,"</head><body/></html>").replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,"");
var title = "";
var domParser = xmlutils.getDOMParser();
var xmlDocument;
try {
xmlDocument = domParser.parseFromString(responseText,"text/html");
}
catch (e) {

}

var charset = xhr.getResponseHeader("Content-Type");
if (xmlDocument && ! (charset && /charset=(.+)$/.test(charset)))
{
charset = xmlDocument.querySelector("meta[http-equiv='Content-Type'][content]");
charset = charset && charset.getAttribute("content");
}

charset = charset && charset.match(/charset=(.+)$/);
charset = charset && charset[1] || "UTF-8";
charset = charset.replace(/[^a-z\d-]/gi,"");
var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
try {
converter.charset = charset;
responseText = converter.ConvertToUnicode(responseText);
xmlDocument = domParser.parseFromString(responseText,"text/html");
}
catch (e) {

}

var titleNode = xmlDocument && xmlDocument.querySelector("head > title");
if (titleNode)
{
title = titleNode.textContent;
}
 else
{
let titleMatches = responseText.match(/<title>(.*?)<\/title>/im);
title = titleMatches ? titleMatches[1] : "";
}

title = title.substr(0,1000) || url;
callback(null,title);
}
,false);
var errorHandler = function (e) {
callback(e.type);
}
;
xhr.addEventListener("error",errorHandler,false);
xhr.addEventListener("abort",errorHandler,false);
xhr.send();
}
;
async.series(seriesTasks,function Fastdial_requestTitleForURL_onSeriesTasksRun(err, results) {
if (titleFound)
return callback(null,titleFound);
if (results && results.request)
return callback(null,results.request);
callback(err);
}
);
}
,
expandBrandingURL: function Fastdial_expandBrandingURL(url) {
return this._application.branding.expandBrandTemplates(url,{
vbID: this._application.core.CONFIG.APP.TYPE});
}
,
_decodeURL: function Fastdial__decodeURL(url) {
var outputURL;
try {
let uri = netutils.newURI(url);
if (uri.host === "clck.yandex.ru")
{
let clickrMatches = uri.path.match(/.+?\*(.+)/);
if (clickrMatches)
{
let regexFromOld = new RegExp("\\?from=vb-fx$");
let regexFromNew = new RegExp("\\?from=" + this._application.core.CONFIG.APP.TYPE + "$");
clickrMatches[1] = clickrMatches[1].replace(/[?&]clid=[^&]+/,"").replace(regexFromOld,"").replace(regexFromNew,"");
outputURL = clickrMatches[1];
}
 else
{
let clckrItem = this.brandingClckrDoc.querySelector("item[url='" + url + "']");
outputURL = clckrItem ? "http://" + clckrItem.getAttribute("domain") : url;
}

}
 else
{
outputURL = url;
}

}
catch (ex) {
outputURL = url;
}

return outputURL;
}
,
_application: null,
_logger: null,
_applyingThumbsSettings: false,
_applyThumbsSettingsQueue: [],
_registeredListeners: {
},
_historyThumbs: {
},
_pickupGUID: null,
_clearHistoryThumbsTimer: null,
_outerWindowIdList: {
},
_logTabShowFlag: true,
_tabsShownCounter: 0};
