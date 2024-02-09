module.exports = (sequelize, Sequelize) => {
    return sequelize.define("group", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      priority: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      expiration: {
        type: Sequelize.DATE,
      }
    });
};