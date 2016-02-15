var soap = require('soap');

var serviceUrl = 'http://nbrb.by/Services/ExRates.asmx?WSDL';


function makeCorrectDate(dateIncome) {
    var date = new Date(dateIncome);
    if (isNaN(date.valueOf())) {
        console.log(curr + " is not a Date");
        return;
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

var serviceClient;

function getOrCreateClient(continueWith) {
    if (serviceClient != undefined) {
        continueWith(serviceClient);
        return;
    }

    function createSoapClient() {
        soap.createClient(serviceUrl, function(err, client) {
            if (!client) {
                console.log("client creating failed");
                setTimeout(createSoapClient, 500);
                return;
            }
            serviceClient = client;
            console.log("client created!!!!");
            continueWith(client);
        });
    }
    createSoapClient();
}

function getCurrenciesRef(periodicity, continueWith) {
    var args = {
        Periodicity: periodicity
    };

    getOrCreateClient(function(client) {
        client.CurrenciesRef(args, function(err, result) {
            if (periodicity == 0) {
                var res = result.CurrenciesRefResult.diffgram.NewDataSet.DailyCurrenciesRef;
            }
            if (periodicity == 1) {
                var res = result.CurrenciesRefResult.diffgram.NewDataSet.MonthlyCurrenciesRef;
            }
            continueWith(res);
        });
    });
};

function getExRatesDaily(date, continueWith) {
    var onDate = makeCorrectDate(date);

    var args = {
        onDate: onDate
    };

    getOrCreateClient(function(client) {
        client.ExRatesDaily(args, function(err, result) {
            continueWith(result.ExRatesDailyResult.diffgram.NewDataSet.DailyExRatesOnDate);
        });
    })
}

function getExRatesMonthly(date, continueWith) {
    var onDate = makeCorrectDate(date);

    var args = {
        onDate: onDate
    };

    getOrCreateClient(function(client) {
        serviceClient.ExRatesMonthly(args, function(err, result) {
            continueWith(result.ExRatesMonthlyResult.diffgram.NewDataSet.MonthlyExRatesOnDate);
        });
    });
}

function getExRatesDyn(curId, fromDate, toDate, continueWith) {
    var from = makeCorrectDate(fromDate);
    var to = makeCorrectDate(toDate)

    var args = {
        curId: curId,
        fromDate: from,
        toDate: to
    };

    getOrCreateClient(function(client) {
        serviceClient.ExRatesDyn(args, function(err, result) {
            if (result == null) {
                continueWith(null);
                return;
            }
            continueWith(result.ExRatesDynResult.diffgram.NewDataSet.Currency);
        });
    });
}

function getLastExRatesDate(periodicity, continueWith) {
    var args = {
        Periodicity: periodicity
    };

    getOrCreateClient(function(client) {
        serviceClient.LastDailyExRatesDate(args, function(err, result) {
            continueWith(result.LastDailyExRatesDateResult);
        });
    });
}

module.exports = {
    getLastExRatesDate: getLastExRatesDate,
    getCurrenciesRef: getCurrenciesRef,
    getExRatesDaily: getExRatesDaily,
    getExRatesDyn: getExRatesDyn,
    getExRatesMonthly: getExRatesMonthly
};
