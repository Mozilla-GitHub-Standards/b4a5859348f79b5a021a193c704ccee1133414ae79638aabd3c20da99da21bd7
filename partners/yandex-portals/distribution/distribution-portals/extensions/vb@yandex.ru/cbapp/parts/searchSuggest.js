"use strict";
const EXPORTED_SYMBOLS = ["searchSuggest"];
const GLOBAL = this;
const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/PlacesUtils.jsm");
if ("nsIPrivateBrowsingChannel" in Ci)
XPCOMUtils.defineLazyModuleGetter(this,"PrivateBrowsingUtils","resource://gre/modules/PrivateBrowsingUtils.jsm"); else
this.PrivateBrowsingUtils = null;
const searchSuggest = {
SUGGEST_TIMEOUT: 5000,
init: function searchSuggest_init(application) {
this._application = application;
this._logger = application.getLogger("searchSuggest");
application.core.Lib.sysutils.copyProperties(application.core.Lib,GLOBAL);
}
,
finalize: function searchSuggest_finalize() {
this._application = null;
this._logger = null;
}
,
searchWeb: function searchSuggest_searchWeb(queryString, callback) {
var request = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);
request.mozBackgroundRequest = true;
request.open("GET",this._makeURLForQuery(queryString),true);
request.setRequestHeader("Cache-Control","no-cache");
var listenerCallback = function listenerCallback(data) callback(data || [queryString, []]);
var timer = new this._application.core.Lib.sysutils.Timer(function abortOnTimeout() request.abort(), this.SUGGEST_TIMEOUT);
var listener = new searchRequestListener(request, timer, listenerCallback);
if (PrivateBrowsingUtils && request.channel instanceof Ci.nsIPrivateBrowsingChannel)
{
let topBrowserWindow = Services.wm.getMostRecentWindow("navigator:browser");
if (topBrowserWindow)
request.channel.setPrivate(PrivateBrowsingUtils.isWindowPrivate(topBrowserWindow));
}

request.send(null);
}
,
searchLocalHistory: function searchSuggest_searchLocalHistory(searchQuery, callback) {
var query = PlacesUtils.history.getNewQuery();
query.searchTerms = searchQuery;
var options = PlacesUtils.history.getNewQueryOptions();
options.resultType = options.RESULT_TYPE_URI;
options.queryType = Ci.nsINavHistoryQueryOptions.QUERY_TYPE_HISTORY;
options.sortingMode = options.SORT_BY_DATE_DESCENDING;
var result = PlacesUtils.history.executeQuery(query,options);
result.root.containerOpen = true;
var output = [];
var i = 0;
while (i < result.root.childCount && output.length < 10) {
let node = result.root.getChild(i);
if (/^(https?|ftp):\/\//.test(node.uri))
{
output.push([node.uri, node.title || node.uri]);
}

i += 1;
}

result.root.containerOpen = false;
callback(searchQuery,output);
}
,
useExample: function searchSuggest_useExample(query) {
var gURLBar = misc.getTopBrowserWindow().gURLBar;
var currentPos = 0;
var self = this;
if (this._useExampleTimer)
this._useExampleTimer.cancel();
gURLBar.focus();
gURLBar.inputField.value = "";
this._useExampleTimer = new sysutils.Timer(function () {
gURLBar.inputField.value += query.substr(currentPos,1);
currentPos += 1;
if (currentPos === query.length)
{
try {
gURLBar.mController.startSearch(gURLBar.inputField.value);
}
catch (e) {
self._logger.error(e.message);
}

}

}
, 25, true, query.length);
}
,
suppressTutorial: function searchSuggest_suppressTutorial() {
this._application.preferences.set("ftabs.searchStatus",3);
this._application.fastdial.requestInit();
}
,
get isFormVisible() {
return [0, 2].indexOf(this._application.preferences.get("ftabs.searchStatus")) !== - 1;
}
,
_makeURLForQuery: function searchSuggest__makeURLForQuery(queryString) {
return this._application.branding.expandBrandTemplatesEscape(this._brandingSuggestURL,{
"searchTerms": queryString});
}
,
get _brandingSuggestURL() {
delete this._brandingSuggestURL;
return this._brandingSuggestURL = this._application.fastdial.brandingXMLDoc.querySelector("search").getAttribute("suggest");
}
,
_application: null,
_logger: null,
_useExampleTimer: null};
function searchRequestListener(request, timer, callback) {
this._request = request;
this._callback = callback;
this._timer = timer;
request.QueryInterface(Ci.nsIDOMEventTarget);
this._addEventListeners();
}

searchRequestListener.prototype = {
_finalize: function searchRequestListener__finalize() {
this._request = null;
this._callback = null;
this._timer = null;
}
,
_addEventListeners: function searchRequestListener__addEventListeners() {
this._request.addEventListener("error",this,false);
this._request.addEventListener("abort",this,false);
this._request.addEventListener("load",this,false);
}
,
_removeEventListeners: function searchRequestListener__removeEventListeners() {
this._request.removeEventListener("error",this,false);
this._request.removeEventListener("abort",this,false);
this._request.removeEventListener("load",this,false);
}
,
handleEvent: function searchRequestListener_handleEvent(event) {
this._removeEventListeners();
this._timer.cancel();
var data;
switch (event.type) {
case "load":
{
let text = this._request.responseText;
if (/^suggest\.apply\(/.test(text))
{
let stringForEval = "output = []; " + "suggest = {apply: function() output = Array.slice(arguments, 0, 2)}; " + text + "; output;";
let sandbox = new Cu.Sandbox("about:blank");
data = Cu.evalInSandbox(stringForEval,sandbox);
}
 else
{
try {
data = JSON.parse(text);
}
catch (e) {

}

}

if (data && Array.isArray(data[1]))
{
data[1].forEach(function (el) {
if (Array.isArray(el) && el[0] === "nav" && el[3])
el[3] = el[3].replace(/&amp;/g,"&");
}
);
}

break;
}

case "error":

case "abort":
break;
}

this._callback(data);
this._finalize();
}
};
