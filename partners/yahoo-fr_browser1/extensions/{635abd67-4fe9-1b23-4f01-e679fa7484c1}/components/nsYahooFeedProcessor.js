
var CI=Components.interfaces;var CC=Components.classes;var loader=CC["@mozilla.org/moz/jssubscript-loader;1"].getService(CI.mozIJSSubScriptLoader);loader.loadSubScript("chrome://ytoolbar/content/utils.js");loader.loadSubScript("chrome://ytoolbar/content/logger.js");function WrapperClass(object){this.wrappedJSObject=this;this.object=object;}
WrapperClass.prototype={QueryInterface:function(iid){if(!iid.equals(Components.interfaces.nsISupports)){throw Components.results.NS_ERROR_NO_INTERFACE;}
return this;}};function yFeedProcessor(){var _self=this;var layout="";var toolbarmanager=null;var localstorage=CC["@yahoo.com/localstorage;1"].getService(CI.nsIYahooLocalStorage);var mFileIO=CC["@yahoo.com/fileio;1"].getService(CI.nsIYahooFileIO2);var mConfigMgr=CC["@yahoo.com/configmanager;1"].getService(CI.nsIYahooConfigManager);var notifier=CC["@mozilla.org/observer-service;1"].getService(CI.nsIObserverService);var feedFetcher=CC["@yahoo.com/feed/fetcher;1"].getService(CI.nsIYahooFeedFetcher);var feedNodeCollection=CC["@mozilla.org/array;1"].createInstance(CI.nsIMutableArray);var userSecFeedNodeCollection=CC["@mozilla.org/array;1"].createInstance(CI.nsIMutableArray);var fpInit=false;var processedCache=false;var charsets=[];charsets[1]='iso-8859-1';charsets[128]='shift_jis';charsets[129]='euc-kr';charsets[130]='johab';charsets[134]='gb2312';charsets[136]='Big5';charsets[161]='windows-1253';charsets[162]='windows-1254';charsets[163]='windows-1258';charsets[177]='windows-1255';charsets[178]='windows-1256';charsets[186]='windows-1257';charsets[204]='windows-1251';charsets[222]='windows-874';charsets[238]='windows-1250';var uniconvert=CC["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(CI.nsIScriptableUnicodeConverter);uniconvert.charset='utf-8';var stylesMapping={"std":{1:"OUTLINE",2:"ROUNDEDGE",4:"HIGHLIGHT",8:"RAISED",16:"STATIC",32:"TOGGLE",64:"MODIFIABLE",128:"LOCAL",256:"NOMENUHIDE",512:"NOTEXT",1024:"NOMORE",2048:"REMOVEONCLICK",4096:"TOGGLEOFF",8192:"MINIMIZABLE",16384:"REDIRECT",32768:"MENUITEM",65536:"NOUSECACHE",131072:"NOTOOLTIP",262144:"ALWAYSPRESSED",524288:"ANIMATED",1048576:"ALWAYSHIDE",2097152:"BROWSERIMAGE",1073741824:"HIGHLIGHTICON"},"ext":{1:"EX_ALIGNCENTER",2:"EX_ALIGNRIGHT",4:"EX_MODUSERES",8:"EX_MODUSERPAR",16:"EX_TBLINEFEED",32:"EX_TBNOCLOSE",64:"EX_TBNOGETMOD",128:"EX_TBPASSEDIT",256:"EX_TBFORCEGETMOD",4096:"HASSTATE",8192:"EX_ENABLEDBY",65536:"EX_ENABLEDBY",131072:"EX_NEWWINDOWTAB"}};this.raw="";this.loaded=false;this.domBuilder=null;this.localButtonProcessor=null;this.bookmarkManager=null;this.ybButtons=null;this.init=function(tbManager){if(!fpInit){toolbarmanager=tbManager;_self.domBuilder=CC["@yahoo.com/dombuilder;1"].getService(CI.nsIYahooDomBuilder);_self.localButtonProcessor=CC["@yahoo.com/feed/localbutton;1"].getService(CI.nsIYahooLocalButtonProcessor);_self.localButtonProcessor.init(toolbarmanager);_self.bookmarkManager=CC["@yahoo.com/bookmarkmanager;1"].getService(CI.nsIYahooBookmarkManager);_self.bookmarkManager.init(_self.domBuilder);fpInit=true;}};this.clear=function(){toolbarmanager.EventTipManager.clear();_self.domBuilder.bm2Feed=null;_self.bookmarkManager.clear();_self.domBuilder.clear();_self.loaded=false;processedCache=false;layout="";feedNodeCollection.clear();userSecFeedNodeCollection.clear();};clearPartial=function(){_self.domBuilder.bm2Feed=null;_self.bookmarkManager.clear();_self.domBuilder.clear();_self.loaded=false;}
this.saveToUDB=function(){yahooUtils.setTimeout(function(){feedFetcher.pushLayoutToServer(1,layout,toolbarmanager.isGuestMode());},5);};this.saveAndReload=function(){yahooUtils.setTimeout(function(){if(toolbarmanager.isGuestMode()||_self.localButtonProcessor.getUserOpt_SaveLocal()){saveLayoutToPref(layout);}
feedFetcher.pushLayoutToServer(1,layout,toolbarmanager.isGuestMode());_self.processServerFeed();},5);};procResponse=function(raw){_self.raw=raw;if(_self.raw!==""){_self.clear();processJSONBHFeed();if(!toolbarmanager.isGuestMode()){_self.domBuilder.bm2Feed="http://us.bookmarks.yahoo.com/bm2_toolbar.php?appid=toolbar&needpref=1&v=1&cmd=retrieval&size=300000&gfu=1&lang=US";_self.bookmarkManager.processBookmarks(false);}}else{throw"Error processing server feed";}};this.processServerFeed=function(){yahooUtils.setTimeout(function(){try{_self.loaded=false;if(yahooUtils.mFFVersion<=2)
feedFetcher.asyncLoadServerFeed(toolbarmanager.isGuestMode(),new WrapperClass(procResponse));else
procResponse(feedFetcher.loadServerFeed(toolbarmanager.isGuestMode()));}
catch(e){yahooError(e);}},5);};this.processCachedFeed=function(localCacheFile){yahooUtils.setTimeout(function(){try{_self.raw=feedFetcher.loadCachedFeed(localCacheFile);if(_self.raw!==""){_self.clear();processJSONBHFeed();if(!toolbarmanager.isGuestMode()){_self.domBuilder.bm2Feed="http://us.bookmarks.yahoo.com/bm2_toolbar.php?appid=toolbar&needpref=1&v=1&cmd=retrieval&size=300000&gfu=1&lang=US";_self.bookmarkManager.processBookmarks(false);}}else{throw"Error processing cached feed";}}
catch(e){yahooError(e);}},5);};this.setLayout=function(newLayout,groupID){if(_self.loaded){yahooUtils.setTimeout(function(){clearPartial();var addToMyNode=null;var oldLayout=layout.split(",");layout=newLayout;newLayout=newLayout.split(",");feedFetcher.pushLayoutToServer(1,layout,toolbarmanager.isGuestMode());if(toolbarmanager.isGuestMode()||_self.localButtonProcessor.getUserOpt_SaveLocal()){saveLayoutToPref(layout);}
mConfigMgr.setBoolValue('buttons.close-yahoo-toolbar-grp_fav',false,true);mConfigMgr.setBoolValue('buttons.close-yahoo-toolbar-grp_cna',false,true);if((newLayout.length>oldLayout.length)||(newLayout[0]==="")){_self.processServerFeed();return;}
for(var i=0;i<userSecFeedNodeCollection.length;i++){var node=userSecFeedNodeCollection.queryElementAt(i,CI.nsIYahooFeedNode);if(node.id&&node.id.substr(14).length===3&&node.id.indexOf("rss")===14){addToMyNode=node;userSecFeedNodeCollection.removeElementAt(i);}}
var len=userSecFeedNodeCollection.length;if(newLayout.length===oldLayout.length){for(var i=0;i<len;i++){var cur_node=userSecFeedNodeCollection.queryElementAt(i,CI.nsIYahooFeedNode);if(cur_node.id&&cur_node.id.substr(14)!=newLayout[i]){for(var j=i;j<len;j++){var node=userSecFeedNodeCollection.queryElementAt(j,CI.nsIYahooFeedNode);if(node.id&&node.id.substr(14)==newLayout[i]){userSecFeedNodeCollection.removeElementAt(j);userSecFeedNodeCollection.insertElementAt(node,i,false);break;}}}}}
if(newLayout.length<oldLayout.length){newLayout.push(" ");for(var i=0;i<len;i++){var cur_node=userSecFeedNodeCollection.queryElementAt(i,CI.nsIYahooFeedNode);if(cur_node.id&&newLayout[i]!==cur_node.id.substr(14)){userSecFeedNodeCollection.removeElementAt(i);break;}}
newLayout.pop();}
if(addToMyNode){len=userSecFeedNodeCollection.length;for(var i=0;i<len;i++){var cur_node=userSecFeedNodeCollection.queryElementAt(i,CI.nsIYahooFeedNode);if(cur_node.id&&cur_node.id.substr(14)=="my"){userSecFeedNodeCollection.insertElementAt(addToMyNode,i,false);break;}}}
_self.domBuilder.clear();for(var i=0;i<feedNodeCollection.length;i++){buildDOM(feedNodeCollection.queryElementAt(i,CI.nsIYahooFeedNode),null);}
for(var i=0;i<userSecFeedNodeCollection.length;i++){buildDOM(userSecFeedNodeCollection.queryElementAt(i,CI.nsIYahooFeedNode),null);}
if(!_self.loaded){_self.loaded=true;notifier.notifyObservers(_self,"yahoo-feed-updated",null);notifier.notifyObservers(_self,"yahoo-feed-alerts-updated",null);if(!toolbarmanager.isGuestMode()){_self.domBuilder.bm2Feed="http://us.bookmarks.yahoo.com/bm2_toolbar.php?appid=toolbar&needpref=1&v=1&cmd=retrieval&size=300000&gfu=1&lang=US";_self.bookmarkManager.processBookmarks(false);}}},1);}};this.getLayout=function(groupID){var retLayout=layout;if(retLayout[retLayout.length-1]==','){retLayout=retLayout.substr(0,retLayout.length-1);}
yahooDebug("getLayout -> "+retLayout);return retLayout;};saveLayoutToPref=function(layout){layout=yahooUtils.stripTrailingComma(layout);if(mConfigMgr.getCharValue('toolbar.layout'))
{mConfigMgr.setCharValue('previous.layout',mConfigMgr.getCharValue('toolbar.layout'),true);}
mConfigMgr.setCharValue('toolbar.layout',layout,true);};preserveCache=function(cacheblob){try{var file=mFileIO.getUserCacheDir();file.appendRelativePath("cachesection");mFileIO.writeFile(file,cacheblob);}catch(e){yahooError("Error in preserveCache"+e);}};processLocalYBCache=function(){try{var cacheblobfile=mFileIO.getUserCacheDir();cacheblobfile.appendRelativePath("ybcache");if(cacheblobfile.exists()){var fileContent=mFileIO.readFile(cacheblobfile);fileContent=fileContent.replace(/\\\"/g,"\"");this.ybButtons=yahooUtils.JSON.parse("{\"yb\":{"+fileContent+"}}");}}catch(e){yahooError("Error in processLocalYBCache"+e);}};retrieveLocalCache=function(){try{yahooDebug("Retrieving Local cache feed component");var cacheblobfile=mFileIO.getUserCacheDir();cacheblobfile.appendRelativePath("cachesection");if(cacheblobfile.exists()){var fileContent=mFileIO.readFile(cacheblobfile);processCache(fileContent,false);}else{yahooDebug("Cache file does not exist");}}catch(e){yahooError("Error in retrieveLocalCache"+e);}};processCaches=function(cacheblob){try{cacheblob=yahooUtils.prepareJsonForEval(cacheblob);var len=cacheblob.indexOf('{p:');if(len==-1){len=cacheblob.length;}
if(len!=0){var ybCache=cacheblob.substr(0,len);ybCache=ybCache.substr(5,ybCache.length-8);ybCache=ybCache.replace(/\"/g,"\\\"");var file=mFileIO.getUserCacheDir();file.appendRelativePath("ybcache");mFileIO.writeFile(file,ybCache);}
cacheblob=cacheblob.replace(/{p:/g,"{\"p\":");cacheblob=cacheblob.replace(/{yb:/g,"{\"yb\":");var caches=yahooUtils.JSON.parse('['+cacheblob+']');for(var i=0;i<caches.length;i++){if(caches[i].yb)processYBcache(caches[i].yb);if(caches[i].p)processCache(caches[i].p,true);}}catch(e){yahooError("Error in processCaches"+e);}};processYBcache=function(cacheblob){try{this.ybButtons=cacheblob;}catch(e){yahooError("Error in processYBcache"+e);}};processCache=function(cacheblob,preserve){try{if(preserve){preserveCache(cacheblob);}
processedCache=true;var ucb=unescape(cacheblob);var pos=0;while(pos<ucb.length){var ch;var param="";var params=[];var first=_self.raw.charAt(pos++);while(pos<ucb.length){ch=ucb[pos++];if(first=='\x16'){if(params.length===0){params[0]="";}else if(params.length==2){params[2]='\x16';params[3]="";}else if(params.length==10){params[10]="";}}
if(ch=='\x19'||ch=='\x15'){params[params.length]=param;param="";break;}
else if(ch=='\x18'){params[params.length]=param;param="";}
else{param+=ch;}}
if(params.length>=1){if(params[0]=="yso_grp_fav"){var file=mFileIO.getUserCacheDir();file.appendRelativePath("app.html");mFileIO.writeFile(file,params[1]);}}}}catch(e){yahooError("Error in ProcessCache"+e);}};processJSONBHFeed=function(){_self.raw=_self.raw.replace(/\\t/g,"\\\\t");try{var ding=yahooUtils.JSON.parse(_self.raw);yahooDebug("Eval Success - Correct JSON Feed");if(ding.v!==undefined){processValuesSection(ding.v);}
if(ding.s!==undefined){processSensitiveSection(ding.s);}
if(ding.p!==undefined){processParamsSection(ding.p);}
if(ding.y!==undefined){processYahooSection(ding.y);}
if(ding.u!==undefined){processUserSection(ding.u);}
if(processedCache===false){retrieveLocalCache();}
for(var i=0;i<feedNodeCollection.length;i++){buildDOM(feedNodeCollection.queryElementAt(i,CI.nsIYahooFeedNode),null);}
for(var i=0;i<userSecFeedNodeCollection.length;i++){buildDOM(userSecFeedNodeCollection.queryElementAt(i,CI.nsIYahooFeedNode),null);}
var prefSrvc=CC["@mozilla.org/preferences-service;1"].getService(CI.nsIPrefBranch);if(toolbarmanager.isGuestMode()&&!prefSrvc.prefHasUserValue('yahoo.ytff.toolbar.layout')){saveLayoutToPref(layout);}
if(localstorage.getString("lay")&&_self.localButtonProcessor.getUserOpt_SaveLocal()){saveLayoutToPref(unescape(localstorage.getString("lay")));}
if(localstorage.getString("port")!=null)
{mConfigMgr.setCharValue('layout.portable',localstorage.getString("port"),true);}
if(!_self.loaded){_self.loaded=true;notifier.notifyObservers(_self,"yahoo-feed-updated",null);notifier.notifyObservers(_self,"yahoo-feed-alerts-updated",null);}}catch(e){yahooError("Error in ProcessJSONBHFeed"+e);}};buildDOM=function(feedNode,parentDOMNode){feedNode.domToolbar=_self.domBuilder.addNode(feedNode,parentDOMNode?parentDOMNode:null);for(var j=0;j<feedNode.childSize;j++){var childNode=feedNode.getChild(j);buildDOM(childNode,feedNode.domToolbar);}};processValuesSection=function(section){try{for(var i=0;i<section.length;i++){var processedNode=processToolbarElement(null,section[i]);if(processedNode)feedNodeCollection.appendElement(processedNode,false);}}catch(e){yahooError("Error processing VSec - \n"+e);}};processSensitiveSection=function(section){try{for(var i=0;i<section.length;i++){var processedNode=processToolbarElement(null,section[i]);if(processedNode)feedNodeCollection.appendElement(processedNode,false);}}catch(e){yahooError("Error processing SSec - \n"+e);}};processParamsSection=function(section){try{for(var i=0;i<section.length;i++){var processedNode=processToolbarElement(null,section[i]);if(processedNode)feedNodeCollection.appendElement(processedNode,false);}}catch(e){yahooError("Error processing PSec - \n"+e);}};processYahooSection=function(section){try{processLocalYBCache();for(var i=0;i<section.length;i++){var processedNode=processToolbarElement(null,section[i]);if(processedNode)feedNodeCollection.appendElement(processedNode,false);}}catch(e){yahooError("Error processing YSec - \n"+e);}};processUserSection=function(section){try{var processYOB=true;var actualLayout=[];for(var i=0;i<section.length;i++){var processedNode=processToolbarElement(null,section[i]);if(processedNode){if(_self.localButtonProcessor.isLocal(processedNode.id)){if(localstorage.getString("yapkill")=="1"){processedNode.type=processedNode.BUTTON_TYPE;}
processYOB=false;}
if(processedNode.id){var id=processedNode.id.substr(14);if(!(id.length===3&&id.indexOf("rss")===0))
actualLayout.push(id);}
userSecFeedNodeCollection.appendElement(processedNode,false);}}
layout=yahooUtils.stripTrailingComma(layout);if(processYOB&&(toolbarmanager.isGuestMode()||_self.localButtonProcessor.getUserOpt_SaveLocal())){var currentLayout=layout.split(',');for(var j=0;j<currentLayout.length;j++){if(_self.localButtonProcessor.isLocal(currentLayout[j])){var pos=j;var insertPos=j;if(pos>=actualLayout.length){pos=actualLayout.length;insertPos=userSecFeedNodeCollection.length;}
var localBtnNode=createNodeForLocalButton(currentLayout[j]);userSecFeedNodeCollection.insertElementAt(localBtnNode,insertPos,false);actualLayout.splice(pos,0,localBtnNode.id.substr(14));}}}
if(localstorage.getString("port")!="-1"){layout=actualLayout.join(",");}}catch(e){yahooError("Error processing USec - \n"+e);}};createNodeForLocalButton=function(buttonID){var buttonJSON=yahooUtils.JSON.parse(_self.localButtonProcessor.getLocalButtonJSON(buttonID));var node=CC["@yahoo.com/feed/node;1"].createInstance(CI.nsIYahooFeedNode);if(buttonJSON.ysoid&&localstorage.getString("yapkill")!="1"){node.type=node.BUTTONSLIDEOUT_TYPE;node.hash='{"id":"'+buttonID+'", "grp":"grp_fav", "ysoid":"'+buttonJSON.ysoid+'"}';}else{node.type=node.BUTTON_TYPE;node.hash='{"id":"'+buttonID+'", "grp":"grp_fav"}';}
node.childSize=0;node.icon=buttonJSON.icon;node.name=buttonJSON.title;node.id="yahoo-toolbar-"+buttonID;node.value="";node.func="";node.funcNum=4;node.funcTracking="";node.funcUrl=buttonJSON.url;node.styles="";node.parentNode=null;return node;};preProcessElement=function(pos){var elem=[];if(pos.e){elem=pos.e;}
if(pos.i){if(layout!==''){layout+=',';}
layout+=pos.i;}
if(pos.m){elem[0]="";for(var i=0;i<pos.m.length;i++){elem[elem.length]=pos.m[i];if(elem.length==2){elem[elem.length]='\x16';elem[elem.length]="";}
if(elem.length==10){elem[elem.length]="";}}}
return elem;};preProcessName=function(name){var retVal=name;if(retVal.indexOf("AE_")>=0)retVal="AE_";if(retVal.indexOf("ep[")>=0)retVal="ep[";return retVal;};processHash=function(node,raw_hash,pos){var isSlideout=false;try{if(raw_hash){var hash=raw_hash;if(hash.icov||hash.iconemp||hash.iconbh){var temp_icon=hash.iconemp?hash.iconemp:(hash.iconbh?hash.iconbh:hash.icov);node.icon=temp_icon;setIconUrl(node,hash);}
if(hash.is){node.icon=hash.is+"/"+node.icon;setIconUrl(node,hash);}
if(hash.id){if(hash.id.length>5&&(hash.id).substr(0,5)=="%40lb")
hash.id=unescape(hash.id);hash.id=hash.id.replace(/%40lb/g,"@lb");node.id=hash.id.replace(/g_/g,"_");}
if(hash.ysoid){hash.ysoid=hash.ysoid.replace(/%40ya/g,"@ya");}
node.hash=yahooUtils.JSON.stringify(hash);localstorage.putObject(node.id,new WrapperClass(pos));var eval_hash=yahooUtils.JSON.parse(node.hash);if(eval_hash.ysoid){node.type=node.BUTTONSLIDEOUT_TYPE;isSlideout=true;}}}catch(e){yahooError(e);}finally{return isSlideout;}};processFunctionDefition=function(node){if(node.func){node.func=node.func.replace(/,/g,"%2C");node.func=node.func.replace(/%25/g,"");var func=node.func.split('\x01');node.func=func.join(",");if(func.length>1){node.funcNum=parseInt(func[1],10);if(func.length>2){node.funcTracking=func[2];}
if(func.length>3){func.splice(0,3);node.funcUrl=func.join(",");}}
else if(func.length==1){node.funcNum=-1;node.funcUrl=func[0];}
func=null;}};processChildElements=function(node,pos,isSlideout){if(pos.c&&pos.c.length>0){switch(node.type){case node.BUTTON_TYPE:node.type=node.BUTTONMENU_TYPE;break;case node.MENUITEM_TYPE:node.type=node.MENU_TYPE;break;}
if(!isSlideout){for(var k=0;k<pos.c.length;k++){processToolbarElement(node,pos.c[k]);}}}
else{if(node.type===node.BUTTONMENU_TYPE){node.type=node.BUTTON_TYPE;}}};populateLocalStorage=function(parent,node,pos){if(parent===null&&node.type==node.PARAM_TYPE)
localstorage.putString(node.name,node.func);if(parent&&parent.type==parent.PARAM_TYPE){localstorage.putString(parent.name+'-'+node.name,node.func);}
if(parent===null&&node.id!="yahoo-toolbar-acs"){localstorage.putObject(node.id,new WrapperClass(pos));}};processToolbarElement=function(parent,pos){try{var elem=preProcessElement(pos);if(elem[0]==".I"){var ybId=elem[1].substr(3);pos=this.ybButtons[ybId];if(pos){elem=preProcessElement(pos);}else{return null;}}
if(elem.length>1){var node=CC["@yahoo.com/feed/node;1"].createInstance(CI.nsIYahooFeedNode);var hash=elem[12];node.name=elem[1];node.name=node.name.replace(/\^T/g," ");node.type=elem[2].charCodeAt(0);node.icon=elem[3];node.func=elem[4];switch(node.type){case node.VALUE_TYPE:localstorage.putString(node.name,elem[3]);node=null;return null;case 0x05:node.type=node.BUTTONMENU_TYPE;break;}
switch(preProcessName(node.name)){case"Ticker":node.type=node.BUTTON_TYPE;break;case"1":processCaches(elem[2]);break;case"sck":feedFetcher.setSecureKey(elem[4]);_self.bookmarkManager.setSecureKey(elem[4]);break;case"lang":if(node.type==node.PARAM_TYPE&&isFinite(node.icon)){uniconvert.charset=charsets[node.icon];_self.raw=uniconvert.ConvertToUnicode(_self.raw);}
break;case"yob":var jsonDef=yahooUtils.JSON.parse(elem[4]);for(var idx=0;idx<jsonDef.length;idx++){jsonDef[idx].icon=jsonDef[idx].icon.replace(/\\/g,"");jsonDef[idx].url=jsonDef[idx].url.replace(/\\/g,"");_self.localButtonProcessor.saveLocalButton(yahooUtils.JSON.stringify(jsonDef[idx]),jsonDef[idx].id);}
break;case"port":_self.localButtonProcessor.setUserOpt_SaveLocal((node.func==0?true:false));break;case"-":case"vsep":case"spr":case"spr_div":case"sep":node.type=node.SEPARATOR_TYPE;break;case"AE_":var keysplit=node.name.split('_');var alertid=parseInt(keysplit[1],10);var index=parseInt(keysplit[2],10);if(node.name=="AE_206_1"){vJSONObj=yahooUtils.JSON.parse(unescape(elem[4]));toolbarmanager.AlertManager.addAlertObject(alertid,index,new WrapperClass(vJSONObj));}else{toolbarmanager.AlertManager.addAlertData(alertid,index,elem[4]);}
break;case"ep[":var length=node.name.length-4;var key=node.name.substr(3,length);toolbarmanager.AlertManager.setExtraParam(key,elem[4],true);break;}
processStyles(node,elem[5],elem[7]);var isSlideout=processHash(node,hash,pos);setIconUrl(node,hash);processFunctionDefition(node);if(node.id){node.id=((parent&&parent.id)?parent.id:"yahoo-toolbar")+"-"+node.id;}
populateLocalStorage(parent,node,pos);processChildElements(node,pos,isSlideout);if(parent!==null&&parent instanceof CI.nsIYahooFeedNode){parent.addChild(node);}
if(parent===null&&node.id=="yahoo-toolbar-etp"){toolbarmanager.EventTipManager.addEventTip(node);}
if(parent===null&&(node.hash.indexOf("yclsid")>-1)){mPluginMgr.addToPlugInMap(node.id,node.hash);}
return((parent===null&&node.id!="yahoo-toolbar-acs"&&node.id!="yahoo-toolbar-etp")?node:null);}}catch(e){yahooError(e);}};processStyles=function(node,styles,extStyles){var bit=0;var nodeStyles=",";var stdBits=stylesMapping.std;var extBits=stylesMapping.ext;try{if(!styles&&!extStyles){return;}
var key;if(styles>0){for(key in stylesMapping.std){if(styles&key){nodeStyles+=stdBits[key]+",";}}}
if(extStyles>0){for(key in extBits){if(extStyles&key){nodeStyles+=extBits[key]+",";}}}
node.styles=nodeStyles;}catch(e){yahooError(e);}};setIconUrl=function(node,hash){if(!node.icon)return;if(node.icon.indexOf(/yob/)!==-1||node.icon.indexOf("http")!==-1||node.icon.indexOf("us.i1.yimg.com")!=-1){return;}
var icon=node.icon;var path="http:\/\/l.yimg.com\/a\/i\/tb\/icons\/";icon=icon.replace(/\\/i,"/");if(icon.indexOf("/")==-1&&hash&&!(hash.iconbh||hash.iconemp)){path="http:\/\/l.yimg.com\/a\/i\/tb\/iconsgif/";}
if(icon.indexOf(".")<0){node.icon="chrome:\/\/ytoolbar/skin/"+icon+".gif";}
else{if(hash&&!(hash.iconbh||hash.iconemp)){icon=icon.replace(/\.bmp$/i,".gif");}
if(node.styles.indexOf('HASSTATE')!=-1){icon=icon.replace(/\.png$/i,"_s0.png");}
path+=icon;node.icon=path;}};this.QueryInterface=function(iid){if(!iid.equals(CI.nsIYahooFeedProcessor)&&!iid.equals(CI.nsISupports))
throw Components.results.NS_ERROR_NO_INTERFACE;return this;};};var FeedProcessorModule={mContractID:"@yahoo.com/feed/processor;1",mCID:Components.ID("{05F8BDE2-514C-40fe-847D-8D39F3C5E3B5}"),mFactory:{createInstance:function(outer,iid){if(outer!=null)throw Components.results.NS_ERROR_NO_AGGREGATION;return(new yFeedProcessor()).QueryInterface(iid);}},registerSelf:function(compMgr,fileSpec,location,type){compMgr=compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);compMgr.registerFactoryLocation(FeedProcessorModule.mCID,"Feed Processor",FeedProcessorModule.mContractID,fileSpec,location,type);},unregisterSelf:function(compMgr,fileSpec,location){},getClassObject:function(compMgr,cid,iid){if(!cid.equals(FeedProcessorModule.mCID)){throw Components.results.NS_ERROR_NO_INTERFACE;}
if(!iid.equals(Components.interfaces.nsIFactory)){throw Components.results.NS_ERROR_NOT_IMPLEMENTED;}
return FeedProcessorModule.mFactory;},canUnload:function(compMgr){return true;}};function NSGetModule(compMgr,fileSpec){return FeedProcessorModule;}