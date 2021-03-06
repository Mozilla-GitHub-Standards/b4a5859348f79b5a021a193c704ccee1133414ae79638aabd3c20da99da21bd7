"use strict";
BarPlatform.PresetWithManifest = BarPlatform.Preset.extend({
    get packagesInfo() {
        return sysutils.copyObj(this._packagesInfo, false);
    },
    _parsePreset: function PresetWithManifest__parsePreset(presetElement) {
        this.base(presetElement);
        this._parsePackages(presetElement);
    },
    _parsePackages: function PresetWithManifest__parsePackages(presetElement) {
        this._packagesInfo = [];
        let packagesElement = xmlutils.queryXMLDoc("./packages", presetElement)[0];
        if (!packagesElement) {
            return;
        }
        let packages = xmlutils.queryXMLDoc("./package", packagesElement);
        for (let i = 0, length = packages.length; i < length; i++) {
            let packageInfo = this._parsePackageElement(packages[i]);
            if (packageInfo) {
                this._packagesInfo.push(packageInfo);
            }
        }
    },
    _parsePackageElement: function PresetWithManifest__parsePackageElement(packageElement) {
        let rawID = packageElement.getAttribute("id");
        let id = this._baseURI ? netutils.resolveRelativeURL(rawID, this._baseURI) : rawID;
        let packageInfo = {
            id: id,
            uri: id,
            file: packageElement.getAttribute("file") || null,
            version: packageElement.getAttribute("version") || "1.0",
            platformMin: packageElement.getAttribute("platform-min") || null,
            browser: packageElement.getAttribute("browser") || null,
            os: packageElement.getAttribute("os") || null,
            architecture: packageElement.getAttribute("architecture") || null
        };
        if (!packageInfo.file) {
            packageInfo.file = encodeURIComponent(packageInfo.id) + ".zip";
        }
        return packageInfo;
    }
});
