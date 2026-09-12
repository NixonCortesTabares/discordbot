const { ROLES } = require('../config/constants');

/**
 * Antes cada comando repetía:
 *   const rolesUsuario = interaction.member.roles.cache;
 *   const tieneRolAdministrador = rolesUsuario.some(r => r.name === "Administrador");
 * Nota: esto es además redundante con .setDefaultMemberPermissions(Administrator)
 * que ya usan varios comandos — se deja este helper como única fuente de verdad
 * por si en el futuro se decide manejar permisos solo por rol y no por permiso de Discord.
 */
function memberHasRole(interactionMember, roleName) {
  return interactionMember.roles.cache.some((r) => r.name === roleName);
}

function isAdmin(interactionMember) {
  return memberHasRole(interactionMember, ROLES.ADMINISTRADOR);
}

module.exports = { memberHasRole, isAdmin };
