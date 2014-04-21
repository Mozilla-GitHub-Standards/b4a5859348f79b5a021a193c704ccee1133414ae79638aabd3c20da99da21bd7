"use strict";
const EXPORTED_SYMBOLS = ["browserTheme"];
const {
        classes: Cc,
        interfaces: Ci,
        utils: Cu
    } = Components;
const browserTheme = {
        init: function browserTheme_init(application) {
            this._application = application;
            this._logger = application.getLogger("Browser theme");
        },
        finalize: function browserTheme_finalize(doCleanup) {
            this._application = null;
            this._logger = null;
        },
        get application() this._application,
        createConsumer: function browserTheme_createConsumer(window) {
            return new browserThemeConsumer(window);
        }
    };
function browserThemeConsumer(window) {
    this._window = window;
    this._logger = browserTheme.application.getLogger("Browser theme consumer");
    this._listeners = [];
    this._window.addEventListener("unload", this, false);
    var documentElement = this._window.document.documentElement;
    var textColor = documentElement.getAttribute(this.WINDOW_COLOR_ATTR_NAME);
    this._backgroundColor = textColor === "bright" ? "dark" : "bright";
    this._lightweightTheme = documentElement.getAttribute(this.WINDOW_LWTHEME_ATTR_NAME) === "true";
    var selectedSkin = browserTheme.application.core.Lib.Preferences.get("general.skins.selectedSkin") || "classic/1.0";
    if (selectedSkin === "classic/1.0")
        this._lightweightTheme = null;
    else
        this._window.addEventListener("load", this, false);
    this._mutationObserver = new this._window.MutationObserver(this._onDOMMutation.bind(this));
    var mutationObserverOptions = {
            attributes: true,
            attributeFilter: [
                this.WINDOW_COLOR_ATTR_NAME,
                this.WINDOW_LWTHEME_ATTR_NAME
            ]
        };
    this._mutationObserver.observe(this._window.document.documentElement, mutationObserverOptions);
}
browserThemeConsumer.prototype = {
    WINDOW_LWTHEME_ATTR_NAME: "lwtheme",
    WINDOW_COLOR_ATTR_NAME: "lwthemetextcolor",
    get info() {
        return {
            lightweightTheme: this._lightweightTheme,
            backgroundColor: this._backgroundColor
        };
    },
    destroy: function browserTheme_destroy() {
        if (!this._window)
            return;
        this._mutationObserver.disconnect();
        this._mutationObserver = null;
        this._window.removeEventListener("unload", this, false);
        this._window = null;
        this._logger = null;
        this._listeners = null;
    },
    addListener: function browserTheme_addListener(listener) {
        if (!listener || typeof listener !== "object" || typeof listener.onBrowserThemeChanged !== "function")
            throw new Error("Listener must be Object with 'onBrowserThemeChanged' method.");
        if (!this._listeners)
            return;
        if (!this._listeners.some(function (l) l === listener))
            this._listeners.push(listener);
    },
    removeListener: function browserTheme_removeListener(listener) {
        if (!this._listeners)
            return;
        this._listeners = this._listeners.filter(function (l) l !== listener);
    },
    handleEvent: function browserTheme_handleEvent(event) {
        switch (event.type) {
        case "load":
            event.currentTarget.removeEventListener("load", this, false);
            new browserTheme.application.core.Lib.sysutils.Timer(this._calculateBackgroundColor.bind(this), 0);
            break;
        case "unload":
            this.destroy();
            break;
        }
    },
    _calculateBackgroundColor: function browserTheme__calculateBackgroundColor() {
        if (!this._window)
            return;
        var doc = this._window.document;
        var height = 0;
        var y = 0;
        [
            "toolbar-menubar",
            "navigator-toolbox"
        ].forEach(function (id) {
            var element = doc.getElementById(id);
            if (!element)
                return;
            var {boxObject: boxObject} = element;
            height += boxObject.height;
            if (boxObject.y > y)
                y = boxObject.y;
        });
        if (!height)
            height = 200;
        var width = doc.documentElement.boxObject.width;
        var canvas = doc.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
        canvas.width = width;
        canvas.height = height;
        var context = canvas.getContext("2d");
        var data = [];
        try {
            context.drawWindow(this._window, 0, y, width, height, "rgba(0, 0, 0, 0)");
            data = context.getImageData(0, y, width, height).data;
        } catch (e) {
            this._logger.error("Can not draw canvas for background color calculation.");
            this._logger.debug(e);
        }
        if (!data.length)
            return;
        var luminances = [];
        let (i = 0, len = data.length) {
            for (; i < len; i += 4) {
                let luminance = 0.2125 * data[i] + 0.7154 * data[i + 1] + 0.0721 * data[i + 2];
                luminances.push(luminance);
            }
        }
        var luminance = luminances.reduce(function (prev, cur) prev + cur) / luminances.length;
        this._backgroundColor = luminance <= 110 ? "dark" : "bright";
        this._notifyListeners();
    },
    _onDOMMutation: function browserTheme__onDOMMutation(mutations) {
        var textColor;
        var lightweightTheme;
        mutations.forEach(function (mutation) {
            textColor = mutation.target.getAttribute(this.WINDOW_COLOR_ATTR_NAME);
            lightweightTheme = mutation.target.getAttribute(this.WINDOW_LWTHEME_ATTR_NAME);
        }, this);
        var backgroundColor = textColor === "bright" ? "dark" : "bright";
        if (this._backgroundColor === backgroundColor && this._lightweightTheme === lightweightTheme)
            return;
        this._backgroundColor = backgroundColor;
        this._lightweightTheme = lightweightTheme;
        this._notifyListeners();
    },
    _notifyListeners: function browserTheme__notifyListeners() {
        if (!this._listeners)
            return;
        var data = Object.create(null);
        data.backgroundColor = this._backgroundColor;
        data.lightweightTheme = this._lightweightTheme;
        this._listeners.forEach(function browserTheme_notificatorFunc(listener) {
            try {
                if (this._listeners.indexOf(listener) !== -1)
                    listener.onBrowserThemeChanged(data);
            } catch (e) {
                this._logger.error("Notify listener error: " + e);
                if (e.stack)
                    this._logger.debug(e.stack);
            }
        }, this);
    }
};