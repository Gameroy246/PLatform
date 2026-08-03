export function generateNodeSQL(node: any, edges: any[]): string {
  let generatedSql = node.data.sql as string || "";
  const op = node.data.operation;
  const parentEdges = edges.filter(e => e.target === node.id);
  const parents = parentEdges.map(e => {
    let p = `node_${e.source.replace(/-/g, '_')}`;
    if (e.sourceHandle === 'error') p += '_error';
    return p;
  });
  const parent1 = parents[0] || 'DUAL';
  const parent2 = parents[1] || 'DUAL';

  // Helper functions to escape SQL injection and handle missing values
  const escapeId = (id: any) => {
    if (!id) return null;
    const clean = String(id).trim().replace(/^["']|["']$/g, '');
    return `"${clean.replace(/"/g, '""')}"`;
  };
  
  const escapeStr = (str: any) => {
    if (str === undefined || str === null) return "''";
    return `'${String(str).replace(/'/g, "''")}'`;
  };

  const safeCol = (col: any, defaultCol: string = '1') => escapeId(col) || defaultCol;
  const safeNewCol = (col: any, defaultCol: string = 'new_col') => escapeId(col) || escapeId(defaultCol);
  
  // Default pass-through if missing required configuration
  const passThrough = `SELECT * FROM ${parent1}`;

  switch (op) {
    case 'dataQuality':
      if (!node.data.column) { generatedSql = passThrough; break; }
      const dqCol = safeCol(node.data.column);
      const dqOp = (node.data.operator as string) || '=';
      let dqVal = (node.data.value as string) || '1';
      if (dqOp.includes('NULL')) dqVal = '';
      else if (!dqVal.startsWith("'") && isNaN(Number(dqVal))) dqVal = escapeStr(dqVal);
      const condition = `${dqCol} ${dqOp} ${dqVal}`;
      generatedSql = `SELECT * FROM ${parent1} WHERE ${condition} ___LDA_DATA_QUALITY_SPLIT___ SELECT * FROM ${parent1} WHERE NOT (${condition})`; 
      break;

    case 'csvInput': 
    case 'fixedWidthInput':
    case 'avroInput':
    case 'orcInput': {
      if (!node.data.file) { generatedSql = `SELECT 'No file selected' AS status`; break; }
      const file = String(node.data.file);
      let arg = escapeStr(file.replace(/\\/g, '/'));
      try { const parsed = JSON.parse(file); if(Array.isArray(parsed)) arg = `[${parsed.map((p: string) => escapeStr(p.replace(/\\/g, '/'))).join(',')}]`; } catch(e){}
      generatedSql = `SELECT * FROM read_csv_auto(${arg}, union_by_name=true, header=true, ignore_errors=true, all_varchar=true, null_padding=true)`;
      break;
    }
    case 'excelInput': {
      if (!node.data.file) { generatedSql = `SELECT 'No file selected' AS status`; break; }
      let fileStr = String(node.data.file);
      try {
        const parsed = JSON.parse(fileStr);
        if (Array.isArray(parsed) && parsed.length > 0) fileStr = parsed[0];
      } catch(e) {}
      const xlFile = fileStr.replace(/\\/g, '/');
      if (xlFile.toLowerCase().includes('.csv')) {
        generatedSql = `SELECT * FROM read_csv_auto(${escapeStr(xlFile)}, union_by_name=true, header=true, ignore_errors=true, all_varchar=true, null_padding=true)`;
      } else {
        generatedSql = `SELECT * FROM st_read(${escapeStr(xlFile)}, open_options=['HEADERS=FORCE'])`;
      }
      break;
    }
    case 'jsonInput': 
    case 'restApiInput':
    case 'graphQLInput':
    case 'xmlInput': {
      const file = String(node.data.file || node.data.url || '');
      if (!file) { generatedSql = `SELECT 'No source provided' AS status`; break; }
      let arg = escapeStr(file.replace(/\\/g, '/'));
      try { const parsed = JSON.parse(file); if(Array.isArray(parsed)) arg = `[${parsed.map((p: string) => escapeStr(p.replace(/\\/g, '/'))).join(',')}]`; } catch(e){}
      generatedSql = `SELECT * FROM read_json_auto(${arg}, union_by_name=true)`; 
      break;
    }
    case 'parquetInput': 
    case 'featherInput': {
      const pFile = String(node.data.file || '');
      if (!pFile) { generatedSql = `SELECT 'No file selected' AS status`; break; }
      let pArg = escapeStr(pFile.replace(/\\/g, '/'));
      try { const parsed = JSON.parse(pFile); if(Array.isArray(parsed)) pArg = `[${parsed.map((p: string) => escapeStr(p.replace(/\\/g, '/'))).join(',')}]`; } catch(e){}
      generatedSql = `SELECT * FROM read_parquet(${pArg}, union_by_name=true)`; 
      break;
    }

    case 'postgresInput': generatedSql = `SELECT * FROM postgres_scan(${escapeStr(node.data.connection_string)}, ${escapeStr(node.data.table)})`; break;
    case 'mysqlInput': generatedSql = `SELECT * FROM mysql_scan(${escapeStr(node.data.connection_string)}, ${escapeStr(node.data.table)})`; break;
    case 'sqlserverInput': generatedSql = `SELECT * FROM odbc_scan(${escapeStr(node.data.connection_string)}, ${escapeStr(node.data.table)})`; break;
    case 'mongodbInput': generatedSql = `SELECT * FROM read_json_auto(${escapeStr(node.data.connection_string)})`; break;
    case 'arrowInput': 
    case 'duckdbInput': generatedSql = `SELECT * FROM ${escapeStr(node.data.file)}`; break;
    case 'sqliteInput': generatedSql = `SELECT * FROM sqlite_scan(${escapeStr(node.data.db_path)}, ${escapeStr(node.data.table)})`; break;

    case 'removeDuplicates': generatedSql = `SELECT DISTINCT * FROM ${parent1}`; break;
    case 'removeNulls': 
      if (!node.data.column) { generatedSql = passThrough; break; }
      generatedSql = `SELECT * FROM ${parent1} WHERE ${safeCol(node.data.column)} IS NOT NULL`; 
      break;
    case 'fillMissing': 
      if (!node.data.column) { generatedSql = passThrough; break; }
      const defVal = node.data.defaultVal || '0';
      const safeDefVal = isNaN(Number(defVal)) ? escapeStr(defVal) : defVal;
      generatedSql = `SELECT *, COALESCE(${safeCol(node.data.column)}, ${safeDefVal}) AS ${safeNewCol(node.data.newCol, 'filled_val')} FROM ${parent1}`; 
      break;
    case 'typeConversion': 
      if (!node.data.column) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, CAST(${safeCol(node.data.column)} AS ${node.data.targetType || 'INTEGER'}) AS ${safeNewCol(node.data.newCol, 'cast_val')} FROM ${parent1}`; 
      break;
    case 'trimWhitespace': 
      if (!node.data.column) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, TRIM(CAST(${safeCol(node.data.column)} AS VARCHAR)) AS ${safeNewCol(node.data.newCol, 'trimmed')} FROM ${parent1}`; 
      break;
    case 'textCasing': 
      if (!node.data.column) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, ${node.data.casing || 'UPPER'}(CAST(${safeCol(node.data.column)} AS VARCHAR)) AS ${safeNewCol(node.data.newCol, 'cased_val')} FROM ${parent1}`; 
      break;
    case 'replaceText': 
      if (!node.data.column) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, REPLACE(CAST(${safeCol(node.data.column)} AS VARCHAR), ${escapeStr(node.data.oldText)}, ${escapeStr(node.data.newText)}) AS ${safeNewCol(node.data.newCol, 'replaced')} FROM ${parent1}`; 
      break;
    case 'regexExtract': 
      if (!node.data.column) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, REGEXP_EXTRACT(CAST(${safeCol(node.data.column)} AS VARCHAR), ${escapeStr(node.data.pattern || '.*')}) AS ${safeNewCol(node.data.newCol, 'regex_val')} FROM ${parent1}`; 
      break;
    case 'dropColumns': {
      if (!node.data.columns) { generatedSql = passThrough; break; }
      const colsToDrop = String(node.data.columns)
        .split(',')
        .map(c => escapeStr(c.trim().replace(/^["']|["']$/g, '')))
        .filter(Boolean);
      if (colsToDrop.length === 0) { generatedSql = passThrough; break; }
      generatedSql = `SELECT COLUMNS(c -> c NOT IN (${colsToDrop.join(', ')})) FROM ${parent1}`; 
      break;
    }
    case 'renameColumn': 
      if (!node.data.oldCol || !node.data.newCol) { generatedSql = passThrough; break; }
      generatedSql = `SELECT * RENAME (${safeCol(node.data.oldCol)} AS ${safeCol(node.data.newCol)}) FROM ${parent1}`; 
      break;
    
    case 'filterRows': 
      if (!node.data.filterCol) { generatedSql = passThrough; break; }
      const fOp = node.data.filterOp || '=';
      let fVal = String(node.data.filterVal || '');
      if (fOp.includes('NULL')) {
         generatedSql = `SELECT * FROM ${parent1} WHERE ${safeCol(node.data.filterCol)} ${fOp}`;
      } else {
         const safeFVal = isNaN(Number(fVal)) ? escapeStr(fVal) : fVal;
         generatedSql = `SELECT * FROM ${parent1} WHERE ${safeCol(node.data.filterCol)} ${fOp} ${safeFVal}`; 
      }
      break;
    case 'sortRows': 
      if (!node.data.column) { generatedSql = passThrough; break; }
      generatedSql = `SELECT * FROM ${parent1} ORDER BY ${safeCol(node.data.column)} ${node.data.direction || 'ASC'}`; 
      break;
    case 'topN': 
      if (!node.data.column) { generatedSql = passThrough; break; }
      generatedSql = `SELECT * FROM ${parent1} ORDER BY ${safeCol(node.data.column)} ${node.data.direction || 'DESC'} LIMIT ${Number(node.data.limit) || 10}`; 
      break;
    case 'sampleRows': generatedSql = `SELECT * FROM ${parent1} USING SAMPLE ${Number(node.data.samplePercent) || 10}%`; break;
    
    case 'dateTruncate': 
      if (!node.data.column) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, DATE_TRUNC(${escapeStr(node.data.datePart || 'month')}, CAST(${safeCol(node.data.column)} AS TIMESTAMP)) AS ${safeNewCol(node.data.newCol, 'truncated_date')} FROM ${parent1}`; 
      break;
    case 'dateArithmetic': 
      if (!node.data.column) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, CAST(${safeCol(node.data.column)} AS TIMESTAMP) + INTERVAL ${Number(node.data.interval) || 1} ${node.data.datePart || 'day'} AS ${safeNewCol(node.data.newCol, 'new_date')} FROM ${parent1}`; 
      break;
    
    case 'conditionalLogic': 
      if (!node.data.condition) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, CASE WHEN ${node.data.condition} THEN ${escapeStr(node.data.trueVal || 'true')} ELSE ${escapeStr(node.data.falseVal || 'false')} END AS ${safeNewCol(node.data.newCol, 'case_val')} FROM ${parent1}`; 
      break;
    case 'splitPart': 
      if (!node.data.column) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, string_split(CAST(${safeCol(node.data.column)} AS VARCHAR), ${escapeStr(node.data.delim || ',')})[${Number(node.data.index) || 1}] AS ${safeNewCol(node.data.newCol, 'split_val')} FROM ${parent1}`; 
      break;
    case 'stringLength': 
      if (!node.data.column) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, LENGTH(CAST(${safeCol(node.data.column)} AS VARCHAR)) AS ${safeNewCol(node.data.newCol, 'len')} FROM ${parent1}`; 
      break;
    
    case 'mathFormula': 
      if (!node.data.formula) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, (${node.data.formula}) AS ${safeNewCol(node.data.newCol, 'calc_val')} FROM ${parent1}`; 
      break;
    case 'extractYear': 
      if (!node.data.column) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, EXTRACT(YEAR FROM CAST(${safeCol(node.data.column)} AS TIMESTAMP)) AS ${safeNewCol(node.data.newCol, 'year_val')} FROM ${parent1}`; 
      break;
    
    case 'innerJoin': generatedSql = `SELECT * FROM ${parent1} INNER JOIN ${parent2} ON ${node.data.joinCondition || '1=1'}`; break;
    case 'leftJoin': generatedSql = `SELECT * FROM ${parent1} LEFT JOIN ${parent2} ON ${node.data.joinCondition || '1=1'}`; break;
    case 'selfJoin': generatedSql = `SELECT t1.*, t2.* FROM ${parent1} t1 INNER JOIN ${parent1} t2 ON ${node.data.joinCondition || '1=1'}`; break;
    case 'fullOuterJoin': generatedSql = `SELECT * FROM ${parent1} FULL OUTER JOIN ${parent2} ON ${node.data.joinCondition || '1=1'}`; break;
    case 'antiJoin': generatedSql = `SELECT * FROM ${parent1} WHERE NOT EXISTS (SELECT 1 FROM ${parent2} WHERE ${node.data.joinCondition || '1=1'})`; break;
    case 'semiJoin': generatedSql = `SELECT * FROM ${parent1} WHERE EXISTS (SELECT 1 FROM ${parent2} WHERE ${node.data.joinCondition || '1=1'})`; break;
    case 'unionAll': generatedSql = `SELECT * FROM ${parent1} UNION ALL SELECT * FROM ${parent2}`; break;
    case 'intersectNodes': generatedSql = `SELECT * FROM ${parent1} INTERSECT SELECT * FROM ${parent2}`; break;
    case 'exceptNodes': generatedSql = `SELECT * FROM ${parent1} EXCEPT SELECT * FROM ${parent2}`; break;
    
    case 'rankRows': 
    case 'denseRankRows':
    case 'percentRankRows': {
      const fns: Record<string, string> = { 'rankRows': 'RANK()', 'denseRankRows': 'DENSE_RANK()', 'percentRankRows': 'PERCENT_RANK()' };
      if (!node.data.orderCol) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, ${fns[op]} OVER (PARTITION BY ${safeCol(node.data.partCol, '1')} ORDER BY ${safeCol(node.data.orderCol)}) AS ${safeNewCol(node.data.newCol, 'rank')} FROM ${parent1}`; 
      break;
    }
    case 'leadRows': 
    case 'lagRows': {
      if (!node.data.column || !node.data.orderCol) { generatedSql = passThrough; break; }
      const func = op === 'leadRows' ? 'LEAD' : 'LAG';
      generatedSql = `SELECT *, ${func}(${safeCol(node.data.column)}, ${Number(node.data.offset) || 1}) OVER (PARTITION BY ${safeCol(node.data.partCol, '1')} ORDER BY ${safeCol(node.data.orderCol)}) AS ${safeNewCol(node.data.newCol, func.toLowerCase() + '_val')} FROM ${parent1}`; 
      break;
    }
    case 'ntileRows': 
      if (!node.data.orderCol) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, NTILE(${Number(node.data.numBuckets) || 4}) OVER (PARTITION BY ${safeCol(node.data.partCol, '1')} ORDER BY ${safeCol(node.data.orderCol)}) AS ${safeNewCol(node.data.newCol, 'tile')} FROM ${parent1}`; 
      break;

    case 'hashColumn': 
      if (!node.data.column) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, md5(CAST(${safeCol(node.data.column)} AS VARCHAR)) AS ${safeNewCol(node.data.newCol, 'hash_val')} FROM ${parent1}`; 
      break;
    case 'regexReplace': 
      if (!node.data.column) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, REGEXP_REPLACE(CAST(${safeCol(node.data.column)} AS VARCHAR), ${escapeStr(node.data.pattern || '.*')}, ${escapeStr(node.data.replacement || '')}) AS ${safeNewCol(node.data.newCol, 'regex_rep')} FROM ${parent1}`; 
      break;
    case 'substringCol': 
      if (!node.data.column) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, SUBSTRING(CAST(${safeCol(node.data.column)} AS VARCHAR), ${Number(node.data.start) || 1}, ${Number(node.data.length) || 10}) AS ${safeNewCol(node.data.newCol, 'sub_str')} FROM ${parent1}`; 
      break;
    case 'leftRightString': 
      if (!node.data.column) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, ${node.data.direction || 'LEFT'}(CAST(${safeCol(node.data.column)} AS VARCHAR), ${Number(node.data.length) || 5}) AS ${safeNewCol(node.data.newCol, 'str_part')} FROM ${parent1}`; 
      break;
    
    case 'dateDiff': 
      if (!node.data.startCol || !node.data.endCol) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, DATEDIFF(${escapeStr(node.data.datePart || 'day')}, CAST(${safeCol(node.data.startCol)} AS TIMESTAMP), CAST(${safeCol(node.data.endCol)} AS TIMESTAMP)) AS ${safeNewCol(node.data.newCol, 'date_diff')} FROM ${parent1}`; 
      break;
    case 'timezoneConvert': 
      if (!node.data.column) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, CAST(${safeCol(node.data.column)} AS TIMESTAMP) AT TIME ZONE ${escapeStr(node.data.tz || 'UTC')} AS ${safeNewCol(node.data.newCol, 'tz_date')} FROM ${parent1}`; 
      break;

    case 'groupBy': 
      if (!node.data.groupCol) { generatedSql = passThrough; break; }
      const agg = node.data.aggFunc || 'COUNT';
      const grp = safeCol(node.data.groupCol);
      const targetAggCol = safeCol(node.data.aggCol || node.data.valCol, '*');
      if (agg === 'COUNT DISTINCT') {
        generatedSql = `SELECT ${grp}, COUNT(DISTINCT ${targetAggCol}) AS agg_val FROM ${parent1} GROUP BY ${grp}`;
      } else if (agg === 'STRING_AGG') {
        generatedSql = `SELECT ${grp}, STRING_AGG(CAST(${targetAggCol} AS VARCHAR), ', ') AS agg_val FROM ${parent1} GROUP BY ${grp}`;
      } else {
        generatedSql = `SELECT ${grp}, ${agg}(${targetAggCol}) AS agg_val FROM ${parent1} GROUP BY ${grp}`;
      }
      break;
    case 'windowFunction': 
      if (!node.data.valCol) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, ${node.data.func || 'SUM'}(${safeCol(node.data.valCol)}) OVER (PARTITION BY ${safeCol(node.data.partCol, '1')} ORDER BY ${safeCol(node.data.orderCol, '1')}) AS ${safeNewCol(node.data.newCol, 'window_result')} FROM ${parent1}`; 
      break;
    case 'pivotTable': 
      if (!node.data.pivotCol || !node.data.valCol) { generatedSql = passThrough; break; }
      generatedSql = `PIVOT ${parent1} ON ${safeCol(node.data.pivotCol)} USING ${node.data.aggFunc || 'SUM'}(${safeCol(node.data.valCol)}) GROUP BY ${safeCol(node.data.groupCol)}`; 
      break;
    case 'unpivotTable': 
      generatedSql = `UNPIVOT ${parent1} ON COLUMNS(* EXCLUDE(${safeCol(node.data.idCol, 'id')})) INTO NAME ${safeCol(node.data.nameCol, 'variable')} VALUE ${safeCol(node.data.valCol, 'value')}`; 
      break;
    case 'rollup': 
      if (!node.data.groupCols) { generatedSql = passThrough; break; }
      const groupCols = String(node.data.groupCols).split(',').map(c => safeCol(c.trim())).join(', ');
      generatedSql = `SELECT ${groupCols}, ${node.data.aggFunc || 'SUM'}(${safeCol(node.data.valCol, '*')}) AS agg_val FROM ${parent1} GROUP BY ROLLUP(${groupCols})`; 
      break;
    case 'summaryStats': generatedSql = `SUMMARIZE SELECT * FROM ${parent1}`; break;
    case 'dataContract': generatedSql = `SELECT * FROM ${parent1} WHERE ${node.data.rule || '1=1'}`; break;
    case 'autoMap': generatedSql = `SELECT ${node.data.mapping || '*'} FROM ${parent1}`; break;
    
    case 'exportCsv': generatedSql = passThrough; break;
    case 'customSql': 
      generatedSql = (node.data.sql as string) || passThrough; 
      if (generatedSql.includes('{parent}')) generatedSql = generatedSql.replace(/{parent}/g, parent1);
      if (generatedSql.includes('{parent1}')) generatedSql = generatedSql.replace(/{parent1}/g, parent1);
      if (generatedSql.includes('{parent2}')) generatedSql = generatedSql.replace(/{parent2}/g, parent2);
      break;
    case 'aiTransform': 
      generatedSql = (node.data.sql as string) || passThrough; 
      if (generatedSql.includes('{parent}')) generatedSql = generatedSql.replace(/{parent}/g, parent1);
      break;

    // Advanced Stats & Math
    case 'medianAgg': 
    case 'modeAgg': 
    case 'stdDevAgg': 
    case 'varianceAgg': {
      if (!node.data.groupCol) { generatedSql = passThrough; break; }
      const fmap: Record<string, string> = { 'medianAgg': 'MEDIAN', 'modeAgg': 'MODE', 'stdDevAgg': 'STDDEV', 'varianceAgg': 'VARIANCE' };
      generatedSql = `SELECT ${safeCol(node.data.groupCol)}, ${fmap[op]}(CAST(${safeCol(node.data.aggCol, 'amount')} AS DOUBLE)) AS agg_val FROM ${parent1} GROUP BY ${safeCol(node.data.groupCol)}`; 
      break;
    }
    case 'correlationMatrix': 
      if (!node.data.col1 || !node.data.col2) { generatedSql = passThrough; break; }
      generatedSql = `SELECT CORR(CAST(${safeCol(node.data.col1)} AS DOUBLE), CAST(${safeCol(node.data.col2)} AS DOUBLE)) AS corr_val FROM ${parent1}`; 
      break;

    // Time Series & Windowing
    case 'movingAverage': 
      if (!node.data.column || !node.data.orderCol) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, AVG(CAST(${safeCol(node.data.column)} AS DOUBLE)) OVER (PARTITION BY ${safeCol(node.data.partCol, '1')} ORDER BY ${safeCol(node.data.orderCol)} ROWS BETWEEN ${Number(node.data.window) || 3} PRECEDING AND CURRENT ROW) AS ${safeNewCol(node.data.newCol, 'moving_avg')} FROM ${parent1}`; 
      break;
    case 'runningTotal': 
      if (!node.data.column || !node.data.orderCol) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, SUM(CAST(${safeCol(node.data.column)} AS DOUBLE)) OVER (PARTITION BY ${safeCol(node.data.partCol, '1')} ORDER BY ${safeCol(node.data.orderCol)} ROWS UNBOUNDED PRECEDING) AS ${safeNewCol(node.data.newCol, 'running_total')} FROM ${parent1}`; 
      break;

    // Data Scrubbing
    case 'normalizeColumn': 
      if (!node.data.column) { generatedSql = passThrough; break; }
      const nc = safeCol(node.data.column);
      generatedSql = `SELECT *, (CAST(${nc} AS DOUBLE) - MIN(CAST(${nc} AS DOUBLE)) OVER()) / NULLIF((MAX(CAST(${nc} AS DOUBLE)) OVER() - MIN(CAST(${nc} AS DOUBLE)) OVER()), 0) AS ${safeNewCol(node.data.newCol, 'normalized_val')} FROM ${parent1}`; 
      break;
    case 'standardizeColumn': 
      if (!node.data.column) { generatedSql = passThrough; break; }
      const sc = safeCol(node.data.column);
      generatedSql = `SELECT *, (CAST(${sc} AS DOUBLE) - AVG(CAST(${sc} AS DOUBLE)) OVER()) / NULLIF(STDDEV(CAST(${sc} AS DOUBLE)) OVER(), 0) AS ${safeNewCol(node.data.newCol, 'standardized_val')} FROM ${parent1}`; 
      break;
    case 'regexMatch': 
      if (!node.data.column) { generatedSql = passThrough; break; }
      generatedSql = `SELECT *, regexp_matches(CAST(${safeCol(node.data.column)} AS VARCHAR), ${escapeStr(node.data.pattern || '.*')}) AS ${safeNewCol(node.data.newCol, 'is_match')} FROM ${parent1}`; 
      break;

    default:
      if (!generatedSql) {
        generatedSql = parents.length ? passThrough : `SELECT 'Disconnected' AS status`;
      }
  }
  return generatedSql;
}
