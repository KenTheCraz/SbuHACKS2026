import postgres from 'postgres';
export async function createStore(env=process.env){
 if(env.DATABASE_URL){
  const sql=postgres(env.DATABASE_URL,{max:5,connect_timeout:10,idle_timeout:20,ssl:env.DATABASE_SSL==='require'?'require':undefined});
  await sql`CREATE TABLE IF NOT EXISTS leaf_users (id text PRIMARY KEY,username text UNIQUE NOT NULL,password_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS leaf_sessions (token_hash text PRIMARY KEY,user_id text NOT NULL REFERENCES leaf_users(id) ON DELETE CASCADE,expires_at bigint NOT NULL)`;
  await sql`CREATE INDEX IF NOT EXISTS leaf_session_expiry ON leaf_sessions(expires_at)`;
  await sql`CREATE TABLE IF NOT EXISTS leaf_data (user_id text PRIMARY KEY REFERENCES leaf_users(id) ON DELETE CASCADE,version integer NOT NULL DEFAULT 0,values_json jsonb NOT NULL DEFAULT '{}'::jsonb)`;
  return {
   async user(username){return (await sql`SELECT id,username,password_hash FROM leaf_users WHERE username=${username}`)[0]},
   async register(id,username,hash){try{await sql.begin(async tx=>{await tx`INSERT INTO leaf_users (id,username,password_hash) VALUES (${id},${username},${hash})`;await tx`INSERT INTO leaf_data(user_id) VALUES (${id})`});return true}catch(e){if(e.code==='23505')return false;throw e}},
   async session(hash){return (await sql`SELECT u.id,u.username FROM leaf_sessions s JOIN leaf_users u ON s.user_id=u.id WHERE s.token_hash=${hash} AND s.expires_at>${Date.now()}`)[0]},
   async issue(hash,id,expires){await sql`DELETE FROM leaf_sessions WHERE expires_at<${Date.now()}`;await sql`INSERT INTO leaf_sessions(token_hash,user_id,expires_at) VALUES (${hash},${id},${expires})`},
   async revoke(hash){await sql`DELETE FROM leaf_sessions WHERE token_hash=${hash}`},
   async read(id){const row=(await sql`SELECT version,values_json FROM leaf_data WHERE user_id=${id}`)[0];return {version:row.version,values:row.values_json}},
   async write(id,version,values){const rows=await sql`UPDATE leaf_data SET version=version+1,values_json=${sql.json(values)} WHERE user_id=${id} AND version=${version} RETURNING version`;return rows[0]?.version??null},
   close:()=>sql.end()
  };
 }
 // Explicit local-only development/test storage; never an ephemeral production fallback.
 if(env.LOCAL_AUTH_DB){const {DatabaseSync}=await import('node:sqlite');const db=new DatabaseSync(env.LOCAL_AUTH_DB);db.exec('PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT UNIQUE,password_hash TEXT); CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),expires_at INTEGER); CREATE TABLE IF NOT EXISTS data(user_id TEXT PRIMARY KEY REFERENCES users(id),version INTEGER DEFAULT 0,values_json TEXT DEFAULT \'{}\');');return {
  async user(name){return db.prepare('SELECT * FROM users WHERE username=?').get(name)},
  async register(id,name,hash){try{db.exec('BEGIN');db.prepare('INSERT INTO users VALUES(?,?,?)').run(id,name,hash);db.prepare('INSERT INTO data(user_id) VALUES(?)').run(id);db.exec('COMMIT');return true}catch(e){db.exec('ROLLBACK');if(e.code?.includes('CONSTRAINT')||e.message.includes('UNIQUE'))return false;throw e}},
  async session(hash){return db.prepare('SELECT u.id,u.username FROM sessions s JOIN users u ON s.user_id=u.id WHERE token_hash=? AND expires_at>?').get(hash,Date.now())},
  async issue(hash,id,expires){db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash,id,expires)},
  async revoke(hash){db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash)},
  async read(id){const r=db.prepare('SELECT * FROM data WHERE user_id=?').get(id);return {version:r.version,values:JSON.parse(r.values_json)}},
  async write(id,version,values){return db.prepare('UPDATE data SET version=version+1,values_json=? WHERE user_id=? AND version=? RETURNING version').get(JSON.stringify(values),id,version)?.version??null},
  async close(){db.close()}
 }}
 throw Error('DATABASE_URL is required for accounts.');
}
