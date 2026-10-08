const $=s=>document.querySelector(s);let me=null,token=localStorage.token||'';const D={},F={};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(m,u,b){let r;try{r=await fetch('/api'+u,{method:m,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:b?JSON.stringify(b):undefined})}catch{throw Error('Network error. Is the server running?')}
 const j=await r.json().catch(()=>({}));if(r.status===401&&me){logout(true)}if(!r.ok)throw Error(j.error||'Request failed');return j}
function toast(m,e){const d=document.createElement('div');d.className='t'+(e?' e':'');d.textContent=m;$('#toast').append(d);setTimeout(()=>d.remove(),3500)}
const run=async f=>{try{await f()}catch(e){toast(e.message,1)}};
const sure=m=>confirm(m);
function modal(h){$('#modal').innerHTML=`<div class="box">${h}</div>`;$('#modal').classList.remove('hidden')}
function closeModal(){$('#modal').classList.add('hidden')}
$('#modal').onclick=e=>{if(e.target.id==='modal')closeModal()};

const T=['title','Title'],DESC=['description','Description','textarea'];
const P={
 notes:{t:'Study Hub',title:'title',sub:x=>`${x.subject||''} · ${x.department||''} · Year ${x.year||'-'} · Uploaded ${(x.created_at||'').slice(0,10)}`,fl:['subject','department','year'],link:'Download',
  f:[T,['subject','Subject'],['department','Department'],['year','Year','number'],DESC,['link','File / resource link (URL)']]},
 events:{t:'Events',title:'title',sub:x=>`📅 ${x.event_date} ${x.event_time||''} · 📍 ${x.venue||'TBA'} · By ${x.organizer||'-'}`,fl:['venue','organizer'],
  f:[T,['event_date','Date','date'],['event_time','Time','time'],['venue','Venue'],DESC,['organizer','Organizer']]},
 opportunities:{t:'Opportunities',title:'title',sub:x=>`${x.category} · ${x.organization||''} · ⏰ Deadline: ${x.deadline||'Open'}`,fl:['category'],save:1,link:'Apply Now',
  f:[T,['organization','Organization'],DESC,['eligibility','Eligibility','textarea'],['deadline','Deadline','date'],['link','Application link (URL)'],['category','Category','select',['Internship','Scholarship','Job','Certification','Other']]]},
 hackathons:{t:'Hackathons & Competitions',title:'title',sub:x=>`${x.type} · By ${x.organizer||'-'} · ⏰ Deadline: ${x.deadline||'Open'}`,fl:['type'],save:1,link:'Official Page',
  f:[T,['type','Type','select',['Hackathon','Coding Competition','Project Competition','Technical Competition']],DESC,['organizer','Organizer'],['deadline','Deadline','date'],['link','Link (URL)']]},
 clubs:{t:'Clubs & Communities',title:'name',sub:x=>`${x.category||''} · Coordinator: ${x.coordinator||'-'} · 🕒 ${x.meeting_info||'TBA'}`,fl:['category'],
  f:[['name','Club name'],DESC,['category','Category'],['coordinator','Coordinator'],['meeting_info','Meeting information']]},
 announcements:{t:'Announcements',title:'title',sub:x=>`${x.category||''} · ${(x.created_at||'').slice(0,10)}`,fl:['category'],
  f:[T,DESC,['category','Category'],['important','Mark as important','check']]}};
const JL={events:['Register','Cancel Registration','Registered Successfully'],hackathons:['Register','Cancel Registration','Registered Successfully'],clubs:['Join Club','Leave Club','Joined club']};
const ICON={dashboard:'🏠',notes:'📚',events:'🎉',opportunities:'💼',hackathons:'💻',clubs:'👥',tasks:'✅',announcements:'📢',profile:'👤'};
const ORDER=['dashboard','notes','events','opportunities','hackathons','clubs','tasks','announcements','profile'];
const NAME={dashboard:'Dashboard',tasks:'Tasks & Deadlines',profile:'Profile'};
const navName=k=>NAME[k]||P[k].t;

function authView(mode){
 const reg=mode==='register';
 $('#app').innerHTML=`<div class="auth"><div class="card"><h1>🎓 Student Life Hub</h1><p class="muted">One platform → Multiple student needs → Better organization</p>
 <form id="af">${reg?'<label>Name</label><input name="name" required><label>Department</label><input name="department" required><label>Year (1-6)</label><input name="year" type="number" min="1" max="6" required>':''}
 <label>Email</label><input name="email" type="email" required><label>Password</label><input name="password" type="password" required minlength="${reg?8:1}">
 ${reg?'<p class="muted">8+ characters, with a letter and a number.</p>':''}<div class="row"><button class="pri" style="width:100%">${reg?'Create account':'Login'}</button></div></form>
 <p class="muted">${reg?'Have an account?':'New here?'} <a href="#" id="sw">${reg?'Login':'Register'}</a></p>${reg?'':'<p class="muted">Demo: student@hub.com / Student@123<br>Admin: admin@hub.com / Admin@123</p>'}</div></div>`;
 $('#sw').onclick=e=>{e.preventDefault();authView(reg?'login':'register')};
 $('#af').onsubmit=e=>{e.preventDefault();run(async()=>{const b=Object.fromEntries(new FormData(e.target));const r=await api('POST','/auth/'+(reg?'register':'login'),b);
  token=r.token;localStorage.token=token;me=r.user;location.hash='#dashboard';shell();toast(reg?'Registration successful. Welcome!':'Welcome back, '+me.name)})}}
async function logout(silent){try{if(!silent)await api('POST','/auth/logout')}catch{}token='';me=null;localStorage.removeItem('token');authView('login');if(!silent)toast('Logged out')}

function shell(){
 const items=[...ORDER.map(k=>[k,ICON[k],navName(k)]),...(me.role==='admin'?[['admin','🛠️','Admin Dashboard']]:[])];
 $('#app').innerHTML=`<div class="layout"><nav class="side" id="side"><h2>🎓 Student Life Hub</h2>${items.map(n=>`<a data-p="${n[0]}" href="#${n[0]}">${n[1]} ${n[2]}</a>`).join('')}<a id="lo">🚪 Logout</a></nav>
 <div class="main"><div class="top"><button class="burger" id="bg">☰</button><form id="gs"><input id="gq" placeholder="Search notes, events, opportunities, clubs, announcements..."><button class="pri">Search</button></form></div><div class="content" id="main"></div></div></div>`;
 $('#bg').onclick=()=>$('#side').classList.toggle('open');$('#lo').onclick=()=>logout();
 $('#gs').onsubmit=e=>{e.preventDefault();const q=$('#gq').value.trim();if(!q)return toast('Type something to search',1);location.hash='#search='+encodeURIComponent(q)};
 route()}
const spin=()=>$('#main').innerHTML='<div class="spin">Loading...</div>';
function route(){if(!me)return;const h=location.hash.slice(1)||'dashboard';$('#side')?.classList.remove('open');
 document.querySelectorAll('.side a[data-p]').forEach(a=>a.classList.toggle('on',a.dataset.p===h.split('=')[0]));spin();
 run(async()=>{if(h.startsWith('search='))return search(decodeURIComponent(h.slice(7)));
  if(P[h])return page(h);({dashboard,tasks,profile,admin:adminPage}[h]||dashboard)()})}
window.onhashchange=route;

async function dashboard(){const d=await api('GET','/dashboard');
 const st=(n,l,h)=>`<div class="card stat" onclick="location.hash='#${h}'"><b>${n}</b>${l}</div>`;
 $('#main').innerHTML=`<h1>Welcome, ${esc(me.name)} 👋</h1><div class="stats">${st(d.notes,'Study materials','notes')}${st(d.upcomingEvents,'Upcoming events','events')}${st(d.opportunities,'Open opportunities','opportunities')}${st(d.pendingTasks,'Pending tasks','tasks')}${st(d.clubs+' ('+d.myClubs+' joined)','Clubs','clubs')}</div>
 <div class="row" style="margin-bottom:16px"><button class="pri" onclick="taskForm()">+ Add Task</button><button onclick="location.hash='#events'">Browse Events</button><button onclick="location.hash='#notes'">Find Notes</button><button onclick="location.hash='#hackathons'">Hackathons</button></div>
 <div class="grid"><div class="card"><h3>⏰ Upcoming deadlines</h3>${d.tasks.map(t=>`<p class="${dueCls(t)}" style="padding-left:8px">${esc(t.title)} <span class="muted">· ${t.deadline||'No deadline'} · ${t.priority}</span></p>`).join('')||'<p class="muted">No pending tasks 🎉</p>'}</div>
 <div class="card"><h3>📅 Upcoming events</h3>${d.events.map(e=>`<p>${esc(e.title)} <span class="muted">· ${e.event_date} · ${esc(e.venue||'')}</span></p>`).join('')||'<p class="muted">No upcoming events</p>'}</div>
 <div class="card"><h3>📢 Recent announcements</h3>${d.announcements.map(a=>`<p>${a.important==1?'<span class="tag" style="margin:0 6px 0 0">Important</span>':''}${esc(a.title)}</p>`).join('')||'<p class="muted">None</p>'}<button onclick="location.hash='#announcements'">View all</button></div></div>`}

async function page(r){const p=P[r];F[r]=F[r]||{};
 $('#main').innerHTML=`<h1>${p.t}</h1><div class="bar"><input id="q" placeholder="Search..." value="${esc(F[r].q||'')}">${p.fl.map(f=>`<input data-f="${f}" placeholder="Filter: ${f.replace('_',' ')}" value="${esc(F[r][f]||'')}">`).join('')}
 <button id="clr">Clear</button>${me.role==='admin'?`<button class="pri" onclick="form('${r}')">+ Add</button>`:''}</div><div class="grid" id="list"></div>`;
 let tm;const go=()=>{clearTimeout(tm);tm=setTimeout(()=>run(()=>list(r)),250)};
 $('#q').oninput=e=>{F[r].q=e.target.value;go()};document.querySelectorAll('[data-f]').forEach(i=>i.oninput=e=>{F[r][i.dataset.f]=e.target.value;go()});
 $('#clr').onclick=()=>{F[r]={};page(r)};await list(r)}
async function list(r){const p=P[r];const qs=new URLSearchParams(Object.fromEntries(Object.entries(F[r]||{}).filter(([,v])=>v)));
 const d=D[r]=await api('GET',`/${r}?${qs}`);$('#list').innerHTML=d.length?d.map(x=>card(r,p,x)).join(''):'<div class="empty" style="grid-column:1/-1">Nothing found. Try changing your search or filters.</div>'}
function card(r,p,x){const j=JL[r],adm=me.role==='admin';
 return `<div class="card ${x.important==1?'imp':''}"><h3>${esc(x[p.title])}${x.important==1?'<span class="tag">Important</span>':''}</h3><p class="muted">${esc(p.sub(x))}</p><p>${esc((x.description||'').slice(0,140))}</p><div class="row">
 <button onclick="detail('${r}',${x.id})">View Details</button>
 ${j&&!adm?`<button class="${x.joined?'sec':'pri'}" onclick="toggle('${r}',${x.id},${x.joined})">${x.joined?j[1]:j[0]}</button>`:''}${j?`<span class="muted">${x.count} ${r==='clubs'?'members':'registered'}</span>`:''}
 ${p.save?`<button onclick="save('${r}',${x.id},${x.saved})">${x.saved?'★ Saved':'☆ Save'}</button>`:''}
 ${x.link?`<a class="btn" href="${esc(x.link)}" target="_blank" rel="noopener">${p.link||'Open Link'}</a>`:''}
 ${adm?`<button onclick="form('${r}',${x.id})">Edit</button><button class="danger" onclick="del('${r}',${x.id})">Delete</button>${j?`<button onclick="members('${r}',${x.id})">${r==='clubs'?'Members':'Registrations'}</button>`:''}`:''}</div></div>`}
function detail(r,id){const x=D[r].find(v=>v.id===id),p=P[r];
 modal(`<h2>${esc(x[p.title])}</h2><p class="muted">${esc(p.sub(x))}</p>${p.f.filter(f=>!['title','name'].includes(f[0])&&x[f[0]]).map(f=>`<p><b>${f[1]}:</b> ${f[0]==='link'?`<a href="${esc(x.link)}" target="_blank" rel="noopener">${esc(x.link)}</a>`:esc(x[f[0]])}</p>`).join('')}<button onclick="closeModal()">Close</button>`)}
const toggle=(r,id,on)=>run(async()=>{await api(on?'DELETE':'POST',`/${r}/${id}/join`);toast(on?'Cancelled':JL[r][2]);await list(r)});
const save=(r,id,on)=>run(async()=>{await api(on?'DELETE':'POST',`/${r}/${id}/save`);toast(on?'Removed from saved':'Saved');await list(r)});
const del=(r,id)=>{if(sure('Delete this item permanently?'))run(async()=>{await api('DELETE',`/${r}/${id}`);toast('Deleted');await list(r)})};
function fieldHtml(f,v){const[n,l,t,o]=f;v=v??'';
 if(t==='textarea')return `<label>${l}</label><textarea name="${n}" rows="3">${esc(v)}</textarea>`;
 if(t==='select')return `<label>${l}</label><select name="${n}">${o.map(x=>`<option ${x===v?'selected':''}>${x}</option>`).join('')}</select>`;
 if(t==='check')return `<label><input type="checkbox" name="${n}" style="width:auto" ${v==1?'checked':''}> ${l}</label>`;
 return `<label>${l}</label><input name="${n}" type="${t||'text'}" value="${esc(String(v).slice(0,t==='time'?5:200))}">`}
function form(r,id){const p=P[r],x=id?D[r].find(v=>v.id===id):{};
 modal(`<h2>${id?'Edit':'Add'} ${p.t}</h2><form id="mf">${p.f.map(f=>fieldHtml(f,x[f[0]])).join('')}<div class="row"><button class="pri">Save</button><button type="button" onclick="closeModal()">Cancel</button></div></form>`);
 $('#mf').onsubmit=e=>{e.preventDefault();run(async()=>{const b={};p.f.forEach(f=>{const el=e.target[f[0]];b[f[0]]=f[2]==='check'?el.checked:el.value});
  if(!String(b[p.f[0][0]]).trim())throw Error('First field is required');
  await api(id?'PUT':'POST',`/${r}${id?'/'+id:''}`,b);closeModal();toast('Saved successfully');await list(r)})}}
function members(r,id){run(async()=>{const m=await api('GET',`/${r}/${id}/members`);
 modal(`<h2>${r==='clubs'?'Members':'Registrations'} (${m.length})</h2>${m.map(u=>`<p>${esc(u.name)} <span class="muted">· ${esc(u.email)} · ${esc(u.department||'')} Y${u.year||''}</span> <button class="danger" onclick="rmMember('${r}',${id},${u.id})">Remove</button></p>`).join('')||'<p class="muted">No one yet.</p>'}<button onclick="closeModal()">Close</button>`)})}
const rmMember=(r,id,u)=>{if(sure('Remove this person?'))run(async()=>{await api('DELETE',`/${r}/${id}/members/${u}`);toast('Removed');members(r,id);list(r)})};

async function search(q){const d=await api('GET','/search?q='+encodeURIComponent(q));const keys=Object.keys(d);
 $('#main').innerHTML=`<h1>Results for "${esc(q)}"</h1>${keys.map(k=>`<h3>${P[k].t}</h3><div class="grid">${d[k].map(x=>`<div class="card"><b>${esc(x.title)}</b><p class="muted">${esc((x.description||'').slice(0,120))}</p><button onclick="location.hash='#${k}'">Open ${P[k].t}</button></div>`).join('')}</div>`).join('')||'<div class="empty">No results found.</div>'}`}

const dueCls=t=>{if(!t.deadline||t.status==='completed')return'';const d=(new Date(t.deadline)-new Date(new Date().toDateString()))/864e5;return d<0?'due-over':d<=2?'due-soon':''};
async function tasks(){$('#main').innerHTML=`<h1>Tasks & Deadlines</h1><div class="bar"><select id="ts"><option value="">All</option><option value="pending">Pending</option><option value="completed">Completed</option></select><button class="pri" onclick="taskForm()">+ Add Task</button></div><div class="grid" id="list"></div>`;
 $('#ts').value=F.ts||'';$('#ts').onchange=e=>{F.ts=e.target.value;run(loadTasks)};await loadTasks()}
async function loadTasks(){const d=D.tasks=await api('GET','/tasks'+(F.ts?'?status='+F.ts:''));
 $('#list').innerHTML=d.length?d.map(t=>`<div class="card ${dueCls(t)}"><h3 class="${t.status==='completed'?'done':''}">${esc(t.title)}</h3><p class="muted">⏰ ${t.deadline||'No deadline'} · ${t.priority} · ${t.status}${dueCls(t)==='due-over'?' · OVERDUE':dueCls(t)==='due-soon'?' · DUE SOON':''}</p><p>${esc(t.description||'')}</p>
 <div class="row"><button onclick="doneTask(${t.id})">${t.status==='completed'?'Mark Pending':'Mark Complete'}</button><button onclick="taskForm(${t.id})">Edit</button><button class="danger" onclick="delTask(${t.id})">Delete</button></div></div>`).join(''):'<div class="empty" style="grid-column:1/-1">No tasks yet. Add your first one!</div>'}
function taskForm(id){const x=id?D.tasks.find(t=>t.id===id):{};
 modal(`<h2>${id?'Edit':'Add'} Task</h2><form id="mf">${fieldHtml(T,x.title)}${fieldHtml(DESC,x.description)}${fieldHtml(['deadline','Deadline','date'],x.deadline)}${fieldHtml(['priority','Priority','select',['Low','Medium','High']],x.priority)}<div class="row"><button class="pri">Save</button><button type="button" onclick="closeModal()">Cancel</button></div></form>`);
 $('#mf').onsubmit=e=>{e.preventDefault();run(async()=>{const b=Object.fromEntries(new FormData(e.target));b.status=x.status||'pending';if(!b.title.trim())throw Error('Title is required');
  await api(id?'PUT':'POST','/tasks'+(id?'/'+id:''),b);closeModal();toast('Task saved');route()})}}
const doneTask=id=>run(async()=>{const t=D.tasks.find(v=>v.id===id);await api('PUT','/tasks/'+id,{...t,status:t.status==='completed'?'pending':'completed'});toast('Task updated');await loadTasks()});
const delTask=id=>{if(sure('Delete this task?'))run(async()=>{await api('DELETE','/tasks/'+id);toast('Task deleted');await loadTasks()})};

function profile(){$('#main').innerHTML=`<h1>Profile</h1><div class="grid"><div class="card"><div class="avatar">${esc(me.name[0].toUpperCase())}</div><p class="muted">${esc(me.email)} · ${me.role}</p>
 <form id="pf">${fieldHtml(['name','Name'],me.name)}${fieldHtml(['department','Department'],me.department)}${fieldHtml(['year','Year','number'],me.year)}<div class="row"><button class="pri">Save Profile</button></div></form></div>
 <div class="card"><h3>Change password</h3><form id="pw"><label>Current password</label><input name="current" type="password" required><label>New password</label><input name="next" type="password" required minlength="8"><div class="row"><button class="pri">Change Password</button><button type="button" id="lo2">Logout</button></div></form></div></div>`;
 $('#lo2').onclick=()=>logout();
 $('#pf').onsubmit=e=>{e.preventDefault();run(async()=>{me={...me,...await api('PUT','/profile',Object.fromEntries(new FormData(e.target)))};toast('Profile updated')})};
 $('#pw').onsubmit=e=>{e.preventDefault();run(async()=>{await api('PUT','/profile/password',Object.fromEntries(new FormData(e.target)));e.target.reset();toast('Password changed')})}}

async function adminPage(){if(me.role!=='admin')return toast('Admin only',1);const s=await api('GET','/stats');
 $('#main').innerHTML=`<h1>Admin Dashboard</h1><div class="stats">${Object.entries(s).map(([k,v])=>`<div class="card stat"><b>${v}</b>Total ${k}</div>`).join('')}</div>
 <p class="muted">Manage notes, events, opportunities, hackathons, clubs and announcements from their pages (Add / Edit / Delete buttons appear for admins).</p>
 <h2>Students</h2><div class="bar"><input id="uq" placeholder="Search students by name or email"></div><div class="tbl" id="ut"></div>`;
 let tm;$('#uq').oninput=()=>{clearTimeout(tm);tm=setTimeout(()=>run(users),250)};await users()}
async function users(){const u=await api('GET','/users?q='+encodeURIComponent($('#uq').value));
 $('#ut').innerHTML=u.length?`<table><tr><th>Name</th><th>Email</th><th>Dept</th><th>Year</th><th>Status</th><th></th></tr>${u.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td>${esc(x.department||'')}</td><td>${x.year||''}</td><td>${x.blocked?'Blocked':'Active'}</td><td><button onclick="blockU(${x.id})">${x.blocked?'Unblock':'Block'}</button> <button class="danger" onclick="delU(${x.id})">Delete</button></td></tr>`).join('')}</table>`:'<div class="empty">No students found.</div>'}
const blockU=id=>run(async()=>{await api('PUT',`/users/${id}/block`);toast('Updated');users()});
const delU=id=>{if(sure('Delete this student and all their data?'))run(async()=>{await api('DELETE','/users/'+id);toast('Student deleted');users()})};

(async()=>{if(!token)return authView('login');try{me=await api('GET','/auth/me');shell()}catch{token='';localStorage.removeItem('token');authView('login')}})();
