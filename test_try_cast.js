const duckdb = require('duckdb');
const db = new duckdb.Database(':memory:');
const conn = db.connect();
conn.all("CREATE TABLE t AS SELECT '3' AS age UNION SELECT '20'; SELECT * FROM t WHERE try_cast(age AS DOUBLE) > 5;", (err, res) => {
    console.log("Numeric compare result:", err || res);
});
conn.all("SELECT * FROM t WHERE age > '5';", (err, res) => {
    console.log("String compare result:", err || res);
});
