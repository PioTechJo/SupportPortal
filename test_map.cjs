const data = {
  id: 1,
  roles: { role_name: "administrator" }
};
let finalRoleName = data.role_name || data.role;
if (data.roles) {
  if (Array.isArray(data.roles) && data.roles.length > 0 && data.roles[0].role_name) {
    finalRoleName = data.roles[0].role_name;
  } else if (!Array.isArray(data.roles) && data.roles.role_name) {
    finalRoleName = data.roles.role_name;
  }
}
console.log(finalRoleName);
