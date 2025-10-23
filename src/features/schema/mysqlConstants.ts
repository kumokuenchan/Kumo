/**
 * MySQL data types grouped by category
 */
export const MYSQL_DATA_TYPES = {
  numeric: [
    'TINYINT',
    'SMALLINT',
    'MEDIUMINT',
    'INT',
    'INTEGER',
    'BIGINT',
    'FLOAT',
    'DOUBLE',
    'DECIMAL',
    'NUMERIC',
    'BIT',
  ],
  string: [
    'CHAR',
    'VARCHAR',
    'TINYTEXT',
    'TEXT',
    'MEDIUMTEXT',
    'LONGTEXT',
    'BINARY',
    'VARBINARY',
    'ENUM',
    'SET',
  ],
  datetime: ['DATE', 'TIME', 'DATETIME', 'TIMESTAMP', 'YEAR'],
  spatial: ['GEOMETRY', 'POINT', 'LINESTRING', 'POLYGON', 'MULTIPOINT', 'MULTILINESTRING', 'MULTIPOLYGON', 'GEOMETRYCOLLECTION'],
  json: ['JSON'],
  blob: ['TINYBLOB', 'BLOB', 'MEDIUMBLOB', 'LONGBLOB'],
};

/**
 * Flatten all data types into a single array
 */
export const ALL_MYSQL_DATA_TYPES = Object.values(MYSQL_DATA_TYPES).flat();

/**
 * Storage engines
 */
export const MYSQL_ENGINES = ['InnoDB', 'MyISAM', 'MEMORY', 'CSV', 'ARCHIVE', 'BLACKHOLE', 'FEDERATED'];

/**
 * Character sets (common ones)
 */
export const MYSQL_CHARSETS = [
  'utf8mb4',
  'utf8',
  'latin1',
  'ascii',
  'utf16',
  'utf32',
  'binary',
  'cp1251',
  'cp1256',
  'cp1257',
  'cp850',
  'cp852',
  'cp866',
  'cp932',
  'dec8',
  'eucjpms',
  'euckr',
  'gb2312',
  'gbk',
  'geostd8',
  'greek',
  'hebrew',
  'hp8',
  'keybcs2',
  'koi8r',
  'koi8u',
  'latin2',
  'latin5',
  'latin7',
  'macce',
  'macroman',
  'sjis',
  'swe7',
  'tis620',
  'ucs2',
  'ujis',
];

/**
 * Foreign key actions
 */
export const FOREIGN_KEY_ACTIONS = ['RESTRICT', 'CASCADE', 'SET NULL', 'NO ACTION', 'SET DEFAULT'];

/**
 * Index types
 */
export const INDEX_TYPES = ['BTREE', 'HASH', 'FULLTEXT', 'SPATIAL'];

/**
 * Common collations for utf8mb4
 */
export const COMMON_COLLATIONS = [
  'utf8mb4_general_ci',
  'utf8mb4_unicode_ci',
  'utf8mb4_bin',
  'utf8mb4_0900_ai_ci',
  'utf8_general_ci',
  'utf8_unicode_ci',
  'utf8_bin',
  'latin1_swedish_ci',
  'latin1_general_ci',
  'latin1_bin',
];

/**
 * Get default length/precision for a data type
 */
export function getDefaultLength(dataType: string): string {
  const type = dataType.toUpperCase();

  switch (type) {
    case 'VARCHAR':
      return '255';
    case 'CHAR':
      return '50';
    case 'INT':
    case 'INTEGER':
      return '11';
    case 'TINYINT':
      return '4';
    case 'SMALLINT':
      return '6';
    case 'MEDIUMINT':
      return '9';
    case 'BIGINT':
      return '20';
    case 'DECIMAL':
    case 'NUMERIC':
      return '10,2';
    case 'FLOAT':
      return '10,2';
    case 'DOUBLE':
      return '16,4';
    case 'BIT':
      return '1';
    case 'ENUM':
      return "('value1','value2')";
    case 'SET':
      return "('value1','value2','value3')";
    default:
      return '';
  }
}

/**
 * Check if a data type supports length/precision
 */
export function supportsLength(dataType: string): boolean {
  const type = dataType.toUpperCase();
  return [
    'CHAR',
    'VARCHAR',
    'BINARY',
    'VARBINARY',
    'INT',
    'INTEGER',
    'TINYINT',
    'SMALLINT',
    'MEDIUMINT',
    'BIGINT',
    'DECIMAL',
    'NUMERIC',
    'FLOAT',
    'DOUBLE',
    'BIT',
    'ENUM',
    'SET',
  ].includes(type);
}

/**
 * Check if a data type supports UNSIGNED attribute
 */
export function supportsUnsigned(dataType: string): boolean {
  const type = dataType.toUpperCase();
  return MYSQL_DATA_TYPES.numeric.map(t => t.toUpperCase()).includes(type) && type !== 'BIT';
}

/**
 * Check if a data type supports AUTO_INCREMENT
 */
export function supportsAutoIncrement(dataType: string): boolean {
  const type = dataType.toUpperCase();
  return ['TINYINT', 'SMALLINT', 'MEDIUMINT', 'INT', 'INTEGER', 'BIGINT'].includes(type);
}
