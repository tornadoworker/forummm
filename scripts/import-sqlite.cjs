const { existsSync, readFileSync, readdirSync } = require('node:fs');
const { basename, extname, join, resolve } = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient, Prisma } = require('@prisma/client');

const mimeTypes = new Map([
  ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'], ['.webp', 'image/webp'],
]);

function readUploads() {
  const uploads = [];
  for (const kind of ['avatars', 'banners', 'attachments']) {
    const dir = join('public', 'uploads', kind);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir, { withFileTypes: true })) {
      const mimeType = mimeTypes.get(extname(file.name).toLowerCase());
      if (!file.isFile() || !mimeType) continue;
      uploads.push({ url: `/uploads/${kind}/${file.name}`, mimeType, content: readFileSync(join(dir, file.name)) });
    }
  }
  return uploads;
}

function orderByDependencies(items, dependencies, key) {
  const pending = new Map(items.map(item => [key(item), item]));
  const ordered = [];
  while (pending.size) {
    const ready = [...pending.values()].filter(item => dependencies(item).every(dep => !pending.has(dep)));
    if (!ready.length) throw new Error('Die Quelldaten enthalten einen Zyklus in den Fremdschlüsseln.');
    for (const item of ready) {
      pending.delete(key(item));
      ordered.push(item);
    }
  }
  return ordered;
}

function readModels(source) {
  const names = source.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all();
  const tables = new Set(names.map(row => row.name));
  const models = Prisma.dmmf.datamodel.models.filter(model => model.name !== 'PublicUpload');
  const expected = new Set(models.map(model => model.dbName ?? model.name));
  for (const table of tables) {
    if (table !== '_prisma_migrations' && !expected.has(table)) throw new Error(`Unbekannte SQLite-Tabelle: ${table}`);
  }

  return orderByDependencies(
    models,
    model => model.fields.filter(field => field.relationFromFields?.length && field.type !== model.name).map(field => field.type),
    model => model.name,
  ).map(model => {
    const table = model.dbName ?? model.name;
    if (!tables.has(table)) throw new Error(`SQLite-Tabelle fehlt: ${table}`);
    const rows = source.prepare(`SELECT * FROM "${table}"`).all().map(row => {
      const data = {};
      for (const field of model.fields.filter(field => field.kind === 'scalar')) {
        const value = row[field.dbName ?? field.name];
        if (value === undefined) {
          if (!field.isRequired || field.hasDefaultValue) continue;
          throw new Error(`SQLite-Spalte fehlt: ${table}.${field.name}`);
        }
        data[field.name] = value === null ? null :
          field.type === 'DateTime' ? new Date(value) : field.type === 'Boolean' ? Boolean(value) : value;
      }
      return data;
    });

    if (model.name === 'PrivateAttachment') {
      for (const row of rows) {
        if (basename(row.storageKey) !== row.storageKey) throw new Error('Ungültiger Schlüssel für privaten Anhang.');
        row.content = readFileSync(join('storage', 'private_uploads', row.storageKey));
      }
    }

    return {
      name: model.name,
      delegate: model.name[0].toLowerCase() + model.name.slice(1),
      rows: model.name === 'Forum' ? orderByDependencies(rows, row => [row.parentId], row => row.id) : rows,
    };
  });
}

async function main() {
  const sourcePath = process.argv[2];
  const destination = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!sourcePath || !/^postgres(?:ql)?:\/\//.test(destination ?? '')) {
    throw new Error('Aufruf: DIRECT_URL setzen und npm run db:import-sqlite -- prisma/dev.db ausführen.');
  }
  if (!existsSync(resolve(sourcePath))) throw new Error('Die SQLite-Quelldatei fehlt.');
  const source = new DatabaseSync(sourcePath, { readOnly: true });
  let models;
  try {
    source.exec('BEGIN');
    if (source.prepare('PRAGMA foreign_key_check').all().length) throw new Error('SQLite meldet ungültige Fremdschlüssel.');
    models = readModels(source);
  } finally {
    source.close();
  }

  let disabledDemoPasswords = 0;
  for (const user of models.find(model => model.name === 'User').rows) {
    if (await bcrypt.compare('admin1234!', user.passwordHash)) {
      user.passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
      disabledDemoPasswords++;
    }
  }

  const defaultDiscordKeyHash = '1df1f60589c5c074573fa01da9d292358904f7eb54ecc436c1f055fdc1ee4eb3';
  for (const integration of models.find(model => model.name === 'IntegrationConfig').rows) {
    if (integration.apiKeyHash === defaultDiscordKeyHash) {
      integration.apiKeyHash = null;
      integration.apiKeyPrefix = null;
      integration.isEnabled = false;
      integration.status = 'NOT_CONFIGURED';
    }
  }

  const uploads = readUploads();
  const postgres = new PrismaClient({ datasourceUrl: destination });
  try {
    await postgres.$transaction(async tx => {
      for (const delegate of ['publicUpload', ...models.map(model => model.delegate)]) {
        if (await tx[delegate].count()) throw new Error('Die Ziel-Datenbank enthält bereits Forumdaten.');
      }
      for (const model of models) {
        for (let offset = 0; offset < model.rows.length; offset += 250) {
          await tx[model.delegate].createMany({ data: model.rows.slice(offset, offset + 250) });
        }
      }
      for (const data of uploads) await tx.publicUpload.create({ data });
    }, { timeout: 120_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } finally {
    await postgres.$disconnect();
  }

  for (const model of models) if (model.rows.length) console.log(`${model.name}: ${model.rows.length}`);
  console.log(`Uploads: ${uploads.length}. Deaktivierte Demo-Passwörter: ${disabledDemoPasswords}.`);
}

main().catch(error => {
  console.error(error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientInitializationError
    ? `PostgreSQL-Import fehlgeschlagen (${error.code || error.errorCode || 'Prisma'}).`
    : error.message);
  process.exitCode = 1;
});
