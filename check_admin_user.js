const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function checkAdminUser() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'gestion_academica',
            port: process.env.DB_PORT || 3306
        });
        
        console.log('=== Checking Admin User ===');
        
        // First, check the table structure
        const [columns] = await connection.execute('DESCRIBE usuarios');
        console.log('\nUsuarios table structure:');
        columns.forEach(col => {
            console.log(`- ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'nullable' : 'not null'})`);
        });
        
        // Find the password column name
        const passwordColumn = columns.find(col => 
            col.Field.toLowerCase().includes('password') || 
            col.Field.toLowerCase().includes('contrasena') ||
            col.Field.toLowerCase().includes('clave')
        );
        
        console.log(`\nPassword column found: ${passwordColumn ? passwordColumn.Field : 'Not found'}`);
        
        // Check if the admin user exists
        const query = passwordColumn 
            ? `SELECT id, nombres, apellidos, email, ${passwordColumn.Field}, rol_id FROM usuarios WHERE email = ?`
            : 'SELECT id, nombres, apellidos, email, rol_id FROM usuarios WHERE email = ?';
            
        const [users] = await connection.execute(query, ['nuevoadmin@test.com']);
        
        if (users.length === 0) {
            console.log('❌ Admin user not found with email: nuevoadmin@test.com');
            
            // Let's see what users exist
            const [allUsers] = await connection.execute(
                'SELECT id, nombres, apellidos, email, rol_id FROM usuarios LIMIT 10'
            );
            
            console.log('\nExisting users:');
            allUsers.forEach(user => {
                console.log(`- ID: ${user.id}, Email: ${user.email}, Name: ${user.nombres} ${user.apellidos}, Role: ${user.rol_id}`);
            });
            
        } else {
            const user = users[0];
            console.log('✅ Admin user found:');
            console.log(`- ID: ${user.id}`);
            console.log(`- Name: ${user.nombres} ${user.apellidos}`);
            console.log(`- Email: ${user.email}`);
            console.log(`- Role ID: ${user.rol_id}`);
            
            // Test password if password column exists
            if (passwordColumn) {
                const testPassword = 'admin123';
                const storedPassword = user[passwordColumn.Field];
                const isPasswordValid = await bcrypt.compare(testPassword, storedPassword);
                console.log(`- Password '${testPassword}' is valid: ${isPasswordValid ? '✅' : '❌'}`);
                
                if (!isPasswordValid) {
                    console.log('- Stored password hash:', storedPassword);
                    
                    // Try to create a new hash for comparison
                    const newHash = await bcrypt.hash(testPassword, 10);
                    console.log('- New hash for comparison:', newHash);
                }
            } else {
                console.log('- No password column found, cannot test password');
            }
        }
        
        await connection.end();
    } catch (error) {
        console.error('Error checking admin user:', error);
    }
}

checkAdminUser();