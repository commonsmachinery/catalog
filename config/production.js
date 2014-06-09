module.exports = {
    catalog: {
        baseURL: "http://catalog.elog.io",
        brokerURL: "amqp://guest@localhost:5672//",
        mongodbURL: "mongodb://localhost/",
        port: "80",
        redisURL: "tcp://localhost:6379",
        secret: "can't touch this!",
        static: "/public/build",
        usersDB: "users",
        usersAutoIndex: false
    }
};
