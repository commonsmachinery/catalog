// Settings specific to running in production mode

module.exports = {
    catalog: {
        frontend: {
            baseURL: "http://catalog.elog.io",
            port: "80",
            secret: "can't touch this!",
            static: "/public/build",
        },
    },
};
