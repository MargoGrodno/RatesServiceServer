var nbClient = require('./nbrbClient');
var dateUtils = require('./dateUtils');

function getTableRates(date, urlPeriod, continueWith) {
    var prevDate = dateUtils.plusDays(date, -1 * urlPeriod);
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

module.exports = {
    getTableRates: getTableRates
};

