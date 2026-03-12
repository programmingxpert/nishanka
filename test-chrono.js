const chrono = require('chrono-node');
const moment = require('moment-timezone');

const defaultTimezone = 'Asia/Kolkata';
const referenceDate = moment.tz(defaultTimezone).toDate();

const tests = [
    "in 3 days at 4:30 pm",
    "on March 20th at 2 Am",
    "in 3 days at 430 pm"
];

for (const t of tests) {
    const parsed = chrono.parseDate(t, referenceDate, { forwardDate: true });
    console.log(`"${t}" ->`, parsed ? parsed.toLocaleString() : "Failed");
}
