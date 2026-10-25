import {randomUUID} from 'node:crypto';
export const pondPresenceMs=90000,pondCapacity=12;
export class PondError extends Error{constructor(message,status=400){super(message);this.status=status}}
export async function createPondStore({sql,db}){
 const pg=!!sql;
 const query=pg?(text,args=[])=>sql.unsafe(text,args):async(text,args=[])=>{const bindings=[];const statement=db.prepare(text.replace(/\$(\d+)/g,(_,n)=>{bindings.push(args[Number(n)-1]);return '?'}));return statement.all(...bindings)};
 let queue=Promise.resolve();
 const transaction=pg?fn=>sql.begin(tx=>fn((text,args=[])=>tx.unsafe(text,args))):fn=>{const work=queue.then(async()=>{db.exec('BEGIN IMMEDIATE');try{const value=await fn(query);db.exec('COMMIT');return value}catch(e){db.exec('ROLLBACK');throw e}});queue=work.catch(()=>{});return work};
 const users=pg?'leaf_users':'users';
 await query(`CREATE TABLE IF NOT EXISTS pond_rooms(id text PRIMARY KEY,name text NOT NULL,topic text NOT NULL,owner_id text NOT NULL REFERENCES ${users}(id) ON DELETE CASCADE,created_at bigint NOT NULL)`);
 await query(`CREATE TABLE IF NOT EXISTS pond_members(user_id text PRIMARY KEY REFERENCES ${users}(id) ON DELETE CASCADE,room_id text NOT NULL REFERENCES pond_rooms(id) ON DELETE CASCADE,last_seen bigint NOT NULL)`);
 await query('CREATE INDEX IF NOT EXISTS pond_members_room ON pond_members(room_id,last_seen)');
 await query(`CREATE TABLE IF NOT EXISTS pond_messages(seq ${pg?'bigserial PRIMARY KEY':'INTEGER PRIMARY KEY AUTOINCREMENT'},id text UNIQUE NOT NULL,room_id text NOT NULL REFERENCES pond_rooms(id) ON DELETE CASCADE,user_id text NOT NULL REFERENCES ${users}(id) ON DELETE CASCADE,body text NOT NULL,created_at bigint NOT NULL)`);
 await query('CREATE INDEX IF NOT EXISTS pond_messages_room ON pond_messages(room_id,seq)');
 const lockSuffix=pg?' FOR UPDATE':'';
 async function lockUser(q,userId){await q(`SELECT id FROM ${users} WHERE id=$1${lockSuffix}`,[userId])}
 async function requireMember(q,userId,roomId,now){const member=(await q('SELECT room_id,last_seen FROM pond_members WHERE user_id=$1',[userId]))[0];if(!member||member.room_id!==roomId||Number(member.last_seen)<=now-pondPresenceMs)throw new PondError('Join this pond to see its members and chat.',403);return member}
 async function admit(q,userId,roomId,now){const room=(await q(`SELECT id FROM pond_rooms WHERE id=$1${lockSuffix}`,[roomId]))[0];if(!room)throw new PondError('This pond could not be found.',404);const count=(await q('SELECT COUNT(*) AS n FROM pond_members WHERE room_id=$1 AND last_seen>$2 AND user_id<>$3',[roomId,now-pondPresenceMs,userId]))[0];if(Number(count.n)>=pondCapacity)throw new PondError('This pond is full. Try another room.',409);await q('INSERT INTO pond_members(user_id,room_id,last_seen) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET room_id=excluded.room_id,last_seen=excluded.last_seen',[userId,roomId,now])}
 return {
  async list(userId,now=Date.now()){
   const rooms=await query('SELECT r.id,r.name,r.topic,r.created_at,COUNT(m.user_id) AS members FROM pond_rooms r LEFT JOIN pond_members m ON m.room_id=r.id AND m.last_seen>$1 GROUP BY r.id,r.name,r.topic,r.created_at ORDER BY COUNT(m.user_id) DESC,r.created_at DESC LIMIT 100',[now-pondPresenceMs]);
   const current=(await query('SELECT room_id FROM pond_members WHERE user_id=$1 AND last_seen>$2',[userId,now-pondPresenceMs]))[0];return {rooms:rooms.map(r=>({...r,created_at:Number(r.created_at),members:Number(r.members),capacity:pondCapacity})),currentRoomId:current?.room_id||null};
  },
  async create(userId,name,topic,now=Date.now()){return transaction(async q=>{await lockUser(q,userId);const count=(await q('SELECT COUNT(*) AS n FROM pond_rooms WHERE owner_id=$1',[userId]))[0];if(Number(count.n)>=10)throw new PondError('You already have 10 ponds. Join an existing one.',429);const id=randomUUID();await q('INSERT INTO pond_rooms(id,name,topic,owner_id,created_at) VALUES($1,$2,$3,$4,$5)',[id,name,topic,userId,now]);await admit(q,userId,id,now);return id})},
  async join(userId,roomId,now=Date.now()){return transaction(async q=>{await lockUser(q,userId);await admit(q,userId,roomId,now)})},
  async heartbeat(userId,roomId,now=Date.now()){return transaction(async q=>{await lockUser(q,userId);const member=(await q('SELECT room_id FROM pond_members WHERE user_id=$1',[userId]))[0];if(!member||member.room_id!==roomId)throw new PondError('You left this pond or joined another one.',403);await admit(q,userId,roomId,now)})},
  async leave(userId,roomId=null){return transaction(async q=>{await lockUser(q,userId);if(roomId)await q('DELETE FROM pond_members WHERE user_id=$1 AND room_id=$2',[userId,roomId]);else await q('DELETE FROM pond_members WHERE user_id=$1',[userId])})},
  async snapshot(userId,roomId,now=Date.now()){
   await requireMember(query,userId,roomId,now);const room=(await query('SELECT id,name,topic FROM pond_rooms WHERE id=$1',[roomId]))[0];if(!room)throw new PondError('This pond could not be found.',404);
   const members=await query(`SELECT u.id,u.username FROM pond_members m JOIN ${users} u ON u.id=m.user_id WHERE m.room_id=$1 AND m.last_seen>$2 ORDER BY u.username`,[roomId,now-pondPresenceMs]);
   const messages=await query(`SELECT recent.*,u.username FROM (SELECT seq,id,user_id,body,created_at FROM pond_messages WHERE room_id=$1 ORDER BY seq DESC LIMIT 60) recent JOIN ${users} u ON u.id=recent.user_id ORDER BY recent.seq`,[roomId]);
   return {room,members,messages:messages.map(m=>({...m,seq:String(m.seq),created_at:Number(m.created_at)})),capacity:pondCapacity};
  },
  async message(userId,roomId,id,body,now=Date.now()){return transaction(async q=>{await lockUser(q,userId);await requireMember(q,userId,roomId,now);const existing=(await q('SELECT room_id,user_id FROM pond_messages WHERE id=$1',[id]))[0];if(existing){if(existing.room_id!==roomId||existing.user_id!==userId)throw new PondError('Invalid message identifier.');return}
   const recent=(await q('SELECT COUNT(*) AS n,MAX(created_at) AS latest FROM pond_messages WHERE user_id=$1 AND created_at>$2',[userId,now-60000]))[0];if(Number(recent.n)>=20||recent.latest&&now-Number(recent.latest)<800)throw new PondError('Give the pond a moment. Please wait before sending more messages.',429);
   await q('INSERT INTO pond_messages(id,room_id,user_id,body,created_at) VALUES($1,$2,$3,$4,$5)',[id,roomId,userId,body,now]);await q('DELETE FROM pond_messages WHERE room_id=$1 AND seq NOT IN (SELECT seq FROM pond_messages WHERE room_id=$2 ORDER BY seq DESC LIMIT 100)',[roomId,roomId]);
  })}
 };
}
