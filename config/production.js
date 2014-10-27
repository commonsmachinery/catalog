// Settings specific to running in production mode

module.exports = {
    catalog: {
        frontend: {
            baseURL: "https://catalog.elog.io",
            port: "8004",
            secret: "can't touch this!",
            static: "/public/build",
        },
    },
};
