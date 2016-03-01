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

module.exports = {
    getListCurrencies: getListCurrencies
};
