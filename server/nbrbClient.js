var soap = require('soap');
var Promise = require('promise');
var serviceUrl = 'http://nbrb.by/Services/ExRates.asmx?WSDL';

var serviceClient = (function() {

    var _getClient = function() {
        return new Promise(function(resolve, reject) {
            soap.createClient(serviceUrl, function(err, _client) {
                console.log("client done!");
                resolve(_client);
            });
        });
    };

    return _getClient().then(function(_client) {
        return _client;
    });

})();

function getExRatesDaily(date, continueWith) {
    var onDate = makeDateYYYYMMDD(date);
    var args = {
        onDate: onDate
    };

    serviceClient
        .then(function(client) {
            client.ExRatesDaily(args, function(err, result) {
                continueWith(result.ExRatesDailyResult.diffgram.NewDataSet.DailyExRatesOnDate);
            });
        });
}

function getExRatesMonthly(date, continueWith) {
    var onDate = makeDateYYYYMMDD(date);

    var args = {
        onDate: onDate
    };

    serviceClient
        .then(function(client) {
            client.ExRatesMonthly(args, function(err, result) {
                continueWith(result.ExRatesMonthlyResult.diffgram.NewDataSet.MonthlyExRatesOnDate);
            });
        });
}

function getExRatesDyn(curId, fromDate, toDate, continueWith) {
    var from = makeDateYYYYMMDD(fromDate);
    var to = makeDateYYYYMMDD(toDate)

    var args = {
        curId: curId,
        fromDate: from,
        toDate: to
    };

    serviceClient
        .then(function(client) {
            client.ExRatesDyn(args, function(err, result) {
                continueWith(result.ExRatesDynResult.diffgram.NewDataSet.Currency);
            });
        });
}

function getLastExRatesDate(periodicity, continueWith) {
    var args = {
        Periodicity: periodicity
    };

    serviceClient
        .then(function(client) {
            client.LastDailyExRatesDate(args, function(err, result) {
                continueWith(result.LastDailyExRatesDateResult);
            });
        });
}

function getCurrenciesRef(periodicity, continueWith) {
    var args = {
        Periodicity: periodicity
    };

    serviceClient
        .then(function(client) {
            client.CurrenciesRef(args, function(err, result) {
                if (periodicity == 0) {
                    var res = result.CurrenciesRefResult.diffgram.NewDataSet.DailyCurrenciesRef;
                }
                if (periodicity == 1) {
                    var res = result.CurrenciesRefResult.diffgram.NewDataSet.MonthlyCurrenciesRef;
                }
                continueWith(res);
            });
        })
};

function makeDateYYYYMMDD(dateIncome) {
    if (!(dateIncome instanceof Date)) {
        var date = dateFromJSON(dateIncome);
    } else {
        var date = dateIncome;
    }
    var dd = date.getDate();
    var mm = date.getMonth() + 1; //January is 0!
    var yyyy = date.getFullYear();

    if (dd < 10) {
        dd = '0' + dd
    }
    if (mm < 10) {
        mm = '0' + mm
    }
    return yyyy + '-' + mm + '-' + dd;
}


module.exports = {
    getExRatesDaily: getExRatesDaily,
    getExRatesMonthly: getExRatesMonthly,
    getExRatesDyn: getExRatesDyn,
    getLastExRatesDate: getLastExRatesDate,
    getCurrenciesRef: getCurrenciesRef
};
