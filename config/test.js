// Settings specific to running in test mode.

module.exports = {
    catalog: {
        autoIndex: true,

        frontend: {
            sessionDB: 'frontend-session-test',
        },

        auth: {
            db: 'auth-test',
        },

        core: {
            db: 'core-test',
        },

        event: {
            db: 'event-test',
        },

        search: {
            db: 'search-test'
        },
    },
};
