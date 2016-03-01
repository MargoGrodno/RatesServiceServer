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

function dateInBelarus() {
    var date = new Date();
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset() + 3 * 60);
    return date;
}

function makeDateYYYYMMDD(date) {
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

function fromJSON(dateJSON){
    var date = new Date(dateJSON)
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return date;
}


module.exports = {
    diffDays: diffDays,
    plusDays: plusDays,
    isInside: isInside,
    dateInBelarus: dateInBelarus,
    makeDateYYYYMMDD: makeDateYYYYMMDD,
    fromJSON: fromJSON
};
