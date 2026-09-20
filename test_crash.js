const fs = require('fs');
fs.writeFileSync('bad2.csv', 'a,b\n1,2\n3,4,5\n"unclosed quote,test\nnextline"');
const duckdb = require('duckdb');
const db = new duckdb.Database(':memory:');
const conn = db.connect();
conn.exec('CREATE TABLE test AS SELECT * FROM read_csv_auto([\'bad2.csv\'], header=true, ignore_errors=true, all_varchar=true)', (err) => {
    console.log(err || 'success');
});
