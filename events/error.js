/* eslint-disable */
module.exports = {
    name: 'error',
    execute(error, client) {
        console.error('❌ Discord Client Connection Error:', error);
    }
};
