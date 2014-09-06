var callLength;
var currentCalller;
var connection;


function init() {
    document.addEventListener("deviceready", deviceReady, true);
    checkPreAuth();
    delete init;
}

function deviceReady() {
    $("#loginForm").on("submit", handleLogin);
}

function checkPreAuth() {
    var form = $("#loginForm");
    if (window.localStorage["email"] != undefined && window.localStorage["password"] != undefined) {
        $("#email", form).val(window.localStorage["email"]);
        $("#password", form).val(window.localStorage["password"]);
        handleLogin();
    }
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
                window.localStorage["token"] = res["token"];
                window.localStorage["auth_token"] = res["auth_token"];

                twilioDeviceReady();
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
    alert(2);

    alert($("#ToNumber").val());
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
