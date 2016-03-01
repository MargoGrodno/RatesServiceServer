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


module.exports = {
    diffDays: diffDays,
    plusDays: plusDays,
    isInside: isInside,
};