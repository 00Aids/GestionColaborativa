const Task = require('./src/models/Task');
const Project = require('./src/models/Project');
require('dotenv').config();

async function simulateController() {
    try {
        const taskModel = new Task();
        const projectModel = new Project();
        
        const projectId = 35;
        
        console.log('=== Simulating AdminController.showTaskKanban ===');
        console.log(`Project ID: ${projectId}`);
        
        // Step 1: Get project details
        console.log('\n1. Getting project details...');
        const projects = await projectModel.findWithDetails({ id: projectId });
        if (!projects || projects.length === 0) {
            console.log('ERROR: Project not found');
            return;
        }
        
        const project = projects[0];
        console.log(`Project found: "${project.titulo}"`);
        
        // Step 2: Get tasks grouped by workflow
        console.log('\n2. Getting tasks grouped by workflow...');
        const tasksGrouped = await taskModel.getProjectTasksWithWorkflow(projectId);
        
        console.log('Tasks grouped result:');
        console.log(`- TODO: ${tasksGrouped.todo.length} tasks`);
        console.log(`- IN_PROGRESS: ${tasksGrouped.in_progress.length} tasks`);
        console.log(`- DONE: ${tasksGrouped.done.length} tasks`);
        
        // Step 3: Get project members
        console.log('\n3. Getting project members...');
        const members = await projectModel.getProjectMembers(projectId);
        console.log(`Members found: ${members.length}`);
        
        // Step 4: Simulate what would be passed to the view
        console.log('\n4. Data that would be passed to the view:');
        const viewData = {
            title: `Tareas - ${project.titulo}`,
            project: project,
            tasksGrouped: tasksGrouped,
            members: members
        };
        
        console.log('View data structure:');
        console.log('- title:', viewData.title);
        console.log('- project.id:', viewData.project.id);
        console.log('- project.titulo:', viewData.project.titulo);
        console.log('- tasksGrouped.todo.length:', viewData.tasksGrouped.todo.length);
        console.log('- tasksGrouped.in_progress.length:', viewData.tasksGrouped.in_progress.length);
        console.log('- tasksGrouped.done.length:', viewData.tasksGrouped.done.length);
        console.log('- members.length:', viewData.members.length);
        
        // Step 5: Show detailed task information
        if (viewData.tasksGrouped.todo.length > 0) {
            console.log('\n5. Detailed TODO tasks:');
            viewData.tasksGrouped.todo.forEach((task, index) => {
                console.log(`Task ${index + 1}:`);
                console.log(`  - ID: ${task.id}`);
                console.log(`  - Title: "${task.titulo}"`);
                console.log(`  - Description: "${task.descripcion}"`);
                console.log(`  - Priority: ${task.prioridad}`);
                console.log(`  - Workflow Status: ${task.estado_workflow}`);
                console.log(`  - Status: ${task.estado}`);
                console.log(`  - Assigned to: ${task.asignado_nombres || 'Sin asignar'}`);
                console.log(`  - Due date: ${task.fecha_limite}`);
            });
        }
        
        console.log('\n=== Simulation completed successfully ===');
        
    } catch (error) {
        console.error('Error in simulation:', error);
    }
}

simulateController();