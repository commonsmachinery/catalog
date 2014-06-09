module.exports = {
    catalog: {
        baseURL: "http://localhost:8004",
        brokerURL: "amqp://guest@localhost:5672//",
        mongodbURL: "mongodb://localhost/",
        port: "8004",
        redisURL: "tcp://localhost:6379",
        secret: "rainbow pegasi",
        static: "/public",
        usersDB: "users-dev",
        usersAutoIndex: true
    }
};
