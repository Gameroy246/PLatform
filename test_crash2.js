const duckdb = require('duckdb');
const db = new duckdb.Database(':memory:');
const conn = db.connect();
conn.exec('CREATE TABLE t AS SELECT 1 AS a; CREATE TABLE test AS SELECT COLUMNS(c -> c NOT IN (\'description\')) FROM t;', (err) => {
    console.log(err || 'success');
});
