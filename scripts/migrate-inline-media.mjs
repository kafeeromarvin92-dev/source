import fs from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";

const dbPath = path.resolve(process.env.SQLITE_DATABASE_PATH || "./dev.db");
const rootSetting = process.env.OBJECT_STORAGE_DIR || ".data/objects";
const root = path.resolve(rootSetting);
const db = new Database(dbPath, { fileMustExist: true });
const dataUrl = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+=*)$/;
const extension = (type) => type === "image/jpeg" ? "jpg" : type.replace("image/", "");
const writeObject = async (folder, id, value) => {
    const match = value.match(dataUrl);
    if (!match) return null;
    const key = `${folder}/${id}.${extension(match[1])}`;
    const target = path.join(root, key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, Buffer.from(match[2], "base64"));
    return key;
};

for (const row of db.prepare("SELECT id, avatar FROM User WHERE avatar LIKE 'data:image/%'").all()) {
    const key = await writeObject("avatars", row.id, row.avatar);
    if (key) db.prepare("UPDATE User SET avatar = ? WHERE id = ?").run(key, row.id);
}
for (const row of db.prepare("SELECT id, image FROM Submission WHERE image LIKE 'data:image/%'").all()) {
    const key = await writeObject("evidence", row.id, row.image);
    if (key) db.prepare("UPDATE Submission SET image = ? WHERE id = ?").run(key, row.id);
}
db.close();
console.log(`Migrated inline images to ${root}`);
