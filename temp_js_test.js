// Test JavaScript syntax
document.addEventListener('DOMContentLoaded', function() {
    var taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            var submitBtn = this.querySelector('button[type="submit"]');
            var originalText = submitBtn.innerHTML;
            
            var formData = new FormData(this);
            var taskData = Object.fromEntries(formData);
            var taskId = taskData.taskId;
            
            var url = taskId ? '/api/tasks/' + taskId : '/api/tasks';
            var method = taskId ? 'PUT' : 'POST';
            
            fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(taskData)
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                if (data.success) {
                    console.log('Success');
                } else {
                    console.log('Error');
                }
            })
            .catch(function(error) {
                console.error('Error:', error);
            });
        });
    }
});