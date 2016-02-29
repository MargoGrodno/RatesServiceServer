var soap = require('soap');
var Promise = require('promise');

var serviceUrl = 'http://nbrb.by/Services/ExRates.asmx?WSDL';
var currenciesHistory = [];

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

makeCurrenciesHistory(function(currencies) {
    currenciesHistory = currencies;
    console.log("currenciesHistory done!");
});

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

function makeCurrenciesHistory(continueWith) {
    var today = new Date();
    getExRatesDaily(today, function(todayRates) {
        getCurrenciesRef(0, function(allCurrencies) {
            var result = [];
            for (var i = 0; i < allCurrencies.length; i++) {
                var currentCur = allCurrencies[i];

                var isTillTodayAlive = !currentCur.Cur_DateEnd;
                var isSetToday = (todayRates.filter(function(obj) {
                    return obj.Cur_Code == currentCur.Cur_Code;
                }).length > 0);

                // работаю только с теми валютами, курс которых действительно доступен до сегодняшего дня,
                // и задается каждый день (т.е. и сегодня тоже был задан)  
                if (isSetToday && isTillTodayAlive) {
                    result.push({
                        abbreviation: currentCur.Cur_Abbreviation,
                        history: [{
                            id: currentCur.Cur_Id,
                            startDate: new Date(currentCur.Cur_DateStart.slice(0, 10)),
                            endDate: null
                        }]
                    });

                    //проверяю есть ли "родитель"
                    if (currentCur.Cur_Id != currentCur.Cur_ParentID) {
                        var parent = allCurrencies.filter(function(obj) {
                            return obj.Cur_Id == currentCur.Cur_ParentID;
                        })[0];
                        var parentEndDate = new Date(parent.Cur_DateEnd.slice(0, 10));
                        var curStartDate = new Date(currentCur.Cur_DateStart.slice(0, 10));
                        var preCurStartDate = plusDays(curStartDate, -1);

                        // работаю только с теми валютами, курс которых существовал непрерывно
                        if (preCurStartDate.getTime() == parentEndDate.getTime()) {
                            var historyItem = {
                                id: parent.Cur_Id,
                                startDate: new Date(parent.Cur_DateStart.slice(0, 10)),
                                endDate: new Date(parent.Cur_DateEnd.slice(0, 10))
                            };
                            result[result.length - 1].history.splice(0, 0, historyItem);
                        }
                    }
                }
            };
            continueWith(result);
        })
    })
}

function getListCurrencies(continueWith) {
    var listCurrencies = [];

    for (var i = 0; i < currenciesHistory.length; i++) {
        listCurrencies.push(currenciesHistory[i].abbreviation);
    };

    continueWith(listCurrencies);
};

function getTableRates(date, urlPeriod, continueWith) {
    var prevDate = plusDays(date, -1 * urlPeriod);
    getExRatesDaily(date, function(ratesPrimary) {   // переписать на параллельное выполнение
        getExRatesDaily(prevDate, function(ratesBefore) {
            var result = [];
            var change = 0;
            for (var i = 0; i < ratesPrimary.length; i++) {
                var abbreviation = ratesPrimary[i].Cur_Abbreviation;
                var ratePrimary = ratesPrimary[i].Cur_OfficialRate;

                var beforeRate = ratesBefore.filter(function(obj) {
                    return obj.Cur_Abbreviation == abbreviation;
                });

                if (beforeRate.length > 0) {
                    change = parseFloat((ratePrimary - beforeRate[0].Cur_OfficialRate).toFixed(2));
                } else {
                    change = "undef";
                }

                result.push({
                    abbreviation: abbreviation,
                    name: ratesPrimary[i].Cur_QuotName,
                    rate: parseFloat(ratePrimary),
                    change: change
                });
            };

            continueWith(result);
        });
    });
}

function getCurrencyHistory(currAbb, dateFrom, dateTo, continueWith) {
    var demountedById = demountById(currAbb, dateFrom, dateTo);
    var errorMsg;
    if (demountedById[0].error) {
        errorMsg = demountedById.splice(0, 1)[0];
    }

    // разбиваю запрос необходимых данных, на куски, длинна которых 
    // не превышает 365 дней (ограничение сервиса Нацбанка)
    var requestsParams = demountByPeriod(demountedById, 365);

    var listResults = [];
    requestsParams.forEach(function(curReqParams) {
        var partResult = new Promise(
            function(resolve, reject) {
                getExRatesDyn(curReqParams.id, curReqParams.fromDate, curReqParams.toDate, resolve, reject);
            }
        );
        listResults.push(partResult);
    })

    Promise.all(listResults)
        .then(function(res) {
            var result = {
                data: []
            };
            if (errorMsg) {
                result.errorMsg = errorMsg.error;
            }
            for (var i = 0; i < res.length; i++) {
                for (var j = 0; j < res[i].length; j++) {
                    result.data.push({
                        date: res[i][j].Date,
                        rate: parseFloat(res[i][j].Cur_OfficialRate)
                    });
                };
            };
            continueWith(result);
        });
}

function demountById(curAbb, fromDate, toDate) {
    var result = [];

    var currencyHistory = currenciesHistory.filter(function(obj) {
        return obj.abbreviation == curAbb;
    })[0].history;

    var curGlobalStart = currencyHistory[0].startDate;
    if (fromDate.getTime() < curGlobalStart.getTime()) {
        result.push({ error: curAbb + " rate is only available from " + makeDateYYYYMMDD(curGlobalStart) });
        fromDate = curGlobalStart;
    }

    for (var i = 0; i < currencyHistory.length; i++) {
        var partStart = currencyHistory[i].startDate,
            partId = currencyHistory[i].id,
            partEnd = currencyHistory[i].endDate;
        if (partEnd == null) {
            var partEnd = new Date(); //создавать именно текущую в Беларуси дату
        }

        if (isInside(partStart, partEnd, fromDate)) {
            if (isInside(partStart, partEnd, toDate)) {
                result.push({
                    id: partId,
                    fromDate: fromDate,
                    toDate: toDate
                });
                return result;
            }
            result.push({
                id: partId,
                fromDate: fromDate,
                toDate: partEnd
            });
            fromDate = plusDays(partEnd, 1);
        }
    };
}

function demountByPeriod(demById, period) {

    function demount(fromDate, toDate, period) {
        var result = [];
        var diff = diffDays(fromDate, toDate);
        while (diff > period-1) {
            tempToDate = plusDays(fromDate, period-1);
            if (diff == period) {
                tempToDate = plusDays(fromDate, period-2);
            }
            result.push({
                from: fromDate,
                to: tempToDate
            });
            fromDate = plusDays(tempToDate, 1);
            diff = diffDays(fromDate, toDate);
        }
        result.push({
            from: fromDate,
            to: toDate
        });
        return result;
    }

    var result = [];
    demById.forEach(function(partById) {
        var demountedByPeriod = demount(partById.fromDate, partById.toDate, period);

        demountedByPeriod.forEach(function(curPeriod) {
            result.push({
                id: partById.id,
                fromDate: curPeriod.from,
                toDate: curPeriod.to
            });
        })
    });
    return result;
}

function diffDays(lastDay, firstDay) {
    var milisecDiff = firstDay.getTime() - lastDay.getTime();
    return Math.ceil(milisecDiff / (1000 * 3600 * 24));
}

function plusDays(date, days) {
    var prevDate = new Date(date);
    prevDate.setDate(date.getDate() + parseInt(days, 10));
    return prevDate;
}

function isInside(from, to, date) {
    if (date.getTime() < from.getTime()) {
        return false;
    }
    if (date.getTime() > to.getTime()) {
        return false;
    }
    return true;
}

//формирует дату из строки, не смещая ее относительно часового пояса машины
function dateFromJSON(jsonDate) {
    if (jsonDate instanceof Date) {
        return jsonDate;
    }

    var year = parseInt(jsonDate.slice(0, 4));
    var month = parseInt(jsonDate.slice(5, 7)) - 1;
    var day = parseInt(jsonDate.slice(8, 10));
    var date = new Date(year, month, day);

    if (isNaN(date.valueOf())) {
        console.log(jsonDate + " is not a Date");
        return;
    }
    return date;
}

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
    getTableRates: getTableRates,
    getCurrencyHistory: getCurrencyHistory,
    getLastExRatesDate: getLastExRatesDate,
    getListCurrencies: getListCurrencies
};
