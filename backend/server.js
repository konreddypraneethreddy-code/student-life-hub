require('dotenv').config();
const express=require('express'),mysql=require('mysql2/promise'),bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken'),path=require('path');
const db=mysql.createPool({host:process.env.DB_HOST||'localhost',port:process.env.DB_PORT||3306,user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'student_life_hub',dateStrings:true});
const SECRET=process.env.JWT_SECRET||'dev-secret-change-me';
const app=express();app.use(express.json());
app.use(express.static(path.join(__dirname,'../frontend')));

const wrap=f=>(q,s)=>f(q,s).catch(e=>{console.error(e);
  const bad=/^ER_(BAD_NULL|TRUNCATED|WRONG_VALUE|DATA_TOO_LONG|NO_REFERENCED)/.test(e.code||'');
  s.status(bad?400:500).json({error:bad?'Please fill all fields with valid values':'Server error, try again'})});
const auth=(q,s,n)=>{try{q.user=jwt.verify((q.headers.authorization||'').slice(7),SECRET);n()}catch{s.status(401).json({error:'Please log in again'})}};
const admin=(q,s,n)=>q.user.role==='admin'?n():s.status(403).json({error:'Admin access only'});
const tok=u=>jwt.sign({id:u.id,role:u.role,name:u.name},SECRET,{expiresIn:'7d'});
const pub=u=>({id:u.id,name:u.name,email:u.email,department:u.department,year:u.year,role:u.role});
const okEmail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e||'');
const okPass=p=>typeof p==='string'&&p.length>=8&&/[A-Za-z]/.test(p)&&/\d/.test(p);
const PWMSG='Password must be 8+ characters with a letter and a number';

// ---------- Auth ----------
app.post('/api/auth/register',wrap(async(q,s)=>{
  const{name,email,password,department,year}=q.body;
  if(!name?.trim()||!department?.trim()||!year)return s.status(400).json({error:'All fields are required'});
  if(!okEmail(email))return s.status(400).json({error:'Invalid email address'});
  if(!okPass(password))return s.status(400).json({error:PWMSG});
  const y=+year;if(!(y>=1&&y<=6))return s.status(400).json({error:'Year must be 1-6'});
  const[dup]=await db.query('SELECT id FROM users WHERE email=?',[email.toLowerCase()]);
  if(dup.length)return s.status(409).json({error:'Email already registered'});
  const[r]=await db.query('INSERT INTO users(name,email,password,department,year) VALUES(?,?,?,?,?)',[name.trim(),email.toLowerCase(),await bcrypt.hash(password,10),department.trim(),y]);
  const u={id:r.insertId,role:'student',name:name.trim(),email:email.toLowerCase(),department,year:y};
  s.json({token:tok(u),user:pub(u)})}));
app.post('/api/auth/login',wrap(async(q,s)=>{
  const{email,password}=q.body;if(!okEmail(email)||!password)return s.status(400).json({error:'Enter a valid email and password'});
  const[[u]]=await db.query('SELECT * FROM users WHERE email=?',[email.toLowerCase()]);
  if(!u||!await bcrypt.compare(password,u.password))return s.status(401).json({error:'Invalid email or password'});
  if(u.blocked)return s.status(403).json({error:'Your account is blocked'});
  s.json({token:tok(u),user:pub(u)})}));
app.post('/api/auth/logout',(q,s)=>s.json({ok:true})); // JWT is cleared client-side
app.get('/api/auth/me',auth,wrap(async(q,s)=>{
  const[[u]]=await db.query('SELECT * FROM users WHERE id=? AND blocked=0',[q.user.id]);
  u?s.json(pub(u)):s.status(401).json({error:'Please log in again'})}));
app.put('/api/profile',auth,wrap(async(q,s)=>{
  const{name,department,year}=q.body;if(!name?.trim()||!department?.trim()||!(+year>=1&&+year<=6))return s.status(400).json({error:'Enter valid name, department and year'});
  await db.query('UPDATE users SET name=?,department=?,year=? WHERE id=?',[name.trim(),department.trim(),+year,q.user.id]);
  const[[u]]=await db.query('SELECT * FROM users WHERE id=?',[q.user.id]);s.json(pub(u))}));
app.put('/api/profile/password',auth,wrap(async(q,s)=>{
  const{current,next}=q.body;if(!okPass(next))return s.status(400).json({error:PWMSG});
  const[[u]]=await db.query('SELECT * FROM users WHERE id=?',[q.user.id]);
  if(!await bcrypt.compare(current||'',u.password))return s.status(400).json({error:'Current password is incorrect'});
  await db.query('UPDATE users SET password=? WHERE id=?',[await bcrypt.hash(next,10),q.user.id]);s.json({ok:true})}));

// ---------- Generic resources ----------
// c = columns, s = searchable, f = filterable, o = order
const R={
 notes:{c:['title','subject','department','year','description','link'],s:['title','subject','description'],f:['subject','department','year'],o:'created_at DESC'},
 events:{c:['title','event_date','event_time','venue','description','organizer'],s:['title','venue','description','organizer'],f:['venue','organizer'],o:'event_date'},
 opportunities:{c:['title','organization','description','eligibility','deadline','link','category'],s:['title','organization','description'],f:['category'],o:'deadline'},
 hackathons:{c:['title','type','description','organizer','deadline','link'],s:['title','description','organizer'],f:['type'],o:'deadline'},
 clubs:{c:['name','description','category','coordinator','meeting_info'],s:['name','description','category'],f:['category'],o:'name'},
 announcements:{c:['title','description','category','important'],s:['title','description','category'],f:['category','important'],o:'created_at DESC'}};
const J={events:['event_registrations','event_id'],hackathons:['hackathon_registrations','hackathon_id'],clubs:['club_members','club_id']};
const S={opportunities:['saved_opportunities','opportunity_id'],hackathons:['saved_hackathons','hackathon_id']};
const P='/api/:r(notes|events|opportunities|hackathons|clubs|announcements)';
const vals=(r,b)=>R[r].c.map(c=>b[c]===''||b[c]===undefined?null:b[c]===true?1:b[c]===false?0:b[c]);
const valid=(r,b)=>b&&String(b[R[r].c[0]]||'').trim();

app.get(P,auth,wrap(async(q,s)=>{
  const r=q.params.r,d=R[r],a=[],w=[],u=+q.user.id;let ex='';
  if(J[r])ex+=`,(SELECT COUNT(*) FROM ${J[r][0]} WHERE ${J[r][1]}=t.id) AS count,EXISTS(SELECT 1 FROM ${J[r][0]} WHERE ${J[r][1]}=t.id AND user_id=${u}) AS joined`;
  if(S[r])ex+=`,EXISTS(SELECT 1 FROM ${S[r][0]} WHERE ${S[r][1]}=t.id AND user_id=${u}) AS saved`;
  if(q.query.q){w.push('('+d.s.map(c=>c+' LIKE ?').join(' OR ')+')');d.s.forEach(()=>a.push('%'+q.query.q+'%'))}
  for(const c of d.f)if(q.query[c]){w.push(c+' LIKE ?');a.push('%'+q.query[c]+'%')}
  const[rows]=await db.query(`SELECT t.*${ex} FROM ${r} t${w.length?' WHERE '+w.join(' AND '):''} ORDER BY ${d.o}`,a);
  s.json(rows)}));
app.post(P,auth,admin,wrap(async(q,s)=>{
  const r=q.params.r;if(!valid(r,q.body))return s.status(400).json({error:'Title/name is required'});
  const[x]=await db.query(`INSERT INTO ${r}(${R[r].c}) VALUES(${R[r].c.map(()=>'?')})`,vals(r,q.body));s.json({id:x.insertId})}));
app.put(P+'/:id(\\d+)',auth,admin,wrap(async(q,s)=>{
  const r=q.params.r;if(!valid(r,q.body))return s.status(400).json({error:'Title/name is required'});
  const[x]=await db.query(`UPDATE ${r} SET ${R[r].c.map(c=>c+'=?')} WHERE id=?`,[...vals(r,q.body),q.params.id]);
  x.affectedRows?s.json({ok:true}):s.status(404).json({error:'Not found'})}));
app.delete(P+'/:id(\\d+)',auth,admin,wrap(async(q,s)=>{
  const[x]=await db.query(`DELETE FROM ${q.params.r} WHERE id=?`,[q.params.id]);
  x.affectedRows?s.json({ok:true}):s.status(404).json({error:'Not found'})}));

// join / leave (events, hackathons, clubs)
const PJ='/api/:r(events|hackathons|clubs)/:id(\\d+)';
app.post(PJ+'/join',auth,wrap(async(q,s)=>{
  const[t,k]=J[q.params.r];const[x]=await db.query(`INSERT IGNORE INTO ${t}(${k},user_id) VALUES(?,?)`,[q.params.id,q.user.id]).catch(()=>[{affectedRows:-1}]);
  if(x.affectedRows===-1)return s.status(404).json({error:'Not found'});
  x.affectedRows?s.json({ok:true}):s.status(409).json({error:'Already registered'})}));
app.delete(PJ+'/join',auth,wrap(async(q,s)=>{
  const[t,k]=J[q.params.r];await db.query(`DELETE FROM ${t} WHERE ${k}=? AND user_id=?`,[q.params.id,q.user.id]);s.json({ok:true})}));
// admin: list / remove members
app.get(PJ+'/members',auth,admin,wrap(async(q,s)=>{
  const[t,k]=J[q.params.r];const[rows]=await db.query(`SELECT u.id,u.name,u.email,u.department,u.year FROM ${t} m JOIN users u ON u.id=m.user_id WHERE m.${k}=?`,[q.params.id]);s.json(rows)}));
app.delete(PJ+'/members/:uid(\\d+)',auth,admin,wrap(async(q,s)=>{
  const[t,k]=J[q.params.r];await db.query(`DELETE FROM ${t} WHERE ${k}=? AND user_id=?`,[q.params.id,q.params.uid]);s.json({ok:true})}));
// save / unsave (opportunities, hackathons)
const PS='/api/:r(opportunities|hackathons)/:id(\\d+)/save';
app.post(PS,auth,wrap(async(q,s)=>{const[t,k]=S[q.params.r];await db.query(`INSERT IGNORE INTO ${t}(${k},user_id) VALUES(?,?)`,[q.params.id,q.user.id]).catch(()=>{});s.json({ok:true})}));
app.delete(PS,auth,wrap(async(q,s)=>{const[t,k]=S[q.params.r];await db.query(`DELETE FROM ${t} WHERE ${k}=? AND user_id=?`,[q.params.id,q.user.id]);s.json({ok:true})}));

// ---------- Tasks (per user) ----------
const taskVals=(b)=>[String(b.title||'').trim(),b.description||null,b.deadline||null,['Low','Medium','High'].includes(b.priority)?b.priority:'Medium',b.status==='completed'?'completed':'pending'];
app.get('/api/tasks',auth,wrap(async(q,s)=>{
  const a=[q.user.id];let w='';if(['pending','completed'].includes(q.query.status)){w=' AND status=?';a.push(q.query.status)}
  const[r]=await db.query(`SELECT * FROM tasks WHERE user_id=?${w} ORDER BY status,deadline IS NULL,deadline`,a);s.json(r)}));
app.post('/api/tasks',auth,wrap(async(q,s)=>{
  const v=taskVals(q.body);if(!v[0])return s.status(400).json({error:'Task title is required'});
  const[x]=await db.query('INSERT INTO tasks(user_id,title,description,deadline,priority,status) VALUES(?,?,?,?,?,?)',[q.user.id,...v]);s.json({id:x.insertId})}));
app.put('/api/tasks/:id(\\d+)',auth,wrap(async(q,s)=>{
  const v=taskVals(q.body);if(!v[0])return s.status(400).json({error:'Task title is required'});
  const[x]=await db.query('UPDATE tasks SET title=?,description=?,deadline=?,priority=?,status=? WHERE id=? AND user_id=?',[...v,q.params.id,q.user.id]);
  x.affectedRows?s.json({ok:true}):s.status(404).json({error:'Task not found'})}));
app.delete('/api/tasks/:id(\\d+)',auth,wrap(async(q,s)=>{
  const[x]=await db.query('DELETE FROM tasks WHERE id=? AND user_id=?',[q.params.id,q.user.id]);
  x.affectedRows?s.json({ok:true}):s.status(404).json({error:'Task not found'})}));

// ---------- Dashboard, search, admin ----------
const count=async t=>(await db.query(`SELECT COUNT(*) n FROM ${t}`))[0][0].n;
app.get('/api/dashboard',auth,wrap(async(q,s)=>{
  const[events]=await db.query('SELECT id,title,event_date,venue FROM events WHERE event_date>=CURDATE() ORDER BY event_date LIMIT 5');
  const[tasks]=await db.query("SELECT id,title,deadline,priority FROM tasks WHERE user_id=? AND status='pending' ORDER BY deadline IS NULL,deadline LIMIT 5",[q.user.id]);
  const[ann]=await db.query('SELECT id,title,category,important,created_at FROM announcements ORDER BY created_at DESC LIMIT 4');
  const[[o]]=await db.query('SELECT COUNT(*) n FROM opportunities WHERE deadline IS NULL OR deadline>=CURDATE()');
  const[[pt]]=await db.query("SELECT COUNT(*) n FROM tasks WHERE user_id=? AND status='pending'",[q.user.id]);
  const[[mc]]=await db.query('SELECT COUNT(*) n FROM club_members WHERE user_id=?',[q.user.id]);
  s.json({notes:await count('notes'),upcomingEvents:events.length,opportunities:o.n,pendingTasks:pt.n,clubs:await count('clubs'),myClubs:mc.n,events,tasks,announcements:ann})}));
app.get('/api/search',auth,wrap(async(q,s)=>{
  const t=String(q.query.q||'').trim();if(!t)return s.json({});const out={};
  for(const r of ['notes','events','opportunities','clubs','announcements']){
    const d=R[r],lbl=d.c[0];
    const[rows]=await db.query(`SELECT id,${lbl} AS title,description FROM ${r} WHERE ${d.s.map(c=>c+' LIKE ?').join(' OR ')} LIMIT 10`,d.s.map(()=>'%'+t+'%'));
    if(rows.length)out[r]=rows}
  s.json(out)}));
app.get('/api/stats',auth,admin,wrap(async(q,s)=>{
  const o={};for(const[k,t]of Object.entries({students:'users',notes:'notes',events:'events',opportunities:'opportunities',clubs:'clubs',announcements:'announcements',hackathons:'hackathons'}))o[k]=await count(t);
  o.students=(await db.query("SELECT COUNT(*) n FROM users WHERE role='student'"))[0][0].n;
  o.registrations=(await count('event_registrations'))+(await count('hackathon_registrations'));s.json(o)}));
app.get('/api/users',auth,admin,wrap(async(q,s)=>{
  const t='%'+(q.query.q||'')+'%';
  const[r]=await db.query("SELECT id,name,email,department,year,blocked FROM users WHERE role='student' AND (name LIKE ? OR email LIKE ?) ORDER BY id DESC",[t,t]);s.json(r)}));
app.put('/api/users/:id(\\d+)/block',auth,admin,wrap(async(q,s)=>{
  await db.query("UPDATE users SET blocked=1-blocked WHERE id=? AND role='student'",[q.params.id]);s.json({ok:true})}));
app.delete('/api/users/:id(\\d+)',auth,admin,wrap(async(q,s)=>{
  await db.query("DELETE FROM users WHERE id=? AND role='student'",[q.params.id]);s.json({ok:true})}));

app.use('/api',(q,s)=>s.status(404).json({error:'Endpoint not found'}));
const port=process.env.PORT||3000;
app.listen(port,()=>console.log(`Student Life Hub running at http://localhost:${port}`));
