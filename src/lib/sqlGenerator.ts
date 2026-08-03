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

  switch (op) {
    case 'dataQuality':
      const dqCol = (node.data.column as string) || '1';
      const dqOp = (node.data.operator as string) || '=';
      let dqVal = (node.data.value as string) || '1';
      if (dqOp.includes('NULL')) dqVal = '';
      else if (!dqVal.startsWith("'") && isNaN(Number(dqVal))) dqVal = `'${dqVal.replace(/'/g, "''")}'`;
      const condition = `${dqCol} ${dqOp} ${dqVal}`;
      generatedSql = `SELECT * FROM ${parent1} WHERE ${condition} ___LDA_DATA_QUALITY_SPLIT___ SELECT * FROM ${parent1} WHERE NOT (${condition})`; 
      break;
    case 'csvInput': 
    case 'excelInput': {
      const csvFile = String(node.data.file || '');
      let csvArg = `'${csvFile.replace(/\\/g, '/')}'`;
      try { const parsed = JSON.parse(csvFile); if(Array.isArray(parsed)) csvArg = `[${parsed.map((p: string) => `'${p.replace(/\\/g, '/')}'`).join(',')}]`; } catch(e){}
      generatedSql = `SELECT * FROM read_csv_auto(${csvArg}, union_by_name=true)`;
      break;
    }
    case 'jsonInput': {
      const jFile = String(node.data.file || '');
      let jArg = `'${jFile.replace(/\\/g, '/')}'`;
      try { const parsed = JSON.parse(jFile); if(Array.isArray(parsed)) jArg = `[${parsed.map((p: string) => `'${p.replace(/\\/g, '/')}'`).join(',')}]`; } catch(e){}
      generatedSql = `SELECT * FROM read_json_auto(${jArg}, union_by_name=true)`; 
      break;
    }
    case 'parquetInput': {
      const pFile = String(node.data.file || '');
      let pArg = `'${pFile.replace(/\\/g, '/')}'`;
      try { const parsed = JSON.parse(pFile); if(Array.isArray(parsed)) pArg = `[${parsed.map((p: string) => `'${p.replace(/\\/g, '/')}'`).join(',')}]`; } catch(e){}
      generatedSql = `SELECT * FROM read_parquet(${pArg}, union_by_name=true)`; 
      break;
    }

    case 'postgresInput': generatedSql = `SELECT * FROM postgres_scan('${node.data.connection_string || ''}', '${node.data.table || ''}')`; break;
    case 'mysqlInput': generatedSql = `SELECT * FROM mysql_scan('${node.data.connection_string || ''}', '${node.data.table || ''}')`; break;
    case 'sqlserverInput': generatedSql = `SELECT * FROM odbc_scan('${node.data.connection_string || ''}', '${node.data.table || ''}')`; break;
    case 'mongodbInput': generatedSql = `SELECT * FROM read_json_auto('${node.data.connection_string || ''}')`; break;
    case 'arrowInput': generatedSql = `SELECT * FROM '${node.data.file || ''}'`; break;
    
    case 'removeDuplicates': generatedSql = `SELECT DISTINCT * FROM ${parent1}`; break;
    case 'removeNulls': generatedSql = `SELECT * FROM ${parent1} WHERE ${node.data.column || 'id'} IS NOT NULL`; break;
    case 'fillMissing': generatedSql = `SELECT *, COALESCE(${node.data.column || 'id'}, '${node.data.defaultVal || '0'}') AS ${node.data.newCol || 'filled_val'} FROM ${parent1}`; break;
    case 'typeConversion': generatedSql = `SELECT *, CAST(${node.data.column || 'id'} AS ${node.data.targetType || 'INTEGER'}) AS ${node.data.newCol || 'cast_val'} FROM ${parent1}`; break;
    case 'trimWhitespace': generatedSql = `SELECT *, TRIM(${node.data.column || 'id'}) AS ${node.data.newCol || 'trimmed'} FROM ${parent1}`; break;
    case 'textCasing': generatedSql = `SELECT *, ${node.data.casing || 'UPPER'}(${node.data.column || 'id'}) AS ${node.data.newCol || 'cased_val'} FROM ${parent1}`; break;
    case 'replaceText': {
      const rCol = node.data.column ? `"${node.data.column}"` : 'id';
      const rOld = node.data.oldText ? String(node.data.oldText).replace(/'/g, "''") : '';
      const rNew = node.data.newText ? String(node.data.newText).replace(/'/g, "''") : '';
      generatedSql = `SELECT *, REPLACE(${rCol}, '${rOld}', '${rNew}') AS ${node.data.newCol || 'replaced'} FROM ${parent1}`; 
      break;
    }
    case 'regexExtract': generatedSql = `SELECT *, REGEXP_EXTRACT(${node.data.column || 'id'}, '${node.data.pattern || '.*'}') AS ${node.data.newCol || 'regex_val'} FROM ${parent1}`; break;
    case 'dropColumns': generatedSql = `SELECT * EXCLUDE (${node.data.columns || 'id'}) FROM ${parent1}`; break;
    case 'renameColumn': generatedSql = `SELECT * RENAME (${node.data.oldCol || 'old'} AS ${node.data.newCol || 'new'}) FROM ${parent1}`; break;
    
    case 'filterRows': {
      const fCol = node.data.filterCol ? `"${node.data.filterCol}"` : '1';
      const fOp = node.data.filterOp || '=';
      const fVal = node.data.filterVal ? `'${String(node.data.filterVal).replace(/'/g, "''")}'` : '1';
      generatedSql = `SELECT * FROM ${parent1} WHERE ${fCol} ${fOp} ${fVal}`; 
      break;
    }
    case 'sortRows': generatedSql = `SELECT * FROM ${parent1} ORDER BY ${node.data.column || 'id'} ${node.data.direction || 'ASC'}`; break;
    case 'topN': generatedSql = `SELECT * FROM ${parent1} ORDER BY ${node.data.column || 'id'} ${node.data.direction || 'DESC'} LIMIT ${node.data.limit || '10'}`; break;
    case 'sampleRows': generatedSql = `SELECT * FROM ${parent1} USING SAMPLE ${node.data.samplePercent || '10'}%`; break;
    
    case 'dateTruncate': generatedSql = `SELECT *, DATE_TRUNC('${node.data.datePart || 'month'}', CAST(${node.data.column || 'date_col'} AS TIMESTAMP)) AS ${node.data.newCol || 'truncated_date'} FROM ${parent1}`; break;
    case 'dateArithmetic': generatedSql = `SELECT *, CAST(${node.data.column || 'date_col'} AS TIMESTAMP) + INTERVAL ${node.data.interval || '1'} ${node.data.datePart || 'day'} AS ${node.data.newCol || 'new_date'} FROM ${parent1}`; break;
    
    case 'conditionalLogic': generatedSql = `SELECT *, CASE WHEN ${node.data.condition || '1=1'} THEN '${node.data.trueVal || 'true'}' ELSE '${node.data.falseVal || 'false'}' END AS ${node.data.newCol || 'case_val'} FROM ${parent1}`; break;
    case 'splitPart': generatedSql = `SELECT *, str_split(${node.data.column || 'id'}, '${node.data.delim || ','}')[${node.data.index || '1'}] AS ${node.data.newCol || 'split_val'} FROM ${parent1}`; break;
    case 'stringLength': generatedSql = `SELECT *, LENGTH(${node.data.column || 'id'}) AS ${node.data.newCol || 'len'} FROM ${parent1}`; break;
    
    case 'mathFormula': generatedSql = `SELECT *, (${node.data.formula || '1'}) AS ${node.data.newCol || 'calc_val'} FROM ${parent1}`; break;
    case 'extractYear': generatedSql = `SELECT *, EXTRACT(YEAR FROM CAST(${node.data.column || 'date_col'} AS TIMESTAMP)) AS ${node.data.newCol || 'year_val'} FROM ${parent1}`; break;
    
    case 'innerJoin': generatedSql = `SELECT * FROM ${parent1} INNER JOIN ${parent2} ON ${node.data.joinCondition || '1=0'}`; break;
    case 'leftJoin': generatedSql = `SELECT * FROM ${parent1} LEFT JOIN ${parent2} ON ${node.data.joinCondition || '1=0'}`; break;
    case 'selfJoin': generatedSql = `SELECT t1.*, t2.* FROM ${parent1} t1 INNER JOIN ${parent1} t2 ON ${node.data.joinCondition || '1=0'}`; break;
    case 'fullOuterJoin': generatedSql = `SELECT * FROM ${parent1} FULL OUTER JOIN ${parent2} ON ${node.data.joinCondition || '1=0'}`; break;
    case 'antiJoin': generatedSql = `SELECT * FROM ${parent1} WHERE NOT EXISTS (SELECT 1 FROM ${parent2} WHERE ${node.data.joinCondition || '1=0'})`; break;
    case 'semiJoin': generatedSql = `SELECT * FROM ${parent1} WHERE EXISTS (SELECT 1 FROM ${parent2} WHERE ${node.data.joinCondition || '1=0'})`; break;
    case 'unionAll': generatedSql = `SELECT * FROM ${parent1} UNION ALL SELECT * FROM ${parent2}`; break;
    case 'intersectNodes': generatedSql = `SELECT * FROM ${parent1} INTERSECT SELECT * FROM ${parent2}`; break;
    case 'exceptNodes': generatedSql = `SELECT * FROM ${parent1} EXCEPT SELECT * FROM ${parent2}`; break;
    
    case 'rankRows': generatedSql = `SELECT *, RANK() OVER (PARTITION BY ${node.data.partCol || '1'} ORDER BY ${node.data.orderCol || 'id'}) AS ${node.data.newCol || 'rank'} FROM ${parent1}`; break;
    case 'denseRankRows': generatedSql = `SELECT *, DENSE_RANK() OVER (PARTITION BY ${node.data.partCol || '1'} ORDER BY ${node.data.orderCol || 'id'}) AS ${node.data.newCol || 'dense_rank'} FROM ${parent1}`; break;
    case 'percentRankRows': generatedSql = `SELECT *, PERCENT_RANK() OVER (PARTITION BY ${node.data.partCol || '1'} ORDER BY ${node.data.orderCol || 'id'}) AS ${node.data.newCol || 'pct_rank'} FROM ${parent1}`; break;
    case 'leadRows': generatedSql = `SELECT *, LEAD(${node.data.column || 'id'}, ${node.data.offset || '1'}) OVER (PARTITION BY ${node.data.partCol || '1'} ORDER BY ${node.data.orderCol || 'id'}) AS ${node.data.newCol || 'lead_val'} FROM ${parent1}`; break;
    case 'lagRows': generatedSql = `SELECT *, LAG(${node.data.column || 'id'}, ${node.data.offset || '1'}) OVER (PARTITION BY ${node.data.partCol || '1'} ORDER BY ${node.data.orderCol || 'id'}) AS ${node.data.newCol || 'lag_val'} FROM ${parent1}`; break;
    case 'ntileRows': generatedSql = `SELECT *, NTILE(${node.data.numBuckets || '4'}) OVER (PARTITION BY ${node.data.partCol || '1'} ORDER BY ${node.data.orderCol || 'id'}) AS ${node.data.newCol || 'tile'} FROM ${parent1}`; break;

    case 'hashColumn': generatedSql = `SELECT *, md5(CAST(${node.data.column || 'id'} AS VARCHAR)) AS ${node.data.newCol || 'hash_val'} FROM ${parent1}`; break;
    case 'regexReplace': generatedSql = `SELECT *, REGEXP_REPLACE(${node.data.column || 'id'}, '${node.data.pattern || '.*'}', '${node.data.replacement || ''}') AS ${node.data.newCol || 'regex_rep'} FROM ${parent1}`; break;
    case 'substringCol': generatedSql = `SELECT *, SUBSTRING(${node.data.column || 'id'}, ${node.data.start || '1'}, ${node.data.length || '10'}) AS ${node.data.newCol || 'sub_str'} FROM ${parent1}`; break;
    case 'leftRightString': generatedSql = `SELECT *, ${node.data.direction || 'LEFT'}(${node.data.column || 'id'}, ${node.data.length || '5'}) AS ${node.data.newCol || 'str_part'} FROM ${parent1}`; break;
    
    case 'dateDiff': generatedSql = `SELECT *, DATEDIFF('${node.data.datePart || 'day'}', CAST(${node.data.startCol || 'date1'} AS TIMESTAMP), CAST(${node.data.endCol || 'date2'} AS TIMESTAMP)) AS ${node.data.newCol || 'date_diff'} FROM ${parent1}`; break;
    case 'timezoneConvert': generatedSql = `SELECT *, CAST(${node.data.column || 'date_col'} AS TIMESTAMP) AT TIME ZONE '${node.data.tz || 'UTC'}' AS ${node.data.newCol || 'tz_date'} FROM ${parent1}`; break;

    case 'sqliteInput': generatedSql = `SELECT * FROM sqlite_scan('${node.data.db_path || ''}', '${node.data.table || ''}')`; break;
    case 'duckdbInput': generatedSql = `SELECT * FROM '${node.data.file || ''}'`; break;

    case 'groupBy': 
      const agg = node.data.aggFunc || 'COUNT';
      if (agg === 'COUNT DISTINCT') {
        generatedSql = `SELECT ${node.data.groupCol || 'id'}, COUNT(DISTINCT ${node.data.aggCol || '*'}) AS agg_val FROM ${parent1} GROUP BY ${node.data.groupCol || 'id'}`;
      } else if (agg === 'STRING_AGG') {
        generatedSql = `SELECT ${node.data.groupCol || 'id'}, STRING_AGG(${node.data.aggCol || '*'}, ', ') AS agg_val FROM ${parent1} GROUP BY ${node.data.groupCol || 'id'}`;
      } else {
        generatedSql = `SELECT ${node.data.groupCol || 'id'}, ${agg}(${node.data.aggCol || '*'}) AS agg_val FROM ${parent1} GROUP BY ${node.data.groupCol || 'id'}`;
      }
      break;
    case 'windowFunction': generatedSql = `SELECT *, ${node.data.func || 'SUM'}(${node.data.valCol || 'amount'}) OVER (PARTITION BY ${node.data.partCol || 'category'} ORDER BY ${node.data.orderCol || 'date'}) AS ${node.data.newCol || 'window_result'} FROM ${parent1}`; break;
    case 'pivotTable': generatedSql = `PIVOT ${parent1} ON ${node.data.pivotCol || 'category'} USING ${node.data.aggFunc || 'SUM'}(${node.data.valCol || 'amount'}) GROUP BY ${node.data.groupCol || 'id'}`; break;
    case 'unpivotTable': generatedSql = `UNPIVOT ${parent1} ON COLUMNS(* EXCLUDE(${node.data.idCol || 'id'})) INTO NAME ${node.data.nameCol || 'variable'} VALUE ${node.data.valCol || 'value'}`; break;
    case 'rollup': generatedSql = `SELECT ${node.data.groupCols || 'category, subcategory'}, ${node.data.aggFunc || 'SUM'}(${node.data.valCol || 'amount'}) AS agg_val FROM ${parent1} GROUP BY ROLLUP(${node.data.groupCols || 'category, subcategory'})`; break;
    case 'summaryStats': generatedSql = `SUMMARIZE SELECT * FROM ${parent1}`; break;
    case 'dataContract': generatedSql = `SELECT * FROM ${parent1} WHERE ${node.data.rule || '1=1'}`; break;
    case 'autoMap': generatedSql = `SELECT ${node.data.mapping || '*'} FROM ${parent1}`; break;
    
    case 'exportCsv': generatedSql = `SELECT * FROM ${parent1}`; break;
    case 'customSql': 
      generatedSql = (node.data.sql as string) || `SELECT * FROM ${parent1}`; 
      if (generatedSql.includes('{parent}')) generatedSql = generatedSql.replace(/{parent}/g, parent1);
      if (generatedSql.includes('{parent1}')) generatedSql = generatedSql.replace(/{parent1}/g, parent1);
      if (generatedSql.includes('{parent2}')) generatedSql = generatedSql.replace(/{parent2}/g, parent2);
      break;
    case 'aiTransform': 
      generatedSql = (node.data.sql as string) || `SELECT * FROM ${parent1}`; 
      if (generatedSql.includes('{parent}')) generatedSql = generatedSql.replace(/{parent}/g, parent1);
      break;
    // Advanced Connectors
    case 'restApiInput': generatedSql = `SELECT * FROM read_json_auto('${node.data.url || ''}')`; break;
    case 'graphQLInput': generatedSql = `SELECT * FROM read_json_auto('${node.data.url || ''}')`; break;
    case 'xmlInput': generatedSql = `SELECT * FROM read_json_auto('${node.data.file || ''}')`; break;
    case 'avroInput': generatedSql = `SELECT * FROM read_csv_auto('${node.data.file || ''}')`; break;
    case 'orcInput': generatedSql = `SELECT * FROM read_csv_auto('${node.data.file || ''}')`; break;
    case 'featherInput': generatedSql = `SELECT * FROM read_parquet('${node.data.file || ''}')`; break;
    case 'fixedWidthInput': generatedSql = `SELECT * FROM read_csv_auto('${node.data.file || ''}')`; break;

    // Advanced Stats & Math
    case 'medianAgg': generatedSql = `SELECT ${node.data.groupCol || 'id'}, MEDIAN(CAST(${node.data.aggCol || 'amount'} AS DOUBLE)) AS agg_val FROM ${parent1} GROUP BY ${node.data.groupCol || 'id'}`; break;
    case 'modeAgg': generatedSql = `SELECT ${node.data.groupCol || 'id'}, MODE(${node.data.aggCol || 'amount'}) AS agg_val FROM ${parent1} GROUP BY ${node.data.groupCol || 'id'}`; break;
    case 'stdDevAgg': generatedSql = `SELECT ${node.data.groupCol || 'id'}, STDDEV(CAST(${node.data.aggCol || 'amount'} AS DOUBLE)) AS agg_val FROM ${parent1} GROUP BY ${node.data.groupCol || 'id'}`; break;
    case 'varianceAgg': generatedSql = `SELECT ${node.data.groupCol || 'id'}, VARIANCE(CAST(${node.data.aggCol || 'amount'} AS DOUBLE)) AS agg_val FROM ${parent1} GROUP BY ${node.data.groupCol || 'id'}`; break;
    case 'correlationMatrix': generatedSql = `SELECT CORR(CAST(${node.data.col1 || 'x'} AS DOUBLE), CAST(${node.data.col2 || 'y'} AS DOUBLE)) AS corr_val FROM ${parent1}`; break;

    // Time Series & Windowing
    case 'movingAverage': generatedSql = `SELECT *, AVG(CAST(${node.data.column || 'amount'} AS DOUBLE)) OVER (PARTITION BY ${node.data.partCol || 'id'} ORDER BY ${node.data.orderCol || 'date'} ROWS BETWEEN ${node.data.window || '3'} PRECEDING AND CURRENT ROW) AS ${node.data.newCol || 'moving_avg'} FROM ${parent1}`; break;
    case 'runningTotal': generatedSql = `SELECT *, SUM(CAST(${node.data.column || 'amount'} AS DOUBLE)) OVER (PARTITION BY ${node.data.partCol || 'id'} ORDER BY ${node.data.orderCol || 'date'} ROWS UNBOUNDED PRECEDING) AS ${node.data.newCol || 'running_total'} FROM ${parent1}`; break;

    // Data Scrubbing
    case 'normalizeColumn': generatedSql = `SELECT *, (CAST(${node.data.column || 'amount'} AS DOUBLE) - MIN(CAST(${node.data.column || 'amount'} AS DOUBLE)) OVER()) / (MAX(CAST(${node.data.column || 'amount'} AS DOUBLE)) OVER() - MIN(CAST(${node.data.column || 'amount'} AS DOUBLE)) OVER()) AS ${node.data.newCol || 'normalized_val'} FROM ${parent1}`; break;
    case 'standardizeColumn': generatedSql = `SELECT *, (CAST(${node.data.column || 'amount'} AS DOUBLE) - AVG(CAST(${node.data.column || 'amount'} AS DOUBLE)) OVER()) / NULLIF(STDDEV(CAST(${node.data.column || 'amount'} AS DOUBLE)) OVER(), 0) AS ${node.data.newCol || 'standardized_val'} FROM ${parent1}`; break;
    case 'regexMatch': generatedSql = `SELECT *, REGEXP_MATCHES(${node.data.column || 'id'}, '${node.data.pattern || '.*'}') AS ${node.data.newCol || 'is_match'} FROM ${parent1}`; break;

    default:
      if (!generatedSql) {
        generatedSql = parents.length ? `SELECT * FROM ${parent1}` : `SELECT 'Disconnected' AS status`;
      }
  }
  return generatedSql;
}
