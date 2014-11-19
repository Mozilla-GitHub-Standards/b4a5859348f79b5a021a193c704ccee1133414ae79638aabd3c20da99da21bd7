
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");var CI=Components.interfaces;var CC=Components.classes;var loader=CC["@mozilla.org/moz/jssubscript-loader;1"].getService(CI.mozIJSSubScriptLoader);loader.loadSubScript("chrome://ytoolbar/content/logger.js");loader.loadSubScript("chrome://ytoolbar/content/installerVariables.js");function YahooPartnerManager(){_mPrefBranch=CC["@mozilla.org/preferences-service;1"].getService(CI.nsIPrefBranch2);}
YahooPartnerManager.prototype={getCharValue:function(key){var val="";try{val=_mPrefBranch.getCharPref(key);}catch(e){}
return val;},init:function(){try{var _mFileIO=CC["@yahoo.com/fileio;1"].getService(CI.nsIYahooFileIO2);var locale=this.getCharValue("yahoo.ytff.installer.language");try{if((yahooInstallerVariables.setdefaultLang==="false")&&(locale==""))
{_mPrefBranch.setBoolPref("yahoo.ytff.deferUpdateUrl",true);return;}}
catch(e)
{yahooError(e.message);}
var install=_mFileIO.getExtensionDir();install.appendRelativePath("install.rdf");var updateUrl="https:\/\/us.data.toolbar.yahoo.com/dl/toolbar/"
+locale+"/yhoo/v1/yhoo/update.rdf?.intl="+locale
+"&.pc="+this.getCharValue('yahoo.ytff.toolbar.pc')
+"&.dc="+this.getCharValue('yahoo.ytff.toolbar.dc')
+"&.sc="+this.getCharValue('yahoo.ytff.toolbar.sc')
+"&.tc="+this.getCharValue('yahoo.ytff.toolbar.tc')
+"&.ver="+this.getCharValue('yahoo.ytff.installer.version')
+"&.vert="+this.getCharValue('yahoo.ytff.installer.activeVertical')
if(install.exists()){var contents=_mFileIO.readFile(install);var replace="<em:updateURL><![CDATA["+updateUrl+"]]></em:updateURL>";contents=contents.replace(/<em:updateURL>.*<\/em:updateURL>/,replace);replace="<em:homepageURL>http:\/\/"+locale+".toolbar.yahoo.com</em:homepageURL>";contents=contents.replace(/<em:homepageURL>.*<\/em:homepageURL>/,replace);var out=CC["@mozilla.org/network/file-output-stream;1"].createInstance(CI.nsIFileOutputStream);out.init(install,0x04|0x08|0x20,0666,0);out.write(contents,contents.length);out.flush();out.close();}
var ext=[];ext[0]=_mFileIO.getProfileDir();ext[0].appendRelativePath("extensions.rdf");ext[1]=_mFileIO.getProfileDir();ext[1].appendRelativePath("extensions");ext[1].appendRelativePath("Extensions.rdf");for(var i=0;i<ext.length;i++){if(ext[i].exists()){try{var contents=_mFileIO.readFile(ext[i]);var replace="updateURL=\""+updateUrl+"\"";replace="homepageURL=\"http:\/\/"+locale+".toolbar.yahoo.com\/\"";contents=contents.replace(new RegExp("homepageURL=\"http:\/\/(.*)yahoo.com[^\"]*\""),replace);var out=CC["@mozilla.org/network/file-output-stream;1"].createInstance(CI.nsIFileOutputStream);out.init(ext[i],0x04|0x08|0x20,0666,0);out.write(contents,contents.length);out.flush();out.close();var rdf=CC["@mozilla.org/rdf/rdf-service;1"].getService(CI.nsIRDFService);var ds=rdf.GetDataSourceBlocking("file:///"
+ext[i].path);ds=ds.QueryInterface(CI.nsIRDFRemoteDataSource);ds.Flush();}catch(e){yahooError("Error in yahooChangeMetaInformation() with ext["+i+"]: "+e);}}}}catch(e){yahooError("Error in yahooChangeMetaInformation: "+e);}},classID:Components.ID("{C163F351-1248-4A36-AD0E-E0B2051928A4}"),contractID:"@yahoo.com/partner/manager;1",QueryInterface:XPCOMUtils.generateQI([Components.interfaces.nsIYahooPartnerManager])};if(XPCOMUtils.generateNSGetFactory)
var NSGetFactory=XPCOMUtils.generateNSGetFactory([YahooPartnerManager]);else
var NSGetModule=XPCOMUtils.generateNSGetModule([YahooPartnerManager]);