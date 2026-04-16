import mysql from 'mysql2';

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',   
    password: '',     
    database: 'cosmetics_shop' 
});

export default pool.promise();