const http = require('http');

function testDeleteEndpoint() {
    const postData = JSON.stringify({});
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/admin/projects/1/members/3',
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Cookie': 'connect.sid=s%3A_your_session_id_here' // Necesitarías una sesión válida
        }
    };

    const req = http.request(options, (res) => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Headers: ${JSON.stringify(res.headers)}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('Response body:', data);
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });

    req.write(postData);
    req.end();
}

console.log('🔍 Probando endpoint DELETE /admin/projects/1/members/3...');
testDeleteEndpoint();