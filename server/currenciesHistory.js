var nbClient = require('./nbrbClient');
var Promise = require('promise');

var currenciesHistory = (function() {

    var _getHistory = function() {
        return new Promise(function(resolve, reject) {
            makeCurrenciesHistory(function (_history) {
                console.log("currenciesHistory done!");
                resolve(_history)
            })
        });
    };

    return _getHistory().then(function(_history) {
        return _history;
    });
})();

function makeCurrenciesHistory(continueWith) {
    var today = new Date();
    nbClient.getExRatesDaily(today, function(todayRates) {
        nbClient.getCurrenciesRef(0, function(allCurrencies) {
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

function plusDays(date, days) {
    var prevDate = new Date(date);
    prevDate.setDate(date.getDate() + parseInt(days, 10));
    return prevDate;
}

module.exports = {
    history: currenciesHistory
};
