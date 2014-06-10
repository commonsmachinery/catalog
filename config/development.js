// Settings specific to running in development mode.

module.exports = {
    catalog: {
        autoIndex: true,

        frontend: {
            sessionDB: 'frontend-session-dev',
        },

        auth: {
            db: 'auth-dev',
        },
    },
};
