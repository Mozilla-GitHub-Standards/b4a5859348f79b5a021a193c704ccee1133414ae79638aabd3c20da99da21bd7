"use strict";
BarPlatform._ParserConsts = {
    STR_BAR_API_ATTR: "bar-api",
    STR_WIDGET_ELEMENT_NAME: "widget",
    STR_PLUGIN_ELEMENT_NAME: "plugin",
    COMPONENT_TYPES: {
        plugin: 0,
        widget: 0
    }
};
BarPlatform.Unit = function CBPUnit(fileName, package_, name) {
    if (typeof fileName != "string") {
        throw new CustomErrors.EArgType("fileName", "String", fileName);
    }
    if (!(package_ instanceof BarPlatform.ComponentPackage)) {
        throw new CustomErrors.EArgType("package_", "ComponentPackage", package_);
    }
    if (typeof name != "string") {
        throw new CustomErrors.EArgType("name", "String", name);
    }
    if (name.length < 1) {
        throw new CustomErrors.EArgRange("name", "/.+/", name);
    }
    this._fileName = fileName;
    this._package = package_;
    this._name = name;
    this._logger = BarPlatform._getLogger("Unit_" + name);
};
BarPlatform.Unit.prototype = {
    constructor: BarPlatform.Unit,
    get name() {
        return this._name;
    },
    get unitPackage() {
        return this._package;
    },
    get componentInfo() {
        return sysutils.copyObj(this._componentInfo);
    },
    getComponent: function CBPUnit_getComponent() {
        if (!(this._component || this._parseError)) {
            this._load();
        }
        if (!this._component) {
            throw this._parseError;
        }
        return this._component;
    },
    finalize: function CBPUnit_finalize() {
        if (this._component) {
            this._component.finalize();
            this._component = null;
        }
        this._parseError = undefined;
        this._name = undefined;
        this._package = null;
        this._logger = null;
    },
    get _componentInfo() {
        let result;
        let cachedFile = this._package.cache.getFile(this._fileName + ".json");
        if (cachedFile.exists()) {
            try {
                result = fileutils.jsonFromFile(cachedFile);
            } catch (e) {
                this._logger.error(e);
            }
        }
        if (!result) {
            let channel = this._package.newChannelFromPath(this._fileName);
            try {
                let infoParser = new UnitInfoParser();
                result = infoParser.parseFromStream(channel.contentStream, channel.originalURI);
                fileutils.jsonToFile(result, cachedFile);
            } finally {
                channel.contentStream.close();
            }
        }
        result.id = this._package.id + "#" + this._name;
        if (result.iconPath) {
            result.iconURL = this._package.resolvePath(result.iconPath);
        }
        result.package_ = this._package;
        delete this._componentInfo;
        this.__defineGetter__("_componentInfo", () => result);
        return this._componentInfo;
    },
    _load: function CBPUnit__load() {
        try {
            let {barAPI, type} = this._componentInfo;
            let compParser = BarPlatform._getParser(barAPI, type);
            this._component = this._parseComponent(compParser);
        } catch (e) {
            this._parseError = e;
            this._logger.error(this._consts.ERR_PARSING_COMPONENT + ". " + strutils.formatError(e));
            if (!(e instanceof BarPlatform.Unit.EWidgetSyntax)) {
                let stackTrace = e.stack;
                if (stackTrace) {
                    this._logger.debug(stackTrace);
                }
            }
        }
    },
    _parseComponent: function CBPUnit__parseComponent(compParser) {
        let parseStartTime = Date.now();
        let unitDoc = this._package.getXMLDocument(this._fileName);
        let component = compParser.parseFromDoc(unitDoc, this);
        this._logger.debug("Component parsed in " + (Date.now() - parseStartTime) + "ms");
        return component;
    },
    _consts: { ERR_PARSING_COMPONENT: "An error occured while parsing component" },
    _name: undefined,
    _logger: null,
    _widgetProto: null,
    _parseError: undefined,
    _fileName: undefined,
    _package: null
};
BarPlatform.Unit.parseSetting = function CBPUnit_parseSetting(settingElement, defaultScope) {
    let settingName = settingElement.getAttribute("name");
    if (!settingName) {
        throw new BarPlatform.Unit.EUnitSyntax(settingElement.nodeName, this._consts.ERR_NO_SETTING_NAME);
    }
    let settingScope = this.evalScope(settingElement.getAttribute("scope") || undefined, defaultScope);
    let defaultValue = settingElement.getAttribute("default");
    let settingTypes = BarPlatform.Unit.settingTypes;
    function evalValueType(valTypeName) {
        switch (valTypeName) {
        case "number":
        case "float":
            return settingTypes.STYPE_FLOAT;
        case "int":
            return settingTypes.STYPE_INTEGER;
        case "boolean":
            return settingTypes.STYPE_BOOLEAN;
        default:
            return settingTypes.STYPE_STRING;
        }
    }
    let settingType = settingTypes.STYPE_STRING;
    let controlElement = settingElement.getElementsByTagNameNS("*", "control")[0];
    if (controlElement) {
        switch (controlElement.getAttribute("type")) {
        case "checkbox":
            settingType = settingTypes.STYPE_BOOLEAN;
            break;
        case "textedit":
            settingType = evalValueType(controlElement.getAttribute("value-type"));
            break;
        case "custom":
            settingType = evalValueType(controlElement.getAttribute("fx-value-type"));
            break;
        }
    }
    return {
        name: settingName,
        scope: settingScope,
        defaultValue: defaultValue,
        type: settingType,
        controlElement: controlElement
    };
};
BarPlatform.Unit.evalScope = function CBPUnit_evalScope(scopeName, defaultScope) {
    switch (scopeName) {
    case "package":
        return this.scopes.ENUM_SCOPE_PACKAGE;
    case "widget":
        return this.scopes.ENUM_SCOPE_WIDGET;
    case "plugin":
        return this.scopes.ENUM_SCOPE_PLUGIN;
    case "instance":
        return this.scopes.ENUM_SCOPE_INSTANCE;
    case undefined:
        if (defaultScope !== undefined) {
            return defaultScope;
        }
    default:
        throw new CustomErrors.EArgRange("scopeName", "package|widget|plugin|instance|{default}", scopeName);
    }
};
BarPlatform.Unit.scopes = {
    ENUM_SCOPE_PACKAGE: 0,
    ENUM_SCOPE_WIDGET: 1,
    ENUM_SCOPE_PLUGIN: 2,
    ENUM_SCOPE_INSTANCE: 3
};
BarPlatform.Unit.settingTypes = {
    STYPE_STRING: 0,
    STYPE_INTEGER: 1,
    STYPE_FLOAT: 2,
    STYPE_BOOLEAN: 3
};
BarPlatform.Unit.EUnitSyntax = function EUnitSyntax(elementName, explanation) {
    CustomErrors.ECustom.apply(this, null);
    this._elementName = elementName.toString();
    this._explanation = explanation.toString();
};
BarPlatform.Unit.EUnitSyntax.prototype = {
    _name: "EUnitSyntax",
    __proto__: CustomErrors.ECustom.prototype,
    constructor: BarPlatform.Unit.EUnitSyntax,
    get _details() {
        return [
            this._elementName,
            this._explanation
        ];
    },
    _message: "Unit parse error",
    _elementName: undefined,
    _explanation: undefined
};
BarPlatform.Unit.EWidgetSyntax = function EWidgetSyntax(elementName, explanation) {
    BarPlatform.Unit.EUnitSyntax.apply(this, arguments);
};
BarPlatform.Unit.EWidgetSyntax.prototype = {
    _name: "EWidgetSyntax",
    __proto__: BarPlatform.Unit.EUnitSyntax.prototype,
    constructor: BarPlatform.Unit.EWidgetSyntax,
    _message: "Widget parse error"
};
BarPlatform.Unit.EPluginSyntax = function EPluginSyntax(elementName, explanation) {
    BarPlatform.Unit.EUnitSyntax.apply(this, arguments);
};
BarPlatform.Unit.EPluginSyntax.prototype = {
    _name: "EPluginSyntax",
    __proto__: BarPlatform.Unit.EUnitSyntax.prototype,
    constructor: BarPlatform.Unit.EPluginSyntax,
    _message: "Bar plugin parse error"
};
function UnitInfoParser() {
}
UnitInfoParser.prototype = {
    constructor: UnitInfoParser,
    parseFromStream: function UnitInfoParser_parseFromStream(inputStream, baseURI) {
        BarPlatform._getLogger("IParser").trace("Parsing component info " + baseURI.spec);
        let componentText = fileutils.readStringFromStream(inputStream).replace(this._componentElementRE, "$1/>");
        let componentElement = xmlutils.getDOMParser(baseURI, baseURI, false).parseFromString(componentText, "text/xml").documentElement;
        if (!(componentElement.localName in BarPlatform._ParserConsts.COMPONENT_TYPES)) {
            throw new Error(componentElement.localName + " is not allowed as component type.");
        }
        return {
            type: componentElement.localName,
            name: componentElement.getAttribute("name") || "",
            isUnique: componentElement.getAttribute("unique") != "false",
            barAPI: componentElement.getAttribute("bar-api") || "xb",
            iconPath: componentElement.getAttribute("icon-vector") || componentElement.getAttribute("icon") || ""
        };
    },
    _componentElementRE: /(<([a-z]:)*(plugin|widget)[^>]+)>[^]*/m
};
BarPlatform.WidgetPrototypeBase = Base.extend({
    constructor: function WidgetPrototypeBase(id, name, unique, iconPath, unit) {
        if (!id) {
            throw new CustomErrors.EArgRange("id", "/.+/", id);
        }
        if (!(unit instanceof BarPlatform.Unit)) {
            throw new CustomErrors.EArgType("unit", "Unit", unit);
        }
        this._id = id.toString();
        this._unit = unit;
        this._unique = Boolean(unique);
        this._name = name.toString();
        this._iconPath = iconPath || "";
        this._spawns = Object.create(null);
    },
    finalize: function WidgetPrototypeBase_finalize() {
        this._unit = null;
        this._spawns = null;
    },
    get id() {
        return this._id;
    },
    get name() {
        return this._name;
    },
    get iconURI() {
        return this._iconPath ? this.pkg.resolvePath(this._iconPath) : "";
    },
    get iconPath() {
        return this._iconPath;
    },
    get isUnique() {
        return this._unique;
    },
    get unit() {
        return this._unit;
    },
    get pkg() {
        return this._unit.unitPackage;
    },
    get spawnedIDs() {
        return Object.keys(this._spawns);
    },
    getAllWidgetItems: function WidgetPrototypeBase_getAllWidgetItems() {
        let result = [];
        for (let [
                    ,
                    spawnRec
                ] in Iterator(this._spawns)) {
            for (let [
                        ,
                        widgetProjection
                    ] in Iterator(spawnRec.projections)) {
                result.push(widgetProjection.uiElement);
            }
        }
        return result;
    },
    getAllWidgetItemsOfInstance: function WidgetPrototypeBase_getAllWidgetItemsOfInstance(WIID) {
        let spawnRec = this._spawns[WIID];
        if (!spawnRec) {
            throw new Error("Invalid widget instance ID");
        }
        let result = [];
        for (let [
                    ,
                    widgetProjection
                ] in Iterator(spawnRec.projections)) {
            result.push(widgetProjection.uiElement);
        }
        return result;
    },
    instanceFinalized: function WidgetPrototypeBase_instanceFinalized(widgetInstance) {
        let WIID = widgetInstance.id;
        let spawnRec = this._spawns[WIID];
        if (!spawnRec) {
            this._logger.warn("Somebody said that " + WIID + " instance is finalized but I don't remember this one.");
            return;
        }
        spawnRec.projections = spawnRec.projections.filter(wInst => wInst != widgetInstance);
        if (spawnRec.projections.length < 1) {
            try {
                this._noMoreInstProjections(WIID, spawnRec);
            } finally {
                delete this._spawns[WIID];
            }
        }
        if (sysutils.isEmptyObject(this._spawns)) {
            this._onAllInstancesFinalized();
        }
    },
    _name: undefined,
    _iconPath: undefined,
    _unit: null,
    _unique: false,
    _spawns: null,
    _makeSpawnRecord: function WidgetPrototypeBase__makeSpawnRecord(instanceID) {
        let spawnRec = { projections: [] };
        return spawnRec;
    },
    _noMoreInstProjections: function WidgetPrototypeBase__noMoreInstProjections(WIID, spawnRec) {
    },
    _onAllInstancesFinalized: function WidgetPrototypeBase__onAllInstancesFinalized() {
    }
});
