// Creates tables + demo data. Run: npm run seed
require('dotenv').config();
const mysql=require('mysql2/promise'),bcrypt=require('bcryptjs'),fs=require('fs'),path=require('path');
(async()=>{
const c=await mysql.createConnection({host:process.env.DB_HOST||'localhost',user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',multipleStatements:true});
await c.query(fs.readFileSync(path.join(__dirname,'../database/schema.sql'),'utf8'));
await c.query('USE '+(process.env.DB_NAME||'student_life_hub'));
const a=await bcrypt.hash('Admin@123',10),s=await bcrypt.hash('Student@123',10);
await c.query("INSERT INTO users(name,email,password,department,year,role) VALUES('Admin','admin@hub.com',?,'Administration',1,'admin'),('Demo Student','student@hub.com',?,'Computer Science',2,'student')",[a,s]);
await c.query(`
INSERT INTO notes(title,subject,department,year,description,link) VALUES
('Data Structures Unit 1','Data Structures','Computer Science',2,'Arrays, linked lists, stacks and queues.','https://example.com/ds1.pdf'),
('Engineering Maths Formulae','Mathematics','Computer Science',1,'Quick formula sheet.','https://example.com/maths.pdf'),
('Digital Electronics Notes','Electronics','Electronics',2,'Logic gates and flip-flops.','https://example.com/de.pdf');
INSERT INTO events(title,event_date,event_time,venue,description,organizer) VALUES
('Web Dev Workshop',DATE_ADD(CURDATE(),INTERVAL 5 DAY),'10:00:00','Seminar Hall A','Hands-on HTML/CSS/JS workshop.','Coding Club'),
('Career Fair',DATE_ADD(CURDATE(),INTERVAL 12 DAY),'09:30:00','Main Auditorium','Meet recruiters from top companies.','Placement Cell'),
('Cultural Night',DATE_ADD(CURDATE(),INTERVAL 20 DAY),'18:00:00','Open Grounds','Music, dance and drama.','Student Council');
INSERT INTO opportunities(title,organization,description,eligibility,deadline,link,category) VALUES
('Summer Software Internship','TechCorp','8-week paid internship.','CS/IT, year 2-3',DATE_ADD(CURDATE(),INTERVAL 15 DAY),'https://example.com/intern','Internship'),
('Merit Scholarship','Education Trust','Tuition support for top students.','CGPA 8.5+',DATE_ADD(CURDATE(),INTERVAL 30 DAY),'https://example.com/scholar','Scholarship'),
('Junior Developer','StartupX','Full-time entry role.','Final year',DATE_ADD(CURDATE(),INTERVAL 25 DAY),'https://example.com/job','Job'),
('Cloud Practitioner Cert','CloudCo','Discounted exam voucher.','All students',DATE_ADD(CURDATE(),INTERVAL 40 DAY),'https://example.com/cert','Certification');
INSERT INTO hackathons(title,type,description,organizer,deadline,link) VALUES
('CodeSprint 24h','Hackathon','Build a solution in 24 hours.','Coding Club',DATE_ADD(CURDATE(),INTERVAL 10 DAY),'https://example.com/sprint'),
('Algorithm Arena','Coding Competition','Individual coding contest.','CS Department',DATE_ADD(CURDATE(),INTERVAL 18 DAY),'https://example.com/arena');
INSERT INTO clubs(name,description,category,coordinator,meeting_info) VALUES
('Coding Club','Learn and build software together.','Technical','Dr. Rao','Fridays 4 PM, Lab 2'),
('Photography Club','Capture campus life.','Arts','Ms. Sen','Wednesdays 3 PM, Room 101'),
('Robotics Club','Design and build robots.','Technical','Mr. Khan','Saturdays 11 AM, Workshop');
INSERT INTO announcements(title,description,category,important) VALUES
('Mid-term exam schedule released','Check the notice board for dates.','Exams',1),
('Library timing extended','Open until 9 PM this month.','General',0),
('Fee payment deadline','Last date to pay semester fees is approaching.','Fees',1);`);
await c.query("INSERT INTO tasks(user_id,title,description,deadline,priority) VALUES(2,'Submit DS assignment','Chapter 3 problems',DATE_ADD(CURDATE(),INTERVAL 2 DAY),'High'),(2,'Prepare for quiz','Maths revision',DATE_ADD(CURDATE(),INTERVAL 6 DAY),'Medium')");
console.log('Database ready. Admin: admin@hub.com / Admin@123 | Student: student@hub.com / Student@123');process.exit(0);
})().catch(e=>{console.error(e.message);process.exit(1)});
