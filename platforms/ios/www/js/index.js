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
                window.localStorage["email"] = u;
                window.localStorage["password"] = p;
                window.localStorage["name"] = res["name"];
                window.localStorage["slug"] = res["slug"];
                window.localStorage["token"] = res["token"];

                twilioDeviceReady();
                $.mobile.changePage( "#dashboardPage", { transition: "slideup", allowSamePageTransition: true} );
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


var callLength;
var currentCalller;

function twilioDeviceReady() {
    $("#agentSlug").text(window.localStorage["name"]);

    Twilio.Device.setup(window.localStorage["token"], {
        debug: true
    });
}


function show_call_end_status(conn) {
    var functional_id = ("dialog-confirm" + conn.parameters.From).replace(" ", "-");
    // maybe only close the call that was otherwise picked
    $("#" + functional_id).dialog("close");
    $("#" + functional_id).remove();

    var difference = ($.now() - callLength) / 1000;
    currentCalller = "";

    if (isNaN(difference)) {
        var message = "Call ended";
    } else {
        var message = "Call ended. Call lasted " + difference + " seconds";
    }

    $("#log").text(message);
}

function conference(name, number) {
    $.post("http://my-med-labs-call-center.herokuapp.com/init_conference", {
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

function check_rooms() {
    $.post("http://my-med-labs-call-center.herokuapp.com/check_rooms");
}

function check_logs() {
    $.post("http://my-med-labs-call-center.herokuapp.com/check_logs");
}

function hangup() {
    Twilio.Device.disconnectAll();
}


$("ul#users li").click(function() {
    conference($(this).attr('rel'), currentCalller);
});






