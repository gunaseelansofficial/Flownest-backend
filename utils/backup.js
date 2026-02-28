const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Automated MongoDB Backup Script
 * Usage: node backup.js
 */

const DB_NAME = 'flownest';
const BACKUP_PATH = path.join(__dirname, 'backups');
const DATE = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const ARCHIVE_NAME = `${DB_NAME}_backup_${DATE}.gz`;

if (!fs.existsSync(BACKUP_PATH)) {
    fs.mkdirSync(BACKUP_PATH);
}

const backupCommand = `mongodump --db=${DB_NAME} --archive=${path.join(BACKUP_PATH, ARCHIVE_NAME)} --gzip`;

console.log(`Starting backup of ${DB_NAME}...`);

exec(backupCommand, (error, stdout, stderr) => {
    if (error) {
        console.error(`Backup Error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(`Backup Info: ${stderr}`);
    }
    console.log(`Backup completed successfully: ${ARCHIVE_NAME}`);
});
