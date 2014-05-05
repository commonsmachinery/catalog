module.exports = {
    catalog: {
        style_dest: '/public',
        style_src: '/styles',
        authentication: 'persona',

        baseURL: 'http://localhost:8004',
        brokerURL: 'amqp://guest@localhost:5672//',
        mongodbURL: 'mongodb://localhost/',
        port: '8004',
        redisURL: 'tcp://localhost:6379',
        secret: 'rainbow pegasi',
        static: '/public',
        usersDB: 'users-dev',
        usersAutoIndex: true
    }
}
