const userApiUrl = baseURL + 'api/User';
const adminPanel = document.getElementById('adminPanel');
const createUserForm =  document.getElementById('UserList');
async function getUserInfo() {
    const res = await fetWithAuth(baseURL + '/api/auth/me')
    const data = await res.json();
     return data;
}
async function loadUsers() 
{
    const res = await fetWithAuth(userApiUrl);
    const users = await res.json();
    userList.innerHTML ='';
    users.forEach(user =>{
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-item-center';
        li.textContent = '${User.username}-${user.role}';
        userList.appendChild(li);
    });
}
createUserForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newRole').value;

    await fetWithAuth(userApiUrl + '/create',{
        method: 'POST',
        body: JSON.stringify({username,password,role})
    });
    createUserForm.reset();
    await loadUsers;
});
document.addEventListener('DOMContentLoaded',()=>{
    getUserInfo().then(user =>{
    if (user.role ==='admin'){
        adminPanel.classList.remove('d-none');
        loadUsers();
        }
    });
})
