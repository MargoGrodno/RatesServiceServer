var Promise = require('promise');
var nbClient = require('./nbrbClient');
var currenciesHistory = require('./currenciesHistory');

function getListCurrencies(continueWith) {
    currenciesHistory.history
        .then(function(history) {
            var listCurrencies = [];

            history.forEach(function(currencyHistory) {
                listCurrencies.push(currencyHistory.abbreviation);
            });

            continueWith(listCurrencies);
        });
};

function getTableRates(date, urlPeriod, continueWith) {
    var prevDate = plusDays(date, -1 * urlPeriod);
    nbClient.getExRatesDaily(date, function(ratesPrimary) { // переписать на параллельное выполнение
        nbClient.getExRatesDaily(prevDate, function(ratesBefore) {
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
    demountById(currAbb, dateFrom, dateTo, function(demountedById) {
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
                    nbClient.getExRatesDyn(curReqParams.id, curReqParams.fromDate, curReqParams.toDate, resolve, reject);
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
    });

}

function demountById(curAbb, fromDate, toDate, continueWith) {
    currenciesHistory.history
        .then(function(history) {
            var result = [];

            var currencyHistory = history.filter(function(obj) {
                return obj.abbreviation == curAbb;
            })[0].history;

            var curGlobalStart = currencyHistory[0].startDate;
            if (fromDate.getTime() < curGlobalStart.getTime()) {
                var dd = curGlobalStart.getDate();
                var mm = curGlobalStart.getMonth() + 1; //January is 0!
                var yyyy = curGlobalStart.getFullYear();
                result.push({ error: curAbb + " rate is only available from " + yyyy + '-' + mm + '-' + dd });
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
                        continueWith(result);
                        return;
                    }
                    result.push({
                        id: partId,
                        fromDate: fromDate,
                        toDate: partEnd
                    });
                    fromDate = plusDays(partEnd, 1);
                }
            };
            continueWith(result);
        });
}

function demountByPeriod(demById, period) {

    function demount(fromDate, toDate, period) {
        var result = [];
        var diff = diffDays(fromDate, toDate);
        while (diff > period - 1) {
            tempToDate = plusDays(fromDate, period - 1);
            if (diff == period) {
                tempToDate = plusDays(fromDate, period - 2);
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


module.exports = {
    getTableRates: getTableRates,
    getCurrencyHistory: getCurrencyHistory,
    getListCurrencies: getListCurrencies
};
