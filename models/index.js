import Sequelize from 'sequelize-oracle'
import dbConfig from '../configs/db'

const sequelize = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'oracle',
    pool: {
        maxConnections: 100,
        minConnections: 0,
        maxIdelTime: 1000
    }
})

const db = {}

db.sequelize = sequelize
db.Sequelize = Sequelize

export default db