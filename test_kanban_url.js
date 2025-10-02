const http = require('http');
const querystring = require('querystring');

function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
        });
        
        req.on('error', reject);
        
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

async function testKanbanURL() {
    try {
        const projectId = 35;
        const kanbanPath = `/admin/projects/${projectId}/tasks/kanban`;
        
        console.log(`Testing Kanban URL: http://localhost:3000${kanbanPath}`);
        
        // First, let's try to get the login page to get session cookies
        const loginResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/login',
            method: 'GET'
        });
        
        const cookies = loginResponse.headers['set-cookie'];
        console.log('Got login page, now attempting to login...');
        
        // Login with the test admin user
        const loginData = querystring.stringify({
            email: 'nuevoadmin@test.com',
            password: 'admin123'
        });
        
        const loginPostResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/login',
            method: 'POST',
            headers: {
                'Cookie': cookies ? cookies.join('; ') : '',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(loginData)
            }
        }, loginData);
        
        console.log('Login response status:', loginPostResponse.status);
        
        // Get the session cookies from login
        const sessionCookies = loginPostResponse.headers['set-cookie'] || cookies;
        
        // Now try to access the Kanban page
        const kanbanResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: kanbanPath,
            method: 'GET',
            headers: {
                'Cookie': sessionCookies ? sessionCookies.join('; ') : ''
            }
        });
        
        console.log('Kanban response status:', kanbanResponse.status);
        console.log('Response length:', kanbanResponse.data.length);
        
        // Check if the response contains task data
        const responseText = kanbanResponse.data;
        
        // Look for task-related content
        const hasTaskCards = responseText.includes('task-card');
        const hasTaskTitle = responseText.includes('Test Task - Script Creation');
        const hasTodoColumn = responseText.includes('todo-column');
        const hasTasksGrouped = responseText.includes('tasksGrouped');
        
        console.log('\nContent analysis:');
        console.log('- Contains task-card class:', hasTaskCards);
        console.log('- Contains test task title:', hasTaskTitle);
        console.log('- Contains todo-column:', hasTodoColumn);
        console.log('- Contains tasksGrouped:', hasTasksGrouped);
        
        // Look for the specific task count
        const todoCountMatch = responseText.match(/todo\.length.*?(\d+)/);
        if (todoCountMatch) {
            console.log('- TODO tasks count in HTML:', todoCountMatch[1]);
        }
        
        // Check for any JavaScript errors or console logs
        const hasJSErrors = responseText.includes('error') || responseText.includes('Error');
        console.log('- Potential JS errors in response:', hasJSErrors);
        
        // Save a portion of the response for manual inspection
        const taskSectionMatch = responseText.match(/<div class="column-body" id="todo-column">[\s\S]*?<\/div>/);
        if (taskSectionMatch) {
            console.log('\nTODO column content:');
            console.log(taskSectionMatch[0].substring(0, 500) + '...');
        }
        
    } catch (error) {
        console.error('Error testing Kanban URL:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data length:', error.response.data ? error.response.data.length : 'No data');
        }
    }
}

testKanbanURL();