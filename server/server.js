var http = require('http');
var url = require('url');
var ratesService = require('./ratesService');
var getIp = require('./getIp');

var ip = getIp();

var startTime = new Date();

var server = http.createServer(function(req, res) {
    console.log('method: ' + req.method + ", " + req.url);

    if (req.method != "GET") {
        responseWith(res, Error("Unsuported http request"), 501);
        return;
    }

    getHandler(req, res, function(err, statusCode) {
        responseWith(res, err, statusCode);
    });
});

function responseWith(response, body, statusCode) {
    if (body instanceof Error) {
        responseWithError(response, body, statusCode);
        return;
    }
    var statusCode = 200;
    response.writeHeader(statusCode, {
        'Access-Control-Allow-Origin': '*'
    });
    if (body) {
        response.write(JSON.stringify(body));
    }
    response.end();
}

function responseWithError(response, err, statusCode) {
    if (statusCode == undefined) {
        statusCode = 400;
    }
    response.writeHeader(statusCode, {
        'Access-Control-Allow-Origin': '*'
    });
    response.write(JSON.stringify(err.message));
    response.end();
}

function minusDays(dateIncome, days) {
    var date = new Date(dateIncome);
    if (isNaN(date.valueOf())) {
        console.log(dateIncome + " is not a Date");
        return;
    }
    var prevDate = new Date(date);
    prevDate.setDate(date.getDate() - parseInt(days, 10));
    return prevDate;
}

function getHandler(req, res, continueWith) {
    if (req.url == "/") {
        continueWith({
            status: "Running",
            startTime: startTime
        });
        return;
    }

    var urlMethod = getUrlParam(req.url, "method");

    if (urlMethod == "tableRates") {
        var urlDate = getUrlParam(req.url, "date");
        var urlPeriod = getUrlParam(req.url, "period");
        var prevDate = minusDays(urlDate, urlPeriod);
        getTableRates(urlDate, prevDate, continueWith);
        return;
    }
    continueWith(Error("Unsuported method"), 501);
}

function getTableRates(date, prevDate, continueWith) {
    ratesService.getExRatesDaily(date, function(resultPrimary) {
        ratesService.getExRatesDaily(prevDate, function(resultPrev) {
            var result = [];
            var change = 0;
            for (var i = 0; i < resultPrimary.length; i++) {
                var abbreviation = resultPrimary[i].Cur_Abbreviation;
                var rate = resultPrimary[i].Cur_OfficialRate;

                var prevRate = resultPrev.filter(function(obj) {
                    return obj.Cur_Abbreviation == abbreviation;
                });
                if(prevRate.length != 0){
                    change = parseFloat((rate - prevRate[0].Cur_OfficialRate).toFixed(2));   
                }
                else {
                    change = "undef";
                }
                
                result.push({
                    abbreviation: resultPrimary[i].Cur_Abbreviation,
                    name: resultPrimary[i].Cur_QuotName,
                    rate: parseFloat(rate),
                    change: change
                });
            };
            
            continueWith(result);
        });
    });
}

function getUrlParam(reqUrl, param) {
    var parts = url.parse(reqUrl, true);
    return parts.query[param];
}

function startServer(port) {
    server.listen(port, ip);
    server.setTimeout(0);
    console.log('Server running at http://' + ip + ':' + port);
}

module.exports = {
    startServer: startServer
};