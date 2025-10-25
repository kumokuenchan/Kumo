import { Router } from 'express';
import { dataEditingService } from '../services/DataEditingService.js';
import { faker } from '@faker-js/faker';

const router = Router();

// POST /api/data-editing/:connectionId/update-row
// Body: { database: string, table: string, key: Record<string, any>, changes: Record<string, any> }
router.post('/:connectionId/update-row', async (req, res) => {
  try {
    const { connectionId } = req.params as { connectionId: string };
    const { database, table, key, changes } = req.body || {};

    if (!database || !table || !key || !changes) {
      return res.status(400).json({
        success: false,
        error: 'database, table, key, and changes are required',
      });
    }

    const result = await dataEditingService.updateRow(connectionId, database, table, key, changes);
    res.json({ success: true, row: result.row, affectedRows: result.affectedRows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update row' });
  }
});

// POST /api/data-editing/:connectionId/insert-row
// Body: { database: string, table: string, values: Record<string, any> }
router.post('/:connectionId/insert-row', async (req, res) => {
  try {
    const { connectionId } = req.params as { connectionId: string };
    const { database, table, values } = req.body || {};

    if (!database || !table || !values) {
      return res.status(400).json({ success: false, error: 'database, table, and values are required' });
    }

    const result = await dataEditingService.insertRow(connectionId, database, table, values);
    res.json({ success: true, row: result.row, insertId: result.insertId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to insert row' });
  }
});

// POST /api/data-editing/:connectionId/delete-row
// Body: { database: string, table: string, key: Record<string, any> }
router.post('/:connectionId/delete-row', async (req, res) => {
  try {
    const { connectionId } = req.params as { connectionId: string };
    const { database, table, key } = req.body || {};

    if (!database || !table || !key) {
      return res.status(400).json({ success: false, error: 'database, table, and key are required' });
    }

    const result = await dataEditingService.deleteRow(connectionId, database, table, key);
    res.json({ success: true, affectedRows: result.affectedRows });
  } catch (error: any) {
    const status = error?.errno === 1451 ? 409 : 500; // FK constraint -> 409 Conflict
    res.status(status).json({ success: false, error: error.message || 'Failed to delete row' });
  }
});

// POST /api/data-editing/:connectionId/batch-update
// Body: { database: string, table: string, updates: Array<{key, changes}>, atomic?: boolean }
router.post('/:connectionId/batch-update', async (req, res) => {
  try {
    const { connectionId } = req.params as { connectionId: string };
    const { database, table, updates, atomic } = req.body || {};

    if (!database || !table || !Array.isArray(updates)) {
      return res.status(400).json({ success: false, error: 'database, table, and updates are required' });
    }

    const result = await dataEditingService.batchUpdate(connectionId, database, table, updates, !!atomic);
    res.json({ success: true, results: result.results, totalUpdated: result.totalUpdated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to batch update rows' });
  }
});

// GET /api/data-editing/:connectionId/fk-lookup?database=&table=&column=&q=&limit=&offset=
router.get('/:connectionId/fk-lookup', async (req, res) => {
  try {
    const { connectionId } = req.params as { connectionId: string };
    const { database, table, column, q } = req.query as any;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;

    if (!database || !table || !column) {
      return res.status(400).json({ success: false, error: 'database, table, and column are required' });
    }

    const result = await dataEditingService.fkLookup(
      connectionId,
      String(database),
      String(table),
      String(column),
      q ? String(q) : undefined,
      limit,
      offset
    );

    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to lookup foreign key values' });
  }
});

// POST /api/data-editing/:connectionId/generate-data
// Body: { database: string, table: string, rowCount: number }
router.post('/:connectionId/generate-data', async (req, res) => {
  try {
    const { connectionId } = req.params as { connectionId: string };
    const { database, table, rowCount } = req.body || {};

    if (!database || !table || !rowCount) {
      return res.status(400).json({ success: false, error: 'database, table, and rowCount are required' });
    }

    if (rowCount < 1 || rowCount > 10000) {
      return res.status(400).json({ success: false, error: 'rowCount must be between 1 and 10000' });
    }

    // Get table columns to generate appropriate dummy data
    const columns = await dataEditingService.getTableColumns(connectionId, database, table);

    // Generate rows
    const rows = [];
    for (let i = 0; i < rowCount; i++) {
      const row: Record<string, any> = {};
      for (const col of columns) {
        // Skip auto-increment columns
        if (col.isAutoIncrement) {
          continue;
        }

        // Skip nullable columns (optional - only fill required columns)
        if (col.isNullable && !col.hasDefault) {
          // Only generate values for columns that are likely important
          // Skip most nullable columns without defaults to avoid constraint issues
          const colName = col.name.toLowerCase();
          const isLikelyImportant = colName.includes('name') ||
                                    colName.includes('title') ||
                                    colName.includes('description') ||
                                    colName.includes('email');
          if (!isLikelyImportant) {
            continue; // Leave as NULL
          }
        }

        // Generate value based on column type and name
        row[col.name] = generateFakeValue(col);
      }
      rows.push(row);
    }

    // Insert rows in batches
    let rowsGenerated = 0;
    let failedRows = 0;
    const errors: string[] = [];
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      for (const row of batch) {
        try {
          await dataEditingService.insertRow(connectionId, database, table, row);
          rowsGenerated++;
        } catch (error: any) {
          failedRows++;
          const errorMsg = error.message || 'Unknown error';
          console.error(`Failed to insert row ${failedRows}:`, errorMsg);
          // Only store first 5 unique error messages
          if (errors.length < 5 && !errors.includes(errorMsg)) {
            errors.push(errorMsg);
          }
        }
      }
    }

    res.json({
      success: true,
      rowsGenerated,
      failedRows,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to generate dummy data' });
  }
});

// Helper function to generate fake values based on column definition
function generateFakeValue(col: any): any {
  const colName = col.name.toLowerCase();
  const colType = col.columnType.toLowerCase();
  const dataType = col.dataType.toLowerCase();

  // FIRST: Handle based on column TYPE (more reliable than name)
  // Handle ENUM types first
  if (colType.includes('enum')) {
    const enumMatch = colType.match(/enum\((.*?)\)/);
    if (enumMatch) {
      const enumValues = enumMatch[1]
        .split(',')
        .map(v => v.trim().replace(/^'|'$/g, ''));
      return faker.helpers.arrayElement(enumValues);
    }
  }

  // Handle numeric types
  if (colType.includes('int')) {
    // Handle boolean tinyint(1)
    if (colType.includes('tinyint(1)')) {
      return faker.datatype.boolean() ? 1 : 0;
    }

    // Determine if unsigned
    const isUnsigned = colType.includes('unsigned');

    // Set appropriate ranges based on int type
    if (colType.startsWith('tinyint')) {
      return faker.number.int({ min: isUnsigned ? 0 : 1, max: isUnsigned ? 255 : 127 });
    } else if (colType.startsWith('smallint')) {
      return faker.number.int({ min: isUnsigned ? 0 : 1, max: isUnsigned ? 65535 : 32767 });
    } else if (colType.startsWith('mediumint')) {
      return faker.number.int({ min: isUnsigned ? 0 : 1, max: isUnsigned ? 16777215 : 8388607 });
    } else if (colType.startsWith('bigint')) {
      return faker.number.int({ min: isUnsigned ? 0 : 1, max: 1000000 }); // Keep reasonable for display
    } else {
      // Regular INT
      return faker.number.int({ min: isUnsigned ? 0 : 1, max: isUnsigned ? 4294967295 : 2147483647 });
    }
  }
  if (colType.includes('decimal') || colType.includes('float') || colType.includes('double')) {
    return faker.number.float({ min: 0, max: 1000, precision: 0.01 });
  }
  if (colType.includes('date')) return faker.date.recent();
  if (colType.includes('time')) return faker.date.recent().toTimeString().split(' ')[0];
  if (colType.includes('year')) return faker.date.recent().getFullYear();
  if (colType.includes('bool')) return faker.datatype.boolean();
  if (colType.includes('json')) return JSON.stringify({ value: faker.lorem.word() });

  // Handle text/string types - use name-based patterns for better data
  if (colType.includes('text') || colType.includes('varchar') || colType.includes('char')) {
    const maxLength = extractMaxLength(colType);

    // Use name-based patterns for string fields
    if (colName.includes('email')) return faker.internet.email().substring(0, maxLength || 255);
    if (colName.includes('phone')) return faker.phone.number().substring(0, maxLength || 20);
    if (colName.includes('name') && colName.includes('first')) return faker.person.firstName().substring(0, maxLength || 50);
    if (colName.includes('name') && colName.includes('last')) return faker.person.lastName().substring(0, maxLength || 50);
    if (colName.includes('name') && !colName.includes('user')) return faker.person.fullName().substring(0, maxLength || 100);
    if (colName.includes('username')) return faker.internet.username().substring(0, maxLength || 50);
    if (colName.includes('password')) return faker.internet.password().substring(0, maxLength || 50);
    if (colName.includes('address')) return faker.location.streetAddress().substring(0, maxLength || 100);
    if (colName.includes('city')) return faker.location.city().substring(0, maxLength || 50);
    if (colName.includes('state') || colName.includes('province')) return faker.location.state().substring(0, maxLength || 50);
    if (colName.includes('country')) return faker.location.country().substring(0, maxLength || 50);
    if (colName.includes('zip') || colName.includes('postal')) return faker.location.zipCode().substring(0, maxLength || 10);
    if (colName.includes('company')) return faker.company.name().substring(0, maxLength || 100);
    if (colName.includes('job') || colName.includes('title')) return faker.person.jobTitle().substring(0, maxLength || 100);
    if (colName.includes('url') || colName.includes('website')) return faker.internet.url().substring(0, maxLength || 255);
    if (colName.includes('description') || colName.includes('bio')) return faker.lorem.paragraph().substring(0, maxLength || 500);

    // Default string values based on length
    if (maxLength && maxLength < 50) {
      return faker.lorem.word().substring(0, maxLength);
    }
    if (maxLength && maxLength < 200) {
      return faker.lorem.sentence().substring(0, maxLength);
    }
    return faker.lorem.paragraph().substring(0, maxLength || 500);
  }

  // Default: random word
  return faker.lorem.word();
}

function extractMaxLength(colType: string): number | null {
  const match = colType.match(/\((\d+)\)/);
  return match ? parseInt(match[1]) : null;
}

export default router;
