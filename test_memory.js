const duckdb = require('duckdb');
const db = new duckdb.Database(':memory:');
const conn1 = db.connect();
const conn2 = db.connect();

conn1.exec('CREATE TABLE t AS SELECT 1 AS a', (err) => {
    if (err) throw err;
    conn2.all('SELECT * FROM t', (err, res) => {
        if (err) throw err;
        console.log("Conn 2 sees:", res);
    });
});
