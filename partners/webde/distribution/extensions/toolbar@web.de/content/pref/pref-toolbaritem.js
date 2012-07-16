/**
 * Opens the UnitedInternet toolbar's Settings window.
 * @param module {String} Directly open the settings dialog for
 *   a specific module.
 *   The module name is "united-pref-<module>-pane" as ID of the <prefpane>
 *   e.g. "amazon", "email".
 *   Optional. If null, open the settings window overview with
 *   buttons for each module.
 */
function openPrefWindow(module)
{
  window.openDialog("chrome://unitedtb/content/pref/pref-window.xul",
      "united-pref-window",
      // per <http://mdn.beonex.com/en/Preferences_System.1>
      "chrome=yes,dialog,titlebar,toolbar,modal,centerscreen",
      { module : module });
}
