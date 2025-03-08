const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Fehler beim Verbinden mit der Datenbank:', err.message);
    } else {
        console.log('Verbunden mit der SQLite-Datenbank');
        db.run(`
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY,
                shop TEXT,
                access_token TEXT,
                toc_enabled INTEGER DEFAULT 0,
                blacklist TEXT DEFAULT '[]',
                toc_title TEXT DEFAULT 'Inhaltsverzeichnis',
                toggle_show TEXT DEFAULT '[anzeigen]',
                toggle_hide TEXT DEFAULT '[verbergen]'
            )
        `, (err) => {
            if (err) {
                console.error('Fehler beim Erstellen der Tabelle:', err.message);
            } else {
                console.log('Tabelle "settings" bereit');
            }
        });
    }
});

module.exports = db;