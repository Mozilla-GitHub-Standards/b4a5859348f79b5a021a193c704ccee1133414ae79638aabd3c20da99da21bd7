/**
 * This is a dialog (implemented as page displayed in the browser content
 * part, due to AMO rules) that's invoked on installation of the toolbar
 * (if not part of branded browser).
 *
 * It makes our search engine the default in the Firefox search field,
 * and our portal the homepage/startpage. It's opt-in (per AMO rules),
 * i.e. we do that only if the user explicitly checks the checkbox.
 *
 * Installation of our search plugin OSD file happens in search-plugin-install.js.
 * Here, we only set the default.
 *
 * Over time, this grew into a general installation questionaire.
 *
 * Buttons:
 * There are multiple possibilities for the buttons. This summarizes the states
 * of the buttons.
 *
 * Regular build, no email address entered: "Finish" (does opt-in)
 * Regular build, email address entered: "Login" (does opt-in)
 * AMO Build, no email address entered: "Login Only" and "Finish & Opt-in"
 * AMO Build, email address entered: "Login Only" and "Login & Opt-in"
 * 
 * We reuse the same 2 buttons, we just change the labels.
 *
 * These are required because:
 *   1. AMO required that we provide a separate button that does not opt-in
 *        and to make it clear that the other button opts-in.
 *   2. Product management request that the button text change from Finish
 *        to Login when an email address is entered.
 *
 * This was implemented by using attributes on the finish button so that we
 * didn't have to bring properties files in.
 */
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://unitedtb/util/util.js");
Components.utils.import("resource://unitedtb/main/brand-var-loader.js");
Components.utils.import("resource://unitedtb/build.js");

function onOptinLoad()
{
  if (brand.regions.list.length < 2)
    document.getElementById("region-label").hidden = true;
  if (ourPref.get("brandedbrowser", false))
  {
    document.getElementById("container").setAttribute("brandedbrowser", "true");
    confirmClose = false;
  }
  else
  {
    // Only optin if we are not branded browser
    document.getElementById("finish-button").addEventListener("click", onOptin, true);
  }
  if (kVariant == "amo")
  {
    document.getElementById("container").setAttribute("amo", "true");
    confirmClose = false;
    var finishButton = document.getElementById("finish-button")
    // See comment in login-page.js
    // For AMO, we were required to add a second button that allows the user to login
    // without opting in. We show the new button via CSS, but we have to modify the
    // labels for the finish button to have opt-in text.
    finishButton.setAttribute("finish-label", finishButton.getAttribute("finish-amo-label"));
    finishButton.setAttribute("login-label", finishButton.getAttribute("login-amo-label"));
    // For AMO, we have to default new tab to false
    ourPref.set("newtab.enabled", false);
  }
  document.getElementById("login-button").addEventListener("click", function () { onLogin(showFirstRun); }, true);
  // finish-button also has click handler onOptin() added above.
  // onLogin must be called after onOptin()
  document.getElementById("finish-button").addEventListener("click", function () { onLogin(showFirstRun); }, true);
  document.getElementById("close-button").addEventListener("click", function () { onCloseButton(showFirstRun); }, true);
}
window.addEventListener("load", onOptinLoad, false);

function onOptin()
{
  var searchengine = document.getElementById("searchengine").checked;

  var startpageSelectedID;
  var startpageRadioButtons = document.getElementsByName("startpage");
  for (var i = 0; i < startpageRadioButtons.length; i++) {
    if (startpageRadioButtons[i].checked) {
      startpageSelectedID = startpageRadioButtons[i].id;
      break;
    }
  }
  var newtab = document.getElementById("newtab").checked;

  //<copied from="pref-general.js (with modifications">
  if (searchengine)
  {
    // sets pref "browser.search.selectedEngine" and notifies app
    try {
      // nsIBrowserSearchService
      Services.search.currentEngine = Services.search.getEngineByName(brand.search.engineName);
    } catch (ex) {
      // Fails on Mara
    }
    ourPref.set("search.opt-in", true);
  }

  switch (startpageSelectedID) {
    case "startpage-search":
      generalPref.set("browser.startup.homepage",
          brand.toolbar.startpageURL);
      break;
    case "startpage-brand":
      generalPref.set("browser.startup.homepage",
          brand.toolbar.startpageHomepageURL);
      break;
  }
  //</copied>

  ourPref.set("newtab.enabled", newtab);
}
