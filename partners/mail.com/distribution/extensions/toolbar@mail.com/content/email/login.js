/**
 * The UI for logging into the user's UnitedInternet account.
 *
 * This implements the triggers for login/logout, email address and password
 * UI, and the single account (backend supports multiple accounts).
 */

/**
 * Messages observed:
 * "logged-in", "logged-out"
 *    Effect: Changes login button/icon
 * "do-login"
 *    Parameters:
 *      withUI {Boolean}, currently always true
 *          Allow to show password dialog. See Effect.
 *      needAccountType {Integer-enum} optional
 *          1 = log in the primary account only (which always matches brand)
 *          9 = log in only the account passed in as |account|
 *          10 = try to log in all accounts
 *              if any account succeeds, the successCallback will be called.
 *              if all are aborted, the errorCallback will be called.
 *          default: if |account|: 9, else: 1
 *      account {Account} optional
 *          if given, log in only this account
 *          if null, log in all known accounts
 *          if null and there are no known accounts, allow to configure one
 *      successCallback {Function(account)}
 *          Will be called, once the user has successfully logged in.
 *          (this process may take several seconds)
 *          param account {Account}   The account that the user logged in with,
 *              matching your request.
 *          Optional. If null, do nothing.
 *      errorCallback {Function(e)}
 *          called when there was an error.
 *          In the login case, this is never called, but the error is shown to
 *          the user and then another login dialog, until he Cancels. Then we
 *          call abortCallback.
 *          param e {Exception}   Details of the failure
 *          Optional. If null, will show error to user.
 *      abortCallback {Function(e)}
 *          Will be called, if the user clicked Cancel in the login dialog.
 *          Optional. If null, do nothing.
 *          Either successCallback, errorCallback or abortCallback will
 *          always be called (if passed).
 *    Effect:
 *      If withUI = true: Same as clicking on login button:
 *        Tries to log in, incl. asking user for password if necessary, and
 *        server calls.
 *      If withUI = false: (currently unused)
 *        If we have a loginToken, try to log in with that. If it fails,
 *        forget about it. Do not even show an error to the user.
 *      Either way:
 *        If successful, will implicitly cause "logged-in" msg to be sent.
 */

Components.utils.import("resource://unitedtb/email/account-list.js", this);
Components.utils.import("resource://unitedtb/email/webapp-start.js", this);

var gStringBundle = new united.StringBundle(
    "chrome://unitedtb/locale/email/login.properties");

// All accounts
// {Array of Account}
var gAccs = [];

function onLoad()
{
  try {
    migrate();
    readAccounts();
    updateUI();
    autoLoginIfPossible();
  } catch (e) { united.error(e); }
}
window.addEventListener("load", onLoad, false);

function readAccounts()
{
  //gAccs = getAllExistingAccounts().filter(function(acc) { return acc.kType == "unitedinternet"; });
  gAccs = getAllExistingAccounts();
}

function migrate()
{
  try {
    let oldAccount = united.ourPref.get("login.emailAddress");
    let accountsList = united.ourPref.get("accountsList");
    if ( !accountsList && oldAccount)
    {
      let oldStoreLogin = !!united.ourPref.get("login.longSession", true);
      united.ourPref.reset("login.emailAddress");
      united.ourPref.reset("login.longSession");
      let acc = makeNewAccount(oldAccount);
      acc.wantStoredLogin = oldStoreLogin;
      acc.saveToPrefs();
    }
    if (accountsList)
      united.ourPref.set("email.runonceNewUsersShown", true);
  } catch (e) { united.error(e); }
}

// automatically log in without UI, if "remember me" activated and we have credentials
function autoLoginIfPossible()
{
  for each (let acc in gAccs)
  {
    if (acc.haveStoredLogin && !acc.isLoggedIn)
    {
      acc.login(0, true, function() {}, united.error);
      // automatic action, so do not bother user about errors
      // login-logic.js will send out a global "logged-in" message which will trigger
      // the further steps
    }
  }
}

function updateUI()
{
  var loggedinE = document.getElementById("united-logged-in-button");
  var loggedinMenuitemE = document.getElementById("united-logged-in-menuitem");
  var loggedoutE = document.getElementById("united-logged-out-button");

  var primaryAcc = getPrimaryAccount();
  // Show "logged in", if any account is logged in
  var loggedin = gAccs.some(function(acc) { return acc.isLoggedIn; });
  //var loggedin = primaryAcc ? primaryAcc.isLoggedIn : false;
  loggedinE.hidden = !loggedin;
  loggedoutE.hidden = loggedin;

  // put username on logout button
  if ( !loggedinE.originalLabel)
    loggedinE.originalLabel = loggedinE.label;
  if ( !loggedinMenuitemE.originalLabel)
    loggedinMenuitemE.originalLabel = loggedinMenuitemE.label;
  if (primaryAcc && primaryAcc.isLoggedIn)
  {
    let username = united.sanitize.label(primaryAcc.emailAddress.split("@")[0]);
    // Wanted to make it configurable in local, but ran into
    // <https://bugzilla.mozilla.org/show_bug.cgi?id=698831>
    loggedinE.label = username;
    loggedinMenuitemE.label = gStringBundle.get("logout.primary.menuitem",
        [ primaryAcc.emailAddress ]);
  }
  else
  {
    loggedinE.label = loggedinE.originalLabel;
    loggedinMenuitemE.label = loggedinMenuitemE.originalLabel;
  }
        
  united.toolbar.onButtonSizeChangedByCode();
}

united.autoregisterGlobalObserver("logged-in", updateUI);
united.autoregisterGlobalObserver("logged-out", updateUI);

/**
 * Listen to "do-login" requests.
 * email.js and co asks us to trigger login, including UI for password.
 * @see definition at top of file
 */
function onLoginRequest(params)
{
  // param checking
  united.assert(typeof(params.withUI) == "boolean");
  if ( !params.withUI)
    throw NotReached("Disabled - Do you really need this?"); //autoLoginIfPossible();
  var acc = params.account;
  united.assert(typeof(acc) == "object" || typeof(acc) == "undefined");
  if (acc && !united.arrayContains(gAccs, acc)) // just in case this is new
    gAccs.push(acc);
  var needAccountType = united.sanitize.enum(params.needAccountType,
      [1, 9, 10], acc ? 9 : 1);
  var successCallback = params.successCallback || function() {};
  var errorCallback = params.errorCallback || united.errorCritical;
  var abortCallback = params.abortCallback || function() {};
  united.assert(typeof(successCallback) == "function");
  united.assert(typeof(errorCallback) == "function");
  united.assert(typeof(abortCallback) == "function");

  if ( !gAccs.length) // we have no accounts yet
  {
    // create account, but only our brand
    tryLogin(2, null, false, successCallback, errorCallback, abortCallback);
  }
  else if (needAccountType == 9 || needAccountType == 1) // specific account
  {
    if (needAccountType == 1)
      acc = getPrimaryAccount();
    tryLogin(1, acc, true, successCallback, errorCallback, abortCallback);
  }
  else if (needAccountType == 10) // all accounts
  {
    // combine all callbacks to one
    let waiting = gAccs.length;
    let firstError = null;
    let firstAcc = null;
    let aborted = false;
    let combinedCallback = function(acc)
    {
      if (--waiting)
        return;
      if (aborted)
        abortCallback();
      else if (firstError)
        errorCallback(firstError);
      else
        successCallback(firstAcc);
    };
    let combinedSuccessCallback = function(acc)
    {
      if ( !firstAcc)
        firstAcc = acc;
      combinedCallback();
    };
    let combinedErrorCallback = function(e)
    {
      if ( !firstError)
        firstError = e;
      combinedCallback();
    };
    let combinedAbortCallback = function()
    {
      aborted = true;
      combinedCallback();
    };

    for each (let acc in gAccs)
      tryLogin(1, acc, true, combinedSuccessCallback, combinedErrorCallback,
          combinedAbortCallback);
  }
}
united.autoregisterWindowObserver("do-login", onLoginRequest);

function accountListChange()
{
  readAccounts();
  updateUI();
}

function logoutRemovedAccount(obj)
{
  var account = obj.account;
  united.assert(account);
  if (account.isLoggedIn)
  {
    account.logout(function() {}, united.error);
  }
}
united.autoregisterGlobalObserver("account-added", accountListChange);
united.autoregisterGlobalObserver("account-removed", accountListChange);
united.autoregisterGlobalObserver("account-removed", logoutRemovedAccount);

/**
 * Called by Login button
 */
function onCommandDoLogin()
{
  try {
    onLoginRequest({
      withUI : true,
      needAccountType : 10, // all
      // successCallback default: do nothing
      // errorCallback default: show errors
      // abortCallback default: do nothing
    });
  } catch (e) { united.errorCritical(e); }
}

/**
 * Open UI prompt to get password, and then log in with server.
 *
 * This should only be called in response to user action, not on startup.
 * Called when:
 * - Login button clicked
 * - some component sends the "do-login" msg.
 * - bad password (recursively)
 * - account setup
 *
 * - if usecase == login and already logged in: does nothing.
 * - if usecase == login, the email address is not editable anymore.
 *
 * @param usecase {Integer-enum}
 *     1 = login, only of the account |acc|
 *     2 = create new account only
 *     3 = edit existing account |acc|
 * @param acc {Account}  Log in or edit this account.
 *     The fields will be prefilled with this account.
 *     Required for usecase 1 and 3, must be null for usecase 2.
 * @param allowAutoLogin {Boolean}
 *     if true and we have a password stored, don't show UI, but login directly
 *     if false, show dialog in any case
 *
 * @param successCallback {Function(account)}
 *    called when the user successfully logged in (usecase 1 and 2)
 *    param account {Account}
 * @param errorCallback {Function(e)}
 *    called when there was an error.
 *    In the login case, this is never called, but the error is shown to the
 *    user and then another login dialog, until he Cancels. Then we call
 *    abortCallback.
 * @param abortCallback {Function(e)}
 *    called when user clicked Cancel (including after an error)
 */
function tryLogin(usecase, acc, allowAutoLogin,
    successCallback, errorCallback, abortCallback)
{
  try {
    united.sanitize.enum(usecase, [1, 2, 3]);
    united.assert(usecase == 2 || acc && acc.emailAddress);
    united.assert(usecase != 2 || !acc);
    united.assert(typeof(successCallback) == "function");
    united.assert(typeof(errorCallback) == "function");
    united.assert(typeof(abortCallback) == "function");

    if (usecase == 1 && acc.isLoggedIn)
    {
      successCallback(acc);
      return;
    }

    if (usecase == 1 && acc.haveStoredLogin && allowAutoLogin)
      ; // don't show dialog, skip directly to login
    else // show dialog
    {
      var prefillEmail = acc ? acc.emailAddress : "";
      var prefillStore = acc ? acc.wantStoredLogin : true;
      var answ = united.login.common.getEmailAddressAndPassword({
          emailAddress : prefillEmail,
          wantStoredLogin : prefillStore,
          usecase : usecase,
        });
      if (!answ) // user cancelled
      {
        abortCallback();
        return;
      }

      if (usecase == 2) // create account
      {
        // email address already checked in login-dialog.js
        united.assert(answ.emailAddress && answ.emailAddress != prefillEmail);
        acc = getExistingAccountForEmailAddress(answ.emailAddress);
        if (acc)
        {
          errorCallback(new united.Exception(gStringBundle.get("error.exists")));
          return;
        }
        acc = makeNewAccount(answ.emailAddress);
        acc.wantStoredLogin = answ.wantStoredLogin;
      }
      else // login or edit
      {
        united.assert(answ.emailAddress == prefillEmail);
        if (answ.wantStoredLogin != prefillStore)
        {
          acc.wantStoredLogin = answ.wantStoredLogin;
          acc.saveToPrefs();
        }
      }

      acc.setPassword(answ.password);
    }

    acc.login(0, true,
    // on success, login-logic.js will send out a global "logged-in"
    // message, which will trigger the further steps (in all windows)
    function() // success
    {
      if (usecase == 2)
      {
        acc.saveToPrefs();
        openWelcomePageMaybe(acc);
      }
      successCallback(acc);
    },
    function(e) // error handler, e.g. wrong password
    {
      united.errorCritical(e); // explicit user action, so notify user of errors
      if (usecase == 2)
      {
        acc.deleteAccount();
        acc = null;
      }
      // let user try again. no loop, because user can abort dialog
      tryLogin(usecase, acc, false, successCallback, errorCallback, abortCallback);
    });
  } catch (e) { united.errorCritical(e); }
}

/**
 * Logout button clicked.
 * Invalidate token and delete it from disk.
 */
function onCommandDoLogout()
{
  if ( !logoutConfirmation())
    return;

  var remainingCount = gAccs.length;
  var loggedOut = function()
  {
    remainingCount--;
    if (remainingCount == 0 && united.brand.login.afterLogoutWebURL)
      united.loadPage(united.brand.login.afterLogoutWebURL, "tab");
  };

  for each (let acc in gAccs)
  {
    try {
      logoutPerUsecase(acc); // log out web app, too (must happen before toolbar logout)
    } catch (e) { united.errorCritical(e) };

    if ( !acc.isLoggedIn)
      loggedOut();
    else
      acc.logout(loggedOut, united.errorCritical); // (notify user of errors)
  }
}

/**
 * Upon very first successful login, we may open a special
 * "welcome" / "runonce" webpage.
 * Depends on brand and marketing actions.
 */
function openWelcomePageMaybe(account)
{
  var webpageURL = united.brand.login.runonceNewUsersWebURL;
  if ( !webpageURL)
    return;
  if (united.ourPref.get("email.runonceNewUsersShown"))
    return;
  // If the redirect does not exist, the page is not shown, and no error is thrown.
  // So, we need to make 2 requests: The first background request is only
  // to check whether the URL gives HTTP 200 or 404.
  // The second is then the browser.
  new united.FetchHTTP({ url : webpageURL, method : "GET" },
  function() // success
  {
    // load in browser
    united.ourPref.set("email.runonceNewUsersShown", true);
    united.loadPage(webpageURL, "tab");
  },
  function(e)
  {
    // silence error (esp. 404), that's the whole point
    united.debug("Got error from runonceNewUsers: " + e);
  }).start();
}

/**
 * Prompt for logout: Are you sure?
 * @returns {Boolean}
 *     true = The user confirmed explicitly or by pref
 *     false = cancel
 */
function logoutConfirmation()
{
  if (united.ourPref.get("login.logoutConfirm"))
  {
    var prompts = united.Cc["@mozilla.org/embedcomp/prompt-service;1"]
        .getService(united.Ci.nsIPromptService);
    var buttonFlags = prompts.BUTTON_POS_0 * prompts.BUTTON_TITLE_IS_STRING +
        prompts.BUTTON_POS_1 * prompts.BUTTON_TITLE_CANCEL +
        prompts.BUTTON_POS_1_DEFAULT;
    var remember = { value : null };
    var confirm = prompts.confirmEx(window,
        gStringBundle.get("logout.confirm.title"),
        gStringBundle.get("logout.confirm.msg"),
        buttonFlags,
        gStringBundle.get("logout.confirm.ok"),
        null,
        null,
        gStringBundle.get("logout.confirm.remember"),
        remember);
    var ok = confirm == 0;
    if (!ok)
      return false;
    if (ok && remember.value)
      united.ourPref.set("login.logoutConfirm", false);
  }
  return true;
}

/**
 * The "main" account is used by all the services and UI
 * that do not supple multiple accounts.
 * @returns {Account}
 *     May be null, if no account is configured,
 *     or if none of the configured accounts is from
 *     the brand of the current toolbar,
 *     e.g. only a GMX account, but this is a web.de toolbar.
 */
function getPrimaryAccount()
{
  for each (let acc in gAccs)
  {
    if (acc.providerID == united.brand.login.providerID)
      return acc;
  }
  return null;
}