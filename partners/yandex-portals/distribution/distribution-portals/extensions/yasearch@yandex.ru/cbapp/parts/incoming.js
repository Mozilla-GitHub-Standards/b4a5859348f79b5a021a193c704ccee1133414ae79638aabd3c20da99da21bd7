"use strict";
const EXPORTED_SYMBOLS = ["incomingCompMgr"];
const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;
const GLOBAL = this;
const incomingCompMgr = {
init: function incomingCompMgr_init(application) {
this._application = application;
application.core.Lib.sysutils.copyProperties(application.core.Lib,GLOBAL,{
sysutils: 1,
fileutils: 1,
strutils: 1,
Preferences: 1});
this._logger = this._application.getLogger("IncomingComponentsManager");
try {
this._checkIncoming();
}
catch (e) {
this._logger.error("Failed checking for incomming components. " + strutils.formatError(e));
this._logger.debug(e.stack);
}

}
,
activateIncoming: function incomingCompMgr_activateIncoming(firstWndController) {
fileutils.removeFileSafe(this._incomingEntriesFile);
var newComponentEntries = this._newComponentEntries;
if (! newComponentEntries || ! newComponentEntries.length)
return;
var spring = firstWndController.getToolbarSpring();
var widgetLibrary = this._application.widgetLibrary;
for(let [, compEntry] in Iterator(newComponentEntries)) {
try {
let entryIsActive = compEntry.enabled == compEntry.ENABLED_YES;
switch (compEntry.componentType) {
case compEntry.TYPE_WIDGET:
if (entryIsActive && ! firstWndController.getWidgetItems(compEntry.componentID).length)
{
let [widget] = firstWndController.placeWidget(compEntry.componentID,spring);
if (compEntry.settings)
widget.applySettings(compEntry.settings,true);
}

break;
case compEntry.TYPE_PLUGIN:
let plugin = widgetLibrary.getPlugin(compEntry.componentID);
plugin.applySettings(compEntry.settings,true);
plugin.enabled = entryIsActive;
break;
}

}
catch (e) {
this._logger.warn("Could not activate new component. " + strutils.formatError(e));
}

}

}
,
_comparator: Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Ci.nsIVersionComparator),
_consts: {
PREF_DEFAULT_PRESET_URL: ".default.preset.url",
DEF_PRESET_FILE_NAME: "default.xml"},
_checkIncoming: function incomingCompMgr__checkIncoming() {
this._newComponentEntries = [];
var incomingEntriesFile = this._incomingEntriesFile;
if (incomingEntriesFile.exists())
{
try {
let storedEntries = JSON.parse(fileutils.readTextFile(incomingEntriesFile));
if (Array.isArray(storedEntries))
{
let ComponentEntry = this._application.BarPlatform.Preset.ComponentEntry;
this._newComponentEntries = storedEntries.map(function (fake) new ComponentEntry(fake));
}

}
catch (e) {
this._logger.warn("Invalid file " + incomingEntriesFile.leafName + ". " + strutils.formatError(e));
}

fileutils.removeFileSafe(incomingEntriesFile);
}

var incomingCompsDir = this._application.directories.appRootDir;
incomingCompsDir.append("incoming");
if (! incomingCompsDir.exists())
return;
var incomingDirEntries = incomingCompsDir.directoryEntries;
var widgetLibrary = this._application.widgetLibrary;
var firstPresetFile = null;
var firstPresetUrl;
while (incomingDirEntries.hasMoreElements()) {
let incomingDir = incomingDirEntries.getNext().QueryInterface(Ci.nsIFile);
if (! incomingDir.isDirectory())
continue;
try {
let [presetFile, presetUrl] = this._processDirectory(incomingDir);
if (! presetFile)
continue;
this._installPreset(presetFile,presetUrl);
if (! firstPresetFile || firstPresetFile.lastModifiedTime > presetFile.lastModifiedTime)
{
firstPresetFile = presetFile;
firstPresetUrl = presetUrl;
}

}
catch (e) {
this._logger.error("Could not install components from incomming directory. " + strutils.formatError(e));
}

}

var weHaveNewWidgets = false;
var weHaveNewPlugins = false;
for (let i = 0, length = this._newComponentEntries.length;i < length;i++) {
let entry = this._newComponentEntries[i];
let compID = entry.componentID;
if (widgetLibrary.isKnownComponent(compID))
continue;
switch (entry.componentType) {
case entry.TYPE_WIDGET:
widgetLibrary.registerWidgets(compID,true,true);
weHaveNewWidgets = true;
break;
case entry.TYPE_PLUGIN:
widgetLibrary.registerPlugins(compID,true,true);
weHaveNewPlugins = true;
break;
default:
continue;
}

}

try {
widgetLibrary.persist(weHaveNewWidgets,weHaveNewPlugins);
}
catch (e) {
this._logger.error("Could not persist widget library. " + strutils.formatError(e));
}

if (firstPresetFile)
this._trySetAsDefaultPreset(firstPresetUrl);
if (this._newComponentEntries.length)
{
let jsonableEntries = this._newComponentEntries.map(function (entry) entry.toSimpleObject());
fileutils.writeTextFile(this._incomingEntriesFile,JSON.stringify(jsonableEntries));
}

fileutils.removeFileSafe(incomingCompsDir);
}
,
get _incomingEntriesFile() {
var incomingEntriesFile = this._application.directories.appRootDir;
incomingEntriesFile.append("incoming_comps.json");
return incomingEntriesFile;
}
,
_processDirectory: function incomingCompMgr__processDirectory(directory) {
var presetFile = directory.clone();
presetFile.append(this._consts.DEF_PRESET_FILE_NAME);
if (! presetFile.exists())
{
this._logger.debug("Preinstalled default preset file not found. (Folder: " + directory.path + ")");
return;
}

var preset_manifest = new this._application.BarPlatform.PresetWithManifest(presetFile);
var packagesInfo = this._filterPackagesInfo(preset_manifest.packagesInfo);
var packageManager = this._application.packageManager;
for (let i = 0, length = packagesInfo.length;i < length;i++) {
let packageInfo = packagesInfo[i];
let id = packageInfo.id;
let install = true;
if (packageManager.isPackageInstalled(id))
{
let installedPackageInfo = packageManager.getPackageInfo(id);
if (this._comparator.compare(installedPackageInfo.version,packageInfo.version) >= 0)
install = false;
}

if (install)
{
try {
let sourceFile = directory.clone();
sourceFile.append(packageInfo.file);
packageManager.installPackage(sourceFile,packageInfo);
}
catch (e) {
this._logger.error("Failed installing package '" + id + "'.\n" + strutils.formatError(e));
this._logger.debug(e.stack);
}

}

}

var widgetLibrary = this._application.widgetLibrary;
var entries = preset_manifest.allEntries;
var newComponentIds = [];
for (let i = 0, length = entries.length;i < length;i++) {
let entry = entries[i];
if (! widgetLibrary.isKnownComponent(entry.componentID))
this._newComponentEntries.push(entry);
}

return [presetFile, preset_manifest.url];
}
,
_installPreset: function incomingCompMgr__installPreset(presetFile, presetUrl) {
var destFileName = encodeURIComponent(presetUrl);
var previousPresetFile = this._application.directories.presetsDir;
previousPresetFile.append(destFileName);
if (previousPresetFile.exists())
fileutils.removeFileSafe(previousPresetFile);
try {
presetFile.copyTo(this._application.directories.presetsDir,destFileName);
}
catch (e) {
this._logger.error("Failed installing preset.\n" + strutils.formatError(e));
}

}
,
_trySetAsDefaultPreset: function incomingCompMgr__trySetAsDefaultPreset(presetUrl) {
var defaultPresetUrlPrefPath = this._application.name + this._consts.PREF_DEFAULT_PRESET_URL;
var instPresetURL = Preferences.get(defaultPresetUrlPrefPath);
if (! instPresetURL)
Preferences.set(defaultPresetUrlPrefPath,presetUrl);
}
,
_filterPackagesInfo: function incomingCompMgr__filterPackagesInfo(packagesInfo) {
var platformInfo = sysutils.platformInfo;
var filteredPackagesInfo = [];
var ids = Object.create(null);
const apiVersion = this._application.core.CONFIG.PLATFORM.VERSION;
for (let i = 0, length = packagesInfo.length;i < length;i++) {
let packageInfo = packagesInfo[i];
if (packageInfo.platformMin && apiVersion < packageInfo.platformMin || packageInfo.browser && packageInfo.browser != platformInfo.browser.name || packageInfo.os && packageInfo.os != platformInfo.os.name || packageInfo.architecture && packageInfo.architecture != platformInfo.browser.architecture)
continue;
if (packageInfo.id in ids)
continue;
ids[packageInfo.id] = 1;
filteredPackagesInfo.push(packageInfo);
}

return filteredPackagesInfo;
}
};
