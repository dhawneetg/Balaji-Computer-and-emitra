const db = require('./database');
db.getAllExams().then(exams => {
    console.log(`Found ${exams.length} exams.`);
    console.log(JSON.stringify(exams.slice(0, 2), null, 2));
    process.exit(0);
});
