/* Copyright (C) 2007-2011 eBay Inc. All Rights Reserved. */Sidebar.DragNDropManager={_dragService:null,init:function(){this._dragService=Cc["@mozilla.org/widget/dragservice;1"].getService(Ci.nsIDragService);},onDragOver:function(aEvent){let isOldAPI=(null==Ci.nsIDOMDataTransfer);if(isOldAPI&&(!aEvent.dataTransfer)){this._setDataTransfer(aEvent);}
let types=aEvent.dataTransfer.types;let isSupported=types.contains("text/html")||types.contains("text/uri-list")||types.contains("text/unicode");if(isSupported){if(isOldAPI){this._dragService.getCurrentSession().canDrop=true;aEvent.stopPropagation();}
aEvent.preventDefault();}
var itemId=this._getItemIdFromDraggedItem();if(itemId){var sidebarTabBox=document.getElementById("gs-ebay-sidebar-tabbox");var originalSelectedIndex=sidebarTabBox.selectedIndex;if(sidebarTabBox.selectedIndex!=0){sidebarTabBox.selectedIndex=0;Sidebar.applyFilter();sidebarTabBox.setAttribute("listSprung",true);let that=this;window.parent.addEventListener("mousemove",function dragEndListener(){var dragSession=that._dragService.getCurrentSession();if(!dragSession){window.parent.removeEventListener("mousemove",dragEndListener,false);if(sidebarTabBox.getAttribute("listSprung")){sidebarTabBox.selectedIndex=originalSelectedIndex;Sidebar.applyFilter();sidebarTabBox.removeAttribute("listSprung");}}},false);}}},onDragDrop:function(aEvent){if(null==Ci.nsIDOMDataTransfer){if(!aEvent.dataTransfer){this._setDataTransfer(aEvent);}
this.onDrop(aEvent);}},onDrop:function(aEvent){var sidebarTabBox=document.getElementById("gs-ebay-sidebar-tabbox");var itemId=this._getItemIdFromDraggedItem();if(itemId){EbayCompanion.ApiCoordinator.addToWatchList(itemId);}
sidebarTabBox.removeAttribute("listSprung");aEvent.preventDefault();},_setDataTransfer:function(aEvent){let that=this;aEvent.dataTransfer={types:{contains:function(aFlavor){let session=that._dragService.getCurrentSession();return(session&&session.isDataFlavorSupported(aFlavor));}},getData:function(aFlavor){let session=that._dragService.getCurrentSession();let transferable=Cc["@mozilla.org/widget/transferable;1"].createInstance(Ci.nsITransferable);let dataObj={};let data;transferable.addDataFlavor(aFlavor);session.getData(transferable,0);transferable.getAnyTransferData({},dataObj,{});if(dataObj.value instanceof Ci.nsISupportsString){data=dataObj.value.QueryInterface(Ci.nsISupportsString);}else{data=dataObj.value;}
return data;},mozGetDataAt:function(aFlavor,aIndex){return this.getData(aFlavor);}};},_getItemIdFromDraggedItem:function(){var dragSession=this._dragService.getCurrentSession();var itemId=null;var thisNode;var url=null;thisNode=dragSession.sourceNode;url=this._getUrlFromNode(thisNode);if(null!=url){var matches;matches=url.match(/itemZ(\d*?)(?:QQ|#|$)/i);if(!matches){matches=url.match(/item=(\d*?)(?:&|#|$)/i);}
if(matches&&matches[1]){itemId=matches[1];}
matches=url.match(/\/[^/]+\/(\d*?)(?:\?|&|#|$)/i);if(matches&&matches[1]){itemId=matches[1];}}
return itemId;},_getUrlFromNode:function(aNode){var thisNode;var url=null;var urlTmp=null;try{thisNode=aNode;for(var i=0;!urlTmp&&i<5;i++){if(thisNode.nodeName.match(/a/i)){urlTmp=thisNode.href;}else{thisNode=thisNode.parentNode;}}
if(null==urlTmp){try{urlTmp=aNode.parentNode.parentNode.parentNode.parentNode.value;}catch(e){}}
if(null==urlTmp){try{if(aNode.nodeName.match(/toolbaritem/i)&&aNode.id=="urlbar-container"){urlTmp=aNode.firstChild.value;}}catch(e){}}
if(null!=urlTmp){try{var uriObject=Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService).newURI(urlTmp,null,null);if(-1!=uriObject.host.indexOf("ebay")){url=urlTmp;}}catch(e){}}}catch(e){EbayCompanion.Logger.exception(e);}
return url;}};