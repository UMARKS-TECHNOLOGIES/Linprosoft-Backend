import { env } from "./config/environment";
import app from './app'

app.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`);
    
})
