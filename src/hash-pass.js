import { hash } from 'bcryptjs'; 
hash('YourPassword123!', 10).then(console.log);