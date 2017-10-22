// handle so we can clear previous timeouts
var timeoutId;

// ISP URLs
var urls = {
    'internode': 'https://secure.internode.on.net/myinternode/sys1/login'
};

function writeStatus(status) {
    if (status === '') {status = '&nbsp;';}
    document.getElementById('settingsStatus').innerHTML = status;
}

// recall user settings
function loadOptions() {
    var username = localStorage["username"];
    var password = localStorage["password"];

    if (username) {
        document.getElementById("username").value = username;
    }
    if (password) {
        document.getElementById("password").value = password;
    }
}

//function testOptions() {
//    // clear previous settingsStatus text timeouts
//    clearTimeout(timeoutId);
//
//    // test connection
//    var username = document.getElementById("username").value;
//    var password = document.getElementById("password").value;
//
//    if (username == null || username == '' || password == null || password == '') {
//        writeStatus('Incorrect username or password');
//        timeoutId = setTimeout(function() {writeStatus('')}, 2000);
//    } else {
//        var downloadURL = "https://customer-webtools-api.internode.on.net/api/v1.5/";
//        var xmlDocDownload = new XMLHttpRequest();
//
//        writeStatus('Testing...');
//        timeoutId = setTimeout(function () {
//            xmlDocDownload.abort();
//            writeStatus("Connection timed out");
//        }, 10000);
//
//        xmlDocDownload.open("GET", downloadURL, true, username, password);
//        xmlDocDownload.onreadystatechange = function () {
//            clearTimeout(timeoutId);
//            if (xmlDocDownload.readyState == 4) {
//                if (xmlDocDownload.status == 200) {
//                    writeStatus("Connection worked!");
//                } else if (xmlDocDownload.status == 401) {
//                    writeStatus("Incorrect username or password");
//                } else {
//                    writeStatus("Could not connect");
//                }
//                timeoutId = setTimeout(function () {
//                    writeStatus('');
//                }, 2000);
//            }
//        };
//        xmlDocDownload.send(null);
//    }
//}

// show broadband plan details
function testOptions() {
    // clear previous settings status timeouts
    clearTimeout(timeoutId);

    var username = document.getElementById("username").value;
    var password = document.getElementById("password").value;

    if (username === null || username === '' || password === null || password === '') {
        writeStatus('Incorrect username or password');
    } else {
        var downloadURL = "https://customer-webtools-api.internode.on.net/api/v1.5/";
        var xmlDocDownload = new XMLHttpRequest();

        writeStatus('Fetching data...');

        timeoutId = setTimeout(function () {
            xmlDocDownload.abort();
            writeStatus("Connection timed out");
        }, 10000);

        xmlDocDownload.open("GET", downloadURL, true, username, password);
        xmlDocDownload.onreadystatechange = function () {
            clearTimeout(timeoutId);
            if (xmlDocDownload.readyState === 4) {
                if (xmlDocDownload.status === 200) {

                    var xmlDownload = xmlDocDownload.responseXML;
                    if (xmlDownload.getElementsByTagName("service")[0].childNodes[0].nodeValue !== null) {
                        // remember service number
                        serviceNo = xmlDownload.getElementsByTagName("service")[0].childNodes[0].nodeValue;

                        var serviceURL = "https://customer-webtools-api.internode.on.net/api/v1.5/" + serviceNo + "/service";

                        // get service XML
                        var xmlDocService = new XMLHttpRequest();
                        xmlDocService.open("GET", serviceURL, true);
                        xmlDocService.onreadystatechange = function () {
                            if (xmlDocService.readyState === 4 && xmlDocService.status === 200) {
                                var xmlService = xmlDocService.responseXML;
                                if (xmlService.getElementsByTagName("service") !== null) {
                                    document.getElementById('detailPlan').innerHTML = xmlService.getElementsByTagName('plan')[0].childNodes[0].nodeValue;
                                    document.getElementById('detailQuota').innerHTML = xmlService.getElementsByTagName('quota')[0].childNodes[0].nodeValue + ' B';
                                    document.getElementById('detailRating').innerHTML = xmlService.getElementsByTagName('usage-rating')[0].childNodes[0].nodeValue;
                                    document.getElementById('detailSpeed').innerHTML = xmlService.getElementsByTagName('speed')[0].childNodes[0].nodeValue;
                                    document.getElementById('detailRollover').innerHTML = xmlService.getElementsByTagName('rollover')[0].childNodes[0].nodeValue;
                                    document.getElementById('detailCharged').innerHTML = xmlService.getElementsByTagName('excess-charged')[0].childNodes[0].nodeValue;
                                    document.getElementById('detailShaped').innerHTML = xmlService.getElementsByTagName('excess-shaped')[0].childNodes[0].nodeValue;
                                    document.getElementById('detailRestricted').innerHTML = xmlService.getElementsByTagName('excess-restrict-access')[0].childNodes[0].nodeValue;
                                    document.getElementById('detailCost').innerHTML = '$' + xmlService.getElementsByTagName('plan-cost')[0].childNodes[0].nodeValue;
                                    document.getElementById('details').style.display = "block";
                                    writeStatus("Connection worked!");
                                    timeoutId = setTimeout(function () {
                                        writeStatus('');
                                    }, 2000);
                                }
                            }
                        };
                        xmlDocService.send(null);
                    }

                } else if (xmlDocDownload.status === 401) {
                    writeStatus("Incorrect username or password");
                    timeoutId = setTimeout(function () {
                        writeStatus('');
                    }, 2000);
                } else {
                    writeStatus("Could not connect");
                    timeoutId = setTimeout(function () {
                        writeStatus('');
                    }, 2000);
                }
            }
        };
        xmlDocDownload.send(null);
    }
}

// save user settings
function saveOptions() {
    // clear previous settings status timeouts
    clearTimeout(timeoutId);

    var username = document.getElementById("username").value;
    var password = document.getElementById("password").value;

    //if (username == null || username == "" || password == null || password == "") {
		//// fails if empty username or password
    //    writeStatus("Incorrect username or password");
    //    timeoutId = setTimeout(function() {
    //        writeStatus('')
    //    }, 2000);
    //} else {
    localStorage["username"] = username;
    localStorage["password"] = password;
    writeStatus("Settings saved!");
    timeoutId = setTimeout(function() {
        writeStatus('')
    }, 2000);
    //}
}

// open ISP login page
function openLoginPage() {
    var win = window.open(urls[document.getElementById('ISP').value], '_blank');
    win.focus();
}

function onClickTest(e) {
    setTimeout(testOptions, 100);
}

function onClickSave(e) {
    setTimeout(saveOptions, 100);
}

//function onClickShow(e) {
//    setTimeout(showPlanDetails, 100);
//}

function onClickOpen(e) {
    setTimeout(openLoginPage, 100);
}

// arm buttons
document.addEventListener("DOMContentLoaded", function() {
    document.getElementById('details').style.display = "none";
    document.getElementById("testButton").addEventListener("click", onClickTest);
    document.getElementById("saveButton").addEventListener("click", onClickSave);
    document.getElementById("openButton").addEventListener("click", onClickOpen);
    loadOptions();
});

