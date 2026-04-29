import dotenv from "dotenv";
dotenv.config(); // Must be first!

import app from './app'

const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    
})