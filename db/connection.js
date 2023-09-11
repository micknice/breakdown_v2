const { Pool } = require('pg');
const ENV = process.env.NODE_ENV || 'dev'

require('dotenv').config({
  path: `${__dirname}/../.env.${ENV}`,
});

const config = 
  {
    connectionString: 'postgres://breakdown_service_user:vOeFLz9KWnt91Z3G6mjqpVExvfqPaNto@dpg-cj453rp8g3nakvhrpbqg-a.frankfurt-postgres.render.com/breakdown_service?ssl=true',
    max: 2
}
                        
                      


module.exports = new Pool(config);