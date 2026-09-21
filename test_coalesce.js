const duckdb = require('duckdb');
const db = new duckdb.Database(':memory:');
const conn = db.connect();
conn.exec("CREATE TABLE t AS SELECT '5' AS v UNION SELECT NULL; SELECT COALESCE(v, 0) FROM t;", (err, res) => {
    console.log(err || res);
});
