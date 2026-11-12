import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Automated Database Backup & Integrity Check Utility
 * VEGA CrimeLife Forum Security System
 */

const BACKUP_DIR = path.join(process.cwd(), 'backups', 'db');
const DB_FILE = fs.existsSync(path.join(process.cwd(), 'prisma', 'dev.db'))
  ? path.join(process.cwd(), 'prisma', 'dev.db')
  : path.join(process.cwd(), 'dev.db');
const MAX_BACKUPS_TO_KEEP = 14;

export async function createDatabaseBackup(): Promise<{
  success: boolean;
  backupFile?: string;
  sha256?: string;
  sizeBytes?: number;
  error?: string;
}> {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return { success: false, error: `Quelldatenbank nicht gefunden: ${DB_FILE}` };
    }

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_${timestamp}.db`;
    const targetPath = path.join(BACKUP_DIR, backupFileName);

    // Synchronous copy to avoid partial writes
    fs.copyFileSync(DB_FILE, targetPath);

    // Calculate SHA-256 checksum for verification
    const fileBuffer = fs.readFileSync(targetPath);
    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const metaPath = targetPath + '.meta.json';

    fs.writeFileSync(
      metaPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          backupFile: backupFileName,
          sha256,
          sizeBytes: fileBuffer.length,
        },
        null,
        2
      )
    );

    // Rotate old backups
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('backup_') && f.endsWith('.db'))
      .sort()
      .reverse();

    if (files.length > MAX_BACKUPS_TO_KEEP) {
      for (const oldFile of files.slice(MAX_BACKUPS_TO_KEEP)) {
        try {
          fs.unlinkSync(path.join(BACKUP_DIR, oldFile));
          const oldMeta = path.join(BACKUP_DIR, oldFile + '.meta.json');
          if (fs.existsSync(oldMeta)) fs.unlinkSync(oldMeta);
        } catch {}
      }
    }

    return {
      success: true,
      backupFile: targetPath,
      sha256,
      sizeBytes: fileBuffer.length,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// CLI execution check
if (require.main === module) {
  createDatabaseBackup().then((res) => {
    if (res.success) {
      console.log(`[BACKUP SUCCESS] Backup erstellt: ${res.backupFile}`);
      console.log(`[SHA256 CHECKSUM] ${res.sha256}`);
      console.log(`[SIZE] ${(res.sizeBytes! / 1024).toFixed(1)} KB`);
    } else {
      console.error(`[BACKUP ERROR] ${res.error}`);
      process.exit(1);
    }
  });
}
