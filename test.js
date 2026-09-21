const duckdb = require('duckdb');
const db = new duckdb.Database(':memory:');
db.all('CREATE TABLE t AS SELECT 1 AS a; SELECT COLUMNS(c -> c NOT IN (\'description\')) FROM t;', (err, res) => {
    console.log(err || res);
});
