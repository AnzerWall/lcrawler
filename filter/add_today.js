'use strict';

const moment = require('moment');
class AddTodayFilter {
    async process(frame) {
        frame.$today = moment(frame.$timestamp).format('YYYYMMDD');
        return true;
    }
}

module.exports = AddTodayFilter;
