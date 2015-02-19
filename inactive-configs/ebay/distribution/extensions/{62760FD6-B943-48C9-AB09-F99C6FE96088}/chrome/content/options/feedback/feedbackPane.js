/* Copyright (C) 2007-2011 eBay Inc. All Rights Reserved. */const Cc=Components.classes;const Ci=Components.interfaces;const Ce=Components.Exception;const Cr=Components.results;const Cu=Components.utils;var FeedbackPane={init:function(){try{Cu.import("resource://ebaycompanion/helpers/logger.js");Cu.import("resource://ebaycompanion/constants.js");Cu.import("resource://ebaycompanion/datasource.js");Cu.import("resource://ebaycompanion/helpers/observers.js");this._observers=new Observers;this._observers.add(function(){window.location.reload();},"ebay-account-logged-in");var that=this;var activeAccount=Datasource.activeAccount();if(activeAccount){var email=activeAccount.get("email");var userId=activeAccount.get("userId");var additionalFields={};additionalFields["firefox_version"]=navigator.userAgent;var getVersionCallback=function(aVersion){additionalFields["extension_version"]=aVersion;var url=GSFastPass.generateURL(email,userId,userId,false,additionalFields);that._addGSJSFiles("fastpass",url);}
Constants.getVersion(getVersionCallback);}}
catch(e){Logger.exception(e);}},uninit:function(){try{this._observers.removeAll();}
catch(e){Logger.exception(e);}},_addGSJSFiles:function(aJSId,aUrl){try{var head=document.getElementsByTagName("head")[0];var script=document.createElement('script');script.id=aJSId;script.type='text/javascript';script.src=aUrl;head.appendChild(script);}catch(e){Logger.exception(e);}}}
window.addEventListener("load",function(){FeedbackPane.init();},false);window.addEventListener("unload",function(){FeedbackPane.uninit();},false);