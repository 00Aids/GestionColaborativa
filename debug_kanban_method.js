const Task = require('./src/models/Task');
require('dotenv').config();

async function debugKanbanMethod() {
    try {
        const taskModel = new Task();
        
        // Test with project ID 35 (the latest project)
        const projectId = 35;
        console.log(`Testing getProjectTasksWithWorkflow for project ID: ${projectId}`);
        
        const tasksGrouped = await taskModel.getProjectTasksWithWorkflow(projectId);
        
        console.log('\nResult from getProjectTasksWithWorkflow:');
        console.log('Type:', typeof tasksGrouped);
        console.log('Keys:', Object.keys(tasksGrouped));
        
        console.log('\nTODO tasks:');
        console.log('Count:', tasksGrouped.todo ? tasksGrouped.todo.length : 'undefined');
        if (tasksGrouped.todo && tasksGrouped.todo.length > 0) {
            tasksGrouped.todo.forEach((task, index) => {
                console.log(`  ${index + 1}. ID: ${task.id}, Title: "${task.titulo}", Status: ${task.estado_workflow}`);
            });
        }
        
        console.log('\nIN_PROGRESS tasks:');
        console.log('Count:', tasksGrouped.in_progress ? tasksGrouped.in_progress.length : 'undefined');
        if (tasksGrouped.in_progress && tasksGrouped.in_progress.length > 0) {
            tasksGrouped.in_progress.forEach((task, index) => {
                console.log(`  ${index + 1}. ID: ${task.id}, Title: "${task.titulo}", Status: ${task.estado_workflow}`);
            });
        }
        
        console.log('\nDONE tasks:');
        console.log('Count:', tasksGrouped.done ? tasksGrouped.done.length : 'undefined');
        if (tasksGrouped.done && tasksGrouped.done.length > 0) {
            tasksGrouped.done.forEach((task, index) => {
                console.log(`  ${index + 1}. ID: ${task.id}, Title: "${task.titulo}", Status: ${task.estado_workflow}`);
            });
        }
        
        console.log('\nFull object structure:');
        console.log(JSON.stringify(tasksGrouped, null, 2));
        
    } catch (error) {
        console.error('Error testing getProjectTasksWithWorkflow:', error);
    }
}

debugKanbanMethod();