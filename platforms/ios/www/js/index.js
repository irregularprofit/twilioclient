var callLength;
var currentCalller;
var connection;
var pushNotification;
var dialBackNumber;

function init() {
    document.addEventListener("deviceready", deviceReady, true);
    document.addEventListener("resume", deviceResume, false);
    checkPreAuth();
    delete init;
}

function checkPreAuth() {
    var form = $("#loginForm");
    if (window.localStorage["email"] != undefined && window.localStorage["password"] != undefined) {
        $("#email", form).val(window.localStorage["email"]);
        $("#password", form).val(window.localStorage["password"]);
        handleLogin();
    }
}

function deviceReady() {
    $("#loginForm").on("submit", handleLogin);
}

function handleLogin() {
    var form = $("#loginForm");
    //disable the button so we can't resubmit while we wait
    $("#submitButton", form).attr("disabled", "disabled");
    var u = $("#email", form).val();
    var p = $("#password", form).val();

    if (u != '' && p != '') {
        $.post("http://my-med-labs-call-center.herokuapp.com/api/users/sign_in", {
            user: {
                email: u,
                password: p
            }
        }, function(res) {
            if (res["success"]) {
                //store
                window.localStorage["email"] = u.toLowerCase();
                window.localStorage["password"] = p;
                window.localStorage["name"] = res["name"];
                window.localStorage["slug"] = res["slug"];
                window.localStorage["token"] = res["token"];           //twilio token
                window.localStorage["auth_token"] = res["auth_token"]; //login token

                twilioDeviceReady();
                onNotificationReady();

                $.mobile.changePage("#dashboardPage", {
                    transition: "slideup",
                    allowSamePageTransition: true
                });
            } else {
                navigator.notification.alert("Your login failed", function() {});
            }
            $("#submitButton").removeAttr("disabled");
        }, "json");
    } else {
        //Thanks Igor!
        navigator.notification.alert("You must enter a email and password", function() {});
        $("#submitButton").removeAttr("disabled");
    }
    return false;
}

function twilioDeviceReady() {
    $("#agentSlug").text(window.localStorage["name"]);

    setupTwilioDevice();

    getAllActiveAgents();
}

function setupTwilioDevice() {
    Twilio.Device.setup(window.localStorage["token"], {
        debug: true
    });
}

function getUpdatedToken() {
    $.get("http://my-med-labs-call-center.herokuapp.com/api/users/get_token", {
        user_email: window.localStorage["email"],
        user_token: window.localStorage["auth_token"]
    }, function(res) {
        if (res["success"] && window.localStorage["slug"] == res["slug"]) {
            window.localStorage["token"] = res["token"];
            setupTwilioDevice();
            return true;
        } else {
            return false;
        }
    }, "json");
}

function isUserOnCall() {
    $.get("http://my-med-labs-call-center.herokuapp.com/api/users/user_on_call", {
        user_email: window.localStorage["email"],
        user_token: window.localStorage["auth_token"]
    }, function(res) {
        if (res["success"]) {
            return true;
        } else {
            return false;
        }
    }, "json");
}

function getAllActiveAgents() {
    $.get("http://my-med-labs-call-center.herokuapp.com/api/users/get_active_agents", {
        user_email: window.localStorage["email"],
        user_token: window.localStorage["auth_token"]
    }, function(res) {
        if (res["success"]) {
            res["users"].forEach(addAgentToList);
            $('ul#users').listview('refresh');

            $("ul#users").on("click", "li", function() {
                conference($(this).attr('rel'), currentCalller);
            });

        } else {
            return false;
        }
    }, "json");
}

function addAgentToList(agent) {
    $('ul#users').append('<li class="ui-li ui-li-static ui-body-inherit ui-btn-active" rel="' + agent["slug"] + '">' + agent["name"] + '</li>');
}

function conference(name, number) {
    $("#log").text("Now dialing to " + name + "...");

    $.post("http://my-med-labs-call-center.herokuapp.com/init_conference", {
        user_email: window.localStorage["email"],
        user_token: window.localStorage["auth_token"],
        agent: name,
        from: number
    });
}

function dial() {
    params = {
        "PhoneNumber": $("#ToNumber").val()
    };
    Twilio.Device.connect(params);
}

function hangup() {
    Twilio.Device.disconnectAll();
    show_call_end_status();
}

function show_call_end_status() {
    var difference = ($.now() - callLength) / 1000;
    if (isNaN(difference)) {
        var message = "Call ended";
    } else {
        var message = "Call ended. Call lasted " + difference + " seconds";
    }

    $("#log").text(message);
}

function accept() {
    connection.accept();
    $("#answerCallDialog").popup( "close" );
    $("#log").text("Successfully established call");
    callLength = $.now();
}

// FIXME: this doesn't work
function decline() {
    connection.disconnect();
    // connection = null;
    $("#answerCallDialog").popup( "close" );
}

function dialBackToServer(from) {
    $.get("http://my-med-labs-call-center.herokuapp.com/api/users/receive_dialback", {
        from: from,
        user_email: window.localStorage["email"],
        user_token: window.localStorage["auth_token"]
    }, function(res) {
        if (res["success"]) {
        }
    }, "json");
}

function shouldDialBackServer() {
    alert("dial back number " + window.localStorage["dial_back_number"]);
    if (window.localStorage["dial_back_number"] != "undefined") {
        dialBackToServer(window.localStorage["dial_back_number"]);
        window.localStorage["dial_back_number"] = "undefined";
    }
}

function deviceResume() {
    shouldDialBackServer();
}

// handle APNS notifications for iOS
function onNotificationAPN(e) {

    alert(e.called_id);
    alert(e.foreground);

    if (e.called_id) {
        window.localStorage["dial_back_number"] = e.called_id;
    }

    if (e.sound) {
        // playing a sound also requires the org.apache.cordova.media plugin
        var snd = new Media(e.sound);
        snd.play();
    }

    if (e.badge) {
        pushNotification.setApplicationIconBadgeNumber(successHandler, e.badge);
    }
}

function sendTokenToServer(result) {
    $.post("http://my-med-labs-call-center.herokuapp.com/api/users/send_push_token", {
        push_notification_token: result,
        user_email: window.localStorage["email"],
        user_token: window.localStorage["auth_token"]
    }, function(res) {
        if (res["success"]) {
        } else {
            navigator.notification.alert("Your login failed", function() {});
        }
    }, "json");
}

function tokenHandler(result) {
    // $("#app-status-ul").append('<li>token: ' + result + '</li>');
    // Your iOS push server needs to know the token before it can push to this device
    // here is where you might want to send it the token for later use.
    sendTokenToServer(result);
}

function successHandler(result) {
    // $("#app-status-ul").append('<li>success:' + result + '</li>');
}

function errorHandler(error) {
    // $("#app-status-ul").append('<li>error:' + error + '</li>');
}

function onNotificationReady() {
    // $("#app-status-ul").append('<li>deviceready event received</li>');

    document.addEventListener("backbutton", function(e) {
        // $("#app-status-ul").append('<li>backbutton event received</li>');
        if ($("#home").length > 0) {
            // call this to get a new token each time. don't call it to reuse existing token.
            //pushNotification.unregister(successHandler, errorHandler);
            e.preventDefault();
            navigator.app.exitApp();
        } else {
            navigator.app.backHistory();
        }
    }, false);

    try {
        pushNotification = window.plugins.pushNotification;
        // $("#app-status-ul").append('<li>registering ' + 'iOS' + '</li>');
        pushNotification.register(tokenHandler, errorHandler, {
            "badge": "true",
            "sound": "true",
            "alert": "true",
            "ecb": "onNotificationAPN"
        }); // required!
    } catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        alert(txt);
    }
}


