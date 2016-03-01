var nbClient = require('./nbrbClient');
var currenciesHistory = require('./currenciesHistory');
var dateUtils = require('./dateUtils');

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
            var dateInBelarus = dateUtils.dateInBelarus();
            var isCorrectDateFrom = dateUtils.isInside(curGlobalStart, dateInBelarus, fromDate);
            var isCorrectDateTo = dateUtils.isInside(curGlobalStart, dateInBelarus, toDate);
            if (!(isCorrectDateFrom && isCorrectDateTo)) {
                result.push({
                    error: curAbb +
                        " rate is only available from " + 
                        dateUtils.makeDateYYYYMMDD(curGlobalStart) +
                        " to " + dateUtils.makeDateYYYYMMDD(dateInBelarus)
                });
                fromDate = !isCorrectDateFrom ? curGlobalStart : fromDate;
                toDate = !isCorrectDateTo ? dateInBelarus : toDate;
            }

            for (var i = 0; i < currencyHistory.length; i++) {
                var partStart = currencyHistory[i].startDate,
                    partId = currencyHistory[i].id,
                    partEnd = currencyHistory[i].endDate;
                if (partEnd == null) {
                    var partEnd = new Date(); //создавать именно текущую в Беларуси дату
                }

                if (dateUtils.isInside(partStart, partEnd, fromDate)) {
                    if (dateUtils.isInside(partStart, partEnd, toDate)) {
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
                    fromDate = dateUtils.plusDays(partEnd, 1);
                }
            };
            continueWith(result);
        });
}

function demountByPeriod(demById, period) {

    function demount(fromDate, toDate, period) {
        var result = [];
        var diff = dateUtils.diffDays(fromDate, toDate);
        while (diff > period - 1) {
            tempToDate = dateUtils.plusDays(fromDate, period - 1);
            if (diff == period) {
                tempToDate = dateUtils.plusDays(fromDate, period - 2);
            }
            result.push({
                from: fromDate,
                to: tempToDate
            });
            fromDate = dateUtils.plusDays(tempToDate, 1);
            diff = dateUtils.diffDays(fromDate, toDate);
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


module.exports = {
    getCurrencyHistory: getCurrencyHistory
};
