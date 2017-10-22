// Some icons by Yusuke Kamiyamane http://p.yusukekamiyamane.com/. Licensed under a Creative Commons Attribution 3.0
// License.

// todo
// Check logic of usage array
// bug where negative data remaining shows NaN (ie over quota)
// remove xmlhttp listener after call

const VERSION = 'WhatsTheUsage/0.0.4';

// for local testing only
// if enabled also need to add "http://127.0.0.1/tests/*/" to manifest file
var testing = false;

// pad number n with a leading zero if less than 10
function padWithZero(n) {
    return (n < 10) ? ("0" + n) : n;
}

// returns the number of days in the specified month (both 1-based)
function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

// get nice date string
function getNiceDateString(date) {
    var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return days[date.getDay()] + ", " + date.getDate() + " " + months[date.getMonth()];
}

function sameDay(dateA, dateB) {
    return (dateA.getDate() === dateB.getDate() &&
        dateA.getMonth() === dateB.getMonth() &&
        dateA.getFullYear() === dateB.getFullYear())
}

//// get date in Internode XML format, e.g. 2014-08-29
//function getInternodeDateString(date) {
//    return date.getFullYear() + "-" + padWithZero(date.getMonth() + 1) + "-" + padWithZero(date.getDate());
//}

// get number as data size (1000, not 1024)
function getDataStringFromBytes(bytes) {
    if (bytes === -1) {
        return "no data";
    } else {
        var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 B';
        var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1000)), 10);
        return (bytes / Math.pow(1000, i)).toPrecision(3) + ' ' + sizes[i];
    }
}

function calculateUsageStats(rolloverDate, quota, usage, historyUsage, historyDates) {
    var theDate = new Date();
    var thisYear = theDate.getFullYear();       // today's year
    var thisMonth = theDate.getMonth() + 1;     // today's month (converted to 1-based)
    var thisDay = theDate.getDate();            // today's day
    var rolloverDay = rolloverDate.getDate();   // rollover day
    var daysThisCycle;
    var daysElapsed;

    if (thisDay < rolloverDay) {
    // rollover will happen this month
        daysThisCycle = getDaysInMonth(thisYear, thisMonth - 1);    // previous month
        daysElapsed = thisDay - rolloverDay + daysThisCycle + 1;    // make "1-based"
    } else {
    // rollover will happen next month
        daysThisCycle = getDaysInMonth(thisYear, thisMonth);        // current month
        daysElapsed = thisDay - rolloverDay + 1;                    // make "1-based"
    }

    // dates and usage arrays potentially have gaps, so make new arrays that have no date gaps
    var completeHistoryUsage = [];
    var completeHistoryDates = [];

    // make usage array
    for (var i = 0; i < daysThisCycle; i++) {
        completeHistoryUsage.push(-1);
    }

    // make date array
    for (var j = 0; j < daysThisCycle; j++) {
        completeHistoryDates.push(new Date(+ new Date - j * 86400000));
        // check there is a date for each of the complete dates and if there is overwrite the usage data for that date
        for (var k = 0; k < historyDates.length; k++) {
            if (sameDay(completeHistoryDates[j], historyDates[k])) {
                completeHistoryUsage[j] = historyUsage[k];
            }
        }
    }

    // pixel gap between blocks i.e. the block height
    var pixelsPerDay = 8;

    // round to nearest 0.25 days
    var usageAsDays = (Math.round(usage / quota * daysThisCycle * 4) / 4).toFixed(2);

    // calculate total block height to offset elements when drawing
    // totalBlocks (rounded up to whole block)
    var totalBlocks;
    if (usageAsDays > daysThisCycle) {
        totalBlocks = usageAsDays;
    } else {
        totalBlocks = daysThisCycle;
    }

    // default is showing total usage
    setDivHeightPosition(totalBlocks, pixelsPerDay);
    drawMarkers(usage, daysElapsed, usageAsDays, totalBlocks, pixelsPerDay, true);
    drawTotalUsage(quota, usage, daysThisCycle, daysElapsed, usageAsDays, totalBlocks, pixelsPerDay);
    drawDailyUsage(quota, usage, completeHistoryUsage, daysThisCycle, daysElapsed, usageAsDays, totalBlocks, pixelsPerDay);
    drawStats(usage, quota, daysElapsed, daysThisCycle);

    document.getElementById("icon1").style.height = "35px";
    document.getElementById("icon1").innerHTML = "<img src='img/cookie.png'>";
    document.getElementById("icon2").innerHTML = "<img src='img/cal.png'>";
    document.getElementById("blocksDaily").style.webkitFilter  = "opacity(0%)";

    // show daily detail view on rollover
    document.getElementById("blocksDaily").onmouseenter = function () {
        document.getElementById("blocksTotal").style.webkitFilter  = "opacity(0%)";
        document.getElementById("blocksDaily").style.webkitFilter  = "opacity(100%)";

        //clearBlocksDiv();
        document.getElementById("blocksDaily").style.cursor = "none";
    };

    // show default view on rollout
    document.getElementById("blocksDaily").onmouseleave = function () {
        document.getElementById("blocksTotal").style.webkitFilter  = "opacity(100%)";
        document.getElementById("blocksDaily").style.webkitFilter  = "opacity(0%)";

        // todo - this needed?
        drawStats(usage, quota, daysElapsed, daysThisCycle);

        document.getElementById("blocksDaily").style.cursor = "auto";
    };
}

// set container div height and position stats divs to accommodate number of blocks
function setDivHeightPosition(totalBlocks, pixelsPerDay) {
    var heightFromTop = totalBlocks * pixelsPerDay + 52;
    document.getElementById("container").style.height = heightFromTop + 95 + "px";
    //document.getElementById("markers").style.height = heightFromTop + "px";
    //document.getElementById("blocksTotal").style.height = heightFromTop + "px";
    document.getElementById("stats").style.top = heightFromTop + 12 + "px";
}

// draw loading graphic
function drawLoading() {
    document.getElementById("usageStats").innerHTML = "Fetching usage data...";
    document.getElementById("icon1").innerHTML = "<img src='img/load.gif'>";
}

function drawLoadingWarning(warning) {
    document.getElementById("icon1").innerHTML = "";
    if (warning === 'login') {
        document.getElementById("dayStats").innerHTML = "Incorrect username or password.";
        document.getElementById("icon2").innerHTML = "<img src='img/exclamation.png'>";
    } else if (warning === 'other') {
        document.getElementById("dayStats").innerHTML = "Could not connect, please try again.";
        document.getElementById("icon2").innerHTML = "<img src='img/exclamation.png'>";
    }
}

//// draw drop shadow under bottom block
//function drawBlockShadow(totalBlocks, pixelsPerDay) {
//
//    // make image
//    var blockShadow = new Image();
//    blockShadow.src = "img/block_shadow.png";
//    blockShadow.style.opacity = "0.75";
//
//    // draw drop shadow under bottom block
//    var div = document.createElement("div");
//    div.style.position = "absolute";
//    div.style.top = totalBlocks * pixelsPerDay + "px";
//    div.style.left = "18px";
////    div.appendChild(blockShadow.cloneNode(false));
//    document.getElementById("blocksTotal").appendChild(div);
//}

// draw all marker stuff
function drawMarkers(usage, daysElapsed, usageAsDays, totalBlocks, pixelsPerDay, showUsageMarker) {
    // make image
    var dayMarker = new Image();
    var usageMarker = new Image();
    dayMarker.src = "img/marker_right.png";
    usageMarker.src = "img/marker_left.png";

    // draw today marker and text
    var dayDiv = document.createElement("div");
    var usageDiv = document.createElement("div");

    dayDiv.style.position = usageDiv.style.position = "absolute";

    // set marker heights based on day and usage
    dayDiv.style.top = (totalBlocks - daysElapsed + 1) * pixelsPerDay + "px";
    usageDiv.style.top = (totalBlocks - usageAsDays + 0.5) * pixelsPerDay + "px";

    // account for single digit label width
    if (daysElapsed < 10) { dayDiv.style.left = "7px"; }
    usageDiv.style.left = "110px"; // minus30

    // add content
    dayDiv.appendChild(document.createTextNode("Day " + daysElapsed));
    dayDiv.appendChild(dayMarker.cloneNode(false));
    // TODO usageDiv.appendChild(usageMarker.cloneNode(false));
    // TODO usageDiv.appendChild(document.createTextNode(getDataStringFromBytes(usage)));

    // add to doc
    document.getElementById("markers").innerHTML = "";
    document.getElementById("markers").appendChild(dayDiv);
    if (showUsageMarker) {
        document.getElementById("markers").appendChild(usageDiv);
    }
}

// draw stats
function drawStats(usage, quota, daysElapsed, daysThisCycle) {

    // set text for each table row
    document.getElementById("usageStats").innerHTML = "<b>Data usage</b> <br>" + getDataStringFromBytes(usage) + " of " + getDataStringFromBytes(quota);// + "<br>" + getDataStringFromBytes(quota - usage) + " left";
    document.getElementById("dayStats").innerHTML = "<b>Day of cycle</b> <br>" + daysElapsed + " of " + daysThisCycle;
}

// draw standard usage column
function drawTotalUsage(quota, usage, daysThisCycle, daysElapsed, usageAsDays, totalBlocks, pixelsPerDay) {

    // draw icon badge
    // set blue if in quota, red if above, yellow if over
    if (usageAsDays < daysElapsed) {
        chrome.browserAction.setBadgeBackgroundColor({color:[0, 0, 255, 100]});
    } else if (usageAsDays < daysThisCycle) {
        chrome.browserAction.setBadgeBackgroundColor({color:[255, 0, 0, 100]});
    } else {
        chrome.browserAction.setBadgeBackgroundColor({color:[0, 0, 0, 100]});
    }
    var pc = Math.round(100 * usage/quota) + '%';
    chrome.browserAction.setBadgeText({text: pc});

    // image stuff
    var blank = new Image();
    var blockUsedNone = new Image();
    var blockUsed025 = new Image();
    var blockUsed050 = new Image();
    var blockUsed075 = new Image();
    var blockUsed100 = new Image();
    var blockAheadNone = new Image();
    var blockAhead025 = new Image();
    var blockAhead050 = new Image();
    var blockAhead075 = new Image();
    var blockAhead100 = new Image();
    var blockAheadOver = new Image();
    var blockOver025 = new Image();
    var blockOver050 = new Image();
    var blockOver075 = new Image();
    var blockOver100 = new Image();
    blank.src = "img/blank.png";
    //blockUsedNone.src = "img/block_used_100_0007.png";
    blockUsedNone.src = "img/block_empty_100_0007.png";
    blockUsed025.src = "img/block_used_025_0007.png";
    blockUsed050.src = "img/block_used_050_0007.png";
    blockUsed075.src = "img/block_used_075_0007.png";
    blockUsed100.src = "img/block_used_100_0007.png";
    blockAheadNone.src = "img/block_empty_100_0007.png";
    blockAhead025.src = "img/block_ahead_025_0007.png";
    blockAhead050.src = "img/block_ahead_050_0007.png";
    blockAhead075.src = "img/block_ahead_075_0007.png";
    blockAhead100.src = "img/block_ahead_100_0007.png";
    blockOver025.src = "img/block_over_025_0007.png";
    blockOver050.src = "img/block_over_050_0007.png";
    blockOver075.src = "img/block_over_075_0007.png";
    blockOver100.src = "img/block_over_100_0007.png";
    blockUsedNone.style.opacity = "0.15";
    blockUsed025.style.opacity = blockUsed050.style.opacity = blockUsed075.style.opacity = blockUsed100.style.opacity = "1";
    blockAheadNone.style.opacity = "0.15";
    blockAhead025.style.opacity = blockAhead050.style.opacity = blockAhead075.style.opacity = blockAhead100.style.opacity = "1";
    blockOver025.style.opacity = blockOver050.style.opacity = blockOver075.style.opacity = blockOver100.style.opacity = "1";

    // draw whole, fractional, and empty usage blocks within quota
    for (var day = 0; day < totalBlocks; day ++) {

        // each block has its own div
        var div = document.createElement("div");
        div.style.position = "absolute";
        div.style.top = (totalBlocks - day - 1) * pixelsPerDay;

        var emptyBlock;
        var block025;
        var block050;
        var block075;
        var block100;

        // if behind average usage rate
        if (day < daysElapsed) {
            emptyBlock = blockUsedNone.cloneNode(false);
            block025 = blockUsed025.cloneNode(false);
            block050 = blockUsed050.cloneNode(false);
            block075 = blockUsed075.cloneNode(false);
            block100 = blockUsed100.cloneNode(false);
        // if ahead of average usage rate
        } else if (day < daysThisCycle) {
            emptyBlock = blockAheadNone.cloneNode(false);
            block025 = blockAhead025.cloneNode(false);
            block050 = blockAhead050.cloneNode(false);
            block075 = blockAhead075.cloneNode(false);
            block100 = blockAhead100.cloneNode(false);
        // if above quota
        } else {
            emptyBlock = blank.cloneNode(false);
            block025 = blockOver025.cloneNode(false);
            block050 = blockOver050.cloneNode(false);
            block075 = blockOver075.cloneNode(false);
            block100 = blockOver100.cloneNode(false);
        }

        // make fractional and empty blocks overlay properly within a single div
        emptyBlock.style.position = "absolute";
        emptyBlock.style.top = "0px";
        emptyBlock.style.left = "0px";

        // whole day block
        if (day + 1 <= usageAsDays) {
            div.appendChild(block100);

        // at least 75% of a day block
        } else if (day + 0.75 <= usageAsDays) {
            div.appendChild(emptyBlock);
            div.appendChild(block075);

        // at least 50% of a day block
        } else if (day + 0.50 <= usageAsDays) {
            div.appendChild(emptyBlock);
            div.appendChild(block050);

        // at least 25% of a day block
        } else if (day + 0.25 <= usageAsDays) {
            div.appendChild(emptyBlock);
            div.appendChild(block025);

        } else {
            div.appendChild(emptyBlock);
        }
        document.getElementById("blocksTotal").appendChild(div);
    }
}

// draw daily history usage column
function drawDailyUsage(quota, usage, completeHistoryUsage, daysThisCycle, daysElapsed, usageAsDays, totalBlocks, pixelsPerDay) {
    // image stuff
    var blockUsedArr = [];
    var blockEmptyArr = [];

    // there are 21 possible images to represent usage within a day
    for (var i = 0; i < 21; i++) {
        blockUsedArr[i] = new Image();
        blockEmptyArr[i] = new Image();
        blockUsedArr[i].src = "img/block_used_100_00" + padWithZero(i + 1) + ".png";
        blockEmptyArr[i].src = "img/block_empty_100_00" + padWithZero(i + 1) + ".png";
    }

    // find max usage of any day in current cycle
    // and create arrays
    var maxUsage = 1;    // small number to avoid div/zero
    var usageArr = [];
    var leftPerDay;
    var day;

    // average usage left per day (beyond this day?)
    // if no days left, make it zero (instead of div by zero/negative)
    if (daysThisCycle <= daysElapsed) {
        leftPerDay = 0;
    // if we haven't gone over quota calculate a real left per day amount
    } else if (daysThisCycle > usageAsDays) {
        leftPerDay = Math.round((quota - usage) / (daysThisCycle - daysElapsed));
    // if we have gone over quota, make left per day zero (instead of negative)
    } else {
        leftPerDay = 0;
    }

    // loop backwards to get right number of data usage points in right order
    for (day = 0; day < daysElapsed; day++) {

        var daysUsage = completeHistoryUsage[daysElapsed - day - 1];
        usageArr.push(daysUsage);

        // find highest usage value to normalise all usage values to for drawing
        if (daysUsage > maxUsage) {
            maxUsage = daysUsage;
        }
    }

    // increase max usage to normalise by in case highest usage value is average usage remaining (leftPerDay)
    if (leftPerDay > maxUsage) {
        maxUsage = leftPerDay;
    }
    var normLeftPerDay = Math.round(leftPerDay / maxUsage * 20);

    // usages normalised to 20 for images
    var normUsageArr = [];
    for (day = 0; day < usageArr.length; day++) {
        normUsageArr.push(Math.round(usageArr[day] / maxUsage * 20));
    }

    // loop for each day of this cycle
    for (day = 0; day < daysThisCycle; day++) {

        // each block has its own div
        var div = document.createElement("div");
        div.style.position = "absolute";
        div.style.top = (totalBlocks - day - 1) * pixelsPerDay;
        div.day = day;

        // what was/is/will be the date on the day "day"
        // calculate it fresh, don't rely on usage history list
        var dayDate = new Date(+ new Date + (day - daysElapsed + 1) * 86400000);
        // write 'today' if it is today
        var appendTodayStr = "";
        if ((day - daysElapsed + 1) === 0) {
            appendTodayStr = " (today)";
        }
        div.dayStatsStr = "<b>Date</b><br>" + getNiceDateString(dayDate) + appendTodayStr;

        // check if usage history arrays have entries for this day
        // if so this day is current/in the past
        var block;
        if (day < usageArr.length) {
            div.usage = usageArr[day];
            // draw block
            block = blockUsedArr[normUsageArr[day]].cloneNode(false);
            // block style
            div.onOutStyle = "";
            // usage stats text
            div.usageStatsStr = "<b>Usage on day</b><br>" + getDataStringFromBytes(div.usage);
        // this day is in the future
        } else {
            div.usage = leftPerDay;
            // draw block
            block = blockEmptyArr[normLeftPerDay].cloneNode(false);    //todo - array index too high (21)
            // block style
            div.style.webkitFilter = "opacity(15%)";
            div.onOutStyle = "opacity(15%)";
            // usage stats text
            div.usageStatsStr = "<b>Usage left per day</b><br>" + getDataStringFromBytes(div.usage);
        }

        div.onmouseover = function () {
            // set rollover style
            this.style.webkitFilter  = "brightness(60%)";
            // write stats text
            document.getElementById("usageStats").innerHTML = this.usageStatsStr;
            document.getElementById("dayStats").innerHTML = this.dayStatsStr;
            // draw daily markers
            drawMarkers(usage, this.day + 1, usageAsDays, totalBlocks, pixelsPerDay);
        };
        div.onmouseout = function () {
            // reset style
            this.style.webkitFilter = this.onOutStyle;
            // reset markers
            drawMarkers(usage, daysElapsed, usageAsDays, totalBlocks, pixelsPerDay, true);
        };
        div.appendChild(block);

        document.getElementById("blocksDaily").appendChild(div);
    }
}

// get usage stats from Internode
// If you wish to create your own usage meter interface, do not copy the interface from this program, please contact
// Internode via http://www.internode.on.net/contact/support/ for the API document
function fetchInternodeUsageData(username, password, errorTimeoutId) {
    var downloadURL;
    var usageURL;
    var historyURL;
    var serviceNo;

    if (testing) {
        downloadURL = "http://127.0.0.1:8000/tests/download.xml";
    } else {
        downloadURL = "https://customer-webtools-api.internode.on.net/api/v1.5/";
    }

    // get download.xml
    var xmlDocDownload = new XMLHttpRequest();
    xmlDocDownload.open("GET", downloadURL, true, username, password);
    xmlDocDownload.onreadystatechange = function() {
        if (xmlDocDownload.readyState === 4) {
            if (xmlDocDownload.status === 200) {
                var xmlDownload = xmlDocDownload.responseXML;
                if (xmlDownload.getElementsByTagName("service")[0].childNodes[0].nodeValue !== null) {

                    // remember service number
                    serviceNo = xmlDownload.getElementsByTagName("service")[0].childNodes[0].nodeValue;

                    if (testing) {
                        usageURL =   "http://127.0.0.1:8000/tests/usage.xml";
                        historyURL = "http://127.0.0.1:8000/tests/history.xml";
                    } else {
                        usageURL =   "https://customer-webtools-api.internode.on.net/api/v1.5/" + serviceNo + "/usage";
                        historyURL = "https://customer-webtools-api.internode.on.net/api/v1.5/" + serviceNo + "/history";
                    }

                    // get usage XML
                    var xmlDocUsage = new XMLHttpRequest();
                    xmlDocUsage.open("GET", usageURL, true);
                    xmlDocUsage.onreadystatechange = function () {
                        if (xmlDocUsage.readyState === 4 && xmlDocUsage.status === 200) {
                            var xmlUsage = xmlDocUsage.responseXML;
                            if (xmlUsage.getElementsByTagName("service") !== null) {

                                // remember usage data
                                var rolloverDate = new Date(xmlUsage.getElementsByTagName("traffic")[0].getAttribute("rollover"));
                                var quota = parseInt(xmlUsage.getElementsByTagName("traffic")[0].getAttribute("quota"));
                                var usage = parseInt(xmlUsage.getElementsByTagName("traffic")[0].childNodes[0].nodeValue);

                                // get history XML
                                var xmlDocHistory = new XMLHttpRequest();
                                xmlDocHistory.open("GET", historyURL, true);
                                xmlDocHistory.onreadystatechange = function () {
                                    if (xmlDocHistory.readyState === 4 && xmlDocHistory.status === 200) {
                                        var xmlHistory = xmlDocHistory.responseXML;
                                        if (xmlHistory.getElementsByTagName("service") !== null) {

                                            // clear error timeout as we passed
                                            window.clearTimeout(errorTimeoutId);

                                            // get usage and date history
                                            var historyElements = xmlHistory.getElementsByTagName("usage");

                                            // get arrays of date (Date object) and usage (integer) for the last 40 elements (will cover at least 40 days in time)
                                            // some dates may be missing, but usage/date elements of arrays always appear to be in sync
                                            var historyDates = [];
                                            var historyUsage = [];
                                            for (var i = historyElements.length - 1; i >= historyElements.length - 40; i--) {
                                                historyUsage.push(parseInt(historyElements[i].getElementsByTagName("traffic")[0].childNodes[0].nodeValue));
                                                historyDates.push(new Date(historyElements[i].getAttribute("day")));
                                            }

                                            // process data
                                            calculateUsageStats(rolloverDate, quota, usage, historyUsage, historyDates);
                                        }
                                    }
                                };
                                xmlDocHistory.send(null);
                            }
                        }
                    };
                    xmlDocUsage.send(null);
                }
            } else if (xmlDocDownload.status === 401) {
                window.clearTimeout(errorTimeoutId);
                drawLoadingWarning('login');
            } else {
                window.clearTimeout(errorTimeoutId);
                drawLoadingWarning('other');
            }
        }
    };
    xmlDocDownload.send(null);
}

// load script
document.addEventListener("DOMContentLoaded", function() {
    // modify user agent
    chrome.webRequest.onBeforeSendHeaders.addListener(
        function(info) {
            // Replace the User-Agent header
            var headers = info.requestHeaders;
            headers.forEach(function(header, i) {
                if (header.name.toLowerCase() === 'user-agent') {
                    header.value = VERSION;
                }
            });
            return {requestHeaders: headers};
        },
        // request filter
        {
            // modify the headers for these pages
            urls: ["https://customer-webtools-api.internode.on.net/api/*"],
            // in the main window and frames
            types: ["xmlhttprequest"]
        },
        ["blocking", "requestHeaders"]
    );

    // draw "loading" text
    drawLoading();

    // set loading timeout
    var errorTimeoutId = window.setTimeout(function() {
        drawLoadingWarning('other');
    }, 7500);

    // try and fetch usage, if successful error timeout will be cleared
    var username = localStorage["username"];
    var password = localStorage["password"];

    fetchInternodeUsageData(username, password, errorTimeoutId);
});

