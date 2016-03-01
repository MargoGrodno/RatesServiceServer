var http = require('http');
var url = require('url');
var listCurrenciesService = require('./listCurrenciesService');
var currencyRateService = require('./currencyRateService');
var tableRateService = require('./tableRateService');
var dateUtils = require('./dateUtils');

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
        var urlDate = getUrlParam(req.url, "date"),
            urlPeriod = getUrlParam(req.url, "period");
        var date = dateUtils.fromJSON(urlDate);
        tableRateService.getTableRates(date, urlPeriod, continueWith);
        return;
    }

    if (urlMethod == "currencyHistory") {
        var urlDateFrom = getUrlParam(req.url, "dateFrom"),
            urlDateTo = getUrlParam(req.url, "dateTo"),
            urlCurrencyAbb = getUrlParam(req.url, "currencyAbb");
        var dateFrom = dateUtils.fromJSON(urlDateFrom),
            dateTo = dateUtils.fromJSON(urlDateTo);
        currencyRateService.getCurrencyHistory(urlCurrencyAbb, dateFrom, dateTo, continueWith);
        return;
    }

    if(urlMethod == "currenciesForGraphics"){
        listCurrenciesService.getListCurrencies(function(res){
            continueWith(res);
        });
        return;
    }

    continueWith(Error("Unsuported method"), 501);
}

function getUrlParam(reqUrl, param) {
    var parts = url.parse(reqUrl, true);
    return parts.query[param];
}

function startServer(port) {
    server.listen(port);
    server.setTimeout(0);
    console.log('Server running at http://localhost:' + port);
}

module.exports = {
    startServer: startServer
};