/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 * Not any newer versions of these licenses
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Beonex Mail Notifier
 *
 * The Initial Developer of the Original Code is
 *  Ben Bucksch <ben.bucksch beonex.com>
 * Portions created by the Initial Developer are Copyright (C) 2010 - 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
/**
 * This module checks for new mail, using the POP3 standard protocol.
 */
/**
 * Messages sent:
 * "logged-in" @see login-logic.js
 *    Means: We are 
 *    When: We authenticated to the POP3 server
 *       after starting a periodic mail poll. Not send for a one-time check.
 * "logged-out" @see login-logic.js
 *    When: We dropped the IMAP connection.
 *    TODO currently only sent when voluntarily dropped.
 *    Should handle case when server drops connection.
 * "mail-check" @see email-logic.js
 *    We checked the number of new mails, and the number changed.
 */

const EXPORTED_SYMBOLS = [ "POP3Account" ];

Components.utils.import("resource://unitedtb/util/util.js");
Components.utils.import("resource://unitedtb/util/sanitizeDatatypes.js");
Components.utils.import("resource://unitedtb/util/observer.js");
Components.utils.import("resource://unitedtb/util/Socket.js");
Components.utils.import("resource://unitedtb/util/Auth.js");
Components.utils.import("resource://unitedtb/email/MIME.js");
Components.utils.import("resource://unitedtb/email/account-base.js");
var gStringBundle = new StringBundle("chrome://unitedtb/locale/email/email.properties");

/**
 * Holds and manages login state of one POP3 account
 */
function POP3Account(accountID, isNew)
{
  BaseStandardAccount.call(this, accountID, isNew);
}
POP3Account.prototype =
{
  kType : "pop3",

  _newMailCount : -1, // {Integer} -1 = not checked
  _previousNewMailCount : -1, // {Integer} avoids excessive notifications
  _emails : null, // {Array of RFC822Mail} Some of the unchecked mails (headers)
  _timer : null, // {Abortable} for start/stopCheckingInterval()

  get newMailCount()
  {
    return this._newMailCount;
  },

  get emails()
  {
    return this._emails;
  },

  get isLoggedIn()
  {
    return !!this._timer;
  },

  /**
   * TODO when continuously = true, notifyCallback() is also called when
   *    the number of new mails did not change, should only be called when it changed.
   */
  login : function(peekMails, continuously, notifyCallback, errorCallback)
  {
    assert( !(continuously && this._timer), "I'm already checking regularly");

    if (continuously)
      this._startCheckingInterval(peekMails, notifyCallback, errorCallback);
    else
      this._checkWithServerOnce(peekMails, notifyCallback, errorCallback);
  },

  mailCheck : function(peekMails, continuously, notifyCallback, errorCallback)
  {
    this.login(peekMails, continuously, notifyCallback, errorCallback);
  },

  logout : function(successCallback, errorCallback)
  {
    assert(typeof(successCallback) == "function", "need successCallback");
    assert(typeof(errorCallback) == "function", "need errorCallback");

    this._deleteStoredPassword();

    this._stopCheckingInterval();
    successCallback();
  },

  /**
   * @param peekMails {Integer}  Also fetch the email headers.
   *   Fetch this many mails maximum. Pass 0 to only get the number of mails.
   * @param successCallback {Function(newMailCount {Integer}),
   *    emails {Array of RFC822Mail})}
   */
  _checkWithServerOnce : function(peekMails, successCallback, errorCallback)
  {
    assert(typeof(successCallback) == "function");
    assert(typeof(errorCallback) == "function");
    this._getPasswordFromStore();
    assert(this._password, "need password before trying to log in");
    var self = this;
    mailCheck({
      hostname : self.hostname,
      port : self.port,
      ssl : self.ssl,
      username : self.username,
      password : self._password,
      peekMaxMails : peekMails,
    },
    function(newMailCount, emails)
    {
      self._newMailCount = newMailCount;
      self._emails = emails;
      //debugObject(emails, "emails", 2);
      successCallback(newMailCount, emails);
      if (self._previousNewMailCount == self._newMailCount)
        return;
      notifyGlobalObservers("mail-check", { account: self });
      self._previousNewMailCount = self._newMailCount;
    },
    function(e)
    {
      self._newMailCount = -1;
      self._emails = [];
      errorCallback(e);
    });
  },

  /**
   * This will start checking with the server every |this._interval|
   * seconds, automatically forever from now on.
   * After *each* check, either successCallback or errorCallback
   * will be called, so they will be called many times.
   * To stop it, call stopCheckingInterval().
   *
   * @param peekMails @see login()
   * @param notifyCallback @see login()
   */
  _startCheckingInterval : function(peekMails, notifyCallback, errorCallback)
  {
    this._getPasswordFromStore();
    assert(this._password, "please setPassword() first");
    var self = this;
    this._checkWithServerOnce(peekMails, function(newMailCount, emails)
    {
      notifyGlobalObservers("logged-in", { account: self });
      notifyCallback(newMailCount, emails);
    }, errorCallback);
    this._timer = runAsync(function()
    {
      self._checkWithServerOnce(peekMails, notifyCallback, errorCallback);
    }, errorCallback, this._interval * 1000);
  },
  _stopCheckingInterval : function()
  {
    if (this._timer)
      this._timer.cancel();
    this._timer = null;
    this._newMailCount = -1;
    this._emails = [];
    var self = this;
    notifyGlobalObservers("logged-out", { account: self });
  },
}
extend(POP3Account, BaseStandardAccount);



// POP3 Implementation

/**
 * Parses POP3 command responses ala "+OK msg" and "-ERR error msg"
 */
function POP3ClientSocket(p)
{
  p.separator = "newline";
  p.charset = "ASCII";
  this.protocolDebug = true;
  LineSocket.call(this, p);
  this.registerReceiveLinesCallback(makeCallback(this, this._receiveLinesToPOP3));
}
POP3ClientSocket.prototype =
{
  sendPOP3 : function(lines)
  {
    this.sendLines(lines);
  },
  sendAndReceivePOP3 : function(lines, receiver)
  {
    this.registerReceivePOP3Callback(receiver); // TODO restore
    this.sendPOP3(lines);
  },
  registerReceivePOP3Callback : function(receiver)
  {
    assert(typeof(receiver) == "function", "receiver must be a function");
    this._receivePOP3Callback = receiver;
    this._receivePOP3ContinuationCallback = null;
  },
  /**
   * Passes server output verbatim to this receiver function,
   * until receive() or sendAndReceive() is called again.
   *
   * This is needed for commands that give lots of data,
   * which may return in several chucks, and the later chunks
   * of course have no "+OK" etc..
   * TODO put this appending functionality directly in here somehow?
   * Would need end definition.
   */
  registerReceivePOP3ContinuationCallback : function(receiver)
  {
    assert(typeof(receiver) == "function", "receiver must be a function");
    this._receivePOP3ContinuationCallback = receiver;
  },
  _receivePOP3Callback : null,
  _receivePOP3ContinuationCallback : null,
  _receiveLinesToPOP3 : function(inLines)
  {
    if (this._receivePOP3ContinuationCallback)
    {
      this._receivePOP3ContinuationCallback(inLines);
      return;
    }
    var hostname = this.hostname;
    var firstLine = inLines[0];
    if (firstLine.substr(0, 3) == "+OK")
      this._receivePOP3Callback(firstLine.substr(4), inLines);
    else if (firstLine.substr(0, 4) == "-ERR")
      this._connErrorCallback(gStringBundle.get("pop3.server.error",
                                                [ hostname, firstLine.substr(5) ]));
    else
      this._connErrorCallback(gStringBundle.get("pop3.unexpected.error",
                                                [ hostname, inLines.join("\n") ]));
  },
},
extend(POP3ClientSocket, LineSocket);

/**
 * Contacts POP3 server and asks for number of new mails.
 *
 * @param p {Object} with the following named params as properties:
 * @param hostname {String} POP3 server name
 * @param port {Integer} POP3 server port number
 * @param ssl {Integer-Enum} 1 = plain, 2 = Normal SSL 3 = STARTTLS
 * @param username {String} POP3 login name
 *     Not necessarily the same as email address. Depends on ISP and user.
 * @param password {String}
 * @param peekMaxMails {Integer} if > 0, get subject and author of the first n mails
 *
 * (direct params):
 * @param successCallback {Function(newMailCount {Integer},
 *     emails {Array of RFC822Mail})}
 * @param errorCallback
 */
function mailCheck(p, successCallback, errorCallback)
{
  sanitize.label(p.username);
  sanitize.nonemptystring(p.password);
  sanitize.integer(p.peekMaxMails);
  p.errorCallback = function(e)
  {
    socket.close();
    errorCallback(e);
  };

  var socket = new POP3ClientSocket(p);
  //socket.protocolDebug = true;
  socket.openSocket(function()
  {
    socket.registerReceivePOP3Callback(function(msg, fullResp) // wait for server hello
    {
      socket.sendAndReceivePOP3("USER " + p.username, function(msg, fullResp)
      {
        socket.sendAndReceivePOP3("PASS " + p.password, function(msg, fullResp)
        {
          socket.sendAndReceivePOP3("STAT", function(msg, fullResp)
          {
            var words = msg.split(" ");
            var newMailCount = sanitize.integer(words[0]);
            var emails = [];
            // async |for| loop. TODO use new JS |yield|?
            var i = 0;
            var l = Math.min(newMailCount, p.peekMaxMails);
            var sendTOP = function()
            {
              if (i < l) // loop condition
              {
                socket.sendAndReceivePOP3("TOP " + (i + 1) + " 0", function(msg, firstResp)
                {
                  var finish = function(fullText)
                  {
                    try {
                      emails.push(new RFC822Mail(fullText));
                    } catch (e) { errorInBackend(e); }

                    sendTOP(); // loop
                  }

                  var fullText = firstResp.splice(1); // Remove "+OK" line

                  // potentially modifes |fullText|. @returns {Boolean}
                  var checkEnd = function()
                  {
                    var last = fullText.length - 1;
                    if (fullText[last] == "")
                      fullText = fullText.splice(0, last);
                    last = fullText.length - 1;
                    if (fullText[last] == ".")
                    {
                      fullText = fullText.splice(0, last);
                      return true;
                    }
                    return false;
                  }

                  // Given the length, the server may not send it all at once,
                  // but in several hunks. Catch them all using receiveContinuation(),
                  // and stuff them together in fullText, then parse them in finish().
                  // It's done when we receive a line with just "."
                  if (checkEnd())
                    finish(fullText);
                  else
                    socket.registerReceivePOP3ContinuationCallback(function(moreResp)
                    {
                      fullText = fullText.concat(moreResp);
                      if (checkEnd())
                        finish(fullText); // calls sendAndReceive(), which overwrites this receiver
                      // else continue with this receiver
                    });
                });
              }
              else // after loop end
              {
                debug("closing socket");
                successCallback(newMailCount, emails);
                socket.close();
              }
              i++; // loop iteration
            }
            sendTOP();
          });
        });
      });
    });
  }, errorCallback);
}


function pingTest(hostname, port, successCallback, errorCallback)
{
  var socket = new LineSocket({
    hostname : hostname,
    port : port,
    ssl : 1,
    timeout : 10,
    separator : "newline",
    errorCallback : errorCallback,
  });
  socket.protocolDebug = true;
  socket.sendAndReceive("ping", function(inData)
  {
    if (inData[0] == "pong")
    {
      successCallback(1);
      socket.close();
      return;
    }
    else
    {
      errorCallback("did not receive a pong");
      return;
    }
  });
}

/*
pingTest("localhost", 4000, function()
{
  debug("ping test succeeded");
}, errorInBackend);
*/
