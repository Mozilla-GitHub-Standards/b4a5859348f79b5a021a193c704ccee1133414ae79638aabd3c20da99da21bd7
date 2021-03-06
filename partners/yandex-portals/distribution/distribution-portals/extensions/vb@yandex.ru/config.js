"use strict";
const EXPORTED_SYMBOLS = ["VB_CONFIG"];
const VB_CONFIG = (function () {
var config = {
APP: {
NAME: "yandex-vb",
TYPE: "vbff",
COOKIE: "vb.ff",
PROTOCOL: "yafd"},
BUILD: {
DATE: "Sat Aug 10 2013 18:59:02 GMT+0000",
REVISION: "50006_14"},
CORE: {
CONTRACT_ID: "@yandex.ru/vb-core;1",
CLASS_ID: Components.ID("{1ad918b4-4729-11e1-ab8a-dff4577f00a5}")}};
function freeze(aObject) {
if (! (aObject && typeof aObject == "object"))
return aObject;
Object.freeze(aObject);
for each(let obj in aObject) if (typeof aObject == "object")
freeze(obj);
return aObject;
}

return freeze(config);
}
)();
