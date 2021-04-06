const { JSONB } = require('sequelize')

const migrateColumnFromJSONBArrayToJSONB = (queryInterface, transaction) => async (table, column) => {
  const tempColumnName = `temp_${column}`
  await queryInterface.renameColumn(table, column, tempColumnName, { transaction })
  await queryInterface.addColumn(table, column, JSONB, { transaction })
  await queryInterface.sequelize.query(`UPDATE ${table} SET ${column}=array_to_json(${tempColumnName})::jsonb`, { transaction })
  await queryInterface.removeColumn(table, tempColumnName, { transaction })
}

module.exports = {
  up: async queryInterface => {
    const t = await queryInterface.sequelize.transaction()
    try {
      const columnFromJSONBArrayToJSONB = migrateColumnFromJSONBArrayToJSONB(queryInterface, t)
      // attainments -> acceptor_persons, organisations, nodes
      await columnFromJSONBArrayToJSONB('attainments', 'acceptor_persons')
      await columnFromJSONBArrayToJSONB('attainments', 'organisations')
      await columnFromJSONBArrayToJSONB('attainments', 'nodes')
      t.commit()
    } catch (err) {
      t.rollback()
      throw err
    }
  },
  down: async queryInterface => {}
}
